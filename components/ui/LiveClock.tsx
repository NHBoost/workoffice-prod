'use client'

import { useEffect, useState } from 'react'

/**
 * Horloge live isolée. Re-render uniquement elle-même toutes les 30s,
 * évite de re-render le dashboard entier.
 *
 * Affiche : "lundi 7 mai 2026 · 14:32 · Synchro auto toutes les 2 min"
 */
export function LiveClock({ syncLabel = 'Synchro auto toutes les 2 min' }: { syncLabel?: string }) {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const fullDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const liveTime = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <p className="text-sm text-text-muted">
      <span className="capitalize">{fullDate}</span>
      {' · '}
      <span className="text-text font-medium nums-tabular">{liveTime}</span>
      {' · '}
      <span className="text-text-subtle">{syncLabel}</span>
    </p>
  )
}
