import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import { requireAuth } from './api-auth'

/**
 * Helper d'auth specifique au portail client.
 * Verifie que :
 *  - l'utilisateur est authentifie
 *  - son role est USER
 *  - il est lie a un Client (via Client.userId)
 *
 * Renvoie :
 *  - { error: NextResponse } si une condition echoue
 *  - { client, user } si tout est OK
 *
 * Multi-tenant : le portail ne renvoie JAMAIS les donnees d'un autre client.
 * Cette fonction est la source de verite : tout endpoint /api/portail/* doit
 * l'utiliser et scoper ses queries sur le clientId retourne.
 */
export async function requirePortailClient() {
  const { error, session } = await requireAuth()
  if (error) return { error, client: null, user: null }

  if (session!.user.role !== 'USER') {
    return {
      error: NextResponse.json(
        { error: 'Cette API est réservée aux clients du portail' },
        { status: 403 }
      ),
      client: null,
      user: null,
    }
  }

  const client = await prisma.client.findUnique({
    where: { userId: session!.user.id },
    select: { id: true, centerId: true, societeDenomination: true, nom: true, prenom: true },
  })

  if (!client) {
    return {
      error: NextResponse.json(
        { error: 'Aucun client lié à ce compte. Contactez votre interlocuteur Prestigia.' },
        { status: 404 }
      ),
      client: null,
      user: null,
    }
  }

  return { error: null, client, user: session!.user }
}
