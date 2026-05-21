import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { z } from 'zod'

const mailSchema = z.object({
  recipient: z.string().min(1, 'Destinataire requis'),
  sender: z.string().optional(),
  enterpriseId: z.string().optional(),
  centerId: z.string().min(1, 'Centre requis'),
  status: z.enum(['RECEIVED', 'COLLECTED', 'RETURNED']).default('RECEIVED'),
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
    const body = await request.json()
    const data = mailSchema.parse(body)

    if (session!.user.role === 'MANAGER' && data.centerId !== session!.user.centerId) {
      return NextResponse.json({ error: 'Cannot create in another center' }, { status: 403 })
    }

    const mail = await prisma.mail.create({
      data: {
        recipient: data.recipient,
        sender: data.sender || null,
        enterpriseId: data.enterpriseId || null,
        centerId: data.centerId,
        status: data.status,
        notes: data.notes || null,
      },
      include: { enterprise: { select: { id: true, name: true } } },
    })
    return NextResponse.json(mail, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating mail:', err)
    return NextResponse.json({ error: 'Failed to create mail' }, { status: 500 })
  }
}
