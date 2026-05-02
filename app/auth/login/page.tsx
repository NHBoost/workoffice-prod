'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Building, Users, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Email ou mot de passe incorrect')
      } else {
        toast.success('Connexion réussie')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: Building, label: 'Domiciliation entreprises' },
    { icon: Users, label: 'Gestion multi-centres' },
    { icon: Shield, label: 'Sécurité bancaire' },
    { icon: Zap, label: 'Tableaux de bord temps réel' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Panel gauche : branding (visible >= lg) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-between p-12 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <div className="w-7 h-7 bg-white rounded transform rotate-45" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">WorkOffice</h2>
              <p className="text-sm text-white/70">Prestigia APP</p>
            </div>
          </div>

          <div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Plateforme tout-en-un<br />pour vos espaces de coworking
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Gérez la domiciliation d&apos;entreprises, les salles de réunion, les courriers
              et la facturation depuis une interface unique.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Prestigia APP — Tous droits réservés
          </p>
        </div>
      </div>

      {/* Panel droit : formulaire */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-md w-full">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center mb-8 gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded transform rotate-45" />
            </div>
            <span className="text-xl font-bold text-gray-900">WorkOffice</span>
          </div>

          <div className="card p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Bon retour 👋</h1>
              <p className="text-gray-600 mt-1">Connectez-vous pour accéder à votre espace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email professionnel</label>
                <input
                  type="email"
                  placeholder="email@workoffice.be"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Se souvenir de moi</span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button type="submit" disabled={isLoading} className="w-full btn-primary">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            {/* Demo accounts hint */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Comptes de démonstration :</p>
              <div className="space-y-1 text-xs text-gray-600 font-mono">
                <p>👑 admin@workoffice.be / admin123</p>
                <p>👨‍💼 manager@workoffice.be / manager123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
