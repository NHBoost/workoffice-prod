'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const LABEL_MAP: Record<string, string> = {
  dashboard: 'Tableau de bord',
  users: 'Utilisateurs',
  add: 'Ajouter',
  entreprises: 'Entreprises',
  centers: 'Centres',
  'salles-reunion': 'Salles de réunion',
  'espaces-coworking': 'Espaces coworking',
  'abonnements-coworking': 'Abonnements',
  facturation: 'Facturation',
  courriers: 'Courriers',
  'courriers-a-enlever': 'Courriers à enlever',
  colis: 'Colis',
  mailing: 'Mailing',
  messaging: 'Messages',
  kpis_personnel: 'Analytics',
  'scan-qrcode': 'Scan QR',
  settings: 'Paramètres',
  nouveau: 'Nouveau',
  ajouter: 'Ajouter',
  reservations: 'Réservations',
  statistiques: 'Statistiques',
  resilies: 'Résiliées',
  suspendues: 'Suspendues',
}

const truncateId = (s: string) => (s.length > 10 ? `${s.substring(0, 6)}…` : s)

export function Breadcrumbs() {
  const pathname = usePathname() || ''
  const parts = pathname.split('/').filter(Boolean)

  // Pas de breadcrumbs sur le root /dashboard
  if (parts.length <= 1) return null

  let acc = ''
  const items = parts.map((p, i) => {
    acc += `/${p}`
    const isLast = i === parts.length - 1
    const label = LABEL_MAP[p] || (p.length > 20 ? truncateId(p) : p)
    return { label, href: acc, isLast }
  })

  return (
    <nav className="flex items-center gap-1 text-xs text-text-muted overflow-x-auto whitespace-nowrap">
      <Link
        href="/dashboard"
        className="inline-flex items-center hover:text-text transition-colors shrink-0"
        aria-label="Tableau de bord"
      >
        <Home className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Link>
      {items.slice(1).map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3 w-3 text-text-subtle" />
          {item.isLast ? (
            <span className="text-text font-medium capitalize">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-text transition-colors capitalize"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
