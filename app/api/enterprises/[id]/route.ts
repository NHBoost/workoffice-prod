import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  legalForm: z.string().optional().nullable(),
  siret: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
  centerId: z.string().min(1).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const enterprise = await prisma.enterprise.findUnique({
      where: { id: params.id },
      include: {
        center: { select: { id: true, name: true } },
        _count: {
          select: { subscriptions: true, invoices: true, packages: true, mails: true },
        },
      },
    })
    if (!enterprise) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(enterprise)
  } catch (err) {
    console.error('Error fetching enterprise:', err)
    return NextResponse.json({ error: 'Failed to fetch enterprise' }, { status: 500 })
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

    const updateData: any = { ...data }

    // Auto-fill suspensionDate / terminationDate when status changes
    if (data.status === 'SUSPENDED') {
      const existing = await prisma.enterprise.findUnique({ where: { id: params.id } })
      if (existing && existing.status !== 'SUSPENDED') {
        updateData.suspensionDate = new Date()
      }
    }
    if (data.status === 'TERMINATED') {
      const existing = await prisma.enterprise.findUnique({ where: { id: params.id } })
      if (existing && existing.status !== 'TERMINATED') {
        updateData.terminationDate = new Date()
      }
    }
    if (data.status === 'ACTIVE') {
      updateData.suspensionDate = null
      updateData.terminationDate = null
    }

    const enterprise = await prisma.enterprise.update({
      where: { id: params.id },
      data: updateData,
      include: { center: { select: { id: true, name: true } } },
    })
    return NextResponse.json(enterprise)
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'SIRET déjà utilisé' }, { status: 409 })
    }
    console.error('Error updating enterprise:', err)
    return NextResponse.json({ error: 'Failed to update enterprise' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole('ADMIN')
  if (error) return error

  try {
    await prisma.enterprise.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (err?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Impossible de supprimer (factures/abonnements liés)' },
        { status: 409 }
      )
    }
    console.error('Error deleting enterprise:', err)
    return NextResponse.json({ error: 'Failed to delete enterprise' }, { status: 500 })
  }
}
