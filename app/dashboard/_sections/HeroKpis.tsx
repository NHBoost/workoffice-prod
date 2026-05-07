import { Euro, AlertTriangle, Wallet } from 'lucide-react'
import { Card, Badge, Gauge } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { getHeroData } from '@/lib/dashboard/queries'

export async function HeroKpis() {
  const hero = await getHeroData()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Cadran 1 : CA */}
      <Card className="p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-gold-100 to-transparent rounded-bl-full opacity-50 dark:from-gold-900/20" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">CA mensuel</p>
            <Euro className="h-4 w-4 text-gold-500" />
          </div>
          <p className="text-3xl font-semibold tracking-tighter text-text nums-tabular">
            {formatCurrency(hero.revenue.value)}
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {hero.revenue.delta >= 0 ? (
              <Badge tone="success" size="sm">↗ +{hero.revenue.delta}%</Badge>
            ) : (
              <Badge tone="danger" size="sm">↘ {hero.revenue.delta}%</Badge>
            )}
            <span className="text-text-subtle">vs mois précédent</span>
          </div>
        </div>
      </Card>

      {/* Cadran 2 : Occupation */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-3">Occupation salles</p>
            <p className="text-sm text-text-muted">Aujourd&apos;hui</p>
            <p className="text-xl font-semibold text-text mt-1 nums-tabular">
              {hero.occupancy.occupied} / {hero.occupancy.total}
            </p>
            <p className="text-2xs text-text-subtle mt-1">salles utilisées</p>
          </div>
          <Gauge
            value={hero.occupancy.percent}
            size={80}
            tone={hero.occupancy.percent > 70 ? 'warning' : hero.occupancy.percent > 30 ? 'gold' : 'electric'}
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
            {formatCurrency(hero.mrr)}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            <span className="font-medium text-text">{hero.totalActiveSubs}</span>
            {' '}abonnements actifs
          </p>
        </div>
      </Card>

      {/* Cadran 4 : Alertes */}
      <Card className={cn(
        'p-6 relative overflow-hidden',
        hero.alertsCount > 0 && 'ring-1 ring-warning/30'
      )}>
        {hero.alertsCount > 0 && (
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-warning-soft to-transparent rounded-bl-full opacity-60" />
        )}
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-2xs font-semibold uppercase tracking-wider text-warning">Alertes ouvertes</p>
            <AlertTriangle className={cn('h-4 w-4', hero.alertsCount > 0 ? 'text-warning' : 'text-text-subtle')} />
          </div>
          <p className="text-3xl font-semibold tracking-tighter text-text nums-tabular">
            {hero.alertsCount}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {hero.overdueInvoices.value > 0 && <span className="text-danger font-medium">{hero.overdueInvoices.value} facture(s) en retard</span>}
            {hero.overdueInvoices.value === 0 && hero.packagesPending === 0 && hero.mailsPending === 0 && (
              <span className="text-success">Tout est sous contrôle ✨</span>
            )}
          </p>
        </div>
      </Card>
    </div>
  )
}

export function HeroKpisSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-6 h-[140px] animate-pulse bg-surface" />
      ))}
    </div>
  )
}
