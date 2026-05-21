import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { audit } from '@/lib/audit'
import { decrypt, maskSensitive, encrypt } from '@/lib/crypto'
import { updateClientSchema } from '@/lib/client-schemas'
import { z } from 'zod'

/**
 * GET /api/clients/[id]
 * Retourne le client avec tous les champs sauf les chiffres bruts.
 * Les donnees CI/registre national sont MASQUEES par defaut.
 * Pour avoir les valeurs claires, passer ?reveal=1 (uniquement ADMIN, audit).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  const url = new URL(request.url)
  const reveal = url.searchParams.get('reveal') === '1'
  if (reveal && session!.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden (admin only)' }, { status: 403 })
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        center: { select: { id: true, name: true, city: true, address: true } },
        user: { select: { id: true, email: true, lastPortalLoginAt: true } },
        contrats: {
          orderBy: { sentAt: 'desc' },
          select: {
            id: true,
            type: true,
            pdfPath: true,
            pdfPathSigne: true,
            status: true,
            sentAt: true,
            signedAt: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    // Scope par centre pour MANAGER
    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      client.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Decryptage controle
    let numeroCi = ''
    let registreNational = ''
    try {
      const clair = decrypt(client.numeroCiEnc)
      const clairRN = decrypt(client.registreNationalEnc)
      numeroCi = reveal ? clair : maskSensitive(clair, { keepEnd: 4 })
      registreNational = reveal ? clairRN : maskSensitive(clairRN, { keepEnd: 4 })
    } catch (e) {
      console.error('[api/clients/[id]] decrypt failed', e)
    }

    if (reveal) {
      // Audit explicite lors d'un acces aux donnees sensibles en clair
      await audit('user.update', {
        actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
        resourceType: 'Client',
        resourceId: client.id,
        metadata: { action: 'reveal_sensitive_data' },
        request,
      })
    }

    // On omet les champs *Enc et on injecte les valeurs masquees/claires
    const { numeroCiEnc, registreNationalEnc, ...rest } = client
    return NextResponse.json({ ...rest, numeroCi, registreNational })
  } catch (err) {
    console.error('[api/clients/[id] GET]', err)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

/**
 * PATCH /api/clients/[id] — edition partielle
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = updateClientSchema.parse(body)

    const before = await prisma.client.findUnique({ where: { id: params.id } })
    if (!before) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }
    if (
      session!.user.role !== 'ADMIN' &&
      session!.user.centerId &&
      before.centerId !== session!.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = { ...data }
    // Re-chiffre si les champs sensibles sont modifies
    if (data.numeroCi !== undefined) {
      updateData.numeroCiEnc = encrypt(data.numeroCi)
      delete updateData.numeroCi
    }
    if (data.registreNational !== undefined) {
      updateData.registreNationalEnc = encrypt(data.registreNational)
      delete updateData.registreNational
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data: updateData,
    })

    await audit('user.update', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Client',
      resourceId: client.id,
      metadata: { updatedFields: Object.keys(data) },
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      )
    }
    console.error('[api/clients/[id] PATCH]', err)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

/**
 * DELETE /api/clients/[id] — uniquement ADMIN.
 * Cascade : supprime les contrats associes (FK Cascade).
 * Le User lie n'est PAS supprime (mais le lien est rompu via SetNull).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole('ADMIN')
  if (error) return error

  try {
    const client = await prisma.client.findUnique({ where: { id: params.id } })
    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    await prisma.client.delete({ where: { id: params.id } })

    await audit('user.delete', {
      actor: { id: session!.user.id, email: session!.user.email, role: session!.user.role },
      resourceType: 'Client',
      resourceId: client.id,
      metadata: {
        societe: client.societeDenomination,
        email: client.emailPerso,
      },
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/clients/[id] DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
