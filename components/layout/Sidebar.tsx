'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, Building, MapPin, CalendarDays, Laptop,
  CreditCard, Mail, Package, Send, MessageCircle, BarChart3,
  Settings, QrCode, ChevronLeft, ChevronRight, X, Wallet,
  LogOut, User as UserIcon, Command,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { RoleBadge } from '@/components/ui'
import { Logo, LogoMark } from '@/components/Logo'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** Affiche un badge avec le compteur (ex: messages non lus) */
  badge?: string | number
}

interface NavSection {
  label: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Utilisateurs', href: '/dashboard/users', icon: Users },
      { name: 'Centres', href: '/dashboard/centers', icon: MapPin },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { name: 'Entreprises', href: '/dashboard/entreprises', icon: Building },
      { name: 'Salles de réunion', href: '/dashboard/salles-reunion', icon: CalendarDays },
      { name: 'Espaces coworking', href: '/dashboard/espaces-coworking', icon: Laptop },
      { name: 'Abonnements', href: '/dashboard/abonnements-coworking', icon: Wallet },
      { name: 'Facturation', href: '/dashboard/facturation', icon: CreditCard },
    ],
  },
  {
    label: 'Communication',
    items: [
      { name: 'Courriers', href: '/dashboard/courriers', icon: Mail },
      { name: 'Colis', href: '/dashboard/colis', icon: Package },
      { name: 'Mailing', href: '/dashboard/mailing', icon: Send },
      { name: 'Messages', href: '/dashboard/messaging', icon: MessageCircle },
    ],
  },
  {
    label: 'Outils',
    items: [
      { name: 'Analytics', href: '/dashboard/kpis_personnel', icon: BarChart3 },
      { name: 'Scan QR Code', href: '/dashboard/scan-qrcode', icon: QrCode },
      { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu sur Escape (le clic outside est géré par un backdrop dédié)
  useEffect(() => {
    if (!showUserMenu) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showUserMenu])

  // Auto-close mobile sur changement de route
  useEffect(() => {
    onMobileClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname?.startsWith(href) ?? false

  const Brand = (
    <Link href="/dashboard" className="flex items-center gap-3 group">
      {collapsed ? (
        <LogoMark size="md" theme="auto" />
      ) : (
        <Logo size="md" theme="auto" />
      )}
    </Link>
  )

  const SearchTrigger = !collapsed && (
    <button
      className={cn(
        'mx-3 mb-1 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg w-[calc(100%-1.5rem)]',
        'border border-border bg-surface-2/50 text-xs text-text-muted',
        'hover:bg-surface-2 hover:border-border-strong transition-colors'
      )}
      onClick={() => {
        // Search palette à brancher dans une tâche future
      }}
    >
      <span className="flex-1 text-left">Rechercher...</span>
      <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-mono bg-surface border border-border text-text-subtle">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  )

  const Navigation = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <h3 className="px-3 mb-2 text-2xs font-semibold uppercase tracking-wider text-text-subtle">
              {section.label}
            </h3>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg',
                      'transition-all duration-200 ease-smooth',
                      active
                        ? 'text-text bg-surface-2'
                        : 'text-text-muted hover:text-text hover:bg-surface-2/60'
                    )}
                  >
                    {/* Indicateur actif gold à gauche */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-gold-500 animate-fade-in"
                        aria-hidden
                      />
                    )}
                    <item.icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        active ? 'text-text' : 'text-text-muted group-hover:text-text'
                      )}
                      strokeWidth={active ? 2 : 1.75}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-electric-600 text-white text-2xs font-medium">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  const UserCard = (
    <div ref={userMenuRef} className="relative px-3 pb-3 pt-2 border-t border-border">
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className={cn(
          'w-full flex items-center gap-3 p-2 rounded-lg',
          'hover:bg-surface-2 transition-colors text-left'
        )}
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-ink-700 to-ink-900 ring-2 ring-bg flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {getInitials(session?.user?.name || session?.user?.email || '?')}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">
                {session?.user?.name || 'Utilisateur'}
              </p>
              <p className="text-2xs text-text-subtle truncate">
                {session?.user?.email}
              </p>
            </div>
            <ChevronRight
              className={cn(
                'h-4 w-4 text-text-subtle transition-transform shrink-0',
                showUserMenu && 'rotate-90'
              )}
            />
          </>
        )}
      </button>

      {/* Backdrop pour fermer en cliquant ailleurs (z-40) */}
      {showUserMenu && !collapsed && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setShowUserMenu(false)}
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
        />
      )}

      {/* Dropdown menu (z-50, au-dessus du backdrop) */}
      {showUserMenu && !collapsed && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-surface border border-border rounded-xl shadow-soft-xl overflow-hidden animate-slide-up z-50">
          <div className="p-3 border-b border-border bg-surface-2/40">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-text truncate">{session?.user?.name}</p>
              {(session?.user as any)?.role && (
                <RoleBadge role={(session?.user as any).role} />
              )}
            </div>
            <p className="text-xs text-text-muted truncate">{session?.user?.email}</p>
          </div>
          <ul className="p-1.5">
            <li>
              <Link
                href="/dashboard/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                <UserIcon className="h-4 w-4" />
                Mon profil
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </Link>
            </li>
            <li className="my-1 h-px bg-border mx-2" />
            <li>
              {/*
                Lien direct vers force-logout : navigation HTML native,
                aucune dépendance JS / NextAuth / cookies de session.
                Marche même si signOut() échoue, si JS est bloqué, ou si
                NEXTAUTH_URL est manquant côté Vercel.
              */}
              <a
                href="/api/auth/force-logout?callbackUrl=/auth/login"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-danger hover:bg-danger-soft transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  )

  const SidebarBody = (
    <div className="flex flex-col h-full">
      {/* Header : logo + collapse/close */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-border">
        {Brand}
        {/* Collapse button (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:inline-flex items-center justify-center h-7 w-7 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          aria-label={collapsed ? 'Étendre' : 'Replier'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        {/* Close button (mobile) */}
        <button
          onClick={onMobileClose}
          className="lg:hidden inline-flex items-center justify-center h-7 w-7 rounded-md text-text-muted hover:text-text hover:bg-surface-2"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {SearchTrigger}
      {Navigation}
      {UserCard}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0',
          'bg-surface border-r border-border',
          'transition-[width] duration-300 ease-smooth',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {SidebarBody}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar (off-canvas) */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 w-[280px] bg-surface border-r border-border z-50',
          'flex flex-col',
          'transform transition-transform duration-300 ease-smooth',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {SidebarBody}
      </aside>
    </>
  )
}
