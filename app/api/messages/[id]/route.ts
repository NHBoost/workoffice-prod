import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userId = session!.user.id
    if (message.senderId !== userId && message.receiverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Marquer auto comme lu si c'est le destinataire
    if (message.receiverId === userId && message.status === 'UNREAD') {
      await prisma.message.update({
        where: { id: params.id },
        data: { status: 'READ', readAt: new Date() },
      })
      message.status = 'READ'
      message.readAt = new Date()
    }

    return NextResponse.json(message)
  } catch (err) {
    console.error('Error fetching message:', err)
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const status = body.status as 'READ' | 'UNREAD'
    if (!['READ', 'UNREAD'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const message = await prisma.message.findUnique({ where: { id: params.id } })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (message.receiverId !== session!.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.message.update({
      where: { id: params.id },
      data: {
        status,
        readAt: status === 'READ' ? new Date() : null,
      },
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error updating message:', err)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const message = await prisma.message.findUnique({ where: { id: params.id } })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const userId = session!.user.id
    if (message.senderId !== userId && message.receiverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.message.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error deleting message:', err)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
