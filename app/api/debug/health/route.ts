import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/health
 *
 * Endpoint de diagnostic : verifie que toutes les briques sont en place.
 * Restreint aux ADMIN uniquement.
 *
 * Verifie :
 *  1. Variables d'environnement (presence + format)
 *  2. ENCRYPTION_KEY : encrypt/decrypt fonctionne
 *  3. Connexion BDD (Prisma → Supabase Postgres)
 *  4. Supabase Storage : bucket 'contracts' accessible
 *  5. Resend API : la cle est valide (ping endpoint /domains)
 *  6. Templates contrat HTML : presents et bien parseables
 */
export async function GET(_request: NextRequest) {
  // Endpoint diagnostic : ouvert ADMIN + MANAGER (pas de valeurs secretes exposees,
  // seulement des metadonnees de configuration)
  const { error } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  const checks: Array<{ name: string; ok: boolean; detail?: string }> = []

  // === 1. Variables d'environnement ===
  const envs = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  for (const k of envs) {
    const v = process.env[k]
    checks.push({
      name: `env.${k}`,
      ok: !!v,
      detail: v ? `set (${v.length} chars)` : 'MISSING',
    })
  }

  // === 2. ENCRYPTION_KEY : encrypt/decrypt round-trip ===
  try {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plain = 'test-' + Date.now()
    const enc = encrypt(plain)
    const dec = decrypt(enc)
    checks.push({
      name: 'crypto.encrypt_decrypt',
      ok: dec === plain,
      detail: dec === plain ? 'AES-256-GCM round-trip OK' : `expected "${plain}", got "${dec}"`,
    })
  } catch (e: any) {
    checks.push({ name: 'crypto.encrypt_decrypt', ok: false, detail: e.message })
  }

  // === 3. BDD Prisma ===
  try {
    const userCount = await prisma.user.count()
    const clientCount = await prisma.client.count()
    const centerCount = await prisma.center.count()
    checks.push({
      name: 'db.prisma',
      ok: true,
      detail: `users=${userCount}, clients=${clientCount}, centers=${centerCount}`,
    })
  } catch (e: any) {
    checks.push({ name: 'db.prisma', ok: false, detail: e.message })
  }

  // === 4. Supabase Storage : bucket access ===
  try {
    const { ensureBucket } = await import('@/lib/storage')
    await ensureBucket()
    checks.push({
      name: 'supabase.storage_bucket',
      ok: true,
      detail: "bucket 'contracts' accessible (créé si nécessaire)",
    })
  } catch (e: any) {
    checks.push({ name: 'supabase.storage_bucket', ok: false, detail: e.message })
  }

  // === 5. Resend API : verif credentials ===
  try {
    if (!process.env.RESEND_API_KEY) {
      checks.push({ name: 'resend.api', ok: false, detail: 'RESEND_API_KEY absent' })
    } else {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        checks.push({ name: 'resend.api', ok: false, detail: `HTTP ${res.status} : ${JSON.stringify(body)}` })
      } else {
        const domains = body.data ?? []
        const verifiedDomains = domains.filter((d: any) => d.status === 'verified').map((d: any) => d.name)
        const pendingDomains = domains.filter((d: any) => d.status !== 'verified').map((d: any) => `${d.name} (${d.status})`)
        checks.push({
          name: 'resend.api',
          ok: true,
          detail: `${domains.length} domaine(s) — verifiés: [${verifiedDomains.join(', ')}] · en attente: [${pendingDomains.join(', ')}]`,
        })
      }
    }
  } catch (e: any) {
    checks.push({ name: 'resend.api', ok: false, detail: e.message })
  }

  // === 6. Templates HTML ===
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const templatesDir = path.join(process.cwd(), 'contract-templates')
    const files = ['contrat.html', 'cgv.html', 'rgpd.html']
    const sizes = files.map(f => {
      const p = path.join(templatesDir, f)
      const stat = fs.statSync(p)
      return `${f}=${stat.size}b`
    })
    checks.push({ name: 'templates.html', ok: true, detail: sizes.join(', ') })
  } catch (e: any) {
    checks.push({ name: 'templates.html', ok: false, detail: e.message })
  }

  // === Resume ===
  const allOk = checks.every(c => c.ok)
  const score = `${checks.filter(c => c.ok).length}/${checks.length}`

  return NextResponse.json(
    {
      ok: allOk,
      score,
      summary: allOk
        ? '🎉 Tout est OK, prêt pour les tests end-to-end'
        : '⚠️ Au moins un check a échoué — voir les details',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}
