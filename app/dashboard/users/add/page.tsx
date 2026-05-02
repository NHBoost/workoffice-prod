'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AddUserPage() {
  const router = useRouter()
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'USER'>('USER')
  const [centerId, setCenterId] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetch('/api/centers')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setCenters(d.centers || []))
      .catch(() => toast.error('Impossible de charger les centres'))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Mot de passe : 6 caractères minimum')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || undefined,
          role,
          centerId: centerId || undefined,
          isActive,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur lors de la création')
        return
      }
      toast.success('Utilisateur créé')
      router.push('/dashboard/users')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary-600" />
            Ajouter un utilisateur
          </h1>
          <p className="text-gray-600">Créer un nouveau compte utilisateur de la plateforme</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nom complet <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Prénom Nom"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="email@workoffice.be"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+32 4 12 34 56 78"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Mot de passe <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="6 caractères minimum"
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Rôle <span className="text-red-500">*</span></label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="form-input"
              >
                <option value="USER">Utilisateur</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Administrateur</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {role === 'ADMIN' && 'Accès total à la plateforme'}
                {role === 'MANAGER' && 'Gestion d’un centre spécifique'}
                {role === 'USER' && 'Accès en lecture limité'}
              </p>
            </div>
            <div>
              <label className="form-label">Centre rattaché</label>
              <select
                value={centerId}
                onChange={e => setCenterId(e.target.value)}
                className="form-input"
              >
                <option value="">— Aucun centre —</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">Compte actif (peut se connecter)</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/dashboard/users" className="btn-secondary">Annuler</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Créer l’utilisateur
          </button>
        </div>
      </form>
    </div>
  )
}
