import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { z } from 'zod'

const messageSchema = z.object({
  receiverId: z.string().min(1, 'Destinataire requis'),
  subject: z.string().min(1, 'Sujet requis'),
  content: z.string().min(1, 'Contenu requis'),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'inbox' // inbox / sent
    const search = searchParams.get('search') || ''

    const userId = session!.user.id
    const where: any =
      folder === 'sent' ? { senderId: userId } : { receiverId: userId }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const unreadCount = await prisma.message.count({
      where: { receiverId: userId, status: 'UNREAD' },
    })

    return NextResponse.json({ messages, total: messages.length, unreadCount })
  } catch (err) {
    console.error('Error fetching messages:', err)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Anti-spam : 30 messages / min / IP
  const rl = await checkRateLimit(request, 'send_message', { max: 30, window: 60_000 })
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const data = messageSchema.parse(body)

    if (data.receiverId === session!.user.id) {
      return NextResponse.json({ error: 'Cannot send a message to yourself' }, { status: 400 })
    }

    const receiver = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { id: true, isActive: true },
    })
    if (!receiver || !receiver.isActive) {
      return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
    }

    const message = await prisma.message.create({
      data: {
        senderId: session!.user.id,
        receiverId: data.receiverId,
        subject: data.subject,
        content: data.content,
        status: 'UNREAD',
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating message:', err)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}
