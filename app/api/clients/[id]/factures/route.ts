import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { uploadPdf, signedUrl as makeSignedUrl } from '@/lib/storage'
import { z } from 'zod'

export const maxDuration = 30

const createInvoiceSchema = z.object({
  number: z.string().trim().min(1, 'Numéro requis').max(50),
  amount: z.coerce.number().nonnegative(),         // HT
  taxAmount: z.coerce.number().nonnegative().optional(),
  totalAmount: z.coerce.number().positive().optional(),
  tvaTaux: z.coerce.number().min(0).max(100).default(21),
  dueDate: z.coerce.date(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).default('PENDING'),
  notes: z.string().optional(),
})

/**
 * GET /api/clients/[id]/factures
 * Liste les factures du client (cote admin).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invoices = await prisma.invoice.findMany({
      where: { clientId: params.id },
      orderBy: { issuedAt: 'desc' },
    })

    const enriched = await Promise.all(
      invoices.map(async i => {
        let url: string | null = null
        if (i.pdfPath) {
          try { url = await makeSignedUrl(i.pdfPath, 3600) } catch {}
        }
        return { ...i, pdfUrl: url }
      })
    )

    return NextResponse.json({ invoices: enriched, total: enriched.length })
  } catch (err) {
    console.error('[api/clients/[id]/factures GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * POST /api/clients/[id]/factures
 * Multipart : pdf (optional) + champs textuels (JSON)
 * Cree une facture attribuee au client.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await checkRateLimit(request, 'create_invoice_client', { max: 30, window: 60_000 })
  if (rl) return rl

  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      select: { id: true, centerId: true, societeDenomination: true },
    })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Detecte multipart vs JSON
    const contentType = request.headers.get('content-type') || ''
    let rawData: any
    let file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      // IMPORTANT : formData.get() renvoie null si absent, mais Zod
      // .optional() n'accepte que undefined. On filtre les null/empty.
      const v = (k: string): any => {
        const raw = formData.get(k)
        if (raw === null) return undefined
        if (typeof raw === 'string' && raw.trim() === '') return undefined
        return raw
      }
      rawData = {
        number: v('number'),
        amount: v('amount'),
        taxAmount: v('taxAmount'),
        totalAmount: v('totalAmount'),
        tvaTaux: v('tvaTaux') ?? 21,
        dueDate: v('dueDate'),
        status: v('status') ?? 'PENDING',
        notes: v('notes'),
      }
      const f = formData.get('pdf')
      if (f instanceof File && f.size > 0) file = f
    } else {
      rawData = await request.json()
    }

    const data = createInvoiceSchema.parse(rawData)

    // Calcule taxAmount + totalAmount si non fournis
    const tvaTaux = data.tvaTaux
    const taxAmount = data.taxAmount ?? (data.amount * tvaTaux / 100)
    const totalAmount = data.totalAmount ?? (data.amount + taxAmount)

    // Verifier unicite du numero
    const existing = await prisma.invoice.findUnique({ where: { number: data.number } })
    if (existing) {
      return NextResponse.json(
        { error: `Une facture existe déjà avec le numéro ${data.number}` },
        { status: 409 }
      )
    }

    const invoice = await prisma.invoice.create({
      data: {
        number: data.number,
        clientId: client.id,
        amount: data.amount,
        taxAmount,
        totalAmount,
        dueDate: data.dueDate,
        status: data.status,
        paidAt: data.status === 'PAID' ? new Date() : null,
      },
    })

    // Upload PDF si fourni
    let pdfPath: string | null = null
    if (file) {
      if (file.type !== 'application/pdf') {
        await prisma.invoice.delete({ where: { id: invoice.id } })
        return NextResponse.json({ error: 'Le fichier doit être un PDF' }, { status: 400 })
      }
      if (file.size > 20 * 1024 * 1024) {
        await prisma.invoice.delete({ where: { id: invoice.id } })
        return NextResponse.json({ error: 'PDF trop volumineux (max 20 Mo)' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      pdfPath = `clients/${client.id}/invoices/${invoice.id}.pdf`
      try {
        await uploadPdf(pdfPath, buffer)
        await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfPath } })
      } catch (uploadErr: any) {
        await prisma.invoice.delete({ where: { id: invoice.id } })
        return NextResponse.json(
          { error: `Upload PDF échoué : ${uploadErr.message ?? 'inconnu'}` },
          { status: 500 }
        )
      }
    }

    await audit('invoice.create', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Invoice',
      resourceId: invoice.id,
      metadata: { clientId: client.id, number: invoice.number, totalAmount, hasPdf: !!pdfPath },
      request,
    })

    return NextResponse.json({ ok: true, invoice: { ...invoice, pdfPath } }, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('[api/clients/[id]/factures POST]', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
