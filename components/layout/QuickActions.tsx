'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Building, FileText, Package, Mail, CalendarDays, UserPlus, Send,
  type LucideIcon,
} from 'lucide-react'

interface Action {
  label: string
  href: string
  icon: LucideIcon
  description: string
}

const actions: Action[] = [
  { label: 'Ajouter une entreprise', href: '/dashboard/entreprises/nouveau', icon: Building, description: 'Domicilier un nouveau client' },
  { label: 'Créer une facture', href: '/dashboard/facturation/nouveau', icon: FileText, description: 'Émettre une facture' },
  { label: 'Enregistrer un colis', href: '/dashboard/colis/nouveau', icon: Package, description: 'Réception colis' },
  { label: 'Enregistrer un courrier', href: '/dashboard/courriers/nouveau', icon: Mail, description: 'Courrier entrant' },
  { label: 'Réserver une salle', href: '/dashboard/salles-reunion/reservations/ajouter', icon: CalendarDays, description: 'Bloquer un créneau' },
  { label: 'Inviter un utilisateur', href: '/dashboard/users/add', icon: UserPlus, description: 'Créer un compte' },
  { label: 'Lancer une campagne', href: '/dashboard/mailing/nouveau', icon: Send, description: 'Email marketing' },
]

export function QuickActions() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="hidden sm:inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-ink-700 text-white text-xs font-medium hover:bg-ink-800 transition-colors shadow-soft dark:bg-white dark:text-ink-900 dark:hover:bg-white/90"
        aria-label="Actions rapides"
      >
        <Plus className="h-3.5 w-3.5" />
        Créer
      </button>

      {/* Mobile FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg bg-ink-700 text-white hover:bg-ink-800 transition-colors shadow-soft dark:bg-white dark:text-ink-900"
        aria-label="Actions rapides"
      >
        <Plus className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[300px] bg-surface border border-border rounded-2xl shadow-soft-xl overflow-hidden animate-slide-down z-50">
          <div className="px-4 py-3 border-b border-border bg-surface-2/40">
            <h3 className="text-sm font-semibold text-text">Actions rapides</h3>
            <p className="text-2xs text-text-subtle">Accès direct aux créations courantes</p>
          </div>
          <ul className="p-2">
            {actions.map(a => (
              <li key={a.label}>
                <Link
                  href={a.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors group"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-surface-2 group-hover:bg-ink-700 group-hover:text-white text-text-muted inline-flex items-center justify-center transition-colors">
                    <a.icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{a.label}</p>
                    <p className="text-xs text-text-subtle truncate">{a.description}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
