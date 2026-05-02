'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  /** Largeur du drawer (par défaut 'md' = 480px) */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Footer (boutons d'action) */
  footer?: ReactNode
  /** Fermer en cliquant sur le backdrop */
  closeOnBackdrop?: boolean
  children: ReactNode
}

const sizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  children,
}: DrawerProps) {
  // Fermer sur Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock scroll
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
        onClick={() => closeOnBackdrop && onClose()}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 right-0 bottom-0 w-full bg-surface',
          'flex flex-col shadow-soft-xl',
          'transform transition-transform duration-300 ease-smooth',
          'translate-x-0',
          sizes[size]
        )}
        style={{ animation: 'slideIn 300ms ease-out' }}
      >
        <style jsx>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
          <div className="min-w-0">
            {title && (
              <h2 className="text-md font-semibold tracking-tight text-text">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-surface-2/40 flex items-center gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
