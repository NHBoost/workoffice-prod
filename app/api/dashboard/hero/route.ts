import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/dashboard/hero — endpoint OPTIMISÉ pour rendu instantané.
 *
 * Ne renvoie que les 4 KPIs hero (CA, Occupation, MRR, Alertes).
 * Cible : < 100ms TTFB. 5 queries en parallèle, données fraîches.
 *
 * Le dashboard fetch cet endpoint en priorité pour afficher la zone
 * "au-dessus de la ligne de flottaison" avant le reste.
 */
export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [
      lastMonthRevenueAgg,
      prevMonthRevenueAgg,
      overdueInvoices,
      packagesPending,
      mailsPending,
      totalRoomsCount,
      occupiedTodayRaw,
      mrrSubs,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: thisMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: prevMonth, lt: thisMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: today } },
        _count: true,
      }),
      prisma.package.count({ where: { status: 'RECEIVED' } }),
      prisma.mail.count({ where: { status: 'RECEIVED' } }),
      prisma.meetingRoom.count({ where: { isActive: true } }),
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "meetingRoomId")::int AS count
        FROM reservations
        WHERE "startTime" >= ${today} AND "startTime" < ${tomorrow}
          AND "status" IN ('CONFIRMED', 'PENDING')
      `,
      prisma.subscription.aggregate({
        where: { isActive: true, type: 'MONTHLY' },
        _sum: { monthlyAmount: true },
        _count: true,
      }),
    ])

    const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount ?? 0
    const prevMonthRevenue = prevMonthRevenueAgg._sum.totalAmount ?? 0
    const revenueDelta =
      prevMonthRevenue === 0
        ? lastMonthRevenue > 0 ? 100 : 0
        : Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)

    const occupiedTodayCount = Number(occupiedTodayRaw[0]?.count ?? 0)
    const globalOccupancy = totalRoomsCount === 0 ? 0 : Math.round((occupiedTodayCount / totalRoomsCount) * 100)

    const alertsCount = overdueInvoices._count + (packagesPending > 0 ? 1 : 0) + (mailsPending > 0 ? 1 : 0)

    return NextResponse.json(
      {
        revenue: { value: lastMonthRevenue, delta: revenueDelta },
        occupancy: {
          total: totalRoomsCount,
          occupied: occupiedTodayCount,
          percent: globalOccupancy,
        },
        mrr: mrrSubs._sum.monthlyAmount ?? 0,
        totalActiveSubs: mrrSubs._count,
        alerts: {
          count: alertsCount,
          overdueInvoices: overdueInvoices._count,
          packagesPending,
          mailsPending,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          // Cache agressif : 15s de fraîcheur, 60s en stale-while-revalidate
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    )
  } catch (err) {
    console.error('[api/dashboard/hero]', err)
    return NextResponse.json({ error: 'Failed to fetch hero KPIs' }, { status: 500 })
  }
}
