import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

/**
 * Chiffrement symetrique AES-256-GCM pour les donnees sensibles RGPD
 * (numero de carte d'identite, registre national, etc.).
 *
 * Format de sortie : "v1:<iv_b64>:<tag_b64>:<ciphertext_b64>"
 *   - v1 = version du schema (permet d'evoluer plus tard)
 *   - iv  = 12 octets aleatoires (GCM standard)
 *   - tag = 16 octets d'authentification
 *
 * Cle : ENCRYPTION_KEY env var, 32 octets en base64 (256 bits)
 *       genere via : `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
 *
 * IMPORTANT : ne JAMAIS changer la cle apres deploiement
 * (sinon impossible de dechiffrer les donnees existantes).
 */

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const VERSION = 'v1'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (256 bits), got ${key.length}`)
  }
  return key
}

/**
 * Chiffre une chaine. Retourne un format texte compact stockable en BDD (varchar).
 * Si plaintext est vide/null, retourne une chaine vide (pas d'overhead).
 */
export function encrypt(plaintext: string | null | undefined): string {
  if (!plaintext) return ''
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    enc.toString('base64'),
  ].join(':')
}

/**
 * Dechiffre une chaine. Renvoie '' si l'entree est vide.
 * Throw si le format est invalide ou l'auth tag ne matche pas
 * (signe d'une corruption ou d'une mauvaise cle).
 */
export function decrypt(ciphertext: string | null | undefined): string {
  if (!ciphertext) return ''
  const parts = ciphertext.split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid ciphertext format')
  }
  const [, ivB64, tagB64, encB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const enc = Buffer.from(encB64, 'base64')
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('Invalid ciphertext metadata')
  }
  const key = getKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

/**
 * Masque une donnee dechiffree pour affichage (ex: numero CI affiche partiel).
 *   maskSensitive('123-4567890-12')        → '••• ••••• 90-12'
 *   maskSensitive('123-4567890-12', { keepEnd: 3 })  → '••••••••• -12'
 */
export function maskSensitive(value: string, opts: { keepEnd?: number } = {}): string {
  if (!value) return ''
  const keepEnd = opts.keepEnd ?? 4
  if (value.length <= keepEnd) return '•'.repeat(value.length)
  return '•'.repeat(value.length - keepEnd) + value.slice(-keepEnd)
}
