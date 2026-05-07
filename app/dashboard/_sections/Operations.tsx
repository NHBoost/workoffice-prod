import Link from 'next/link'
import {
  CalendarDays, AlertTriangle, Sparkles, Package, Mail, ArrowRight,
  Zap, Activity, ChevronRight, Building, Receipt,
} from 'lucide-react'
import { Card, EmptyState, StatusBadge, LiveIndicator } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { getOperationsData } from '@/lib/dashboard/queries'
import type { LucideIcon } from 'lucide-react'

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

export async function Operations() {
  const ops = await getOperationsData()

  return (
    <>
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
          {ops.upcomingReservations.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Aucune réservation à venir" compact />
          ) : (
            <ul className="space-y-3">
              {ops.upcomingReservations.slice(0, 5).map(r => (
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

        {/* Alertes */}
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
            {ops.overdueInvoicesList.length === 0 && ops.packagesPending === 0 && ops.mailsPending === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="h-6 w-6 mx-auto text-success mb-2" />
                <p className="text-xs text-text-muted">Tout est sous contrôle</p>
              </div>
            ) : (
              <>
                {ops.overdueInvoicesList.slice(0, 3).map(inv => (
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
                {ops.packagesPending > 0 && (
                  <Link href="/dashboard/colis"
                    className="flex items-center justify-between p-3 rounded-lg bg-warning-soft/40 hover:bg-warning-soft transition-colors">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-warning" />
                      <p className="text-xs text-text">{ops.packagesPending} colis à récupérer</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-warning" />
                  </Link>
                )}
                {ops.mailsPending > 0 && (
                  <Link href="/dashboard/courriers-a-enlever"
                    className="flex items-center justify-between p-3 rounded-lg bg-info-soft/40 hover:bg-info-soft transition-colors">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-info" />
                      <p className="text-xs text-text">{ops.mailsPending} courrier(s)</p>
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

      {/* Flux activité */}
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
        {ops.activity.length === 0 ? (
          <EmptyState icon={Activity} title="Pas encore d'activité" compact />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {ops.activity.map(a => {
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
    </>
  )
}

export function OperationsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 h-[280px] animate-pulse bg-surface" />
        ))}
      </div>
      <div className="card p-6 h-[300px] animate-pulse bg-surface" />
    </>
  )
}
