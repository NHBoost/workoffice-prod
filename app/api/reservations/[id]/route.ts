import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalAmount: z.number().nonnegative().optional(),
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']).optional(),
})

async function checkAccess(reservationId: string, userId: string, role: string) {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { userId: true, meetingRoom: { select: { centerId: true } } },
  })
  if (!r) return { allowed: false, notFound: true }
  if (role === 'ADMIN') return { allowed: true, notFound: false }
  if (r.userId === userId) return { allowed: true, notFound: false }
  return { allowed: false, notFound: false }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      meetingRoom: { select: { id: true, name: true, hourlyRate: true } },
    },
  })
  if (!reservation) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(reservation)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const access = await checkAccess(params.id, session!.user.id, session!.user.role)
  if (access.notFound) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: any = { ...data }
    if (data.startTime) updateData.startTime = new Date(data.startTime)
    if (data.endTime) updateData.endTime = new Date(data.endTime)

    const reservation = await prisma.reservation.update({
      where: { id: params.id },
      data: updateData,
    })
    return NextResponse.json(reservation)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error updating reservation:', err)
    return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth()
  if (error) return error

  const access = await checkAccess(params.id, session!.user.id, session!.user.role)
  if (access.notFound) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!access.allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await prisma.reservation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error deleting reservation:', err)
    return NextResponse.json({ error: 'Failed to delete reservation' }, { status: 500 })
  }
}
