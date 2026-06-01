import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
  centerId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/users/[id] — detail user.
 * ADMIN voit tout, MANAGER voit uniquement les users de son centre.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isActive: true, createdAt: true, updatedAt: true,
        lastLoginAt: true, lastPortalLoginAt: true,
        failedLoginAttempts: true, lockedUntil: true,
        center: { select: { id: true, name: true, city: true } },
        client: { select: { id: true, societeDenomination: true } },
      },
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // Scope MANAGER : ne peut voir que les users de son centre
    if (
      session.user.role !== 'ADMIN' &&
      session.user.centerId &&
      user.center?.id !== session.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(user)
  } catch (err) {
    console.error('[api/users/[id] GET]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * PATCH /api/users/[id] — modification.
 * Garde-fous critiques :
 *   - Un utilisateur ne peut pas changer son propre role (anti-lockout)
 *   - Un utilisateur ne peut pas se desactiver lui-meme
 *   - MANAGER ne peut pas creer/modifier d'ADMIN (uniquement ADMIN peut)
 *   - MANAGER ne peut modifier que les users de son centre
 *   - On ne peut pas supprimer le dernier ADMIN actif (verifié au DELETE)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, email: true, role: true, centerId: true, isActive: true,
      },
    })
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // Scope MANAGER
    if (
      session.user.role !== 'ADMIN' &&
      session.user.centerId &&
      target.centerId !== session.user.centerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // === Garde-fous anti-lockout ===
    const isSelf = session.user.id === target.id

    if (isSelf && data.role && data.role !== target.role) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas changer votre propre rôle.' },
        { status: 400 }
      )
    }
    if (isSelf && data.isActive === false) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas désactiver votre propre compte.' },
        { status: 400 }
      )
    }

    // MANAGER ne peut pas promouvoir/rétrograder un ADMIN
    if (session.user.role !== 'ADMIN' && (data.role === 'ADMIN' || target.role === 'ADMIN')) {
      return NextResponse.json(
        { error: 'Seul un ADMIN peut modifier un autre ADMIN.' },
        { status: 403 }
      )
    }

    // Si on retrograde le dernier ADMIN actif → bloque
    if (target.role === 'ADMIN' && data.role && data.role !== 'ADMIN') {
      const remainingAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true, id: { not: target.id } },
      })
      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: 'Impossible : c\'est le dernier ADMIN actif. Crée un autre admin d\'abord.' },
          { status: 400 }
        )
      }
    }
    if (target.role === 'ADMIN' && data.isActive === false) {
      const remainingAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true, id: { not: target.id } },
      })
      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: 'Impossible : c\'est le dernier ADMIN actif.' },
          { status: 400 }
        )
      }
    }

    // Unicité email si change
    if (data.email && data.email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } })
      if (existing) {
        return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
    })

    await audit('user.update', {
      actor: { id: session.user.id, email: session.user.email, role: session.user.role },
      resourceType: 'User',
      resourceId: target.id,
      metadata: {
        changedFields: Object.keys(data),
        roleChange: data.role && data.role !== target.role
          ? `${target.role} → ${data.role}` : undefined,
        statusChange: data.isActive !== undefined && data.isActive !== target.isActive
          ? `${target.isActive ? 'actif' : 'inactif'} → ${data.isActive ? 'actif' : 'inactif'}` : undefined,
      },
      request,
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('[api/users/[id] PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/**
 * DELETE /api/users/[id] — suppression définitive.
 * Réservé ADMIN. Garde-fous :
 *   - On ne peut pas se supprimer soi-même
 *   - On ne peut pas supprimer le dernier ADMIN actif
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, role: true, name: true },
    })
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    if (session.user.id === target.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
        { status: 400 }
      )
    }

    if (target.role === 'ADMIN') {
      const remainingAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true, id: { not: target.id } },
      })
      if (remainingAdmins === 0) {
        return NextResponse.json(
          { error: 'Impossible : c\'est le dernier ADMIN actif.' },
          { status: 400 }
        )
      }
    }

    await prisma.user.delete({ where: { id: params.id } })

    await audit('user.delete', {
      actor: { id: session.user.id, email: session.user.email, role: session.user.role },
      resourceType: 'User',
      resourceId: target.id,
      metadata: { deletedEmail: target.email, deletedName: target.name, deletedRole: target.role },
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/users/[id] DELETE]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
