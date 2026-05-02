import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Libellé d'accessibilité (sr-only) */
  label?: string
}

const sizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
}

export function Spinner({ size = 'md', className, label = 'Chargement...' }: SpinnerProps) {
  return (
    <>
      <Loader2
        className={cn('animate-spin text-text-muted', sizes[size], className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </>
  )
}

/** Variante centrée plein écran */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3">
      <Spinner size="lg" className="text-electric-600" />
      {label && <p className="text-sm text-text-muted">{label}</p>}
    </div>
  )
}
