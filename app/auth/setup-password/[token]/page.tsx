'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/Logo'

export default function SetupPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done'>('loading')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [userInfo, setUserInfo] = useState<{ email: string; name: string | null } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/auth/setup-password?token=${params.token}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) {
          setErrorMsg(body.error || 'Lien invalide')
          setState('invalid')
          return
        }
        setUserInfo({ email: body.email, name: body.name })
        setState('ready')
      })
      .catch(() => {
        setErrorMsg('Erreur réseau')
        setState('invalid')
      })
  }, [params.token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setErrorMsg('Les deux mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Le mot de passe doit faire au moins 8 caractères')
      return
    }
    setErrorMsg('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(body.error || 'Erreur lors de la définition du mot de passe')
        return
      }
      setState('done')
      setTimeout(() => router.push('/auth/login'), 2500)
    } catch {
      setErrorMsg('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-2 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" theme="auto" />
        </div>

        <div className="card p-8">
          {state === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gold-500 mb-3" />
              <p className="text-sm text-text-muted">Vérification du lien...</p>
            </div>
          )}

          {state === 'invalid' && (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-danger-soft text-danger inline-flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-semibold text-text mb-2">Lien invalide ou expiré</h1>
              <p className="text-sm text-text-muted mb-6">{errorMsg}</p>
              <p className="text-xs text-text-subtle mb-4">
                Les liens d'activation sont valables 7 jours. Contacte ton interlocuteur Prestigia
                pour en recevoir un nouveau.
              </p>
              <Link href="/auth/login" className="btn btn-secondary w-full">
                Retour à la connexion
              </Link>
            </div>
          )}

          {state === 'done' && (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-success-soft text-success inline-flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="text-lg font-semibold text-text mb-2">Mot de passe défini</h1>
              <p className="text-sm text-text-muted mb-6">
                Tu peux maintenant te connecter à ton espace client.
              </p>
              <p className="text-xs text-text-subtle">Redirection vers la connexion...</p>
            </div>
          )}

          {state === 'ready' && userInfo && (
            <>
              <div className="mb-6">
                <div className="h-10 w-10 rounded-lg bg-gold-50 text-gold-600 dark:bg-gold-900/30 dark:text-gold-400 inline-flex items-center justify-center mb-3">
                  <Lock className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-text">
                  Bienvenue {userInfo.name?.split(' ')[0] ?? ''}
                </h1>
                <p className="text-sm text-text-muted mt-1">
                  Définis ton mot de passe pour accéder à ton espace client.
                </p>
                <p className="text-2xs text-text-subtle mt-2">
                  Compte : <span className="font-medium text-text">{userInfo.email}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    Mot de passe (8 caractères min.)
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoFocus
                      required
                      className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500"
                    />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">
                    Confirme le mot de passe
                  </label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500"
                  />
                </div>

                {errorMsg && (
                  <div className="text-2xs text-danger bg-danger-soft rounded-md px-3 py-2">
                    {errorMsg}
                  </div>
                )}

                <button type="submit" disabled={submitting} className="btn btn-primary w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {submitting ? 'Enregistrement...' : 'Définir mon mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-2xs text-text-subtle text-center mt-6">
          Pour votre sécurité, ce lien expire après 7 jours.
        </p>
      </div>
    </div>
  )
}
