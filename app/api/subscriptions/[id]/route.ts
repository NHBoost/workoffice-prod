import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { z } from 'zod'

const updateSchema = z.object({
  type: z.enum(['DAILY', 'MONTHLY', 'YEARLY']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  monthlyAmount: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  coworkingSpaceId: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  const subscription = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: {
      enterprise: true,
      coworkingSpace: true,
      invoices: { orderBy: { issuedAt: 'desc' } },
    },
  })
  if (!subscription) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(subscription)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: any = { ...data }
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const subscription = await prisma.subscription.update({
      where: { id: params.id },
      data: updateData,
    })
    return NextResponse.json(subscription)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error updating subscription:', err)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    await prisma.subscription.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Impossible (factures liées)' }, { status: 409 })
    }
    console.error('Error deleting subscription:', err)
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
  }
}
