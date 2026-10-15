import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { objectExists, isSafeStoragePath, deletePdf } from '@/lib/storage'
import { sendEmail, newMailEmail } from '@/lib/email'
import { z } from 'zod'

export const maxDuration = 30

const mailSchema = z.object({
  recipient: z.string().min(1, 'Destinataire requis'),
  sender: z.string().optional(),
  enterpriseId: z.string().optional(),
  clientId: z.string().optional(),
  centerId: z.string().min(1, 'Centre requis'),
  status: z.enum(['RECEIVED', 'COLLECTED', 'RETURNED']).default('RECEIVED'),
  type: z.enum(['STANDARD', 'RECOMMANDE', 'COLIS', 'OFFICIEL']).default('STANDARD'),
  notes: z.string().optional(),
  notifyClient: z.boolean().default(true),
  // Chemin du document deja uploade en direct sur Supabase (/api/uploads/sign)
  documentPath: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    let where: any = scopeByCenter(session!, {}, 'centerId')

    if (search) {
      where.OR = [
        { recipient: { contains: search, mode: 'insensitive' } },
        { sender: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status !== 'all') where.status = status.toUpperCase()

    const mails = await prisma.mail.findMany({
      where,
      include: {
        enterprise: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ mails, total: mails.length }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error('Error fetching mails:', err)
    return NextResponse.json({ error: 'Failed to fetch mails' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const data = mailSchema.parse(await request.json())

    if (session!.user.role === 'MANAGER' && data.centerId !== session!.user.centerId) {
      return NextResponse.json({ error: 'Cannot create in another center' }, { status: 403 })
    }

    // Verifie le client (existence + meme centre pour un MANAGER)
    const client = data.clientId
      ? await prisma.client.findUnique({
          where: { id: data.clientId },
          select: { id: true, prenom: true, emailPerso: true, centerId: true },
        })
      : null
    if (data.clientId && !client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }
    if (client && session!.user.role === 'MANAGER' && client.centerId !== session!.user.centerId) {
      return NextResponse.json({ error: 'Client d’un autre centre' }, { status: 403 })
    }

    // Document : uploade en direct par le navigateur. On verifie que le
    // chemin appartient bien au centre (impose par /api/uploads/sign) et
    // que le fichier existe reellement dans le bucket.
    let pdfPath: string | null = null
    if (data.documentPath) {
      if (!isSafeStoragePath(data.documentPath, `mails/${data.centerId}/`)) {
        return NextResponse.json({ error: 'Chemin de document invalide' }, { status: 400 })
      }
      if (!(await objectExists(data.documentPath))) {
        return NextResponse.json({ error: 'Document introuvable dans le stockage, réessayez l’upload' }, { status: 400 })
      }
      pdfPath = data.documentPath
    }

    let mail
    try {
      mail = await prisma.mail.create({
        data: {
          recipient: data.recipient,
          sender: data.sender || null,
          enterpriseId: data.enterpriseId || null,
          clientId: data.clientId || null,
          centerId: data.centerId,
          status: data.status,
          type: data.type,
          notes: data.notes || null,
          pdfPath,
        },
        include: { enterprise: { select: { id: true, name: true } } },
      })
    } catch (e) {
      // Evite un fichier orphelin si la creation echoue
      if (pdfPath) await deletePdf(pdfPath).catch(() => {})
      throw e
    }

    // Notification email au client (best-effort : le courrier reste cree)
    let emailSent = false
    if (client && data.notifyClient && client.emailPerso) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const tpl = newMailEmail({
          prenom: client.prenom,
          type: data.type,
          sender: data.sender ?? null,
          portalUrl: `${baseUrl}/portail`,
        })
        const result = await sendEmail({
          to: client.emailPerso,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        emailSent = result.ok && result.id !== 'dev-mode'
      } catch (e) {
        console.error('[mails POST] notification failed:', e)
      }
    }

    return NextResponse.json({ ...mail, emailSent }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating mail:', err)
    return NextResponse.json({ error: 'Failed to create mail' }, { status: 500 })
  }
}
