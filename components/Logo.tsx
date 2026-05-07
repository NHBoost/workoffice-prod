import { cn } from '@/lib/utils'

/**
 * Logo Prestigia Business Center.
 *
 * Identité visuelle officielle :
 *  - Diamant doré contour fin avec "P" serif au centre
 *  - Wordmark "Prestigia" en serif crème
 *  - "BUSINESS CENTER" en sans-serif doré, uppercase, letter-spacing wide
 *
 * Couleurs strictement issues du logo (pas de rouge) :
 *  - Background dark : ink-900 (#0F1729)
 *  - Or : gold-400 (#DFBF33) — outline diamant et "P"
 *  - Crème : #F5F0E0 (wordmark)
 *  - Or pâle : gold-300 (#E7D066) — sous-titre
 */

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Theme = 'dark' | 'light' | 'auto'

interface LogoProps {
  size?: Size
  /** dark = sur fond sombre, light = sur fond clair, auto = utilise les couleurs neutres (ink/gold) */
  theme?: Theme
  /** Affiche le wordmark à côté du diamant */
  withWordmark?: boolean
  className?: string
}

const sizeMap: Record<Size, { mark: number; text: string; sub: string }> = {
  xs: { mark: 20, text: 'text-md', sub: 'text-[7px]' },
  sm: { mark: 28, text: 'text-lg', sub: 'text-[8px]' },
  md: { mark: 36, text: 'text-xl', sub: 'text-[9px]' },
  lg: { mark: 48, text: 'text-2xl', sub: 'text-[10px]' },
  xl: { mark: 64, text: 'text-3xl', sub: 'text-xs' },
}

/**
 * LogoMark — diamant + P seulement (compact, pour favicons, sidebar collapsed, etc.)
 */
export function LogoMark({
  size = 'md',
  theme = 'auto',
  className,
}: { size?: Size; theme?: Theme; className?: string }) {
  const s = sizeMap[size].mark

  // Couleur du trait selon thème
  const stroke =
    theme === 'dark' ? '#DFBF33'
      : theme === 'light' ? '#C9A227'
      : 'currentColor' // auto : suit la couleur du parent

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', theme === 'auto' && 'text-gold-500 dark:text-gold-400', className)}
      aria-label="Prestigia Business Center"
    >
      {/* Diamant : carré rotaté 45° */}
      <rect
        x="14"
        y="14"
        width="36"
        height="36"
        transform="rotate(45 32 32)"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
      />
      {/* Lettre P serif au centre */}
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="26"
        fontWeight="700"
        fill={stroke}
      >
        P
      </text>
    </svg>
  )
}

/**
 * Logo — version complète avec wordmark "Prestigia / BUSINESS CENTER"
 */
export function Logo({
  size = 'md',
  theme = 'auto',
  withWordmark = true,
  className,
}: LogoProps) {
  if (!withWordmark) return <LogoMark size={size} theme={theme} className={className} />

  const s = sizeMap[size]
  const wordmarkColor =
    theme === 'dark' ? 'text-[#F5F0E0]'
      : theme === 'light' ? 'text-ink-900'
      : 'text-text'

  const subColor =
    theme === 'dark' ? 'text-gold-300'
      : 'text-gold-600 dark:text-gold-400'

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark size={size} theme={theme} />
      <div className="leading-none">
        <div
          className={cn(
            'font-serif font-semibold tracking-tight',
            s.text,
            wordmarkColor
          )}
          style={{ fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif' }}
        >
          Prestigia
        </div>
        <div
          className={cn(
            'mt-0.5 font-medium uppercase tracking-[0.18em]',
            s.sub,
            subColor
          )}
        >
          Business Center
        </div>
      </div>
    </div>
  )
}
