import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

/**
 * Retourne les infos de l'utilisateur connecté + son centre rattaché.
 * Endpoint accessible à tous les rôles (lecture de ses propres infos).
 */
export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        center: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (err) {
    console.error('Error fetching me:', err)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
