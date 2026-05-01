'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package,
  Plus,
  Search,
  CheckCircle,
  Clock,
  RotateCcw,
  Eye,
  Loader2,
} from 'lucide-react'

interface PackageItem {
  id: string
  tracking: string
  recipient: string
  sender: string | null
  status: string
  receivedAt: string
  collectedAt: string | null
  notes: string | null
  enterprise: { id: string; name: string } | null
  center: { id: string; name: string } | null
}

const statusLabel = (s: string) =>
  ({ RECEIVED: 'Reçu', COLLECTED: 'Récupéré', RETURNED: 'Retourné' }[s] || s)
const statusColor = (s: string) =>
  ({
    RECEIVED: 'bg-blue-100 text-blue-800',
    COLLECTED: 'bg-green-100 text-green-800',
    RETURNED: 'bg-orange-100 text-orange-800',
  }[s] || 'bg-gray-100 text-gray-800')

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    setLoading(true)
    fetch(`/api/packages?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setPackages(data.packages || [])
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des colis'))
      .finally(() => setLoading(false))
  }, [searchTerm, statusFilter])

  const stats = [
    { title: 'Total colis', value: packages.length, icon: Package, color: 'blue' },
    { title: 'En attente', value: packages.filter(p => p.status === 'RECEIVED').length, icon: Clock, color: 'orange' },
    { title: 'Récupérés', value: packages.filter(p => p.status === 'COLLECTED').length, icon: CheckCircle, color: 'green' },
    { title: 'Retournés', value: packages.filter(p => p.status === 'RETURNED').length, icon: RotateCcw, color: 'purple' },
  ]

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const cls: Record<string, string> = {
      blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
          </div>
          <div className={`p-3 rounded-full ${cls[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des colis</h1>
          <p className="text-gray-600">Suivi des colis reçus pour les entreprises domiciliées</p>
        </div>
        <Link href="/dashboard/colis/nouveau" className="btn-primary">
          <Plus className="h-5 w-5" />
          Enregistrer un colis
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher (tracking, destinataire, expéditeur)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 form-input"
                />
              </div>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input">
              <option value="all">Tous les statuts</option>
              <option value="received">Reçus</option>
              <option value="collected">Récupérés</option>
              <option value="returned">Retournés</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Tracking</th>
                  <th className="table-header">Destinataire</th>
                  <th className="table-header">Expéditeur</th>
                  <th className="table-header">Entreprise</th>
                  <th className="table-header">Reçu le</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">Aucun colis trouvé.</td></tr>
                )}
                {packages.map(pkg => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <span className="font-mono text-sm">{pkg.tracking}</span>
                    </td>
                    <td className="table-cell">{pkg.recipient}</td>
                    <td className="table-cell">{pkg.sender || '—'}</td>
                    <td className="table-cell">{pkg.enterprise?.name || '—'}</td>
                    <td className="table-cell">
                      {new Date(pkg.receivedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell">
                      <span className={`status-badge ${statusColor(pkg.status)}`}>{statusLabel(pkg.status)}</span>
                    </td>
                    <td className="table-cell">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
