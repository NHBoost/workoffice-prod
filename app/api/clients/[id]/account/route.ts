import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { sendEmail, setupPasswordEmail } from '@/lib/email'
import { randomBytes } from 'node:crypto'

/**
 * POST /api/clients/[id]/account
 *
 * Crée un User lié au Client, génère un PasswordSetupToken valide 7j,
 * et envoie un email d'invitation au client avec le lien pour définir
 * son mot de passe.
 *
 * Statut compte passe à 'CREE'.
 * Idempotent : si un User existe déjà, regénère juste un nouveau token et renvoie l'email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await checkRateLimit(request, 'create_client_account', { max: 10, window: 60_000 })
  if (rl) return rl

  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { user: true, center: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    // Scope par centre pour MANAGER
    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Crée le User si pas déjà lié
    let user = client.user
    if (!user) {
      // Vérifie qu'aucun User n'existe déjà avec cet email
      const existing = await prisma.user.findUnique({ where: { email: client.emailPerso } })
      if (existing) {
        return NextResponse.json(
          { error: `Un utilisateur existe déjà avec l'email ${client.emailPerso}` },
          { status: 409 }
        )
      }

      user = await prisma.user.create({
        data: {
          email: client.emailPerso,
          name: `${client.prenom} ${client.nom}`,
          phone: client.telephonePerso,
          role: 'USER',
          isActive: true,
          centerId: client.centerId,
          // password = null → le user doit le definir via le token
        },
      })

      // Lier le client au user
      await prisma.client.update({
        where: { id: client.id },
        data: { userId: user.id, compteStatut: 'CREE' },
      })
    }

    // Revoque les anciens tokens (un seul actif par user)
    await prisma.passwordSetupToken.deleteMany({ where: { userId: user.id } })

    // Genere un token cuid-like (32 bytes hex = 64 chars, plus court qu'un UUID)
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7j

    await prisma.passwordSetupToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    // Email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const setupUrl = `${baseUrl}/auth/setup-password/${token}`
    const portalUrl = `${baseUrl}/auth/login`
    const email = setupPasswordEmail({
      prenom: client.prenom,
      setupUrl,
      portalUrl,
    })

    const emailResult = await sendEmail({
      to: client.emailPerso,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })

    await audit('user.create', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'User',
      resourceId: user.id,
      metadata: {
        clientId: client.id,
        email: client.emailPerso,
        emailSent: emailResult.ok,
        emailId: emailResult.id,
      },
      request,
    })

    // Si l'email n'a pas pu partir (Resend pas configure ou erreur), on renvoie
    // le setupUrl pour que l'admin puisse le transmettre manuellement au client.
    const emailFailedOrSkipped = !emailResult.ok || emailResult.id === 'dev-mode'

    return NextResponse.json({
      ok: true,
      emailSent: emailResult.ok && emailResult.id !== 'dev-mode',
      emailError: emailResult.error,
      // Toujours en dev, et aussi en prod si l'email a echoue (fallback admin)
      ...(emailFailedOrSkipped && { setupUrl }),
    })
  } catch (err: any) {
    console.error('[api/clients/[id]/account]', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
