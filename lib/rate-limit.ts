import { prisma } from './prisma'

/**
 * Rate limiter HYBRIDE :
 *  - L1 : cache in-memory (rapide, evite un round-trip DB pour les requetes
 *    legitimes / hits frequents). Limite a une instance Vercel.
 *  - L2 : table RateLimitEntry en BDD (persistant cross-instance, anti-bypass
 *    par parallelisation sur plusieurs instances serverless).
 *
 * Strategie : on increment L1 immediatement, on syncrhonise L2 via upsert.
 * Si L1 dit "deja bloque", on rejette sans toucher L2.
 * Si L1 dit "OK", on verifie L2 (qui peut avoir un count plus eleve si
 * d'autres instances ont deja contribue).
 */

type Bucket = { count: number; resetAt: number }
const memCache = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** Nombre maximum de requetes par fenetre. Defaut : 60. */
  max?: number
  /** Duree de la fenetre en millisecondes. Defaut : 60 secondes. */
  window?: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number
}

/**
 * Rate-limit SYNCHRONE (in-memory uniquement).
 *
 * A utiliser quand on ne peut pas await (ex: NextAuth authorize() en hot path).
 * Pour les endpoints API, prefere rateLimitDB() qui est cross-instance.
 */
export function rateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const max = opts.max ?? 60
  const windowMs = opts.window ?? 60_000
  const now = Date.now()
  const bucket = memCache.get(key)

  if (!bucket || bucket.resetAt < now) {
    memCache.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, retryAfter: 0 }
  }
  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count++
  return { allowed: true, remaining: max - bucket.count, retryAfter: 0 }
}

/**
 * Rate-limit PERSISTANT cross-instance (DB-backed).
 *
 * Coute ~10-30ms par check. A utiliser sur les endpoints API sensibles
 * (POST /users, POST /centers, etc.) ou la persistance est critique.
 *
 * Strategy : L1 in-memory fast-path + L2 BDD comme source de verite.
 */
export async function rateLimitDB(
  key: string,
  opts: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const max = opts.max ?? 60
  const windowMs = opts.window ?? 60_000
  const now = new Date()

  // === L1 : fast-path memoire ===
  const memBucket = memCache.get(key)
  if (memBucket && memBucket.resetAt > now.getTime() && memBucket.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((memBucket.resetAt - now.getTime()) / 1000),
    }
  }

  // === L2 : source de verite BDD ===
  const resetAt = new Date(now.getTime() + windowMs)
  let entry
  try {
    entry = await prisma.rateLimitEntry.upsert({
      where: { key },
      update: {
        count: { increment: 1 },
      },
      create: {
        key,
        count: 1,
        resetAt,
      },
    })

    // Si la fenetre est expiree, on reset
    if (entry.resetAt < now) {
      entry = await prisma.rateLimitEntry.update({
        where: { key },
        data: { count: 1, resetAt },
      })
    }
  } catch (err) {
    // Si la BDD plante, fail-open (mieux que de bloquer tous les users)
    console.error('rateLimitDB failed, falling back to memory:', err)
    return rateLimit(key, opts)
  }

  // Sync du cache L1
  memCache.set(key, { count: entry.count, resetAt: entry.resetAt.getTime() })

  if (entry.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000),
    }
  }
  return { allowed: true, remaining: max - entry.count, retryAfter: 0 }
}

/** Recupere l'IP depuis les headers Next.js / Vercel. */
export function getClientIP(req: Request | { headers: Headers }): string {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'anonymous'
  )
}

/** Helper : retourne une Response 429 standardisee. */
export function tooManyRequests(retryAfter: number) {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please retry later.', retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  )
}

// Nettoyage periodique du cache L1 (et opportunistement de la BDD).
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memCache.forEach((b, k) => {
      if (b.resetAt < now) memCache.delete(k)
    })
  }, 5 * 60_000).unref?.()
}
