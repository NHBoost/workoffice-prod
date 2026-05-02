'use client'

import { ReactNode, useEffect } from 'react'
import { X, AlertTriangle, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: ReactNode
  closeOnBackdrop?: boolean
  hideCloseButton?: boolean
  children: ReactNode
}

const sizes: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  closeOnBackdrop = true,
  hideCloseButton = false,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = original }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        className={cn(
          'relative w-full bg-surface rounded-2xl shadow-soft-xl border border-border overflow-hidden animate-scale-in',
          sizes[size]
        )}
      >
        {(title || description || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
            <div className="min-w-0">
              {title && <h2 className="text-md font-semibold tracking-tight text-text">{title}</h2>}
              {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border bg-surface-2/40 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   ConfirmDialog — wrapper Modal pour confirmations courantes
   ============================================================ */

type ConfirmTone = 'danger' | 'warning' | 'success' | 'info'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  loading?: boolean
}

const TONE_CONFIG: Record<ConfirmTone, { icon: any; bg: string; text: string; variant: 'danger' | 'primary' | 'accent' | 'gold' }> = {
  danger:  { icon: Trash2,        bg: 'bg-danger-soft',  text: 'text-danger',  variant: 'danger'  },
  warning: { icon: AlertTriangle, bg: 'bg-warning-soft', text: 'text-warning', variant: 'gold'    },
  success: { icon: CheckCircle2,  bg: 'bg-success-soft', text: 'text-success', variant: 'primary' },
  info:    { icon: AlertTriangle, bg: 'bg-info-soft',    text: 'text-info',    variant: 'accent'  },
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const config = TONE_CONFIG[tone]
  const Icon = config.icon

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideCloseButton
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={config.variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={cn('h-10 w-10 shrink-0 rounded-full inline-flex items-center justify-center', config.bg)}>
          <Icon className={cn('h-5 w-5', config.text)} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {description && (
            <p className="text-sm text-text-muted mt-1">{description}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
