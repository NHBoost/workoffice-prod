import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitDB, getClientIP } from '@/lib/rate-limit'
import { sendEmail, resetPasswordEmail } from '@/lib/email'
import { audit } from '@/lib/audit'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

/**
 * POST /api/auth/forgot-password
 *
 * Génère un PasswordSetupToken valide 1h et envoie un email au user
 * concerné avec le lien vers /auth/setup-password/[token] (page qui
 * gère aussi bien l'activation initiale que la reinit).
 *
 * Anti-enumeration : on retourne toujours success:true même si l'email
 * n'existe pas en BDD, pour ne pas laisser deviner quels comptes existent.
 *
 * Rate-limit strict :
 *   - 5 demandes / 15min / IP (cross-instance via DB)
 *   - En interne aussi : 1 nouveau token par user tous les 5 min max
 *     (evite le spam d'un attaquant qui inonderait un client legitime)
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  // Rate-limit par IP
  const rl = await rateLimitDB(`forgot:${ip}`, { max: 5, window: 15 * 60_000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const { email } = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isActive: true },
    })

    // Anti-enumeration : on continue avec message succès meme si user inexistant
    if (user && user.isActive) {
      // Rate-limit par user : max 1 token generé toutes les 5 min
      // (empêche un attaquant de saturer l'inbox d'un client legitime)
      const recent = await prisma.passwordSetupToken.findFirst({
        where: {
          userId: user.id,
          createdAt: { gt: new Date(Date.now() - 5 * 60_000) },
        },
      })

      if (!recent) {
        // Revoque les anciens tokens actifs du user (un seul actif à la fois)
        await prisma.passwordSetupToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        })

        // Genere un token 32 bytes hex (64 chars) — 1h de validite
        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 60 * 60_000) // 1h

        await prisma.passwordSetupToken.create({
          data: { token, userId: user.id, expiresAt },
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const resetUrl = `${baseUrl}/auth/setup-password/${token}`
        // Prenom pour la salutation (fallback : "Bonjour," sans nom)
        const prenom = user.name?.split(' ')[0] ?? null

        const tpl = resetPasswordEmail({ prenom, resetUrl, ip })
        const result = await sendEmail({
          to: user.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })

        await audit('password.reset_request', {
          actor: { id: user.id, email: user.email, role: null },
          resourceType: 'User',
          resourceId: user.id,
          metadata: { emailSent: result.ok, requestedFromIP: ip },
          request,
        })
      } else {
        // Un token a deja ete genere il y a moins de 5 min : silent throttle
        console.log(`[forgot-password] Throttle : token deja emis recemment pour ${email}`)
      }
    }

    // Message générique dans tous les cas (anti-enumeration)
    return NextResponse.json({
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
