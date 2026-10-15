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
 * Types MIME autorises dans le bucket (documents de courrier + contrats).
 * PDF, Word (doc/docx), images de scan, Excel.
 */
export const ALLOWED_DOC_MIME = [
  'application/pdf',
  'application/msword',                                                       // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
  'application/vnd.ms-excel',                                                 // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]

/**
 * Cree le bucket s'il n'existe pas (idempotent) + s'assure que les types
 * MIME documents sont autorises (met a jour le bucket existant si besoin).
 */
export async function ensureBucket(): Promise<void> {
  const supabase = getSupabase()
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false, // bucket privé
      fileSizeLimit: 20 * 1024 * 1024, // 20 MB max
      allowedMimeTypes: ALLOWED_DOC_MIME,
    })
    if (error && !/already exists/i.test(error.message)) {
      throw error
    }
  } else {
    // Le bucket existe deja (cree a l'origine en PDF-only) : on elargit
    // les types MIME autorises. Idempotent, ignore les erreurs benignes.
    await supabase.storage
      .updateBucket(BUCKET, {
        public: false,
        fileSizeLimit: 20 * 1024 * 1024,
        allowedMimeTypes: ALLOWED_DOC_MIME,
      })
      .catch(() => {})
  }
}

/**
 * Upload un document quelconque (PDF, DOCX, image...) dans le bucket.
 * Retourne le path stockable en BDD.
 */
export async function uploadDocument(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await ensureBucket()
  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true })
  if (error) throw error
  return path
}

/** Renvoie l'extension de fichier a partir du nom original (ou .bin par defaut). */
export function extFromFilename(filename: string): string {
  const m = filename.match(/\.([a-z0-9]+)$/i)
  return m ? `.${m[1].toLowerCase()}` : '.bin'
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

// ============================================================
// Upload direct navigateur -> Supabase (contourne la limite de
// ~4,5 Mo par requete des fonctions Vercel)
// ============================================================

/** Taille max d'un document (alignee sur fileSizeLimit du bucket). */
export const MAX_DOC_BYTES = 20 * 1024 * 1024

// Certains navigateurs envoient un type MIME vide ou generique : on le
// deduit alors de l'extension pour ne pas rejeter un fichier valide.
const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
}

export function resolveMime(filename: string, declared: string | null | undefined): string {
  if (declared && ALLOWED_DOC_MIME.includes(declared)) return declared
  return MIME_BY_EXT[extFromFilename(filename)] ?? (declared || '')
}

/**
 * Cree une URL d'upload signee (usage unique, ~2h) pour `path`.
 * Le navigateur fait ensuite un PUT du fichier directement sur cette URL.
 */
export async function createUploadUrl(path: string): Promise<string> {
  await ensureBucket()
  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw error ?? new Error('Failed to create upload URL')
  return data.signedUrl
}

/** Verifie qu'un objet existe bien dans le bucket (apres upload direct). */
export async function objectExists(path: string): Promise<boolean> {
  const i = path.lastIndexOf('/')
  const dir = path.slice(0, i)
  const name = path.slice(i + 1)
  const supabase = getSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 10 })
  if (error) return false
  return (data ?? []).some(o => o.name === name)
}

/** Chemin "sur" : segments alphanumeriques, pas de '..' ni de '//'. */
export function isSafeStoragePath(path: string, prefix: string): boolean {
  return (
    path.startsWith(prefix) &&
    /^[A-Za-z0-9/_.-]+$/.test(path) &&
    !path.includes('..') &&
    !path.includes('//')
  )
}
