import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { z } from 'zod'

const createPackageSchema = z.object({
  tracking: z.string().min(1),
  recipient: z.string().min(1),
  sender: z.string().optional(),
  enterpriseId: z.string().optional(),
  centerId: z.string().min(1),
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
        { tracking: { contains: search, mode: 'insensitive' } },
        { recipient: { contains: search, mode: 'insensitive' } },
        { sender: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status !== 'all') where.status = status.toUpperCase()

    const packages = await prisma.package.findMany({
      where,
      include: {
        enterprise: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ packages, total: packages.length })
  } catch (err) {
    console.error('Error fetching packages:', err)
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = createPackageSchema.parse(body)

    if (session!.user.role === 'MANAGER' && data.centerId !== session!.user.centerId) {
      return NextResponse.json({ error: 'Cannot create in another center' }, { status: 403 })
    }

    const pkg = await prisma.package.create({ data })
    return NextResponse.json(pkg, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating package:', err)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}
