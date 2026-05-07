import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfDay(d: Date) {
  const x = startOfDay(d)
  x.setDate(x.getDate() + 1)
  return x
}

/**
 * Construit un trend [{value}] sur 12 mois à partir d'un mapping {YYYY-MM: number}.
 */
function buildTrend(map: Record<string, number>) {
  const now = new Date()
  const out: { value: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({ value: map[key] ?? 0 })
  }
  return out
}

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const now = new Date()
    const today = startOfDay(now)
    const tomorrow = endOfDay(now)
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonth = startOfMonth(now)
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    // ============ MEGA BATCH PARALLELE — toutes les queries independantes en 1 seul aller-retour ============
    type Row = { ym: string; v: number }
    const [
      // Aggregations principales
      totalRevenueAgg,
      lastMonthRevenueAgg,
      prevMonthRevenueAgg,
      activeEnterprises,
      lastMonthEnterprises,
      prevMonthEnterprises,
      reservationsToday,
      packagesPending,
      mailsPending,
      overdueInvoices,
      overdueLastMonth,
      activeUsers,
      newUsersThisMonth,
      // Trends 12 mois
      revRows,
      entRows,
      resRows,
      pkgRows,
      // Centres + agregations par centre
      centers,
      reservationsByCenter,
      subsByCenter,
      occupiedByCenter,
      // Activite recente
      recentInvoices,
      recentPackages,
      recentMails,
      recentEnterprises,
      // Alertes
      overdueInvoicesList,
      // Cockpit additionnel
      upcomingReservations,
      topEnterprisesRaw,
      totalRoomsCount,
      occupiedTodayRaw,
      subsByType,
    ] = await Promise.all([
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: thisMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: monthAgo, lt: thisMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.enterprise.count({ where: { status: 'ACTIVE' } }),
      prisma.enterprise.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.enterprise.count({ where: { createdAt: { gte: monthAgo, lt: thisMonth } } }),
      prisma.reservation.count({
        where: { startTime: { gte: today, lt: tomorrow }, status: { in: ['CONFIRMED', 'PENDING'] } },
      }),
      prisma.package.count({ where: { status: 'RECEIVED' } }),
      prisma.mail.count({ where: { status: 'RECEIVED' } }),
      prisma.invoice.aggregate({
        where: {
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: today },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: monthAgo },
        },
        _count: true,
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      // Trends
      prisma.$queryRaw<Row[]>`
        SELECT to_char(date_trunc('month', "paidAt"), 'YYYY-MM') AS ym,
               COALESCE(SUM("totalAmount"), 0)::float AS v
        FROM invoices
        WHERE "status" = 'PAID' AND "paidAt" >= ${yearAgo}
        GROUP BY 1
      `,
      prisma.$queryRaw<Row[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym,
               COUNT(*)::int AS v
        FROM enterprises
        WHERE "createdAt" >= ${yearAgo}
        GROUP BY 1
      `,
      prisma.$queryRaw<Row[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym,
               COUNT(*)::int AS v
        FROM reservations
        WHERE "createdAt" >= ${yearAgo}
        GROUP BY 1
      `,
      prisma.$queryRaw<Row[]>`
        SELECT to_char(date_trunc('month', "receivedAt"), 'YYYY-MM') AS ym,
               COUNT(*)::int AS v
        FROM packages
        WHERE "receivedAt" >= ${yearAgo}
        GROUP BY 1
      `,
      // Centres
      prisma.center.findMany({
        include: {
          _count: { select: { enterprises: true, meetingRooms: true, users: true } },
        },
      }),
      prisma.$queryRaw<{ centerId: string; count: number }[]>`
        SELECT mr."centerId", COUNT(r.id)::int AS count
        FROM reservations r
        JOIN meeting_rooms mr ON mr.id = r."meetingRoomId"
        WHERE r."startTime" >= ${thisMonth}
        GROUP BY mr."centerId"
      `,
      prisma.$queryRaw<{ centerId: string; count: number }[]>`
        SELECT e."centerId", COUNT(s.id)::int AS count
        FROM subscriptions s
        JOIN enterprises e ON e.id = s."enterpriseId"
        WHERE s."isActive" = true
        GROUP BY e."centerId"
      `,
      prisma.$queryRaw<{ centerId: string; count: number }[]>`
        SELECT mr."centerId", COUNT(r.id)::int AS count
        FROM reservations r
        JOIN meeting_rooms mr ON mr.id = r."meetingRoomId"
        WHERE r."startTime" >= ${today} AND r."startTime" < ${tomorrow}
          AND r."status" IN ('CONFIRMED', 'PENDING')
        GROUP BY mr."centerId"
      `,
      // Activite recente
      prisma.invoice.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { enterprise: { select: { name: true } } },
      }),
      prisma.package.findMany({ take: 3, orderBy: { receivedAt: 'desc' } }),
      prisma.mail.findMany({ take: 3, orderBy: { receivedAt: 'desc' } }),
      prisma.enterprise.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, status: true },
      }),
      // Alertes
      prisma.invoice.findMany({
        where: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: today } },
        take: 3,
        orderBy: { dueDate: 'asc' },
        include: { enterprise: { select: { name: true } } },
      }),
      // Cockpit
      prisma.reservation.findMany({
        where: {
          startTime: { gte: new Date() },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        take: 5,
        orderBy: { startTime: 'asc' },
        include: {
          meetingRoom: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.$queryRaw<{ enterpriseId: string; total: number; count: number }[]>`
        SELECT "enterpriseId", COALESCE(SUM("totalAmount"),0)::float AS total, COUNT(*)::int AS count
        FROM invoices
        WHERE "status" = 'PAID'
        GROUP BY "enterpriseId"
        ORDER BY total DESC
        LIMIT 5
      `,
      prisma.meetingRoom.count({ where: { isActive: true } }),
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "meetingRoomId")::int AS count
        FROM reservations
        WHERE "startTime" >= ${today} AND "startTime" < ${tomorrow}
          AND "status" IN ('CONFIRMED', 'PENDING')
      `,
      prisma.subscription.groupBy({
        by: ['type'],
        where: { isActive: true },
        _count: true,
        _sum: { monthlyAmount: true },
      }),
    ])

    const totalRevenue = totalRevenueAgg._sum.totalAmount ?? 0
    const lastMonthRevenue = lastMonthRevenueAgg._sum.totalAmount ?? 0
    const prevMonthRevenue = prevMonthRevenueAgg._sum.totalAmount ?? 0
    const revenueDelta =
      prevMonthRevenue === 0
        ? lastMonthRevenue > 0 ? 100 : 0
        : Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)

    const enterpriseDelta =
      prevMonthEnterprises === 0
        ? lastMonthEnterprises > 0 ? 100 : 0
        : Math.round(((lastMonthEnterprises - prevMonthEnterprises) / prevMonthEnterprises) * 100)

    const revMap: Record<string, number> = {}
    revRows.forEach(r => { revMap[r.ym] = Number(r.v) })
    const entMap: Record<string, number> = {}
    entRows.forEach(r => { entMap[r.ym] = Number(r.v) })
    const resMap: Record<string, number> = {}
    resRows.forEach(r => { resMap[r.ym] = Number(r.v) })
    const pkgMap: Record<string, number> = {}
    pkgRows.forEach(r => { pkgMap[r.ym] = Number(r.v) })

    const trendRevenue = buildTrend(revMap)
    const trendEnterprises = buildTrend(entMap)
    const trendReservations = buildTrend(resMap)
    const trendPackages = buildTrend(pkgMap)

    // Revenue chart en parallele : reuse trendRevenue + format month names
    const revenueChart = trendRevenue.map((r, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      return {
        month: d.toLocaleDateString('fr-FR', { month: 'short' }),
        value: Math.round(r.value),
      }
    })

    // ============ Centres summary (consolidation des aggregations parallelisees) ============
    const resMapByCenter = Object.fromEntries(reservationsByCenter.map(r => [r.centerId, Number(r.count)]))
    const subsMapByCenter = Object.fromEntries(subsByCenter.map(r => [r.centerId, Number(r.count)]))
    const occMapByCenter = Object.fromEntries(occupiedByCenter.map(r => [r.centerId, Number(r.count)]))

    const centersSummary = centers.map(c => {
      const totalRooms = c._count.meetingRooms
      const occupied = occMapByCenter[c.id] ?? 0
      const occupancy = totalRooms === 0 ? 0 : Math.round((occupied / totalRooms) * 100)
      return {
        id: c.id,
        name: c.name,
        city: c.city,
        enterprises: c._count.enterprises,
        rooms: totalRooms,
        users: c._count.users,
        reservations: resMapByCenter[c.id] ?? 0,
        activeSubs: subsMapByCenter[c.id] ?? 0,
        occupancy,
      }
    })

    // ============ Activité récente (consolidation) ============
    const activity = [
      ...recentInvoices.map(i => ({
        type: 'invoice' as const,
        id: i.id,
        title: `Facture ${i.number}`,
        description: `${i.totalAmount.toFixed(2)} € — ${i.enterprise.name}`,
        date: i.createdAt,
        href: `/dashboard/facturation/${i.id}`,
        status: i.status,
      })),
      ...recentPackages.map(p => ({
        type: 'package' as const,
        id: p.id,
        title: `Colis pour ${p.recipient}`,
        description: p.sender ? `De ${p.sender}` : 'Réception colis',
        date: p.receivedAt,
        href: '/dashboard/colis',
        status: p.status,
      })),
      ...recentMails.map(m => ({
        type: 'mail' as const,
        id: m.id,
        title: `Courrier pour ${m.recipient}`,
        description: m.sender ? `De ${m.sender}` : 'Réception courrier',
        date: m.receivedAt,
        href: '/dashboard/courriers',
        status: m.status,
      })),
      ...recentEnterprises.map(e => ({
        type: 'enterprise' as const,
        id: e.id,
        title: `Domiciliation ${e.name}`,
        description: 'Nouvelle entreprise',
        date: e.createdAt,
        href: `/dashboard/entreprises/${e.id}`,
        status: e.status,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)

    // ============ Top entreprises : 2e phase (depend de topEnterprisesRaw) ============
    const topEntIds = topEnterprisesRaw.map(t => t.enterpriseId)
    const topEntsData = topEntIds.length > 0
      ? await prisma.enterprise.findMany({
          where: { id: { in: topEntIds } },
          select: { id: true, name: true, status: true },
        })
      : []
    const topEnterprises = topEnterprisesRaw.map(t => {
      const e = topEntsData.find(x => x.id === t.enterpriseId)
      return {
        id: t.enterpriseId,
        name: e?.name ?? '—',
        status: e?.status ?? 'ACTIVE',
        revenue: Number(t.total),
        invoiceCount: Number(t.count),
      }
    })

    // 3) Taux d'occupation global (consolidation)
    const occupiedTodayCount = Number(occupiedTodayRaw[0]?.count ?? 0)
    const globalOccupancy = totalRoomsCount === 0 ? 0 : Math.round((occupiedTodayCount / totalRoomsCount) * 100)

    // 4) Répartition abonnements par type (consolidation)
    const subscriptionsBreakdown = subsByType.map(s => ({
      type: s.type,
      count: s._count,
      revenue: s._sum.monthlyAmount ?? 0,
    }))

    // 5) MRR (Monthly Recurring Revenue)
    const mrr = subscriptionsBreakdown
      .filter(s => s.type === 'MONTHLY')
      .reduce((acc, s) => acc + Number(s.revenue), 0)

    return NextResponse.json({
      kpis: {
        revenue: { value: lastMonthRevenue, delta: revenueDelta, trend: trendRevenue },
        revenueTotal: { value: totalRevenue },
        activeEnterprises: {
          value: activeEnterprises,
          delta: enterpriseDelta,
          trend: trendEnterprises,
        },
        reservationsToday: { value: reservationsToday, trend: trendReservations },
        packagesPending: { value: packagesPending, trend: trendPackages },
        mailsPending: { value: mailsPending },
        overdueInvoices: {
          value: overdueInvoices._count,
          amount: overdueInvoices._sum.totalAmount ?? 0,
          delta:
            overdueLastMonth._count === 0
              ? 0
              : Math.round(((overdueInvoices._count - overdueLastMonth._count) / overdueLastMonth._count) * 100),
        },
        activeUsers: { value: activeUsers, newThisMonth: newUsersThisMonth },
      },
      revenueChart,
      centersSummary,
      activity,
      alerts: {
        overdueInvoices: overdueInvoicesList.map(i => ({
          id: i.id,
          number: i.number,
          enterpriseName: i.enterprise.name,
          totalAmount: i.totalAmount,
          dueDate: i.dueDate,
          daysOverdue: Math.floor((today.getTime() - new Date(i.dueDate).getTime()) / 86400000),
        })),
        packagesPending,
        mailsPending,
      },
      cockpit: {
        upcomingReservations: upcomingReservations.map(r => ({
          id: r.id,
          title: r.title,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          totalAmount: r.totalAmount,
          room: r.meetingRoom,
          user: r.user,
        })),
        topEnterprises,
        globalOccupancy,
        totalRoomsCount,
        occupiedTodayCount,
        subscriptionsBreakdown,
        mrr,
        timestamp: new Date().toISOString(),
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    console.error('Error fetching overview:', err)
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }
}
