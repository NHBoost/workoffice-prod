'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react'

interface Enterprise {
  id: string
  name: string
  legalForm: string | null
  siret: string | null
  status: string
  domiciliationDate: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string
  city: string
  postalCode: string
  country: string
  createdAt: string
  center: { id: string; name: string } | null
}

const statusLabel = (s: string) =>
  ({ ACTIVE: 'Actif', SUSPENDED: 'Suspendu', TERMINATED: 'Résilié' }[s] || s)
const statusColor = (s: string) =>
  ({ ACTIVE: 'status-active', SUSPENDED: 'status-suspended', TERMINATED: 'status-terminated' }[s] ||
    'bg-gray-100 text-gray-800')

export default function EnterprisesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    params.set('limit', '50')

    setLoading(true)
    fetch(`/api/enterprises?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setEnterprises(data.enterprises || [])
        setTotal(data.total || 0)
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des entreprises'))
      .finally(() => setLoading(false))
  }, [searchTerm, statusFilter])

  const stats = [
    { title: 'Total', value: total, icon: Building, color: 'blue' },
    { title: 'Actives', value: enterprises.filter(e => e.status === 'ACTIVE').length, icon: Building, color: 'green' },
    { title: 'Suspendues', value: enterprises.filter(e => e.status === 'SUSPENDED').length, icon: Building, color: 'orange' },
    { title: 'Résiliées', value: enterprises.filter(e => e.status === 'TERMINATED').length, icon: Building, color: 'purple' },
  ]

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500', purple: 'bg-purple-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Entreprises</h1>
          <p className="text-gray-600">Domiciliation et suivi des entreprises clientes</p>
        </div>
        <Link href="/dashboard/entreprises/nouveau" className="btn-primary">
          <Plus className="h-5 w-5" />
          Nouvelle entreprise
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
                  placeholder="Rechercher par nom, SIRET ou email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 form-input"
                />
              </div>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input">
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="suspended">Suspendues</option>
              <option value="terminated">Résiliées</option>
            </select>
            <button className="btn-secondary">
              <Download className="h-4 w-4" />
              Exporter
            </button>
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
                  <th className="table-header">Entreprise</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Centre</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Domiciliation</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enterprises.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Aucune entreprise trouvée.</td></tr>
                )}
                {enterprises.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{e.name}</div>
                          <div className="text-sm text-gray-500">{e.legalForm || '—'} {e.siret ? `· ${e.siret}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-gray-900">{e.contactPerson || '—'}</div>
                      <div className="text-xs text-gray-500">{e.email || ''}</div>
                    </td>
                    <td className="table-cell">{e.center?.name || '—'}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${statusColor(e.status)}`}>{statusLabel(e.status)}</span>
                    </td>
                    <td className="table-cell">
                      {e.domiciliationDate
                        ? new Date(e.domiciliationDate).toLocaleDateString('fr-FR')
                        : new Date(e.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link href={`/dashboard/entreprises/${e.id}`} className="p-1 text-gray-400 hover:text-gray-600">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button className="p-1 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4" /></button>
                        <button className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-700">
          {enterprises.length} entreprise(s) affichée(s) sur {total}
        </div>
      </div>
    </div>
  )
}
