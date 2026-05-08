import Link from 'next/link'
import { TrendingUp, Crown, Building } from 'lucide-react'
import { Card, Badge, EmptyState } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { getAnalyticsData } from '@/lib/dashboard/queries'
import RevenueChart from '@/components/charts/RevenueChart'

export async function RevenueAndTop() {
  const { revenueChart, topEnterprises } = await getAnalyticsData()

  // Calcul du delta sur les 2 derniers mois du chart
  const lastVal = revenueChart[revenueChart.length - 1]?.value ?? 0
  const prevVal = revenueChart[revenueChart.length - 2]?.value ?? 0
  const delta = prevVal === 0 ? (lastVal > 0 ? 100 : 0) : Math.round(((lastVal - prevVal) / prevVal) * 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-md font-semibold tracking-tight text-text flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold-600" />
              Évolution des revenus
            </h2>
            <p className="text-2xs text-text-muted mt-0.5">12 derniers mois · Factures payées</p>
          </div>
          <Badge tone="gold" size="sm">{delta >= 0 ? `+${delta}%` : `${delta}%`}</Badge>
        </div>
        <RevenueChart data={revenueChart} />
      </Card>

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
        {topEnterprises.length === 0 ? (
          <EmptyState icon={Building} title="Pas encore de revenus" compact />
        ) : (
          <ul className="space-y-2.5">
            {topEnterprises.map((e, idx) => (
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
  )
}

export function RevenueAndTopSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="card p-6 lg:col-span-2 h-[340px] animate-pulse bg-surface" />
      <div className="card p-6 h-[340px] animate-pulse bg-surface" />
    </div>
  )
}
