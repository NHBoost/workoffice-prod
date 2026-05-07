import Link from 'next/link'
import { MapPin, ChevronRight } from 'lucide-react'
import { Card, Gauge } from '@/components/ui'
import { getCentersData } from '@/lib/dashboard/queries'

export async function CentersPerformance() {
  const centersSummary = await getCentersData()

  if (centersSummary.length === 0) return null

  return (
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
        {centersSummary.map(c => (
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
  )
}

export function CentersPerformanceSkeleton() {
  return <div className="card p-6 h-[200px] animate-pulse bg-surface" />
}
