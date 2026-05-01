import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, scopeByCenter } from '@/lib/api-auth'

export async function GET() {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    // Filtre par centre si non-admin
    const userScope = scopeByCenter(session!, {}, 'centerId')
    const enterpriseScope = scopeByCenter(session!, {}, 'centerId')
    const roomScope = scopeByCenter(session!, {}, 'centerId')
    const reservationScope =
      session!.user.role === 'ADMIN'
        ? {}
        : { meetingRoom: { centerId: session!.user.centerId ?? '__none__' } }
    const packageScope =
      session!.user.role === 'ADMIN'
        ? {}
        : { enterprise: { centerId: session!.user.centerId ?? '__none__' } }
    const mailScope =
      session!.user.role === 'ADMIN'
        ? {}
        : { enterprise: { centerId: session!.user.centerId ?? '__none__' } }
    const invoiceScope =
      session!.user.role === 'ADMIN'
        ? {}
        : { enterprise: { centerId: session!.user.centerId ?? '__none__' } }

    const [
      usersTotal,
      usersActive,
      enterprisesTotal,
      enterprisesActive,
      enterprisesSuspended,
      packagesTotal,
      mailsTotal,
      reservationsTotal,
      paidInvoices,
    ] = await Promise.all([
      prisma.user.count({ where: userScope }),
      prisma.user.count({ where: { ...userScope, isActive: true } }),
      prisma.enterprise.count({ where: enterpriseScope }),
      prisma.enterprise.count({ where: { ...enterpriseScope, status: 'ACTIVE' } }),
      prisma.enterprise.count({ where: { ...enterpriseScope, status: 'SUSPENDED' } }),
      prisma.package.count({ where: packageScope }),
      prisma.mail.count({ where: mailScope }),
      prisma.reservation.count({ where: reservationScope }),
      prisma.invoice.aggregate({
        where: { ...invoiceScope, status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      users: { total: usersTotal, active: usersActive },
      enterprises: {
        total: enterprisesTotal,
        active: enterprisesActive,
        suspended: enterprisesSuspended,
      },
      packages: { total: packagesTotal },
      mail: { total: mailsTotal },
      reservations: { total: reservationsTotal },
      revenue: { total: paidInvoices._sum.amount ?? 0 },
    })
  } catch (err) {
    console.error('Error fetching dashboard stats:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
