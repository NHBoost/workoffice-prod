/**
 * Helper de cache local pour donnees JSON cote client.
 *
 * Strategie : stale-while-revalidate
 *   1. Au mount, on charge depuis localStorage si fresh (< maxAge)
 *      → rendu instantane meme si > 0 ms
 *   2. En parallele on fetch fresh data
 *   3. On met a jour le cache + l'UI quand la fresh data arrive
 *
 * Le cache est invalide a chaque deploiement (cle inclut le build hash
 * ou un version manuel).
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const VERSION = 'v1' // bump si schema change

function key(name: string): string {
  return `dashboard-cache:${VERSION}:${name}`
}

/**
 * Lit une entree du cache si elle est encore valide.
 *  @param name nom unique de l'entree
 *  @param maxAgeMs duree de validite (default : 5 min)
 *  @returns la donnee mise en cache si valide, null sinon
 */
export function getCachedData<T>(name: string, maxAgeMs = 5 * 60_000): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key(name))
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > maxAgeMs) return null
    return entry.data
  } catch {
    return null
  }
}

/** Sauve une entree dans le cache. Silencieux en cas d'echec (quota plein, etc.). */
export function setCachedData<T>(name: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    localStorage.setItem(key(name), JSON.stringify(entry))
  } catch {
    // Silent fail (quota plein, mode privé, etc.)
  }
}

/** Supprime une entree (apres logout par exemple). */
export function clearCachedData(name: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key(name))
  } catch {}
}
