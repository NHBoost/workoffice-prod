import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortailClient } from '@/lib/portail-auth'
import { signedUrl as makeSignedUrl } from '@/lib/storage'

/**
 * GET /api/portail/courriers
 * Liste les courriers attribues au client connecte.
 * Multi-tenant : WHERE clientId = client.id uniquement.
 */
export async function GET() {
  const { error, client } = await requirePortailClient()
  if (error) return error

  try {
    const mails = await prisma.mail.findMany({
      where: { clientId: client!.id },
      orderBy: [{ receivedAt: 'desc' }],
      select: {
        id: true,
        sender: true,
        type: true,
        status: true,
        receivedAt: true,
        readAt: true,
        notes: true,
        pdfPath: true,
      },
    })

    // Genere URLs signees pour les PDFs (1h validite)
    const enriched = await Promise.all(
      mails.map(async m => {
        let url: string | null = null
        if (m.pdfPath) {
          try {
            url = await makeSignedUrl(m.pdfPath, 3600)
          } catch {}
        }
        return { ...m, pdfUrl: url }
      })
    )

    const unreadCount = enriched.filter(m => !m.readAt).length

    return NextResponse.json(
      { mails: enriched, total: enriched.length, unreadCount },
      { headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=60' } }
    )
  } catch (err) {
    console.error('[api/portail/courriers GET]', err)
    return NextResponse.json({ error: 'Failed to fetch mails' }, { status: 500 })
  }
}
