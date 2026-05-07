import { cn } from '@/lib/utils'

interface LiveIndicatorProps {
  label?: string
  tone?: 'success' | 'warning' | 'danger' | 'gold'
  className?: string
}

const TONE_BG: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  gold: 'bg-gold-500',
}

const TONE_TEXT: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  gold: 'text-gold-600 dark:text-gold-400',
}

/**
 * Petit indicateur "live" avec dot pulsant et label.
 *
 * Usage cockpit pour signaler un état temps réel :
 *   <LiveIndicator label="En direct" tone="success" />
 *   <LiveIndicator label="Synchronisé il y a 12s" tone="gold" />
 */
export function LiveIndicator({
  label = 'En direct',
  tone = 'success',
  className,
}: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-2xs font-medium tracking-wide',
        TONE_TEXT[tone],
        className
      )}
    >
      <span className="relative inline-flex h-2 w-2">
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', TONE_BG[tone])} />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', TONE_BG[tone])} />
      </span>
      {label}
    </span>
  )
}
