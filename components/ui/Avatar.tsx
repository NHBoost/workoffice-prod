import { cn, getInitials } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<Size, string> = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-md',
  xl: 'h-14 w-14 text-lg',
}

const colors = [
  'bg-ink-700 text-white',
  'bg-electric-600 text-white',
  'bg-gold-500 text-ink-900',
  'bg-success text-white',
  'bg-info text-white',
  'bg-primary-600 text-white',
]

/** Hash déterministe pour assigner une couleur basée sur le nom */
function hashColor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

interface AvatarProps {
  name?: string | null
  email?: string | null
  src?: string | null
  size?: Size
  className?: string
  /** Affiche un dot de présence en bas à droite */
  status?: 'online' | 'away' | 'offline'
}

export function Avatar({ name, email, src, size = 'md', className, status }: AvatarProps) {
  const seed = name || email || 'anonymous'
  const initials = getInitials(name || email || '?')
  const colorClass = hashColor(seed)

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'rounded-full inline-flex items-center justify-center font-medium tracking-tight',
          'ring-2 ring-bg',
          sizes[size],
          !src && colorClass
        )}
      >
        {src ? (
          <img src={src} alt={name || ''} className="h-full w-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-bg',
            size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            status === 'online' && 'bg-success',
            status === 'away' && 'bg-warning',
            status === 'offline' && 'bg-text-subtle'
          )}
        />
      )}
    </div>
  )
}

/** Stack d'avatars (équipe / participants) */
export function AvatarStack({
  users,
  max = 4,
  size = 'sm',
}: {
  users: { name?: string | null; email?: string | null; src?: string | null }[]
  max?: number
  size?: Size
}) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={i} {...u} size={size} />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'rounded-full inline-flex items-center justify-center font-medium',
            'bg-surface-2 text-text-muted ring-2 ring-bg',
            sizes[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
