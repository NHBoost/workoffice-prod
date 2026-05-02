import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Crown, Shield, User as UserIcon,
} from 'lucide-react'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'ink'
type Size = 'sm' | 'md'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-muted ring-border',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger:  'bg-danger-soft text-danger ring-danger/20',
  info:    'bg-info-soft text-info ring-info/20',
  gold:    'bg-gold-50 text-gold-700 ring-gold-200 dark:bg-gold-900/30 dark:text-gold-400 dark:ring-gold-700/30',
  ink:     'bg-ink-700 text-white ring-ink-700',
}

const sizes: Record<Size, string> = {
  sm: 'text-2xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
}

export interface BadgeProps {
  tone?: Tone
  size?: Size
  icon?: ReactNode
  /** Affiche un dot animé à gauche pour signaler un état live */
  dot?: boolean
  className?: string
  children: ReactNode
}

export function Badge({
  tone = 'neutral',
  size = 'sm',
  icon,
  dot,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full ring-1 ring-inset',
        'transition-colors duration-200',
        tones[tone],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-pulse bg-current" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

/* ============================================================
   StatusBadge — variantes prêtes à l'emploi pour les statuts métier
   ============================================================ */

const statusMap: Record<string, { tone: Tone; label: string; icon: ReactNode }> = {
  // Entreprises
  ACTIVE:      { tone: 'success', label: 'Actif',       icon: <CheckCircle2 className="h-3 w-3" /> },
  SUSPENDED:   { tone: 'warning', label: 'Suspendu',    icon: <Clock className="h-3 w-3" /> },
  TERMINATED:  { tone: 'danger',  label: 'Résilié',     icon: <XCircle className="h-3 w-3" /> },
  // Réservations / Factures
  CONFIRMED:   { tone: 'success', label: 'Confirmée',   icon: <CheckCircle2 className="h-3 w-3" /> },
  PENDING:     { tone: 'info',    label: 'En attente',  icon: <Clock className="h-3 w-3" /> },
  CANCELLED:   { tone: 'danger',  label: 'Annulée',     icon: <XCircle className="h-3 w-3" /> },
  PAID:        { tone: 'success', label: 'Payée',       icon: <CheckCircle2 className="h-3 w-3" /> },
  OVERDUE:     { tone: 'danger',  label: 'En retard',   icon: <AlertTriangle className="h-3 w-3" /> },
  // Colis / Courriers
  RECEIVED:    { tone: 'info',    label: 'Reçu',        icon: <Clock className="h-3 w-3" /> },
  COLLECTED:   { tone: 'success', label: 'Récupéré',    icon: <CheckCircle2 className="h-3 w-3" /> },
  RETURNED:    { tone: 'warning', label: 'Retourné',    icon: <XCircle className="h-3 w-3" /> },
  // Mailing
  DRAFT:       { tone: 'neutral', label: 'Brouillon',   icon: null },
  SCHEDULED:   { tone: 'info',    label: 'Programmée',  icon: <Clock className="h-3 w-3" /> },
  SENT:        { tone: 'success', label: 'Envoyée',     icon: <CheckCircle2 className="h-3 w-3" /> },
  // Messages
  UNREAD:      { tone: 'info',    label: 'Non lu',      icon: null },
  READ:        { tone: 'neutral', label: 'Lu',          icon: null },
}

interface StatusBadgeProps {
  status: string
  /** Label custom (override) */
  label?: string
  size?: Size
  className?: string
}

export function StatusBadge({ status, label, size = 'sm', className }: StatusBadgeProps) {
  const config = statusMap[status?.toUpperCase()] || { tone: 'neutral' as Tone, label: status, icon: null }
  return (
    <Badge tone={config.tone} size={size} icon={config.icon} className={className}>
      {label || config.label}
    </Badge>
  )
}

/* ============================================================
   RoleBadge — badges pour les rôles utilisateur
   ============================================================ */

const roleMap: Record<string, { tone: Tone; label: string; icon: ReactNode }> = {
  ADMIN:   { tone: 'gold',    label: 'Admin',   icon: <Crown className="h-3 w-3" /> },
  MANAGER: { tone: 'info',    label: 'Manager', icon: <Shield className="h-3 w-3" /> },
  USER:    { tone: 'neutral', label: 'User',    icon: <UserIcon className="h-3 w-3" /> },
}

export function RoleBadge({ role, size = 'sm', className }: { role: string; size?: Size; className?: string }) {
  const config = roleMap[role?.toUpperCase()] || roleMap.USER
  return (
    <Badge tone={config.tone} size={size} icon={config.icon} className={className}>
      {config.label}
    </Badge>
  )
}
