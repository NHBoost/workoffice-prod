import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, scopeByCenter } from '@/lib/api-auth'
import { z } from 'zod'

const subscriptionSchema = z.object({
  enterpriseId: z.string().min(1),
  coworkingSpaceId: z.string().optional(),
  type: z.enum(['DAILY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  monthlyAmount: z.number().nonnegative(),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get('active') === 'true'

    let where: any = {}
    if (onlyActive) where.isActive = true

    if (session!.user.role !== 'ADMIN') {
      where.enterprise = { centerId: session!.user.centerId ?? '__none__' }
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        enterprise: { select: { id: true, name: true } },
        coworkingSpace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ subscriptions, total: subscriptions.length })
  } catch (err) {
    console.error('Error fetching subscriptions:', err)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = subscriptionSchema.parse(body)

    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    if (endDate <= startDate) {
      return NextResponse.json({ error: 'La date de fin doit être après le début' }, { status: 400 })
    }

    const subscription = await prisma.subscription.create({
      data: {
        enterpriseId: data.enterpriseId,
        coworkingSpaceId: data.coworkingSpaceId || null,
        type: data.type,
        startDate,
        endDate,
        monthlyAmount: data.monthlyAmount,
        isActive: data.isActive,
      },
      include: {
        enterprise: { select: { id: true, name: true } },
        coworkingSpace: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(subscription, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Error creating subscription:', err)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}
