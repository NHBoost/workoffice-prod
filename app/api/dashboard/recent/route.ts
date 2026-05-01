import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, scopeByCenter } from '@/lib/api-auth'

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const enterpriseScope = scopeByCenter(session!, {}, 'centerId')
    const userScope = scopeByCenter(session!, {}, 'centerId')

    const [enterprises, users] = await Promise.all([
      prisma.enterprise.findMany({
        where: enterpriseScope,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          domiciliationDate: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: userScope,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({ enterprises, users })
  } catch (err) {
    console.error('Error fetching recent items:', err)
    return NextResponse.json({ error: 'Failed to fetch recent items' }, { status: 500 })
  }
}
