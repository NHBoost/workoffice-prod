/**
 * Upload direct navigateur -> Supabase Storage.
 *
 * 1. Demande une URL signee a /api/uploads/sign (le serveur impose le chemin)
 * 2. PUT du fichier directement sur Supabase (pas de transit par Vercel)
 * Retourne le chemin a transmettre a l'API de creation.
 */
export async function directUpload(
  file: File,
  params: { purpose: 'mail' | 'client-mail'; centerId?: string; clientId?: string }
): Promise<string> {
  const signRes = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      filename: file.name,
      mime: file.type || undefined,
      size: file.size,
    }),
  })
  const sign = await signRes.json().catch(() => ({}))
  if (!signRes.ok) throw new Error(sign.error || `Préparation de l’upload échouée (${signRes.status})`)

  const putRes = await fetch(sign.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': sign.mime, 'x-upsert': 'false' },
    body: file,
  })
  if (!putRes.ok) {
    const d = await putRes.json().catch(() => ({}))
    throw new Error(`Upload du fichier échoué : ${d.message || d.error || putRes.status}`)
  }
  return sign.path as string
}
