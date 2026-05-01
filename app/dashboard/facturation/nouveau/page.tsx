'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Enterprise {
  id: string
  name: string
}

const TVA_RATE = 0.21 // 21 % Belgique

export default function NewInvoicePage() {
  const router = useRouter()
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [enterpriseId, setEnterpriseId] = useState('')
  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [taxRate, setTaxRate] = useState(TVA_RATE)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [status, setStatus] = useState<'PENDING' | 'PAID'>('PENDING')

  useEffect(() => {
    fetch('/api/enterprises?limit=200')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setEnterprises(d.enterprises || []))
      .catch(() => toast.error('Impossible de charger les entreprises'))
  }, [])

  const taxAmount = amount * taxRate
  const totalAmount = amount + taxAmount

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterpriseId,
          number: number.trim() || undefined,
          amount: Number(amount),
          taxAmount: Number(taxAmount.toFixed(2)),
          dueDate,
          status,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.details) {
          const fieldErrors: Record<string, string> = {}
          for (const e of body.details) {
            if (e.path?.[0]) fieldErrors[e.path[0]] = e.message
          }
          setErrors(fieldErrors)
        }
        toast.error(body.error || 'Erreur lors de la création')
        return
      }
      toast.success('Facture créée')
      router.push('/dashboard/facturation')
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
        <Link
          href="/dashboard/facturation"
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle facture</h1>
          <p className="text-gray-600">Émettez une nouvelle facture pour une entreprise</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Destinataire</h2>
          <div>
            <label className="form-label">Entreprise <span className="text-red-500">*</span></label>
            <select
              value={enterpriseId}
              onChange={e => setEnterpriseId(e.target.value)}
              required
              className={`form-input ${errors.enterpriseId ? 'border-red-500' : ''}`}
            >
              <option value="">Sélectionner une entreprise</option>
              {enterprises.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {errors.enterpriseId && <p className="text-xs text-red-600 mt-1">{errors.enterpriseId}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails</h2>
          <div className="space-y-4">
            <div>
              <label className="form-label">Numéro de facture</label>
              <input
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder="Auto-généré si vide (ex: INV-2026-XXXX)"
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">Laisser vide pour un numéro automatique</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Montant HT (€) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Taux TVA (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={(taxRate * 100).toFixed(2)}
                  onChange={e => setTaxRate(Number(e.target.value) / 100)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Date d’échéance <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Statut</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'PENDING' | 'PAID')}
                className="form-input"
              >
                <option value="PENDING">En attente</option>
                <option value="PAID">Déjà payée</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sous-total HT</span>
            <span>{amount.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>TVA ({(taxRate * 100).toFixed(0)} %)</span>
            <span>{taxAmount.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total TTC</span>
            <span className="text-primary-600">{totalAmount.toFixed(2)} €</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/dashboard/facturation" className="btn-secondary">Annuler</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Créer la facture
          </button>
        </div>
      </form>
    </div>
  )
}
