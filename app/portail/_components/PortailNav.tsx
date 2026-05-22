'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Mail, FileText, Receipt, LogOut } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { cn, getInitials } from '@/lib/utils'

/**
 * Logout strict : signOut next-auth + nettoyage localStorage cache
 * + hard reload vers /auth/login pour purger tout state React/SWR.
 */
async function strictSignOut() {
  // Vide tout le cache localStorage prefixe dashboard-cache:
  try {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('dashboard-cache:')) localStorage.removeItem(k)
      })
    }
  } catch {}
  await signOut({ redirect: false })
  // Force reload complet (purge state React, cache memoire, etc.)
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login'
  }
}

const TABS = [
  { href: '/portail',              label: 'Courrier',    icon: Mail },
  { href: '/portail/contrats',     label: 'Contrats',    icon: FileText },
  { href: '/portail/facturation',  label: 'Facturation', icon: Receipt },
]

export function PortailNav({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-30">
      {/* Top : logo + user + logout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/portail" className="inline-flex items-center" aria-label="Portail Prestigia">
          <Logo size="sm" theme="auto" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 flex items-center justify-center text-xs font-semibold">
              {getInitials(userName)}
            </div>
            <span className="text-sm text-text-muted">{userName}</span>
          </div>
          <button
            onClick={() => strictSignOut()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-text-muted hover:text-danger hover:bg-danger-soft transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 -mb-px">
        {TABS.map(t => {
          const active = pathname === t.href
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                active
                  ? 'border-gold-500 text-gold-700 dark:text-gold-400'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
