'use client'

import { Menu, Search, Moon, Sun, Command as CommandIcon, LogOut } from 'lucide-react'
import { Breadcrumbs } from './Breadcrumbs'
import { NotificationCenter } from './NotificationCenter'
import { QuickActions } from './QuickActions'
import { CommandPalette, useCommandPalette } from './CommandPalette'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark')
    setIsDark(dark)
  }, [])

  const toggleDark = () => {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    setIsDark(next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
          {/* Left : mobile menu + breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onMobileMenuOpen}
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <div className="hidden md:block min-w-0">
              <Breadcrumbs />
            </div>
          </div>

          {/* Center : search trigger (desktop) — accent gold subtle */}
          <button
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'group hidden md:inline-flex items-center gap-2 h-9 w-[280px] px-3',
              'rounded-lg border border-border bg-surface text-xs text-text-subtle',
              'hover:bg-surface-2 hover:border-gold-300 hover:text-text transition-colors'
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0 group-hover:text-gold-600 transition-colors" />
            <span className="flex-1 text-left">Rechercher ou créer...</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-mono bg-gold-50 border border-gold-200 text-gold-700 dark:bg-gold-900/30 dark:border-gold-700/40 dark:text-gold-400 group-hover:border-gold-300 transition-colors">
              <CommandIcon className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Mobile search */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              aria-label="Rechercher"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>

            <QuickActions />

            <button
              onClick={toggleDark}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-gold-600 dark:hover:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors"
              aria-label="Basculer le thème"
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
              ) : (
                <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              )}
            </button>

            <NotificationCenter />

            {/* Bouton Déconnexion direct dans le Header (lien HTML natif, sans JS) */}
            <a
              href="/api/auth/force-logout?callbackUrl=/auth/login"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-danger hover:bg-danger-soft transition-colors"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
