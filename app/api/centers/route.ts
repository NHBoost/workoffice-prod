import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { z } from 'zod'

const centerSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  address: z.string().min(1, 'Adresse requise'),
  city: z.string().min(1, 'Ville requise'),
  postalCode: z.string().min(1, 'Code postal requis'),
  country: z.string().min(1, 'Pays requis'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    const centers = await prisma.center.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            enterprises: true,
            meetingRooms: true,
            coworkingSpaces: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ centers, total: centers.length })
  } catch (err) {
    console.error('Error fetching centers:', err)
    return NextResponse.json({ error: 'Failed to fetch centers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Seuls les admins peuvent créer un centre
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    const body = await request.json()
    const data = centerSchema.parse(body)

    const center = await prisma.center.create({
      data: {
        ...data,
        phone: data.phone || null,
        email: data.email || null,
      },
    })

    return NextResponse.json(center, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      )
    }
    console.error('Error creating center:', err)
    return NextResponse.json({ error: 'Failed to create center' }, { status: 500 })
  }
}
