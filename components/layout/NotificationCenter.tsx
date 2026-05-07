'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Mail, Package, FileText, AlertTriangle, MessageCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'mail' | 'package' | 'invoice' | 'alert' | 'message'
  title: string
  description: string
  time: string
  read: boolean
  href?: string
}

const ICONS: Record<Notification['type'], LucideIcon> = {
  mail: Mail,
  package: Package,
  invoice: FileText,
  alert: AlertTriangle,
  message: MessageCircle,
}

const COLORS: Record<Notification['type'], string> = {
  mail: 'bg-info-soft text-info',
  package: 'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400',
  invoice: 'bg-success-soft text-success',
  alert: 'bg-danger-soft text-danger',
  message: 'bg-electric-50 text-electric-600 dark:bg-electric-900/30 dark:text-electric-400',
}

// Notifications mockées (à brancher sur une vraie API plus tard)
const MOCK: Notification[] = [
  {
    id: '1',
    type: 'invoice',
    title: 'Facture INV-2026-001 payée',
    description: 'BEACOON SARL a payé 605,50 €',
    time: 'il y a 5 min',
    read: false,
  },
  {
    id: '2',
    type: 'package',
    title: 'Nouveau colis reçu',
    description: 'Pour GULFGUARD - Jean Dupont',
    time: 'il y a 1 h',
    read: false,
  },
  {
    id: '3',
    type: 'alert',
    title: 'Facture en retard',
    description: 'INV-2025-042 n\'est pas réglée depuis 7 jours',
    time: 'il y a 2 h',
    read: false,
  },
  {
    id: '4',
    type: 'mail',
    title: 'Courrier recommandé reçu',
    description: 'Ministère des Finances pour TECH SOLUTIONS',
    time: 'hier',
    read: true,
  },
  {
    id: '5',
    type: 'message',
    title: 'Marie Manager vous a écrit',
    description: 'Sujet : Réservation salle Créative',
    time: 'hier',
    read: true,
  },
]

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState<Notification[]>(MOCK)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unreadCount = notifications.filter(n => !n.read).length
  const visible = tab === 'unread' ? notifications.filter(n => !n.read) : notifications

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }
  const markRead = (id: string) => {
    setNotifications(notifications.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-ink-900 text-[10px] font-bold ring-2 ring-bg shadow-glow-gold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-2xl shadow-soft-xl overflow-hidden animate-slide-down z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Notifications</h3>
              <p className="text-2xs text-text-subtle">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout lu
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="px-2 pt-2 flex items-center gap-1">
            {(['all', 'unread'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  tab === t
                    ? 'bg-surface-2 text-text'
                    : 'text-text-muted hover:text-text hover:bg-surface-2/60'
                )}
              >
                {t === 'all' ? `Toutes (${notifications.length})` : `Non lues (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto py-1">
            {visible.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCheck className="h-8 w-8 mx-auto text-success mb-2" />
                <p className="text-sm text-text-muted">Tout est à jour ✨</p>
              </div>
            ) : (
              <ul>
                {visible.map(n => {
                  const Icon = ICONS[n.type]
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => markRead(n.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors text-left border-b border-border/50 last:border-b-0"
                      >
                        <div className={cn('h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center', COLORS[n.type])}>
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={cn('text-sm leading-snug', !n.read ? 'font-semibold text-text' : 'text-text-muted')}>
                              {n.title}
                            </p>
                            {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold-500 shadow-glow-gold shrink-0" />}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                            {n.description}
                          </p>
                          <p className="text-2xs text-text-subtle mt-1">{n.time}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-surface-2/40 text-center">
            <button className="text-xs text-text-muted hover:text-text transition-colors">
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
