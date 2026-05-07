import { cn } from '@/lib/utils'

interface GaugeProps {
  /** Valeur en pourcentage (0–100) */
  value: number
  /** Libellé central (par défaut, le pourcentage) */
  label?: string
  /** Sous-libellé sous le pourcentage */
  sublabel?: string
  /** Taille du SVG */
  size?: number
  /** Tone de la jauge (couleur du remplissage) */
  tone?: 'gold' | 'success' | 'warning' | 'danger' | 'electric'
  className?: string
}

const TONE_COLORS: Record<string, string> = {
  gold: '#C9A227',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  electric: '#3B82F6',
}

/**
 * Jauge circulaire (gauge donut) pour afficher un pourcentage.
 * Style cockpit : track gris + arc coloré + valeur centrale.
 */
export function Gauge({
  value,
  label,
  sublabel,
  size = 100,
  tone = 'gold',
  className,
}: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 40
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const color = TONE_COLORS[tone]

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        aria-label={`${clamped}%`}
      >
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-smooth"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tracking-tighter text-text nums-tabular leading-none">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && (
          <span className="text-2xs text-text-subtle mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  )
}
