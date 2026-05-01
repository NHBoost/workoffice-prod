import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/api-auth'
import { z } from 'zod'

const invoiceSchema = z.object({
  number: z.string().min(1).optional(),
  enterpriseId: z.string().min(1, 'Entreprise requise'),
  subscriptionId: z.string().optional(),
  amount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  dueDate: z.string().min(1, 'Date d’échéance requise'),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
})

function generateInvoiceNumber() {
  const year = new Date().getFullYear()
  const ts = Date.now().toString(36).toUpperCase()
  return `INV-${year}-${ts}`
}

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const enterpriseScope =
      session!.user.role === 'ADMIN'
        ? {}
        : { enterprise: { centerId: session!.user.centerId ?? '__none__' } }

    const where: any = { ...enterpriseScope }
    if (status !== 'all') where.status = status.toUpperCase()
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { enterprise: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [invoices, totals] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { enterprise: { select: { id: true, name: true } } },
        orderBy: { issuedAt: 'desc' },
        take: 100,
      }),
      prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: true,
      }),
    ])

    return NextResponse.json({
      invoices,
      total: invoices.length,
      sumTotal: totals._sum.totalAmount ?? 0,
    })
  } catch (err) {
    console.error('Error fetching invoices:', err)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = invoiceSchema.parse(body)

    const totalAmount = data.amount + data.taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        number: data.number || generateInvoiceNumber(),
        enterpriseId: data.enterpriseId,
        subscriptionId: data.subscriptionId || null,
        amount: data.amount,
        taxAmount: data.taxAmount,
        totalAmount,
        dueDate: new Date(data.dueDate),
        status: data.status,
      },
      include: { enterprise: { select: { id: true, name: true } } },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      )
    }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Numéro de facture déjà utilisé' }, { status: 409 })
    }
    console.error('Error creating invoice:', err)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
