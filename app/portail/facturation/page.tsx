'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Receipt, Download, CheckCircle2, Clock, AlertTriangle, Euro,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, EmptyState, Spinner } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { getCachedData, setCachedData } from '@/lib/client-cache'

interface InvoiceRow {
  id: string
  number: string
  amount: number       // HT
  taxAmount: number
  totalAmount: number  // TTC
  status: 'PENDING' | 'PAID' | 'OVERDUE' | string
  issuedAt: string
  dueDate: string
  paidAt: string | null
  pdfPath: string | null
  pdfUrl: string | null
}

interface ApiResponse {
  invoices: InvoiceRow[]
  total: number
  unpaidTotal: number
  overdueCount: number
}

const fr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Statut affiche : Payee / En retard / Impayee
function statusBadge(i: InvoiceRow) {
  const isOverdue = i.status !== 'PAID' && new Date(i.dueDate) < new Date()
  if (i.status === 'PAID') {
    return (
      <Badge tone="success" size="sm" className="inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Payée
      </Badge>
    )
  }
  if (isOverdue) {
    return (
      <Badge tone="danger" size="sm" className="inline-flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        En retard
      </Badge>
    )
  }
  return (
    <Badge tone="warning" size="sm" className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Impayée
    </Badge>
  )
}

export default function PortailFacturationPage() {
  const cacheKey = 'portail-invoices'
  const cached = typeof window !== 'undefined' ? getCachedData<ApiResponse>(cacheKey, 60_000) : null
  const [data, setData] = useState<ApiResponse | null>(cached ?? null)
  const [loading, setLoading] = useState(!cached)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/factures', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      setData(body)
      setCachedData(cacheKey, body)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const invoices = data?.invoices ?? []
  const unpaidTotal = data?.unpaidTotal ?? 0
  const overdueCount = data?.overdueCount ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter text-text">Mes factures</h1>
          <p className="text-sm text-text-muted mt-1">
            {invoices.length === 0
              ? "Aucune facture pour l'instant"
              : `${invoices.length} facture${invoices.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Cartes synthese */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400 flex items-center justify-center">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-muted">Total factures</p>
                <p className="text-lg font-semibold text-text">{invoices.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center',
                unpaidTotal > 0 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
              )}>
                <Euro className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-muted">Montant impayé</p>
                <p className="text-lg font-semibold text-text nums-tabular">{formatCurrency(unpaidTotal)}</p>
              </div>
            </div>
          </Card>
          <Card className={cn('p-4', overdueCount > 0 && 'ring-1 ring-danger/30')}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center',
                overdueCount > 0 ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-text-muted'
              )}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-text-muted">En retard</p>
                <p className="text-lg font-semibold text-text">{overdueCount}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <Card className="p-12 flex items-center justify-center"><Spinner /></Card>
      ) : invoices.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Receipt}
            title="Aucune facture disponible"
            description="Vos factures Prestigia apparaîtront ici dès qu'elles auront été émises."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/50 text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Numéro</th>
                  <th className="px-4 py-3 text-left font-medium">Émise le</th>
                  <th className="px-4 py-3 text-left font-medium">Échéance</th>
                  <th className="px-4 py-3 text-right font-medium">Montant TTC</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-text font-mono">{i.number}</td>
                    <td className="px-4 py-3 text-text-muted">{fr(i.issuedAt)}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {fr(i.dueDate)}
                      {i.paidAt && (
                        <p className="text-2xs text-success">Payée le {fr(i.paidAt)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text nums-tabular">
                      {formatCurrency(i.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(i)}</td>
                    <td className="px-4 py-3 text-right">
                      {i.pdfUrl ? (
                        <a
                          href={i.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-gold-50 text-gold-700 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-400 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      ) : (
                        <span className="text-2xs text-text-subtle italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info paiement */}
      {invoices.length > 0 && (
        <Card className="p-4 bg-info-soft/30">
          <p className="text-xs text-text-muted">
            <strong className="text-text">Paiement</strong> · Les factures se règlent par virement bancaire selon les coordonnées indiquées sur le PDF.
            Pour toute question, contactez votre interlocuteur Prestigia.
          </p>
        </Card>
      )}
    </div>
  )
}
