'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Plus,
  Search,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  Euro,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  number: string
  amount: number
  taxAmount: number
  totalAmount: number
  dueDate: string
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | string
  issuedAt: string
  paidAt: string | null
  enterprise: { id: string; name: string }
}

const statusLabel = (s: string) =>
  ({ PENDING: 'En attente', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée' }[s] || s)

const statusColor = (s: string) =>
  ({
    PENDING: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-700',
  }[s] || 'bg-gray-100 text-gray-700')

const statusIcon = (s: string) => {
  switch (s) {
    case 'PAID':
      return CheckCircle
    case 'PENDING':
      return Clock
    case 'OVERDUE':
      return AlertTriangle
    default:
      return XCircle
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [sumTotal, setSumTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchInvoices = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    setLoading(true)
    fetch(`/api/invoices?${params.toString()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(data => {
        setInvoices(data.invoices || [])
        setSumTotal(data.sumTotal || 0)
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des factures'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchInvoices, [searchTerm, statusFilter])

  const markAsPaid = async (inv: Invoice) => {
    setUpdatingId(inv.id)
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success(`Facture ${inv.number} marquée payée`)
      fetchInvoices()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdatingId(null)
    }
  }

  const totalPending = invoices.filter(i => i.status === 'PENDING').reduce((s, i) => s + i.totalAmount, 0)
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.totalAmount, 0)

  const stats = [
    { title: 'Total facturé', value: `${sumTotal.toLocaleString('fr-FR')} €`, icon: Euro, color: 'blue' },
    { title: 'Encaissé', value: `${totalPaid.toLocaleString('fr-FR')} €`, icon: CheckCircle, color: 'green' },
    { title: 'En attente', value: `${totalPending.toLocaleString('fr-FR')} €`, icon: Clock, color: 'orange' },
    { title: 'En retard', value: `${totalOverdue.toLocaleString('fr-FR')} €`, icon: AlertTriangle, color: 'red' },
  ]

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const cls: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
          <p className="text-gray-600">Gérez les factures et le suivi des paiements</p>
        </div>
        <Link href="/dashboard/facturation/nouveau" className="btn-primary">
          <Plus className="h-5 w-5" />
          Nouvelle facture
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
                  placeholder="Rechercher (numéro, entreprise)..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 form-input"
                />
              </div>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input">
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="paid">Payées</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annulées</option>
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
                  <th className="table-header">Numéro</th>
                  <th className="table-header">Entreprise</th>
                  <th className="table-header">Montant HT</th>
                  <th className="table-header">TVA</th>
                  <th className="table-header">TTC</th>
                  <th className="table-header">Échéance</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500">Aucune facture trouvée.</td></tr>
                )}
                {invoices.map(inv => {
                  const StatusIcon = statusIcon(inv.status)
                  const isOverdueByDate =
                    inv.status === 'PENDING' && new Date(inv.dueDate) < new Date()
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <span className="font-mono text-sm font-medium">{inv.number}</span>
                      </td>
                      <td className="table-cell">{inv.enterprise.name}</td>
                      <td className="table-cell">{inv.amount.toFixed(2)} €</td>
                      <td className="table-cell text-gray-500">{inv.taxAmount.toFixed(2)} €</td>
                      <td className="table-cell font-semibold">{inv.totalAmount.toFixed(2)} €</td>
                      <td className="table-cell">
                        <span className={isOverdueByDate ? 'text-red-600 font-medium' : ''}>
                          {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1 status-badge ${statusColor(inv.status)}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusLabel(inv.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-1">
                          <Link
                            href={`/dashboard/facturation/${inv.id}`}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => markAsPaid(inv)}
                              disabled={updatingId === inv.id}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                            >
                              {updatingId === inv.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Marquer payée'
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-700">
          {invoices.length} facture(s) affichée(s)
        </div>
      </div>
    </div>
  )
}
