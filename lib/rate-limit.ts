/**
 * Rate limiter en mémoire (token bucket simple).
 *
 * Idéal pour MVP / mono-instance. Pour la prod multi-instance Vercel,
 * remplacer par Upstash Redis (`@upstash/ratelimit`).
 *
 * Usage :
 *   const { allowed, retryAfter } = rateLimit(`login:${ip}`, { max: 5, window: 60_000 })
 *   if (!allowed) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** Nombre maximum de requêtes par fenêtre. Défaut : 60. */
  max?: number
  /** Durée de la fenêtre en millisecondes. Défaut : 60 secondes. */
  window?: number
}

export function rateLimit(key: string, opts: RateLimitOptions = {}) {
  const max = opts.max ?? 60
  const windowMs = opts.window ?? 60_000

  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, retryAfter: 0 }
  }

  if (bucket.count >= max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  bucket.count++
  return { allowed: true, remaining: max - bucket.count, retryAfter: 0 }
}

/** Récupère l'IP depuis les headers Next.js / Vercel. */
export function getClientIP(req: Request | { headers: Headers }): string {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'anonymous'
  )
}

/** Nettoyage périodique des buckets expirés (limite la mémoire). */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    buckets.forEach((b, k) => {
      if (b.resetAt < now) buckets.delete(k)
    })
  }, 5 * 60_000).unref?.()
}
