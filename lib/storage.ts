import { createClient } from '@supabase/supabase-js'

/**
 * Wrapper Supabase Storage pour le bucket 'contracts' (PDFs des contrats).
 *
 * Pré-requis (variables d'environnement) :
 *  - SUPABASE_URL                : URL du projet (https://xxx.supabase.co)
 *  - SUPABASE_SERVICE_ROLE_KEY   : clé service_role (bypass RLS, server-side only)
 *  - SUPABASE_STORAGE_BUCKET     : nom du bucket, défaut 'contracts'
 *
 * Le bucket doit être PRIVÉ (pas de lecture publique).
 * Les URLs signées sont générées à la demande, valables 1h par défaut.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'contracts'

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis pour le storage'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Cree le bucket s'il n'existe pas (idempotent).
 * A appeler au demarrage / au premier upload.
 */
export async function ensureBucket(): Promise<void> {
  const supabase = getSupabase()
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false, // bucket privé
      fileSizeLimit: 20 * 1024 * 1024, // 20 MB max
      allowedMimeTypes: ['application/pdf'],
    })
    if (error && !/already exists/i.test(error.message)) {
      throw error
    }
  }
}

/**
 * Upload un Buffer PDF dans le bucket. Retourne le path (clé) pour stockage en BDD.
 *   path: 'clients/{clientId}/{contractId}.pdf'
 */
export async function uploadPdf(path: string, buffer: Buffer): Promise<string> {
  await ensureBucket()
  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) throw error
  return path
}

/**
 * Genere une URL signee temporaire pour telecharger un PDF.
 * Default : 1h. Utiliser des durees plus courtes pour les liens email.
 */
export async function signedUrl(path: string, expiresSec = 3600): Promise<string> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresSec)
  if (error || !data) throw error ?? new Error('Failed to sign URL')
  return data.signedUrl
}

/**
 * Telecharge le binaire (utilise par exemple pour streamer un PDF a un client
 * sans exposer l'URL Supabase signee directement).
 */
export async function downloadPdf(path: string): Promise<Buffer> {
  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) throw error ?? new Error('Failed to download')
  return Buffer.from(await data.arrayBuffer())
}

export async function deletePdf(path: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error && !/not found/i.test(error.message)) throw error
}
