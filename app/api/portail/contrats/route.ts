import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortailClient } from '@/lib/portail-auth'
import { signedUrl as makeSignedUrl } from '@/lib/storage'

/**
 * GET /api/portail/contrats
 * Liste les contrats du client connecte (lecture seule + signed URLs).
 */
export async function GET() {
  const { error, client } = await requirePortailClient()
  if (error) return error

  try {
    const contracts = await prisma.contratClient.findMany({
      where: { clientId: client!.id },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        sentAt: true,
        signedAt: true,
        pdfPath: true,
        pdfPathSigne: true,
      },
    })

    const enriched = await Promise.all(
      contracts.map(async c => {
        let url: string | null = null
        let urlSigne: string | null = null
        try {
          if (c.pdfPath) url = await makeSignedUrl(c.pdfPath, 3600)
          if (c.pdfPathSigne) urlSigne = await makeSignedUrl(c.pdfPathSigne, 3600)
        } catch {}
        return {
          id: c.id,
          type: c.type,
          status: c.status,
          sentAt: c.sentAt,
          signedAt: c.signedAt,
          url,
          urlSigne,
        }
      })
    )

    return NextResponse.json(
      { contracts: enriched, total: enriched.length },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } }
    )
  } catch (err) {
    console.error('[api/portail/contrats GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
