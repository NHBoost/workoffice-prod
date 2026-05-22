import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paidAt: z.coerce.date().optional().nullable(),
  notes: z.string().optional(),
})

/**
 * PATCH /api/clients/[id]/factures/[invoiceId]
 * Marquer Payee / Impayee / annuler. Met a jour paidAt automatiquement.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; invoiceId: string } }
) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      include: { client: { select: { id: true, centerId: true } } },
    })
    if (!invoice || invoice.clientId !== params.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    // Scope par centre pour MANAGER
    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      invoice.client?.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: any = { ...data }
    // Auto paidAt si transition vers PAID
    if (data.status === 'PAID' && !invoice.paidAt) {
      updateData.paidAt = data.paidAt ?? new Date()
    } else if (data.status && data.status !== 'PAID') {
      updateData.paidAt = null
    }

    const updated = await prisma.invoice.update({
      where: { id: params.invoiceId },
      data: updateData,
    })

    await audit('invoice.mark_paid', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Invoice',
      resourceId: invoice.id,
      metadata: {
        clientId: params.id,
        from: invoice.status,
        to: updated.status,
        amount: updated.totalAmount,
      },
      request,
    })

    return NextResponse.json({ ok: true, invoice: updated })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('[api/clients/[id]/factures/[invoiceId] PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/clients/[id]/factures/[invoiceId]
 * Suppression d'une facture (admin only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; invoiceId: string } }
) {
  const { error, session } = await requireRole('ADMIN')
  if (error) return error

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: params.invoiceId } })
    if (!invoice || invoice.clientId !== params.id) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    await prisma.invoice.delete({ where: { id: params.invoiceId } })

    await audit('invoice.delete', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Invoice',
      resourceId: invoice.id,
      metadata: { clientId: params.id, number: invoice.number },
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/clients/[id]/factures/[invoiceId] DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
