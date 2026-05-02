'use client'

import { forwardRef, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/* ============================================================
   Field — wrapper avec label, hint, error
   ============================================================ */

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-text-muted tracking-tight">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-2xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-2xs text-text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

/* ============================================================
   Input
   ============================================================ */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  iconLeft?: ReactNode
  iconRight?: ReactNode
  invalid?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const inputSizes = {
  sm: 'h-8 text-xs',
  md: 'h-10 text-sm',
  lg: 'h-11 text-md',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, iconLeft, iconRight, invalid, size = 'md', ...props }, ref) => {
    if (iconLeft || iconRight) {
      return (
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-3.5 bg-surface text-text placeholder:text-text-subtle',
              'border border-border rounded-lg transition-all duration-200',
              'focus:border-electric-500 focus:ring-4 focus:ring-electric-500/10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              inputSizes[size],
              iconLeft && 'pl-10',
              iconRight && 'pr-10',
              invalid && 'border-danger focus:border-danger focus:ring-danger/10',
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle">
              {iconRight}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3.5 bg-surface text-text placeholder:text-text-subtle',
          'border border-border rounded-lg transition-all duration-200',
          'focus:border-electric-500 focus:ring-4 focus:ring-electric-500/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          inputSizes[size],
          invalid && 'border-danger focus:border-danger focus:ring-danger/10',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

/* ============================================================
   Textarea
   ============================================================ */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3.5 py-2.5 text-sm bg-surface text-text placeholder:text-text-subtle',
        'border border-border rounded-lg transition-all duration-200',
        'focus:border-electric-500 focus:ring-4 focus:ring-electric-500/10',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'resize-y min-h-[80px]',
        invalid && 'border-danger focus:border-danger focus:ring-danger/10',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

/* ============================================================
   Select natif (premium)
   ============================================================ */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full h-10 pl-3.5 pr-10 text-sm bg-surface text-text appearance-none',
          'border border-border rounded-lg transition-all duration-200',
          'focus:border-electric-500 focus:ring-4 focus:ring-electric-500/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'cursor-pointer',
          invalid && 'border-danger focus:border-danger focus:ring-danger/10',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none h-4 w-4"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
)
Select.displayName = 'Select'

/* ============================================================
   Checkbox & Toggle
   ============================================================ */

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-border text-ink-700 focus:ring-electric-500 focus:ring-offset-0',
        'cursor-pointer',
        className
      )}
      {...props}
    />
  )
)
Checkbox.displayName = 'Checkbox'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, disabled, size = 'md' }: ToggleProps) {
  const sz = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9'
  const dot = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  return (
    <label className={cn('inline-flex items-center gap-2', !disabled && 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200',
          'focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:opacity-50',
          sz,
          checked ? 'bg-ink-700 dark:bg-electric-500' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 bg-white rounded-full shadow-soft transition-transform duration-200',
            dot,
            checked && (size === 'sm' ? 'translate-x-3' : 'translate-x-4')
          )}
        />
      </button>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  )
}
