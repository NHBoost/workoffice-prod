'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Trash2,
  Building,
  Receipt,
  Calendar,
  Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  number: string
  amount: number
  taxAmount: number
  totalAmount: number
  dueDate: string
  status: string
  issuedAt: string
  paidAt: string | null
  enterprise: {
    id: string
    name: string
    address: string
    city: string
    postalCode: string
  }
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

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchInvoice = () => {
    fetch(`/api/invoices/${params.id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(setInvoice)
      .catch(() => setError('Facture introuvable'))
  }

  useEffect(fetchInvoice, [params.id])

  const updateStatus = async (status: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success(`Statut mis à jour : ${statusLabel(status)}`)
      fetchInvoice()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer la facture ${invoice?.number} ?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${params.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Facture supprimée')
      router.push('/dashboard/facturation')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 bg-red-50 text-red-700">{error}</div>
      </div>
    )
  }
  if (!invoice) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/facturation"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Facture {invoice.number}
              <span className={`status-badge ${statusColor(invoice.status)}`}>
                {statusLabel(invoice.status)}
              </span>
            </h1>
            <p className="text-gray-600">
              Émise le {new Date(invoice.issuedAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <button
              onClick={() => updateStatus('PAID')}
              disabled={updating}
              className="btn-primary"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Marquer payée
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Building className="h-5 w-5 text-primary-600" />
            Client
          </h2>
          <p className="font-medium text-gray-900">{invoice.enterprise.name}</p>
          <p className="text-sm text-gray-600 mt-2">{invoice.enterprise.address}</p>
          <p className="text-sm text-gray-600">
            {invoice.enterprise.postalCode} {invoice.enterprise.city}
          </p>
        </div>

        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
            <Calendar className="h-5 w-5 text-primary-600" />
            Dates
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Émise le</span>
              <span className="font-medium">{new Date(invoice.issuedAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Échéance</span>
              <span className="font-medium">
                {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            {invoice.paidAt && (
              <div className="flex justify-between text-green-600">
                <span>Payée le</span>
                <span className="font-medium">
                  {new Date(invoice.paidAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <Receipt className="h-5 w-5 text-primary-600" />
          Détails de la facture
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-700">Sous-total HT</span>
            <span className="font-medium">{invoice.amount.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-700">TVA</span>
            <span className="font-medium">{invoice.taxAmount.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between py-3 text-lg">
            <span className="font-bold text-gray-900">Total TTC</span>
            <span className="font-bold text-primary-600">{invoice.totalAmount.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus('CANCELLED')}
            disabled={updating}
            className="btn-secondary"
          >
            Annuler la facture
          </button>
          {invoice.status === 'PENDING' && (
            <button
              onClick={() => updateStatus('OVERDUE')}
              disabled={updating}
              className="btn-secondary"
            >
              Marquer en retard
            </button>
          )}
        </div>
      )}
    </div>
  )
}
