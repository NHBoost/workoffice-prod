import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { signedUrl as makeSignedUrl, objectExists, isSafeStoragePath, deletePdf } from '@/lib/storage'
import { sendEmail, newMailEmail } from '@/lib/email'

export const maxDuration = 30

const VALID_TYPES = ['STANDARD', 'RECOMMANDE', 'COLIS', 'OFFICIEL'] as const

/**
 * GET /api/clients/[id]/courriers
 * Liste les courriers attribues au client (cote admin).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const mails = await prisma.mail.findMany({
      where: { clientId: params.id },
      orderBy: { receivedAt: 'desc' },
    })

    const enriched = await Promise.all(
      mails.map(async m => {
        let url: string | null = null
        if (m.pdfPath) {
          try { url = await makeSignedUrl(m.pdfPath, 3600) } catch {}
        }
        return { ...m, pdfUrl: url }
      })
    )

    return NextResponse.json({ mails: enriched, total: enriched.length })
  } catch (err) {
    console.error('[api/clients/[id]/courriers GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * POST /api/clients/[id]/courriers
 * Multipart : pdf (file, optional) + champs textuels
 * Cree un courrier attribue au client.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await checkRateLimit(request, 'create_courrier', { max: 30, window: 60_000 })
  if (rl) return rl

  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      select: { id: true, centerId: true, nom: true, prenom: true, societeDenomination: true, emailPerso: true },
    })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const senderRaw = formData.get('sender')
    const typeRaw = formData.get('type')
    const notesRaw = formData.get('notes')
    const notifyClientRaw = formData.get('notifyClient')
    const sender = typeof senderRaw === 'string' && senderRaw.trim() ? senderRaw.trim() : null
    const type = typeof typeRaw === 'string' && typeRaw.trim() ? typeRaw.trim().toUpperCase() : 'STANDARD'
    const notes = typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : null
    // Notify par defaut, sauf si l'admin a explicitement decoche
    const notifyClient = notifyClientRaw !== 'false' && notifyClientRaw !== '0'
    // PDF deja uploade en direct sur Supabase (/api/uploads/sign)
    const pdfPathRaw = formData.get('pdfPath')
    const pdfPath = typeof pdfPathRaw === 'string' && pdfPathRaw ? pdfPathRaw : null

    if (!VALID_TYPES.includes(type as any)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    if (pdfPath) {
      if (!isSafeStoragePath(pdfPath, `clients/${client.id}/mails/`) || !pdfPath.endsWith('.pdf')) {
        return NextResponse.json({ error: 'Chemin de PDF invalide' }, { status: 400 })
      }
      if (!(await objectExists(pdfPath))) {
        return NextResponse.json({ error: 'PDF introuvable dans le stockage, réessayez l’upload' }, { status: 400 })
      }
    }

    const mail = await prisma.mail.create({
      data: {
        recipient: `${client.prenom} ${client.nom}`,
        sender,
        clientId: client.id,
        centerId: client.centerId,
        type,
        notes,
        pdfPath,
      },
    }).catch(async e => {
      if (pdfPath) await deletePdf(pdfPath).catch(() => {})
      throw e
    })

    // === Notification email au client ===
    // Best-effort : si l'envoi echoue, on continue (le courrier est cree).
    // L'admin verra emailSent: false dans la reponse et pourra agir.
    let emailSent = false
    let emailError: string | null = null
    if (notifyClient) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const tpl = newMailEmail({
          prenom: client.prenom,
          type,
          sender,
          portalUrl: `${baseUrl}/portail`,
        })
        const result = await sendEmail({
          to: client.emailPerso,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        emailSent = result.ok && result.id !== 'dev-mode'
        emailError = result.error ?? null
      } catch (e: any) {
        emailError = e?.message ?? 'send failed'
      }
    }

    await audit('campaign.create', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Mail',
      resourceId: mail.id,
      metadata: { clientId: client.id, type, hasPdf: !!pdfPath, sender, notifyClient, emailSent },
      request,
    })

    return NextResponse.json({
      ok: true,
      mail,
      emailSent,
      emailError,
      notified: notifyClient,
    }, { status: 201 })
  } catch (err: any) {
    console.error('[api/clients/[id]/courriers POST]', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
