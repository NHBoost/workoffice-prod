/**
 * Headers Cache-Control standardises pour les endpoints API.
 *
 * Strategies disponibles :
 *  - dynamic  : revalidate frequent, donnees qui changent vite
 *  - listing  : listes paginees avec filtres → cache court mais SWR
 *  - detail   : fiche d'une entite, change peu
 *  - static   : donnees quasi-figees (centres, formules)
 *
 * Tous les headers sont en mode "private" (par utilisateur, pas de CDN partage).
 */

export const CACHE_HEADERS = {
  dynamic: {
    'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
  },
  listing: {
    'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
  },
  detail: {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
  },
  static: {
    'Cache-Control': 'private, max-age=300, stale-while-revalidate=900',
  },
} as const

export type CacheStrategy = keyof typeof CACHE_HEADERS
