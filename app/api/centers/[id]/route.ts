import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { z } from 'zod'

const centerSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const center = await prisma.center.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            enterprises: true,
            meetingRooms: true,
            coworkingSpaces: true,
            packages: true,
            mails: true,
          },
        },
      },
    })

    if (!center) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    return NextResponse.json(center)
  } catch (err) {
    console.error('Error fetching center:', err)
    return NextResponse.json({ error: 'Failed to fetch center' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    const body = await request.json()
    const data = centerSchema.parse(body)

    const center = await prisma.center.update({
      where: { id: params.id },
      data: {
        ...data,
        phone: data.phone === '' ? null : data.phone,
        email: data.email === '' ? null : data.email,
      },
    })

    return NextResponse.json(center)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      )
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }
    console.error('Error updating center:', err)
    return NextResponse.json({ error: 'Failed to update center' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    // Vérifier qu'aucune entité ne pointe vers ce centre
    const counts = await prisma.center.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true, enterprises: true, meetingRooms: true, coworkingSpaces: true },
        },
      },
    })
    if (!counts) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }
    const hasDependencies =
      counts._count.users > 0 ||
      counts._count.enterprises > 0 ||
      counts._count.meetingRooms > 0 ||
      counts._count.coworkingSpaces > 0
    if (hasDependencies) {
      return NextResponse.json(
        {
          error:
            'Impossible de supprimer ce centre : des utilisateurs, entreprises ou ressources y sont rattachés.',
        },
        { status: 409 }
      )
    }

    await prisma.center.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }
    console.error('Error deleting center:', err)
    return NextResponse.json({ error: 'Failed to delete center' }, { status: 500 })
  }
}
