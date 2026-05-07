import { prisma } from '@/lib/prisma'

/* ============================================================
   Helpers de date
   ============================================================ */

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

function getRanges() {
  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = endOfDay(now)
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = startOfMonth(now)
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  return { now, today, tomorrow, monthAgo, thisMonth, yearAgo }
}

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

/* ============================================================
   1) HERO — KPIs critiques (au-dessus de la ligne de flottaison)
   Chargé en priorité, doit etre le plus rapide possible.
   ============================================================ */

export async function getHeroData() {
  const { today, tomorrow, monthAgo, thisMonth } = getRanges()

  const [
    totalRevenueAgg,
    lastMonthRevenueAgg,
    prevMonthRevenueAgg,
    activeEnterprises,
    overdueInvoices,
    packagesPending,
    mailsPending,
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
    prisma.invoice.aggregate({
      where: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: today } },
      _sum: { totalAmount: true },
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

  const occupiedTodayCount = Number(occupiedTodayRaw[0]?.count ?? 0)
  const globalOccupancy = totalRoomsCount === 0 ? 0 : Math.round((occupiedTodayCount / totalRoomsCount) * 100)

  const subscriptionsBreakdown = subsByType.map(s => ({
    type: s.type,
    count: s._count,
    revenue: s._sum.monthlyAmount ?? 0,
  }))
  const mrr = subscriptionsBreakdown
    .filter(s => s.type === 'MONTHLY')
    .reduce((acc, s) => acc + Number(s.revenue), 0)
  const totalActiveSubs = subscriptionsBreakdown.reduce((s, b) => s + b.count, 0)

  const alertsCount =
    overdueInvoices._count + (packagesPending > 0 ? 1 : 0) + (mailsPending > 0 ? 1 : 0)

  return {
    revenue: { value: lastMonthRevenue, delta: revenueDelta, total: totalRevenue },
    activeEnterprises,
    overdueInvoices: {
      value: overdueInvoices._count,
      amount: overdueInvoices._sum.totalAmount ?? 0,
    },
    packagesPending,
    mailsPending,
    occupancy: {
      total: totalRoomsCount,
      occupied: occupiedTodayCount,
      percent: globalOccupancy,
    },
    mrr,
    totalActiveSubs,
    alertsCount,
  }
}

/* ============================================================
   2) CENTRES — performance par centre
   ============================================================ */

export async function getCentersData() {
  const { today, tomorrow, thisMonth } = getRanges()

  const [centers, reservationsByCenter, subsByCenter, occupiedByCenter] = await Promise.all([
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
  ])

  const resMapByCenter = Object.fromEntries(reservationsByCenter.map(r => [r.centerId, Number(r.count)]))
  const subsMapByCenter = Object.fromEntries(subsByCenter.map(r => [r.centerId, Number(r.count)]))
  const occMapByCenter = Object.fromEntries(occupiedByCenter.map(r => [r.centerId, Number(r.count)]))

  return centers.map(c => {
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
}

/* ============================================================
   3) ANALYTICS — chart revenus + top clients
   ============================================================ */

export async function getAnalyticsData() {
  const { now, yearAgo } = getRanges()

  type Row = { ym: string; v: number }
  const [revRows, topEnterprisesRaw] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT to_char(date_trunc('month', "paidAt"), 'YYYY-MM') AS ym,
             COALESCE(SUM("totalAmount"), 0)::float AS v
      FROM invoices
      WHERE "status" = 'PAID' AND "paidAt" >= ${yearAgo}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ enterpriseId: string; total: number; count: number }[]>`
      SELECT "enterpriseId", COALESCE(SUM("totalAmount"),0)::float AS total, COUNT(*)::int AS count
      FROM invoices
      WHERE "status" = 'PAID'
      GROUP BY "enterpriseId"
      ORDER BY total DESC
      LIMIT 5
    `,
  ])

  const revMap: Record<string, number> = {}
  revRows.forEach(r => { revMap[r.ym] = Number(r.v) })
  const trendRevenue = buildTrend(revMap)
  const revenueChart = trendRevenue.map((r, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return { month: d.toLocaleDateString('fr-FR', { month: 'short' }), value: Math.round(r.value) }
  })

  // Délai pour récupérer les noms des top entreprises
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

  return { revenueChart, topEnterprises, revenueDelta: 0 }
}

/* ============================================================
   4) OPERATIONS — réservations à venir + alertes + activité
   ============================================================ */

export async function getOperationsData() {
  const { today } = getRanges()

  const [
    upcomingReservations,
    overdueInvoicesList,
    packagesPending,
    mailsPending,
    recentInvoices,
    recentPackages,
    recentMails,
    recentEnterprises,
  ] = await Promise.all([
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
    prisma.invoice.findMany({
      where: { status: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: today } },
      take: 3,
      orderBy: { dueDate: 'asc' },
      include: { enterprise: { select: { name: true } } },
    }),
    prisma.package.count({ where: { status: 'RECEIVED' } }),
    prisma.mail.count({ where: { status: 'RECEIVED' } }),
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
  ])

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

  return {
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
    overdueInvoicesList: overdueInvoicesList.map(i => ({
      id: i.id,
      number: i.number,
      enterpriseName: i.enterprise.name,
      totalAmount: i.totalAmount,
      dueDate: i.dueDate,
      daysOverdue: Math.floor((today.getTime() - new Date(i.dueDate).getTime()) / 86400000),
    })),
    packagesPending,
    mailsPending,
    activity,
  }
}
