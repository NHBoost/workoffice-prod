import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { uploadDocument, extFromFilename, ALLOWED_DOC_MIME } from '@/lib/storage'
import { z } from 'zod'

export const maxDuration = 30

const mailSchema = z.object({
  recipient: z.string().min(1, 'Destinataire requis'),
  sender: z.string().optional(),
  enterpriseId: z.string().optional(),
  centerId: z.string().min(1, 'Centre requis'),
  status: z.enum(['RECEIVED', 'COLLECTED', 'RETURNED']).default('RECEIVED'),
  type: z.enum(['STANDARD', 'RECOMMANDE', 'COLIS', 'OFFICIEL']).default('STANDARD'),
  notes: z.string().optional(),
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

    return NextResponse.json({ mails, total: mails.length }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } })
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
        centerId: v('centerId'),
        status: v('status') ?? 'RECEIVED',
        type: v('type') ?? 'STANDARD',
        notes: v('notes'),
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

    // Cree le mail (sans pdfPath d'abord, pour avoir l'ID)
    const mail = await prisma.mail.create({
      data: {
        recipient: data.recipient,
        sender: data.sender || null,
        enterpriseId: data.enterpriseId || null,
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
      if (!ALLOWED_DOC_MIME.includes(file.type)) {
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
        await uploadDocument(pdfPath, buffer, file.type)
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

    return NextResponse.json({ ...mail, pdfPath }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating mail:', err)
    return NextResponse.json({ error: 'Failed to create mail' }, { status: 500 })
  }
}
