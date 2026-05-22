import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortailClient } from '@/lib/portail-auth'

/**
 * PATCH /api/portail/courriers/[id]
 * Marque un courrier comme lu (du cote client).
 * Multi-tenant : impossible de modifier le courrier d'un autre client.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, client } = await requirePortailClient()
  if (error) return error

  try {
    const mail = await prisma.mail.findUnique({
      where: { id: params.id },
      select: { id: true, clientId: true, readAt: true },
    })
    if (!mail || mail.clientId !== client!.id) {
      // 404 plutot que 403 pour ne pas leak l'existence
      return NextResponse.json({ error: 'Courrier introuvable' }, { status: 404 })
    }

    if (mail.readAt) {
      // Idempotent : deja lu, on ne fait rien
      return NextResponse.json({ ok: true, readAt: mail.readAt })
    }

    const updated = await prisma.mail.update({
      where: { id: params.id },
      data: { readAt: new Date() },
      select: { readAt: true },
    })

    return NextResponse.json({ ok: true, readAt: updated.readAt })
  } catch (err) {
    console.error('[api/portail/courriers/[id] PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
