import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

export type Role = 'ADMIN' | 'MANAGER' | 'USER'

export interface AuthenticatedSession {
  user: {
    id: string
    email: string
    role: Role
    centerId?: string
    name?: string | null
  }
}

/**
 * Vérifie qu'une session existe. Retourne la session ou un NextResponse 401.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    }
  }
  return { error: null, session: session as unknown as AuthenticatedSession }
}

/**
 * Vérifie qu'une session existe ET que le rôle est dans la liste autorisée.
 */
export async function requireRole(...allowedRoles: Role[]) {
  const { error, session } = await requireAuth()
  if (error) return { error, session: null }
  if (!allowedRoles.includes(session!.user.role)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: null,
    }
  }
  return { error: null, session: session! }
}

/**
 * Filtre un `where` Prisma pour ne renvoyer que les enregistrements
 * du centre de l'utilisateur (sauf admin).
 */
export function scopeByCenter(
  session: AuthenticatedSession,
  where: Record<string, any> = {},
  centerField = 'centerId'
) {
  if (session.user.role === 'ADMIN') return where
  if (!session.user.centerId) return { ...where, [centerField]: '__none__' } // bloque tout
  return { ...where, [centerField]: session.user.centerId }
}
