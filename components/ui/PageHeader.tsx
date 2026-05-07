import { ReactNode } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Crumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  /** Breadcrumbs (premier élément = parent le plus haut) */
  breadcrumbs?: Crumb[]
  /** Actions à droite (boutons) */
  actions?: ReactNode
  /** Onglets éventuels sous le header */
  tabs?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4 flex items-center text-xs text-text-muted">
          <Link
            href="/dashboard"
            className="hover:text-text transition-colors flex items-center"
            aria-label="Accueil"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-text-subtle" />
              {c.href ? (
                <Link
                  href={c.href}
                  className="hover:text-text transition-colors"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-text">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="relative inline-block text-2xl sm:text-3xl font-semibold tracking-tighter text-text">
            {title}
            {/* Underline gold subtile pour le titre (touche premium) */}
            <span
              className="absolute -bottom-1 left-0 h-0.5 w-12 rounded-full bg-gradient-to-r from-gold-400 to-gold-600/0"
              aria-hidden
            />
          </h1>
          {description && (
            <p className="mt-3 text-sm text-text-muted max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {tabs && (
        <div className="mt-6 border-b border-border flex items-center gap-1 overflow-x-auto">
          {tabs}
        </div>
      )}
    </div>
  )
}
