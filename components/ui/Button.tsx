'use client'

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'accent' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-ink-700 text-white hover:bg-ink-800 active:bg-ink-900 shadow-soft hover:shadow-soft-md dark:bg-white dark:text-ink-900 dark:hover:bg-white/90',
  accent:
    'bg-electric-600 text-white hover:bg-electric-700 active:bg-electric-800 shadow-soft hover:shadow-soft-md',
  gold:
    'bg-gold-500 text-ink-900 hover:bg-gold-600 hover:text-white active:bg-gold-700 shadow-soft hover:shadow-glow-gold',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface-2 hover:border-border-strong',
  outline:
    'bg-transparent text-text border border-border hover:bg-surface-2',
  ghost:
    'bg-transparent text-text-muted hover:text-text hover:bg-surface-2',
  danger:
    'bg-danger text-white hover:bg-red-700 active:bg-red-800 shadow-soft',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-md gap-2 rounded-lg',
  icon: 'h-9 w-9 p-0 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Icone affichée à gauche du label */
  iconLeft?: ReactNode
  /** Icone affichée à droite du label */
  iconRight?: ReactNode
  /** Pleine largeur */
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-medium tap-none',
          'transition-all duration-200 ease-smooth',
          'focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'select-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'animate-spin')} />
        ) : iconLeft ? (
          <span className="shrink-0">{iconLeft}</span>
        ) : null}
        {size !== 'icon' && children}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    )
  }
)
Button.displayName = 'Button'
