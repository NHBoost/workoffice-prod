'use client'

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'electric' | 'primary'

const TONE_BG: Record<Tone, string> = {
  neutral:  'bg-surface-2 text-text-muted',
  success:  'bg-success-soft text-success',
  warning:  'bg-warning-soft text-warning',
  danger:   'bg-danger-soft text-danger',
  info:     'bg-info-soft text-info',
  gold:     'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
  electric: 'bg-electric-50 text-electric-600 dark:bg-electric-900/30 dark:text-electric-400',
  primary:  'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
}

const SPARK_COLOR: Record<Tone, string> = {
  neutral:  '#71717A',
  success:  '#10B981',
  warning:  '#F59E0B',
  danger:   '#EF4444',
  info:     '#3B82F6',
  gold:     '#C9A227',
  electric: '#3B82F6',
  primary:  '#C9A227',
}

interface KpiCardProps {
  /** Libellé court de la métrique */
  label: string
  /** Valeur principale (number ou string formatée) */
  value: ReactNode
  /** Sous-label discret (ex: "vs mois précédent", "ce mois") */
  sublabel?: string
  /** Icône Lucide à afficher en haut à droite */
  icon?: LucideIcon
  /** Couleur de l'icône (et du sparkline si présent) */
  tone?: Tone
  /** Variation en %. Positif → success, négatif → danger, 0 → flat */
  delta?: number
  /** Sens préféré : si "negative", un delta < 0 sera affiché en vert (ex: factures en retard) */
  deltaIntent?: 'positive' | 'negative' | 'neutral'
  /** Données pour la mini sparkline (max 12 points conseillés) */
  trend?: { value: number; label?: string }[]
  /** Loading state */
  loading?: boolean
  /** Action click sur la card entière */
  onClick?: () => void
  /** Classe additionnelle */
  className?: string
}

export function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = 'neutral',
  delta,
  deltaIntent = 'positive',
  trend,
  loading = false,
  onClick,
  className,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-40" />
      </div>
    )
  }

  // Détermine la couleur du delta selon l'intent
  let deltaTone: 'kpi-up' | 'kpi-down' | 'kpi-flat' = 'kpi-flat'
  let DeltaIcon = Minus
  if (delta !== undefined) {
    if (delta === 0) {
      deltaTone = 'kpi-flat'
      DeltaIcon = Minus
    } else if (deltaIntent === 'negative') {
      // Inversé : delta négatif = bon
      deltaTone = delta < 0 ? 'kpi-up' : 'kpi-down'
      DeltaIcon = delta < 0 ? TrendingDown : TrendingUp
    } else {
      deltaTone = delta > 0 ? 'kpi-up' : 'kpi-down'
      DeltaIcon = delta > 0 ? TrendingUp : TrendingDown
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden card p-5',
        'transition-all duration-300 ease-smooth',
        onClick && 'cursor-pointer hover:shadow-soft-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Subtil gradient overlay au hover */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:to-electric-500/[0.03] transition-all duration-500 pointer-events-none"
        aria-hidden
      />

      {/* Header : label + icon */}
      <div className="relative flex items-start justify-between mb-2.5">
        <p className="text-xs font-medium text-text-muted tracking-tight">{label}</p>
        {Icon && (
          <div
            className={cn(
              'h-9 w-9 rounded-lg inline-flex items-center justify-center',
              TONE_BG[tone],
              'transition-transform duration-300 group-hover:scale-110'
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative flex items-baseline gap-2">
        <p className="text-3xl font-semibold tracking-tighter text-text nums-tabular">
          {value}
        </p>
      </div>

      {/* Footer : delta + sublabel */}
      {(delta !== undefined || sublabel) && (
        <div className="relative mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', deltaTone)}>
              <DeltaIcon className="h-3 w-3" strokeWidth={2.5} />
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1).replace(/\.0$/, '')}%
            </span>
          )}
          {sublabel && <span className="text-text-subtle">{sublabel}</span>}
        </div>
      )}

      {/* Mini sparkline en bas (si fournie) */}
      {trend && trend.length > 1 && (
        <div className="relative mt-4 -mx-5 -mb-5 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SPARK_COLOR[tone]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={SPARK_COLOR[tone]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: SPARK_COLOR[tone], strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'rgb(var(--surface))',
                  border: '1px solid rgb(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                  padding: '4px 8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                labelFormatter={() => ''}
                formatter={(v: any) => [v, '']}
                separator=""
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={SPARK_COLOR[tone]}
                strokeWidth={1.5}
                fill={`url(#spark-${tone})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   StatGrid — wrapper grid responsive pour aligner des KpiCards
   ============================================================ */

interface StatGridProps {
  /** Nombre max de colonnes (sur écrans larges) */
  cols?: 2 | 3 | 4 | 5 | 6
  /** Espacement entre les cards */
  gap?: 'sm' | 'md' | 'lg'
  className?: string
  children: ReactNode
}

const colsMap: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
}

const gapMap = { sm: 'gap-3', md: 'gap-4', lg: 'gap-5' }

export function StatGrid({ cols = 4, gap = 'md', className, children }: StatGridProps) {
  return (
    <div className={cn('grid', colsMap[cols], gapMap[gap], className)}>
      {children}
    </div>
  )
}
