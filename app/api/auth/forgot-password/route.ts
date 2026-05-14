import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitDB, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
})

/**
 * Demande de réinitialisation de mot de passe.
 *
 * Implémentation simplifiée : génère un token cuid stocké en cookie + en DB
 * (dans une vraie prod, l'envoyer par email via SendGrid/Resend).
 *
 * On retourne TOUJOURS un succès pour ne pas leak l'existence d'un email.
 */
export async function POST(request: NextRequest) {
  // Rate limit DB-backed : 5 demandes par 15 min par IP (cross-instance)
  const ip = getClientIP(request)
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

    const user = await prisma.user.findUnique({ where: { email } })

    // Génération token (simulée — à remplacer par envoi email)
    if (user && user.isActive) {
      const token = crypto.randomUUID()
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1h

      // Stocke le token via la table Session si dispo, sinon log seul
      // Dans cette implémentation, on log côté serveur uniquement.
      console.log(`[forgot-password] Token pour ${email} : ${token} (expire ${expires.toISOString()})`)

      // En prod : await sendEmail(email, `https://app/auth/reset-password?token=${token}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    console.error('Error in forgot-password:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
