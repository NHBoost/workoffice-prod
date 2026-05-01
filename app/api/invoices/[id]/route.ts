import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { z } from 'zod'

const updateSchema = z.object({
  amount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        enterprise: { select: { id: true, name: true, address: true, city: true, postalCode: true } },
        subscription: true,
      },
    })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(invoice)
  } catch (err) {
    console.error('Error fetching invoice:', err)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
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

    const existing = await prisma.invoice.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = { ...data }
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate)

    if (data.amount !== undefined || data.taxAmount !== undefined) {
      const amount = data.amount ?? existing.amount
      const taxAmount = data.taxAmount ?? existing.taxAmount
      updateData.totalAmount = amount + taxAmount
    }

    if (data.status === 'PAID' && existing.status !== 'PAID') {
      updateData.paidAt = new Date()
    }
    if (data.status && data.status !== 'PAID') {
      updateData.paidAt = null
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: { enterprise: { select: { id: true, name: true } } },
    })
    return NextResponse.json(invoice)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error updating invoice:', err)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    await prisma.invoice.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('Error deleting invoice:', err)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
