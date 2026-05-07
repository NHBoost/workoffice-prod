import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'elevated' | 'glass' | 'outline' | 'ghost'

const variants: Record<Variant, string> = {
  default:  'bg-surface border border-border shadow-soft',
  elevated: 'bg-surface border border-border shadow-soft-md',
  glass:    'bg-surface/70 backdrop-blur-xl border border-border/60 shadow-soft',
  outline:  'bg-transparent border border-border',
  ghost:    'bg-transparent',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  /** Active hover effect (subtle elevation) */
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl transition-all duration-200',
        variants[variant],
        interactive && 'hover:shadow-soft-md hover:-translate-y-0.5 hover:border-gold-300/60 dark:hover:border-gold-700/40 cursor-pointer',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold tracking-tight text-text', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-text-muted', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between p-6 pt-4 border-t border-border', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'
