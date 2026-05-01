import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { z } from 'zod'

const createEnterpriseSchema = z.object({
  name: z.string().min(1),
  legalForm: z.string().optional(),
  siret: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']).default('ACTIVE'),
  centerId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const skip = (page - 1) * limit

    let where: any = scopeByCenter(session!, {}, 'centerId')

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { siret: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status !== 'all') where.status = status.toUpperCase()

    const [enterprises, total] = await Promise.all([
      prisma.enterprise.findMany({
        where,
        include: { center: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.enterprise.count({ where }),
    ])

    return NextResponse.json({
      enterprises,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (err) {
    console.error('Error fetching enterprises:', err)
    return NextResponse.json({ error: 'Failed to fetch enterprises' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = createEnterpriseSchema.parse(body)

    // Manager peut créer uniquement dans son centre
    if (session!.user.role === 'MANAGER' && data.centerId !== session!.user.centerId) {
      return NextResponse.json({ error: 'Cannot create in another center' }, { status: 403 })
    }

    const enterprise = await prisma.enterprise.create({
      data: { ...data, email: data.email || null },
      include: { center: { select: { id: true, name: true } } },
    })
    return NextResponse.json(enterprise, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating enterprise:', err)
    return NextResponse.json({ error: 'Failed to create enterprise' }, { status: 500 })
  }
}
