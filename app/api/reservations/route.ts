import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { z } from 'zod'

const reservationSchema = z.object({
  meetingRoomId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  totalAmount: z.number().nonnegative().default(0),
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']).default('CONFIRMED'),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const upcoming = searchParams.get('upcoming') === 'true'

    const where: any = {}
    if (status !== 'all') where.status = status.toUpperCase()
    if (upcoming) where.startTime = { gte: new Date() }

    // Scope par centre via la salle pour les non-admins
    if (session!.user.role !== 'ADMIN') {
      where.meetingRoom = { centerId: session!.user.centerId ?? '__none__' }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        meetingRoom: { select: { id: true, name: true, centerId: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 200,
    })

    return NextResponse.json({ reservations, total: reservations.length })
  } catch (err) {
    console.error('Error fetching reservations:', err)
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, 'create_reservation', { max: 20, window: 60_000 })
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const data = reservationSchema.parse(body)

    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    if (endTime <= startTime) {
      return NextResponse.json({ error: 'L’heure de fin doit être après le début' }, { status: 400 })
    }

    // Vérification chevauchement
    const conflict = await prisma.reservation.findFirst({
      where: {
        meetingRoomId: data.meetingRoomId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    })
    if (conflict) {
      return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId: session!.user.id,
        meetingRoomId: data.meetingRoomId,
        title: data.title,
        description: data.description || null,
        startTime,
        endTime,
        totalAmount: data.totalAmount,
        status: data.status,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        meetingRoom: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating reservation:', err)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}
