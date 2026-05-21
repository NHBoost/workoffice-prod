import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api-rate-limit'
import { parseSearchParams } from '@/lib/query-params'
import { audit } from '@/lib/audit'
import { encrypt } from '@/lib/crypto'
import { createClientSchema, FORMULES } from '@/lib/client-schemas'
import { z } from 'zod'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(''),
  centerId: z.string().trim().optional(),
  compteStatut: z.enum(['NON_CREE', 'CREE', 'CONNECTE']).optional(),
  contratStatut: z.enum(['NON_GENERE', 'ENVOYE', 'SIGNE']).optional(),
  formule: z.enum(FORMULES).optional(),
})

/**
 * GET /api/clients — liste paginée + filtres
 * Acces : ADMIN + MANAGER
 */
export async function GET(request: NextRequest) {
  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  const parsed = parseSearchParams(request, listQuerySchema)
  if (parsed instanceof NextResponse) return parsed
  const { page, limit, search, centerId, compteStatut, contratStatut, formule } = parsed

  const skip = (page - 1) * limit
  const where: any = {}

  // Scope par centre pour les MANAGER (admin voit tout)
  if (session!.user.role !== 'ADMIN' && session!.user.centerId) {
    where.centerId = session!.user.centerId
  } else if (centerId) {
    where.centerId = centerId
  }

  if (compteStatut) where.compteStatut = compteStatut
  if (contratStatut) where.contratStatut = contratStatut
  if (formule) where.formule = formule

  if (search) {
    where.OR = [
      { societeDenomination: { contains: search, mode: 'insensitive' } },
      { nom: { contains: search, mode: 'insensitive' } },
      { prenom: { contains: search, mode: 'insensitive' } },
      { emailPerso: { contains: search, mode: 'insensitive' } },
      { emailSociete: { contains: search, mode: 'insensitive' } },
      { bce: { contains: search } },
    ]
  }

  try {
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          societeDenomination: true,
          formeJuridique: true,
          bce: true,
          emailPerso: true,
          nom: true,
          prenom: true,
          fonction: true,
          formule: true,
          dateDebut: true,
          montantHt: true,
          compteStatut: true,
          contratStatut: true,
          createdAt: true,
          center: { select: { id: true, name: true, city: true } },
          user: { select: { id: true, lastPortalLoginAt: true } },
          _count: { select: { contrats: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      clients,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('[api/clients GET]', err)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

/**
 * POST /api/clients — encodage d'un nouveau client
 * Acces : ADMIN + MANAGER
 * Sections A + B + C dans un seul body (cf. CDC)
 */
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(request, 'create_client', { max: 20, window: 60_000 })
  if (rl) return rl

  const { error, session } = await requireRole('ADMIN', 'MANAGER')
  if (error) return error

  try {
    const body = await request.json()
    const data = createClientSchema.parse(body)

    // Verifier que le centre existe
    const center = await prisma.center.findUnique({ where: { id: data.centerId } })
    if (!center) {
      return NextResponse.json({ error: 'Centre introuvable' }, { status: 400 })
    }

    // Empecher les doublons sur emailPerso et BCE
    const existing = await prisma.client.findFirst({
      where: { OR: [{ emailPerso: data.emailPerso }, { bce: data.bce }] },
      select: { id: true, emailPerso: true, bce: true },
    })
    if (existing) {
      const field = existing.emailPerso === data.emailPerso ? 'email' : 'BCE'
      return NextResponse.json(
        { error: `Un client existe déjà avec ce ${field}` },
        { status: 409 }
      )
    }

    const client = await prisma.client.create({
      data: {
        // Section A
        societeDenomination: data.societeDenomination,
        formeJuridique: data.formeJuridique,
        bce: data.bce,
        numeroTva: data.numeroTva,
        adresseSiege: data.adresseSiege,
        emailSociete: data.emailSociete,
        telephoneSociete: data.telephoneSociete,
        secteurActivite: data.secteurActivite,
        dateConstitution: data.dateConstitution,
        // Section B
        nom: data.nom,
        prenom: data.prenom,
        fonction: data.fonction,
        adressePersonnelle: data.adressePersonnelle,
        dateNaissance: data.dateNaissance,
        lieuNaissance: data.lieuNaissance,
        nationalite: data.nationalite,
        // === CHIFFRES (AES-256-GCM) ===
        numeroCiEnc: encrypt(data.numeroCi),
        registreNationalEnc: encrypt(data.registreNational),
        ciDebutValidite: data.ciDebutValidite,
        ciFinValidite: data.ciFinValidite,
        emailPerso: data.emailPerso,
        telephonePerso: data.telephonePerso,
        // Section C
        centerId: data.centerId,
        formule: data.formule,
        dateDebut: data.dateDebut,
        dureeMois: data.dureeMois,
        montantHt: data.montantHt,
        tvaTaux: data.tvaTaux,
      },
      select: {
        id: true,
        societeDenomination: true,
        nom: true,
        prenom: true,
        emailPerso: true,
        formule: true,
        compteStatut: true,
        contratStatut: true,
        createdAt: true,
      },
    })

    await audit('user.create', {
      actor: {
        id: session!.user.id,
        email: session!.user.email,
        role: session!.user.role,
      },
      resourceType: 'Client',
      resourceId: client.id,
      metadata: {
        societe: client.societeDenomination,
        email: client.emailPerso,
        formule: data.formule,
        centerId: data.centerId,
      },
      request,
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      )
    }
    console.error('[api/clients POST]', err)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
