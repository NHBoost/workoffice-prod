import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortailClient } from '@/lib/portail-auth'
import { signedUrl as makeSignedUrl } from '@/lib/storage'

/**
 * GET /api/portail/factures
 * Liste les factures du client connecte. Multi-tenant strict.
 * Retourne aussi un agregat des montants dus et payes pour le header.
 */
export async function GET() {
  const { error, client } = await requirePortailClient()
  if (error) return error

  try {
    const invoices = await prisma.invoice.findMany({
      where: { clientId: client!.id },
      orderBy: [{ issuedAt: 'desc' }],
      select: {
        id: true,
        number: true,
        amount: true,
        taxAmount: true,
        totalAmount: true,
        status: true,
        issuedAt: true,
        dueDate: true,
        paidAt: true,
        pdfPath: true,
      },
    })

    // URLs signees des PDFs (1h)
    const enriched = await Promise.all(
      invoices.map(async i => {
        let url: string | null = null
        if (i.pdfPath) {
          try {
            url = await makeSignedUrl(i.pdfPath, 3600)
          } catch {}
        }
        return { ...i, pdfUrl: url }
      })
    )

    // Agregats : montant impaye total, en retard
    const now = new Date()
    const unpaidTotal = enriched
      .filter(i => i.status !== 'PAID')
      .reduce((sum, i) => sum + Number(i.totalAmount), 0)
    const overdueCount = enriched
      .filter(i => i.status !== 'PAID' && new Date(i.dueDate) < now)
      .length

    return NextResponse.json(
      {
        invoices: enriched,
        total: enriched.length,
        unpaidTotal,
        overdueCount,
      },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('[api/portail/factures GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
