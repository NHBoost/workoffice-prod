'use client'

import { useCallback, useEffect, useState } from 'react'
import { getCachedData, setCachedData } from './client-cache'

/**
 * Hook de fetch avec strategie stale-while-revalidate (SWR-like).
 *
 *  1. Au mount, lit le cache localStorage → rendu instantane si fresh
 *  2. Fetch en arriere-plan
 *  3. Update + cache au retour
 *  4. refetch() pour rafraichir manuellement
 *
 * Usage :
 *   const { data, loading, error, refetch } = useCachedFetch<{clients: Client[]}>(
 *     '/api/clients',
 *     { cacheKey: 'clients-list', maxAge: 2 * 60_000 }
 *   )
 *
 * Defauts :
 *   - cacheKey  : l'URL elle-meme
 *   - maxAge    : 5 minutes
 *   - autoFetch : true (fetch au mount)
 */
export interface UseCachedFetchOptions {
  /** Cle de cache, defaut = url. Utile si l'URL contient des params variables. */
  cacheKey?: string
  /** Duree max d'utilisation du cache, en ms. Defaut 5 min. */
  maxAge?: number
  /** Si false, ne fetch pas au mount (rare). */
  autoFetch?: boolean
}

export interface UseCachedFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCachedFetch<T = any>(
  url: string,
  opts: UseCachedFetchOptions = {}
): UseCachedFetchResult<T> {
  const cacheKey = opts.cacheKey ?? url
  const maxAge = opts.maxAge ?? 5 * 60_000
  const autoFetch = opts.autoFetch ?? true

  // Init depuis le cache → rendu instantane si dispo
  const [data, setData] = useState<T | null>(() => {
    if (typeof window === 'undefined') return null
    return getCachedData<T>(cacheKey, maxAge)
  })
  const [loading, setLoading] = useState<boolean>(!data && autoFetch)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    fetch(url, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: T) => {
        setData(d)
        setCachedData(cacheKey, d)
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [url, cacheKey])

  useEffect(() => {
    if (autoFetch) refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, autoFetch])

  return { data, loading, error, refetch }
}
