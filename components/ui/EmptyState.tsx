import { ReactNode } from 'react'
import { LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Style compact (utile dans les cards / drawers) */
  compact?: boolean
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-10 px-6' : 'py-16 px-6',
        className
      )}
    >
      {/* Iconographie subtile, ring concentriques */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-electric-500/5 blur-xl" />
        <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-surface-2 ring-1 ring-border">
          <Icon className="h-7 w-7 text-text-muted" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-md font-semibold text-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
