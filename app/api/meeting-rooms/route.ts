import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { stringifyJsonArray } from '@/lib/json-array'
import { z } from 'zod'

const createRoomSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().positive(),
  equipment: z.array(z.string()).default([]),
  hourlyRate: z.number().nonnegative(),
  isActive: z.boolean().default(true),
  centerId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    let where: any = scopeByCenter(session!, {}, 'centerId')
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const rooms = await prisma.meetingRoom.findMany({
      where,
      include: {
        center: { select: { id: true, name: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ rooms, total: rooms.length })
  } catch (err) {
    console.error('Error fetching rooms:', err)
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = createRoomSchema.parse(body)

    if (session!.user.role === 'MANAGER' && data.centerId !== session!.user.centerId) {
      return NextResponse.json({ error: 'Cannot create in another center' }, { status: 403 })
    }

    const room = await prisma.meetingRoom.create({
      data: {
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        equipment: stringifyJsonArray(data.equipment),
        hourlyRate: data.hourlyRate,
        isActive: data.isActive,
        centerId: data.centerId,
      },
    })
    return NextResponse.json(room, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating room:', err)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
