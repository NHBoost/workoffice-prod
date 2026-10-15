import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { uploadDocument, extFromFilename, ALLOWED_DOC_MIME } from '@/lib/storage'
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
})

// Certains navigateurs envoient un file.type vide (ou generique) : on le
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
function resolveMime(file: File): string {
  if (ALLOWED_DOC_MIME.includes(file.type)) return file.type
  return MIME_BY_EXT[extFromFilename(file.name).toLowerCase()] ?? file.type
}

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
    // Detecte multipart (avec document) vs JSON (sans)
    const contentType = request.headers.get('content-type') || ''
    let rawData: any
    let file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const v = (k: string): any => {
        const raw = formData.get(k)
        if (raw === null || (typeof raw === 'string' && raw.trim() === '')) return undefined
        return raw
      }
      rawData = {
        recipient: v('recipient'),
        sender: v('sender'),
        enterpriseId: v('enterpriseId'),
        clientId: v('clientId'),
        centerId: v('centerId'),
        status: v('status') ?? 'RECEIVED',
        type: v('type') ?? 'STANDARD',
        notes: v('notes'),
        notifyClient: v('notifyClient') !== 'false',
      }
      const f = formData.get('document')
      if (f instanceof File && f.size > 0) file = f
    } else {
      rawData = await request.json()
    }

    const data = mailSchema.parse(rawData)

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

    // Cree le mail (sans pdfPath d'abord, pour avoir l'ID)
    const mail = await prisma.mail.create({
      data: {
        recipient: data.recipient,
        sender: data.sender || null,
        enterpriseId: data.enterpriseId || null,
        clientId: data.clientId || null,
        centerId: data.centerId,
        status: data.status,
        type: data.type,
        notes: data.notes || null,
      },
      include: { enterprise: { select: { id: true, name: true } } },
    })

    // Upload du document si fourni
    let pdfPath: string | null = null
    if (file) {
      const mime = resolveMime(file)
      if (!ALLOWED_DOC_MIME.includes(mime)) {
        await prisma.mail.delete({ where: { id: mail.id } })
        return NextResponse.json(
          { error: 'Type de fichier non supporté (PDF, DOC/DOCX, XLS/XLSX, JPG, PNG acceptés)' },
          { status: 400 }
        )
      }
      if (file.size > 20 * 1024 * 1024) {
        await prisma.mail.delete({ where: { id: mail.id } })
        return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = extFromFilename(file.name)
      pdfPath = `mails/${mail.centerId}/${mail.id}${ext}`
      try {
        await uploadDocument(pdfPath, buffer, mime)
        await prisma.mail.update({ where: { id: mail.id }, data: { pdfPath } })
      } catch (uploadErr: any) {
        await prisma.mail.delete({ where: { id: mail.id } })
        console.error('[mails POST] upload failed:', uploadErr)
        return NextResponse.json(
          { error: `Upload du document échoué : ${uploadErr.message ?? 'inconnu'}` },
          { status: 500 }
        )
      }
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

    return NextResponse.json({ ...mail, pdfPath, emailSent }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating mail:', err)
    return NextResponse.json({ error: 'Failed to create mail' }, { status: 500 })
  }
}
