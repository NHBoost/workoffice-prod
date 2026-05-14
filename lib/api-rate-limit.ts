import { NextRequest } from 'next/server'
import { rateLimitDB, getClientIP, tooManyRequests, type RateLimitOptions } from './rate-limit'

/**
 * Helper a appeler en tete de chaque handler API sensible.
 *
 * Usage :
 *   export async function POST(req: NextRequest) {
 *     const rl = await checkRateLimit(req, 'create_user', { max: 10, window: 60_000 })
 *     if (rl) return rl  // 429 deja formate
 *     // ... logique metier
 *   }
 *
 * Renvoie null si OK, sinon une Response 429 prete a renvoyer.
 */
export async function checkRateLimit(
  req: NextRequest | Request,
  scope: string,
  opts: RateLimitOptions = {}
): Promise<Response | null> {
  const ip = getClientIP(req)
  const key = `api:${scope}:ip:${ip}`
  const { allowed, retryAfter } = await rateLimitDB(key, opts)
  if (!allowed) return tooManyRequests(retryAfter)
  return null
}
