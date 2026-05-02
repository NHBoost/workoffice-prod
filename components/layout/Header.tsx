'use client'

import { Menu, Search, Moon, Sun, Command as CommandIcon } from 'lucide-react'
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

          {/* Center : search trigger (desktop) */}
          <button
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'hidden md:inline-flex items-center gap-2 h-9 w-[280px] px-3',
              'rounded-lg border border-border bg-surface text-xs text-text-subtle',
              'hover:bg-surface-2 hover:border-border-strong transition-colors'
            )}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Rechercher ou créer...</span>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-mono bg-surface-2 border border-border text-text-subtle">
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
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              aria-label="Basculer le thème"
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
              ) : (
                <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              )}
            </button>

            <NotificationCenter />
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
