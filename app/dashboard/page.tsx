'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Euro, Users, Building, Calendar, Package, Mail, AlertTriangle,
  TrendingUp, Activity, Plus, Receipt, MapPin, CalendarDays,
  ArrowRight, Sparkles, ChevronRight, Zap, Crown, Gauge as GaugeIcon,
  Clock, Award, Star, Target, RefreshCw, BarChart3, Wallet,
} from 'lucide-react'
import { Skeleton } from '@/components/ui'

const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full" />,
})
import {
  PageHeader, KpiCard, StatGrid, Card, Badge, StatusBadge, Avatar,
  Spinner, EmptyState, Gauge, LiveIndicator, RoleBadge, LiveClock,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface OverviewData {
  kpis: any
  revenueChart: { month: string; value: number }[]
  centersSummary: any[]
  activity: any[]
  alerts: { overdueInvoices: any[]; packagesPending: number; mailsPending: number }
  cockpit: {
    upcomingReservations: any[]
    topEnterprises: any[]
    globalOccupancy: number
    totalRoomsCount: number
    occupiedTodayCount: number
    subscriptionsBreakdown: { type: string; count: number; revenue: number }[]
    mrr: number
    timestamp: string
  }
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  invoice: Receipt,
  package: Package,
  mail: Mail,
  enterprise: Building,
}

const ACTIVITY_COLORS: Record<string, string> = {
  invoice: 'bg-success-soft text-success',
  package: 'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
  mail: 'bg-info-soft text-info',
  enterprise: 'bg-electric-50 text-electric-600 dark:bg-electric-900/30 dark:text-electric-400',
}

const QUICK_ACTIONS = [
  { label: 'Ajouter une entreprise', short: 'Entreprise', href: '/dashboard/entreprises/nouveau', icon: Building, tone: 'electric' },
  { label: 'Créer une facture', short: 'Facture', href: '/dashboard/facturation/nouveau', icon: Receipt, tone: 'success' },
  { label: 'Enregistrer un colis', short: 'Colis', href: '/dashboard/colis/nouveau', icon: Package, tone: 'gold' },
  { label: 'Réserver une salle', short: 'Réservation', href: '/dashboard/salles-reunion/reservations/ajouter', icon: CalendarDays, tone: 'info' },
] as const

const TONE_CLASSES: Record<string, string> = {
  electric: 'bg-electric-50 text-electric-600 dark:bg-electric-900/30 dark:text-electric-400 group-hover:bg-electric-600 group-hover:text-white',
  success: 'bg-success-soft text-success group-hover:bg-success group-hover:text-white',
  gold: 'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400 group-hover:bg-gold-500 group-hover:text-white',
  info: 'bg-info-soft text-info group-hover:bg-info group-hover:text-white',
}

const formatRelative = (date: string | Date) => {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'à l\'instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const formatTimeOnly = (date: string | Date) =>
  new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const formatDayShort = (date: string | Date) =>
  new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

export default function CockpitDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(() => {
    setLoading(true)
    fetch('/api/dashboard/overview')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchOverview()
    // Refresh auto toutes les 2 min
    const t = setInterval(fetchOverview, 120_000)
    return () => clearInterval(t)
  }, [fetchOverview])

  if (loading && !data) {
    return (
      <div className="p-6">
        <PageHeader title="Vue d'ensemble" description="Chargement de votre tableau de pilotage..." />
        <StatGrid cols={4} gap="md">
          {[...Array(8)].map((_, i) => <KpiCard key={i} label="" value="" loading />)}
        </StatGrid>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <EmptyState
            icon={AlertTriangle}
            title="Impossible de charger le cockpit"
            description={error || 'Réessayer dans un instant'}
          />
        </Card>
      </div>
    )
  }

  const { kpis, revenueChart, centersSummary, activity, alerts, cockpit } = data

  // Totaux dérivés mémoïsés
  const alertsCount = useMemo(
    () =>
      alerts.overdueInvoices.length +
      (alerts.packagesPending > 0 ? 1 : 0) +
      (alerts.mailsPending > 0 ? 1 : 0),
    [alerts.overdueInvoices.length, alerts.packagesPending, alerts.mailsPending]
  )

  const totalActiveSubs = useMemo(
    () => cockpit.subscriptionsBreakdown.reduce((s, b) => s + b.count, 0),
    [cockpit.subscriptionsBreakdown]
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ============ HEADER COCKPIT ============ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold tracking-tighter text-text relative">
              Vue d&apos;ensemble
              <span className="absolute -bottom-1 left-0 h-0.5 w-16 rounded-full bg-gradient-to-r from-gold-400 to-gold-600/0" aria-hidden />
            </h1>
            <LiveIndicator label="Temps réel" tone="success" />
          </div>
          <LiveClock />

        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="btn btn-secondary"
            title="Actualiser maintenant"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Actualiser
          </button>
          <Link href="/dashboard/kpis_personnel" className="btn btn-primary">
            <BarChart3 className="h-4 w-4" />
            Analytics complets
          </Link>
        </div>
      </div>

      {/* ============ ZONE 1 : 4 GRANDS CADRANS HERO ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Cadran 1 : CA + tendance */}
        <Card className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-gold-100 to-transparent rounded-bl-full opacity-50 dark:from-gold-900/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">CA mensuel</p>
              <Euro className="h-4 w-4 text-gold-500" />
            </div>
            <p className="text-3xl font-semibold tracking-tighter text-text nums-tabular">
              {formatCurrency(kpis.revenue.value)}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {kpis.revenue.delta >= 0 ? (
                <Badge tone="success" size="sm">↗ +{kpis.revenue.delta}%</Badge>
              ) : (
                <Badge tone="danger" size="sm">↘ {kpis.revenue.delta}%</Badge>
              )}
              <span className="text-text-subtle">vs mois précédent</span>
            </div>
          </div>
        </Card>

        {/* Cadran 2 : Taux d'occupation avec gauge */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-3">Occupation salles</p>
              <p className="text-sm text-text-muted">Aujourd&apos;hui</p>
              <p className="text-xl font-semibold text-text mt-1 nums-tabular">
                {cockpit.occupiedTodayCount} / {cockpit.totalRoomsCount}
              </p>
              <p className="text-2xs text-text-subtle mt-1">salles utilisées</p>
            </div>
            <Gauge
              value={cockpit.globalOccupancy}
              size={80}
              tone={cockpit.globalOccupancy > 70 ? 'warning' : cockpit.globalOccupancy > 30 ? 'gold' : 'electric'}
            />
          </div>
        </Card>

        {/* Cadran 3 : MRR */}
        <Card className="p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-electric-100 to-transparent rounded-bl-full opacity-50 dark:from-electric-900/20" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-electric-600 dark:text-electric-400">MRR récurrent</p>
              <Wallet className="h-4 w-4 text-electric-600" />
            </div>
            <p className="text-3xl font-semibold tracking-tighter text-text nums-tabular">
              {formatCurrency(cockpit.mrr)}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              <span className="font-medium text-text">{totalActiveSubs}</span>
              {' '}abonnements actifs
            </p>
          </div>
        </Card>

        {/* Cadran 4 : Alertes critiques */}
        <Card className={cn(
          'p-6 relative overflow-hidden',
          alertsCount > 0 && 'ring-1 ring-warning/30'
        )}>
          {alertsCount > 0 && (
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-warning-soft to-transparent rounded-bl-full opacity-60" />
          )}
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-warning">Alertes ouvertes</p>
              <AlertTriangle className={cn('h-4 w-4', alertsCount > 0 ? 'text-warning' : 'text-text-subtle')} />
            </div>
            <p className="text-3xl font-semibold tracking-tighter text-text nums-tabular">
              {alertsCount}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              {kpis.overdueInvoices.value > 0 && <span className="text-danger font-medium">{kpis.overdueInvoices.value} facture(s) en retard</span>}
              {kpis.overdueInvoices.value === 0 && alerts.packagesPending === 0 && alerts.mailsPending === 0 && (
                <span className="text-success">Tout est sous contrôle ✨</span>
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* ============ ZONE 2 : CENTRES (vraies tuiles cockpit) ============ */}
      {centersSummary.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold-600" />
                Performance par centre
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">État opérationnel des sites en temps réel</p>
            </div>
            <Link href="/dashboard/centers" className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1">
              Tous les centres
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {centersSummary.map((c: any) => (
              <Link
                key={c.id}
                href="/dashboard/centers"
                className="group block p-4 rounded-xl border border-border bg-surface hover:border-gold-300/60 hover:shadow-soft-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{c.name}</p>
                    <p className="text-2xs text-text-subtle">{c.city}</p>
                  </div>
                  <Gauge
                    value={c.occupancy}
                    size={56}
                    tone={c.occupancy > 70 ? 'warning' : c.occupancy > 30 ? 'gold' : 'electric'}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-center">
                  <div>
                    <p className="text-md font-semibold text-text nums-tabular">{c.enterprises}</p>
                    <p className="text-2xs text-text-subtle">Ent.</p>
                  </div>
                  <div className="border-x border-border">
                    <p className="text-md font-semibold text-text nums-tabular">{c.rooms}</p>
                    <p className="text-2xs text-text-subtle">Salles</p>
                  </div>
                  <div>
                    <p className="text-md font-semibold text-text nums-tabular">{c.activeSubs}</p>
                    <p className="text-2xs text-text-subtle">Abos</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ============ ZONE 3 : ANALYTICS PRINCIPAUX (2 cols) ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart revenus 12 mois */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gold-600" />
                Évolution des revenus
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">12 derniers mois · Factures payées</p>
            </div>
            <Badge tone="gold" size="sm">
              {kpis.revenue.delta >= 0 ? `+${kpis.revenue.delta}%` : `${kpis.revenue.delta}%`}
            </Badge>
          </div>
          <RevenueChart data={revenueChart} />
        </Card>

        {/* Top entreprises */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
                <Crown className="h-4 w-4 text-gold-500" />
                Top clients
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">CA cumulé</p>
            </div>
          </div>
          {cockpit.topEnterprises.length === 0 ? (
            <EmptyState icon={Building} title="Pas encore de revenus" compact />
          ) : (
            <ul className="space-y-2.5">
              {cockpit.topEnterprises.map((e: any, idx: number) => (
                <li key={e.id} className="flex items-center gap-3">
                  <div className={cn(
                    'h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold',
                    idx === 0 ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-ink-900 shadow-glow-gold' :
                    idx === 1 ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400' :
                    idx === 2 ? 'bg-gold-50 text-gold-600 dark:bg-gold-900/20 dark:text-gold-400' :
                    'bg-surface-2 text-text-muted'
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/entreprises/${e.id}`} className="text-sm font-medium text-text truncate hover:text-gold-600 transition-colors">
                      {e.name}
                    </Link>
                    <p className="text-2xs text-text-subtle">{e.invoiceCount} facture{e.invoiceCount > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-text nums-tabular shrink-0">
                    {formatCurrency(e.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ============ ZONE 4 : OPÉRATIONS (3 cols) ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Réservations à venir */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-electric-600" />
                Prochaines réservations
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">À venir</p>
            </div>
            <Link href="/dashboard/salles-reunion/reservations" className="text-xs text-text-muted hover:text-text">
              Tout voir
            </Link>
          </div>
          {cockpit.upcomingReservations.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Aucune réservation à venir" compact />
          ) : (
            <ul className="space-y-3">
              {cockpit.upcomingReservations.slice(0, 5).map((r: any) => (
                <li key={r.id} className="flex items-start gap-3">
                  <div className="h-12 w-14 shrink-0 rounded-lg bg-electric-50 dark:bg-electric-900/30 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-medium uppercase text-electric-600 dark:text-electric-400 leading-none">
                      {new Date(r.startTime).toLocaleDateString('fr-FR', { month: 'short' })}
                    </span>
                    <span className="text-md font-bold text-electric-700 dark:text-electric-300 nums-tabular leading-tight">
                      {new Date(r.startTime).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{r.title}</p>
                    <p className="text-2xs text-text-subtle">
                      {r.room.name} · {formatTimeOnly(r.startTime)}–{formatTimeOnly(r.endTime)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Alertes critiques */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                À traiter
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">Actions prioritaires</p>
            </div>
          </div>
          <div className="space-y-2">
            {alerts.overdueInvoices.length === 0 && alerts.packagesPending === 0 && alerts.mailsPending === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="h-6 w-6 mx-auto text-success mb-2" />
                <p className="text-xs text-text-muted">Tout est sous contrôle</p>
              </div>
            ) : (
              <>
                {alerts.overdueInvoices.slice(0, 3).map((inv: any) => (
                  <Link key={inv.id} href={`/dashboard/facturation/${inv.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-danger-soft/40 hover:bg-danger-soft transition-colors group">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text truncate">{inv.number}</p>
                      <p className="text-2xs text-text-muted truncate">
                        {inv.enterpriseName} · {inv.daysOverdue}j de retard
                      </p>
                    </div>
                    <span className="text-xs font-bold text-danger nums-tabular shrink-0 ml-2">
                      {formatCurrency(inv.totalAmount)}
                    </span>
                  </Link>
                ))}
                {alerts.packagesPending > 0 && (
                  <Link href="/dashboard/colis"
                    className="flex items-center justify-between p-3 rounded-lg bg-warning-soft/40 hover:bg-warning-soft transition-colors">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-warning" />
                      <p className="text-xs text-text">{alerts.packagesPending} colis à récupérer</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-warning" />
                  </Link>
                )}
                {alerts.mailsPending > 0 && (
                  <Link href="/dashboard/courriers-a-enlever"
                    className="flex items-center justify-between p-3 rounded-lg bg-info-soft/40 hover:bg-info-soft transition-colors">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-info" />
                      <p className="text-xs text-text">{alerts.mailsPending} courrier(s)</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-info" />
                  </Link>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Actions rapides */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold-500" />
                Actions rapides
              </h2>
              <p className="text-2xs text-text-muted mt-0.5">Raccourcis essentiels</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(a => (
              <Link key={a.label} href={a.href}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-gold-300 hover:shadow-soft transition-all">
                <div className={cn(
                  'h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors duration-200',
                  TONE_CLASSES[a.tone]
                )}>
                  <a.icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <span className="text-2xs font-medium text-text text-center">{a.short}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ============ ZONE 5 : ACTIVITÉ TEMPS RÉEL ============ */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
              <Activity className="h-4 w-4 text-gold-600" />
              Flux d&apos;activité
            </h2>
            <p className="text-2xs text-text-muted mt-0.5">Dernières opérations sur la plateforme</p>
          </div>
          <LiveIndicator label="Live" tone="success" />
        </div>
        {activity.length === 0 ? (
          <EmptyState icon={Activity} title="Pas encore d'activité" compact />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {activity.map((a: any) => {
              const Icon = ACTIVITY_ICONS[a.type] || Activity
              return (
                <li key={`${a.type}-${a.id}`} className="border-b border-border/50 last:border-b-0">
                  <Link href={a.href}
                    className="flex items-start gap-3 px-1 py-3 hover:bg-surface-2/40 -mx-1 rounded-lg transition-colors group">
                    <div className={cn('h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center', ACTIVITY_COLORS[a.type])}>
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-text truncate">{a.title}</p>
                        <span className="text-2xs text-text-subtle shrink-0 nums-tabular">{formatRelative(a.date)}</span>
                      </div>
                      <p className="text-xs text-text-muted truncate">{a.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
