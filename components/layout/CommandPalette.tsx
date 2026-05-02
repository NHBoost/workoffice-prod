'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Command as CommandIcon, ArrowRight, X,
  LayoutDashboard, Users, Building, MapPin, CalendarDays, Laptop, Wallet,
  CreditCard, Mail, Package, Send, MessageCircle, BarChart3, QrCode,
  Settings, Plus, FileText, UserPlus, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  category: string
  keywords?: string
}

const commands: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, category: 'Navigation' },
  { id: 'users', label: 'Utilisateurs', href: '/dashboard/users', icon: Users, category: 'Navigation' },
  { id: 'enterprises', label: 'Entreprises', href: '/dashboard/entreprises', icon: Building, category: 'Navigation' },
  { id: 'centers', label: 'Centres', href: '/dashboard/centers', icon: MapPin, category: 'Navigation' },
  { id: 'rooms', label: 'Salles de réunion', href: '/dashboard/salles-reunion', icon: CalendarDays, category: 'Navigation' },
  { id: 'spaces', label: 'Espaces coworking', href: '/dashboard/espaces-coworking', icon: Laptop, category: 'Navigation' },
  { id: 'subs', label: 'Abonnements', href: '/dashboard/abonnements-coworking', icon: Wallet, category: 'Navigation' },
  { id: 'invoices', label: 'Facturation', href: '/dashboard/facturation', icon: CreditCard, category: 'Navigation' },
  { id: 'mails', label: 'Courriers', href: '/dashboard/courriers', icon: Mail, category: 'Navigation' },
  { id: 'packages', label: 'Colis', href: '/dashboard/colis', icon: Package, category: 'Navigation' },
  { id: 'mailing', label: 'Mailing', href: '/dashboard/mailing', icon: Send, category: 'Navigation' },
  { id: 'messages', label: 'Messages', href: '/dashboard/messaging', icon: MessageCircle, category: 'Navigation' },
  { id: 'analytics', label: 'Analytics', href: '/dashboard/kpis_personnel', icon: BarChart3, category: 'Navigation' },
  { id: 'qr', label: 'Scan QR Code', href: '/dashboard/scan-qrcode', icon: QrCode, category: 'Navigation' },
  { id: 'settings', label: 'Paramètres', href: '/dashboard/settings', icon: Settings, category: 'Navigation' },

  // Actions rapides (création)
  { id: 'new-user', label: 'Nouvel utilisateur', href: '/dashboard/users/add', icon: UserPlus, category: 'Créer', keywords: 'ajouter inviter' },
  { id: 'new-enterprise', label: 'Nouvelle entreprise', href: '/dashboard/entreprises/nouveau', icon: Building, category: 'Créer' },
  { id: 'new-room', label: 'Nouvelle salle', href: '/dashboard/salles-reunion/ajouter', icon: CalendarDays, category: 'Créer' },
  { id: 'new-reservation', label: 'Nouvelle réservation', href: '/dashboard/salles-reunion/reservations/ajouter', icon: CalendarDays, category: 'Créer' },
  { id: 'new-space', label: 'Nouvel espace coworking', href: '/dashboard/espaces-coworking/nouveau', icon: Laptop, category: 'Créer' },
  { id: 'new-invoice', label: 'Nouvelle facture', href: '/dashboard/facturation/nouveau', icon: FileText, category: 'Créer' },
  { id: 'new-mail', label: 'Enregistrer un courrier', href: '/dashboard/courriers/nouveau', icon: Mail, category: 'Créer' },
  { id: 'new-package', label: 'Enregistrer un colis', href: '/dashboard/colis/nouveau', icon: Package, category: 'Créer' },
  { id: 'new-campaign', label: 'Nouvelle campagne email', href: '/dashboard/mailing/nouveau', icon: Send, category: 'Créer' },
  { id: 'new-message', label: 'Nouveau message', href: '/dashboard/messaging/nouveau', icon: MessageCircle, category: 'Créer' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Filtre + groupement
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return commands.filter(
      c =>
        !q ||
        c.label.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    )
  }, [query])

  const grouped = useMemo(() => {
    const map: Record<string, CommandItem[]> = {}
    filtered.forEach(c => {
      if (!map[c.category]) map[c.category] = []
      map[c.category].push(c)
    })
    return map
  }, [filtered])

  // Reset active sur filter change
  useEffect(() => setActiveIdx(0), [filtered.length])

  // Navigation clavier
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[activeIdx]
        if (item) {
          router.push(item.href)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, activeIdx, filtered, onClose, router])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-md animate-fade-in" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-surface rounded-2xl shadow-soft-xl border border-border overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search className="h-4 w-4 text-text-subtle shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une page, créer un élément..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-mono bg-surface-2 border border-border text-text-subtle">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">Aucun résultat pour <span className="font-medium text-text">"{query}"</span></p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-3 last:mb-0">
                <h4 className="px-2 py-1 text-2xs font-medium uppercase tracking-wider text-text-subtle">
                  {cat}
                </h4>
                <ul className="space-y-0.5">
                  {items.map(item => {
                    const idx = filtered.indexOf(item)
                    const isActive = idx === activeIdx
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            router.push(item.href)
                            onClose()
                          }}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-left transition-colors',
                            isActive
                              ? 'bg-surface-2 text-text'
                              : 'text-text-muted hover:text-text hover:bg-surface-2/60'
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && (
                            <ArrowRight className="h-3.5 w-3.5 text-text-subtle" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-border bg-surface-2/50 flex items-center justify-between text-2xs text-text-subtle">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono">↓</kbd>
              naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono">↵</kbd>
              ouvrir
            </span>
          </div>
          <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

/** Hook pour brancher facilement la palette + raccourci Cmd+K / Ctrl+K */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
