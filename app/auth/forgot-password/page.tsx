'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button, Field, Input, Card } from '@/components/ui'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      setSent(true)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 relative overflow-hidden">
      {/* Background mesh subtil */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-electric-200/40 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gold-200/30 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>

        <Card variant="elevated" className="p-8">
          {sent ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="relative inline-flex">
                <div className="absolute inset-0 rounded-full bg-success/10 blur-xl" />
                <div className="relative h-16 w-16 rounded-full bg-success-soft inline-flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" strokeWidth={1.75} />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-text">
                  Email envoyé !
                </h1>
                <p className="text-sm text-text-muted mt-2">
                  Si un compte est associé à <strong className="text-text">{email}</strong>,
                  vous allez recevoir un lien de réinitialisation valable 1 heure.
                </p>
              </div>
              <Link href="/auth/login" className="block">
                <Button variant="primary" fullWidth>
                  Retour à la connexion
                </Button>
              </Link>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-2xs text-text-subtle hover:text-text transition-colors"
              >
                Renvoyer un lien à une autre adresse
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="relative inline-flex mb-4">
                  <div className="absolute inset-0 rounded-2xl bg-electric-500/10 blur-xl" />
                  <div className="relative h-14 w-14 rounded-2xl bg-electric-50 dark:bg-electric-900/30 inline-flex items-center justify-center ring-1 ring-electric-200 dark:ring-electric-800">
                    <Mail className="h-6 w-6 text-electric-600" strokeWidth={1.75} />
                  </div>
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-text">
                  Mot de passe oublié ?
                </h1>
                <p className="text-sm text-text-muted mt-2">
                  Entrez votre email et nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Email professionnel" required>
                  <Input
                    type="email"
                    placeholder="email@workoffice.be"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    size="lg"
                    autoFocus
                  />
                </Field>

                <Button type="submit" fullWidth size="lg" loading={submitting}>
                  Envoyer le lien
                </Button>
              </form>
            </>
          )}
        </Card>

        <div className="mt-6 flex justify-center">
          <Logo size="sm" theme="auto" />
        </div>
      </div>
    </div>
  )
}
