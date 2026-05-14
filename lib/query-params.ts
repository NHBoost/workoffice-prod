import { NextResponse } from 'next/server'
import { z, ZodError, ZodSchema } from 'zod'

/**
 * Parse les searchParams d'une requete avec un schema Zod.
 *
 * Usage :
 *   const querySchema = z.object({
 *     page: z.coerce.number().int().min(1).default(1),
 *     limit: z.coerce.number().int().min(1).max(100).default(20),
 *     search: z.string().trim().max(200).optional(),
 *   })
 *   const parsed = parseSearchParams(request, querySchema)
 *   if (parsed instanceof NextResponse) return parsed  // 400 deja formate
 *   const { page, limit, search } = parsed
 *
 * En cas d'erreur, retourne directement une NextResponse 400 avec les
 * details de validation. Sinon retourne l'objet parse type.
 */
export function parseSearchParams<T extends ZodSchema>(
  request: Request | { url: string },
  schema: T
): z.infer<T> | NextResponse {
  const url = new URL(request.url)
  // Object.fromEntries pour transformer URLSearchParams en plain object
  // (mais perd les valeurs multiples : ?tag=a&tag=b → { tag: 'b' }).
  // Pour notre usage standard (filtres single-value), c'est OK.
  const raw = Object.fromEntries(url.searchParams)
  try {
    return schema.parse(raw)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        },
        { status: 400 }
      )
    }
    throw err
  }
}

/* ============================================================
   Schemas reutilisables pour les patterns courants
   ============================================================ */

/** Pagination standard : page >= 1, limit 1-100 (defaut 20). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** Recherche texte safe : trim, lowercase optionnel, max 200 chars. */
export const searchSchema = z.object({
  search: z.string().trim().max(200).optional(),
})
