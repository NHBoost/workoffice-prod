import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { hash } from 'bcryptjs'
import { z } from 'zod'

const setupSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères').max(200),
})

/**
 * GET /api/auth/setup-password?token=xxx
 * Verifie qu'un token est valide (non expire, non utilise) et retourne
 * les infos pour l'UI (email, nom du compte).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  const entry = await prisma.passwordSetupToken.findUnique({
    where: { token },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!entry) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })
  if (entry.usedAt) return NextResponse.json({ error: 'Lien déjà utilisé' }, { status: 410 })
  if (entry.expiresAt < new Date()) return NextResponse.json({ error: 'Lien expiré' }, { status: 410 })

  return NextResponse.json({
    ok: true,
    email: entry.user.email,
    name: entry.user.name,
  })
}

/**
 * POST /api/auth/setup-password
 * Body: { token, password }
 *
 * Hash le mot de passe, le set sur le User, marque le token comme utilise.
 */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, 'setup_password', { max: 5, window: 5 * 60_000 })
  if (rl) return rl

  try {
    const body = await request.json()
    const { token, password } = setupSchema.parse(body)

    const entry = await prisma.passwordSetupToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!entry) return NextResponse.json({ error: 'Lien invalide' }, { status: 404 })
    if (entry.usedAt) return NextResponse.json({ error: 'Lien déjà utilisé' }, { status: 410 })
    if (entry.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 })
    }

    const hashed = await hash(password, 12)

    // Update user + mark token used in une transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: entry.userId },
        data: { password: hashed, isActive: true },
      }),
      prisma.passwordSetupToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ])

    await audit('password.reset', {
      actor: { id: entry.user.id, email: entry.user.email, role: entry.user.role },
      resourceType: 'User',
      resourceId: entry.user.id,
      metadata: { method: 'setup_token' },
      request,
    })

    return NextResponse.json({ ok: true, email: entry.user.email })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message || 'Validation failed', details: err.errors },
        { status: 400 }
      )
    }
    console.error('[api/auth/setup-password]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
