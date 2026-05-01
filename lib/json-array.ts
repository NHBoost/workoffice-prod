/**
 * Helper pour gérer les champs stockés en JSON string dans Prisma
 * (équivalent String[] en Postgres natif).
 *
 * Exemple : equipment: '["WiFi","TV"]' → ["WiFi", "TV"]
 */

/**
 * Parse une string JSON en tableau de strings.
 * Retourne un tableau vide si la valeur est invalide.
 */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/**
 * Sérialise un tableau en JSON string pour le stockage.
 */
export function stringifyJsonArray(value: string[] | null | undefined): string {
  if (!value || !Array.isArray(value)) return '[]'
  return JSON.stringify(value)
}

/**
 * Affiche un tableau JSON sous forme de string lisible (séparée par des virgules).
 */
export function displayJsonArray(value: string | null | undefined, separator = ', '): string {
  return parseJsonArray(value).join(separator)
}
