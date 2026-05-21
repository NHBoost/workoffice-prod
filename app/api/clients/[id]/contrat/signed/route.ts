import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { audit } from '@/lib/audit'
import { uploadPdf } from '@/lib/storage'

export const maxDuration = 30

/**
 * POST /api/clients/[id]/contrat/signed
 * Multipart form: file=<pdf signe>
 *
 * Upload du contrat signe par le client. Marque le dernier contrat
 * en statut 'ENVOYE' comme 'SIGNE'. Mise a jour de client.contratStatut.
 *
 * Si un contractId specifique est fourni en query (?contractId=xxx), il est
 * utilise ; sinon on prend le contrat le plus recent en statut 'ENVOYE'.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await checkRateLimit(request, 'upload_signed_contract', { max: 10, window: 60_000 })
  if (rl) return rl

  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const url = new URL(request.url)
    const targetContractId = url.searchParams.get('contractId')

    // Recupere le fichier depuis le multipart
    const formData = await request.formData()
    const file = formData.get('pdf')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier PDF manquant' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Le fichier doit être un PDF' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF trop volumineux (max 20 Mo)' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { contrats: { orderBy: { sentAt: 'desc' } } },
    })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Trouve le contrat cible
    const target = targetContractId
      ? client.contrats.find(c => c.id === targetContractId)
      : client.contrats.find(c => c.status === 'ENVOYE')

    if (!target) {
      return NextResponse.json(
        { error: 'Aucun contrat en attente de signature pour ce client' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfPathSigne = `clients/${client.id}/${target.id}-signed.pdf`

    await uploadPdf(pdfPathSigne, buffer)

    await prisma.$transaction([
      prisma.contratClient.update({
        where: { id: target.id },
        data: { pdfPathSigne, status: 'SIGNE', signedAt: new Date() },
      }),
      prisma.client.update({
        where: { id: client.id },
        data: { contratStatut: 'SIGNE' },
      }),
    ])

    await audit('user.update', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'ContratClient',
      resourceId: target.id,
      metadata: {
        action: 'upload_signed',
        clientId: client.id,
        pdfSize: buffer.length,
      },
      request,
    })

    return NextResponse.json({ ok: true, contractId: target.id })
  } catch (err: any) {
    console.error('[api/clients/[id]/contrat/signed]', err)
    return NextResponse.json(
      { error: err.message || 'Failed to upload signed contract' },
      { status: 500 }
    )
  }
}
