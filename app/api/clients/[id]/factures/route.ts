import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { signedUrl as makeSignedUrl, checkClientUpload, deletePdf } from '@/lib/storage'
import { sendEmail, newInvoiceEmail } from '@/lib/email'
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
      select: { id: true, centerId: true, societeDenomination: true, prenom: true, emailPerso: true },
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
    // PDF deja uploade en direct sur Supabase (/api/uploads/sign)
    let pdfPath: string | null = null
    let notifyClient = true // default ON

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
      const p = v('pdfPath')
      if (typeof p === 'string') pdfPath = p
      const notifyRaw = formData.get('notifyClient')
      notifyClient = notifyRaw !== 'false' && notifyRaw !== '0'
    } else {
      rawData = await request.json()
      if (rawData?.notifyClient === false) notifyClient = false
      if (typeof rawData?.pdfPath === 'string' && rawData.pdfPath) pdfPath = rawData.pdfPath
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

    if (pdfPath) {
      const uploadError = await checkClientUpload(pdfPath, client.id, 'invoices')
      if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 })
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
        pdfPath,
      },
    }).catch(async e => {
      // Evite un fichier orphelin si la creation echoue
      if (pdfPath) await deletePdf(pdfPath).catch(() => {})
      throw e
    })

    // === Email au client ===
    let emailSent = false
    let emailError: string | null = null
    if (notifyClient) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const tpl = newInvoiceEmail({
          prenom: client.prenom,
          number: invoice.number,
          totalAmount,
          dueDate: data.dueDate,
          portalUrl: `${baseUrl}/portail/facturation`,
          hasPdf: !!pdfPath,
        })
        const result = await sendEmail({
          to: client.emailPerso,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        emailSent = result.ok && result.id !== 'dev-mode'
        emailError = result.error ?? null
      } catch (e: any) {
        emailError = e?.message ?? 'send failed'
      }
    }

    await audit('invoice.create', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Invoice',
      resourceId: invoice.id,
      metadata: { clientId: client.id, number: invoice.number, totalAmount, hasPdf: !!pdfPath, notifyClient, emailSent },
      request,
    })

    return NextResponse.json({
      ok: true,
      invoice: { ...invoice, pdfPath },
      emailSent,
      emailError,
      notified: notifyClient,
    }, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('[api/clients/[id]/factures POST]', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
