'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Eye, EyeOff, Building, Users, Shield, Activity, Star,
  CheckCircle2, ArrowRight, MapPin, Calendar, Receipt, Mail,
  TrendingUp,
} from 'lucide-react'
import { Button, Field, Input, Checkbox, Badge } from '@/components/ui'
import { Logo, LogoMark } from '@/components/Logo'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Email ou mot de passe incorrect')
      } else {
        toast.success('Connexion réussie')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemo = (mail: string, pwd: string) => {
    setEmail(mail)
    setPassword(pwd)
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* ============================================================
          PANEL GAUCHE — Photo de bureaux + overlay élégant
          ============================================================ */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        {/* Image de fond : bureau coworking moderne */}
        <Image
          src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80"
          alt="Espace de coworking moderne WorkOffice"
          fill
          priority
          quality={90}
          className="object-cover"
          sizes="(min-width: 1024px) 55vw, 0vw"
        />

        {/* Overlay sombre dégradé pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900/85 via-ink-900/70 to-ink-800/60" />
        {/* Overlay accent gold subtil en bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent" />

        {/* Grid pattern subtil */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 text-white">
          {/* Logo */}
          <div className="animate-fade-in">
            <Logo size="lg" theme="dark" />
          </div>

          {/* Hero center */}
          <div className="space-y-8 max-w-lg animate-slide-up">
            <div>
              <Badge size="md" className="!bg-gold-400/15 !text-gold-300 !ring-gold-400/30 backdrop-blur mb-5">
                <Star className="h-3 w-3 mr-1" />
                Plateforme SaaS premium
              </Badge>
              <h1 className="text-4xl xl:text-5xl font-semibold tracking-tighter leading-[1.1]">
                Gérez vos espaces
                <br />
                de coworking
                <br />
                <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-200 bg-clip-text text-transparent">
                  en toute simplicité.
                </span>
              </h1>
              <p className="mt-5 text-md text-white/75 max-w-md leading-relaxed">
                Domiciliation, salles de réunion, courriers, factures et analytics
                temps réel — tout ce dont vous avez besoin sur une seule plateforme.
              </p>
            </div>

            {/* Feature icons grid (UI/UX premium) */}
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { icon: Building, label: 'Domiciliation', desc: 'Multi-entreprises' },
                { icon: Calendar, label: 'Réservations', desc: 'Salles & coworking' },
                { icon: Receipt, label: 'Facturation', desc: 'Auto + suivi' },
                { icon: TrendingUp, label: 'Analytics', desc: 'Temps réel' },
              ].map(f => (
                <div
                  key={f.label}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-gold-400/15 ring-1 ring-gold-400/30 inline-flex items-center justify-center group-hover:bg-gold-400/25 transition-colors">
                    <f.icon className="h-4 w-4 text-gold-300" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{f.label}</p>
                    <p className="text-2xs text-white/60 truncate">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom : trust strip + stats */}
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/10">
              <div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-gold-400" />
                  <p className="text-xl font-semibold tracking-tighter nums-tabular">4</p>
                </div>
                <p className="text-2xs text-white/50 uppercase tracking-wider mt-0.5">Centres</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-gold-400" />
                  <p className="text-xl font-semibold tracking-tighter nums-tabular">99.9%</p>
                </div>
                <p className="text-2xs text-white/50 uppercase tracking-wider mt-0.5">Uptime</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-gold-400" />
                  <p className="text-xl font-semibold tracking-tighter nums-tabular">24/7</p>
                </div>
                <p className="text-2xs text-white/50 uppercase tracking-wider mt-0.5">Support</p>
              </div>
            </div>

            <p className="text-2xs text-white/40">
              © {new Date().getFullYear()} Prestigia · Tous droits réservés
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          PANEL DROIT — Formulaire de connexion (inchangé, propre)
          ============================================================ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo mobile (visible < lg) */}
          <div className="lg:hidden flex items-center justify-center mb-10">
            <Logo size="md" theme="auto" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tighter text-text">
              Bon retour 👋
            </h2>
            <p className="text-sm text-text-muted mt-1.5">
              Connectez-vous pour accéder à votre espace de gestion.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-danger-soft border border-danger/20 text-sm text-danger animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email professionnel" required>
              <Input
                type="email"
                placeholder="email@workoffice.be"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                size="lg"
                disabled={isLoading}
              />
            </Field>

            <Field
              label={
                <div className="flex items-center justify-between">
                  <span>Mot de passe</span>
                  <Link
                    href="/auth/forgot-password"
                    className="text-2xs text-text-muted hover:text-text transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div> as any
              }
              required
            >
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                size="lg"
                disabled={isLoading}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-muted hover:text-text"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span className="text-sm text-text-muted group-hover:text-text transition-colors">
                Se souvenir de moi pendant 30 jours
              </span>
            </label>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isLoading}
              iconRight={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-text-muted">Comptes de démonstration</p>
              <Badge tone="gold" size="sm">Demo</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@workoffice.be', 'admin123')}
                className="text-left p-3 rounded-lg border border-border bg-surface hover:bg-surface-2 hover:border-border-strong transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5 text-gold-500" strokeWidth={2} />
                  <span className="text-xs font-medium text-text">Admin</span>
                </div>
                <p className="text-2xs text-text-subtle font-mono truncate">admin@workoffice.be</p>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('manager@workoffice.be', 'manager123')}
                className="text-left p-3 rounded-lg border border-border bg-surface hover:bg-surface-2 hover:border-border-strong transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3.5 w-3.5 text-info" strokeWidth={2} />
                  <span className="text-xs font-medium text-text">Manager</span>
                </div>
                <p className="text-2xs text-text-subtle font-mono truncate">manager@workoffice.be</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
