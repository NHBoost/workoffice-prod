'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, BarChart3 } from 'lucide-react'
import { LiveClock, LiveIndicator } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Header client : titre + LiveClock isolé + refresh button.
 *
 * Le refresh appelle `router.refresh()` qui re-render les Server Components
 * → chaque Suspense boundary stream à nouveau (pas de full reload).
 */
export function DashboardHeader() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [autoRefreshTick, setAutoRefreshTick] = useState(0)

  // Auto-refresh toutes les 2 min via router.refresh
  useEffect(() => {
    const t = setInterval(() => {
      startTransition(() => router.refresh())
      setAutoRefreshTick(x => x + 1)
    }, 120_000)
    return () => clearInterval(t)
  }, [router])

  const handleRefresh = () => {
    startTransition(() => router.refresh())
  }

  return (
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
          onClick={handleRefresh}
          disabled={isPending}
          className="btn btn-secondary"
          title="Actualiser maintenant"
        >
          <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          Actualiser
        </button>
        <Link href="/dashboard/kpis_personnel" className="btn btn-primary">
          <BarChart3 className="h-4 w-4" />
          Analytics complets
        </Link>
      </div>
    </div>
  )
}
