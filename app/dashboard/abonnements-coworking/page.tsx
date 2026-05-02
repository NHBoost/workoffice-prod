'use client'

import { useEffect, useState } from 'react'
import {
  Wallet,
  Plus,
  Search,
  Loader2,
  Calendar,
  Building,
  Trash2,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Subscription {
  id: string
  type: string
  startDate: string
  endDate: string
  monthlyAmount: number
  isActive: boolean
  enterprise: { id: string; name: string }
  coworkingSpace: { id: string; name: string } | null
}

interface Enterprise { id: string; name: string }
interface CoworkingSpace { id: string; name: string; monthlyRate: number; dailyRate: number; yearlyRate: number }

const typeLabel = (t: string) => ({ DAILY: 'Journalier', MONTHLY: 'Mensuel', YEARLY: 'Annuel' }[t] || t)
const typeColor = (t: string) =>
  ({ DAILY: 'bg-blue-100 text-blue-800', MONTHLY: 'bg-purple-100 text-purple-800', YEARLY: 'bg-green-100 text-green-800' }[t] ||
    'bg-gray-100 text-gray-700')

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [spaces, setSpaces] = useState<CoworkingSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)

  // Modal create
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formEnterpriseId, setFormEnterpriseId] = useState('')
  const [formSpaceId, setFormSpaceId] = useState('')
  const [formType, setFormType] = useState<'DAILY' | 'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [formStart, setFormStart] = useState(new Date().toISOString().slice(0, 10))
  const [formEnd, setFormEnd] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 12)
    return d.toISOString().slice(0, 10)
  })
  const [formAmount, setFormAmount] = useState(0)

  const fetchAll = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (showOnlyActive) params.set('active', 'true')
    Promise.all([
      fetch(`/api/subscriptions?${params.toString()}`).then(r => r.ok ? r.json() : Promise.reject(r)),
      fetch('/api/enterprises?limit=200').then(r => r.ok ? r.json() : Promise.reject(r)),
      fetch('/api/coworking-spaces').then(r => r.ok ? r.json() : Promise.reject(r)),
    ])
      .then(([s, e, c]) => {
        setSubscriptions(s.subscriptions || [])
        setEnterprises((e.enterprises || []).map((x: any) => ({ id: x.id, name: x.name })))
        setSpaces((c.spaces || c.coworkingSpaces || []).map((x: any) => ({
          id: x.id, name: x.name, monthlyRate: x.monthlyRate, dailyRate: x.dailyRate, yearlyRate: x.yearlyRate,
        })))
        setError(null)
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchAll, [showOnlyActive])

  // Auto-fill amount based on space selected
  useEffect(() => {
    const space = spaces.find(s => s.id === formSpaceId)
    if (!space) return
    if (formType === 'DAILY') setFormAmount(space.dailyRate)
    else if (formType === 'YEARLY') setFormAmount(space.yearlyRate)
    else setFormAmount(space.monthlyRate)
  }, [formSpaceId, formType, spaces])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterpriseId: formEnterpriseId,
          coworkingSpaceId: formSpaceId || undefined,
          type: formType,
          startDate: formStart,
          endDate: formEnd,
          monthlyAmount: Number(formAmount),
          isActive: true,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Abonnement créé')
      setShowModal(false)
      setFormEnterpriseId('')
      setFormSpaceId('')
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (s: Subscription) => {
    setActingId(s.id)
    try {
      const res = await fetch(`/api/subscriptions/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !s.isActive }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success(!s.isActive ? 'Abonnement activé' : 'Abonnement désactivé')
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async (s: Subscription) => {
    if (!confirm(`Supprimer cet abonnement ?`)) return
    setActingId(s.id)
    try {
      const res = await fetch(`/api/subscriptions/${s.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Abonnement supprimé')
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActingId(null)
    }
  }

  const filtered = subscriptions.filter(s =>
    !search || s.enterprise.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = subscriptions.filter(s => s.isActive).length
  const monthlyRevenue = subscriptions
    .filter(s => s.isActive && s.type === 'MONTHLY')
    .reduce((sum, s) => sum + s.monthlyAmount, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonnements coworking</h1>
          <p className="text-gray-600">Gestion des abonnements aux espaces de coworking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-5 w-5" />
          Nouvel abonnement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total abonnements</p>
              <p className="text-2xl font-bold">{subscriptions.length}</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Actifs</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenu mensuel récurrent</p>
              <p className="text-2xl font-bold">{monthlyRevenue.toLocaleString('fr-FR')} €</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par entreprise..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 form-input"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={e => setShowOnlyActive(e.target.checked)}
            className="h-4 w-4"
          />
          Actifs uniquement
        </label>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Aucun abonnement</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Entreprise</th>
                  <th className="table-header">Espace</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Période</th>
                  <th className="table-header">Montant</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{s.enterprise.name}</td>
                    <td className="table-cell text-gray-600">{s.coworkingSpace?.name || '—'}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${typeColor(s.type)}`}>{typeLabel(s.type)}</span>
                    </td>
                    <td className="table-cell text-sm">
                      {new Date(s.startDate).toLocaleDateString('fr-FR')} →{' '}
                      {new Date(s.endDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell font-semibold">{s.monthlyAmount.toFixed(2)} €</td>
                    <td className="table-cell">
                      {s.isActive ? (
                        <span className="status-badge bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 inline mr-1" />Actif
                        </span>
                      ) : (
                        <span className="status-badge bg-gray-100 text-gray-700">
                          <Clock className="h-3 w-3 inline mr-1" />Inactif
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleActive(s)}
                          disabled={actingId === s.id}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          {actingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (s.isActive ? 'Désactiver' : 'Activer')}
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={actingId === s.id}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Nouvel abonnement</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="form-label">Entreprise <span className="text-red-500">*</span></label>
                <select
                  value={formEnterpriseId}
                  onChange={e => setFormEnterpriseId(e.target.value)}
                  required
                  className="form-input"
                >
                  <option value="">Sélectionner</option>
                  {enterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Espace coworking</label>
                <select
                  value={formSpaceId}
                  onChange={e => setFormSpaceId(e.target.value)}
                  className="form-input"
                >
                  <option value="">— Aucun (domiciliation pure) —</option>
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="DAILY">Journalier</option>
                    <option value="MONTHLY">Mensuel</option>
                    <option value="YEARLY">Annuel</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={e => setFormAmount(Number(e.target.value))}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Date début</label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Date fin</label>
                  <input
                    type="date"
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
