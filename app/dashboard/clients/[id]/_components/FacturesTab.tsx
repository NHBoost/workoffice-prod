'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'
import {
  Receipt, Plus, Loader2, CheckCircle2, Clock, AlertTriangle,
  Download, RotateCcw, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, EmptyState, Spinner, Modal, ConfirmDialog } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'

interface InvoiceRow {
  id: string
  number: string
  amount: number
  taxAmount: number
  totalAmount: number
  status: string
  issuedAt: string
  dueDate: string
  paidAt: string | null
  pdfPath: string | null
  pdfUrl: string | null
}

const fr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function statusBadge(i: InvoiceRow) {
  const isOverdue = i.status !== 'PAID' && new Date(i.dueDate) < new Date()
  if (i.status === 'PAID') return <Badge tone="success" size="sm" className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Payée</Badge>
  if (isOverdue) return <Badge tone="danger" size="sm" className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />En retard</Badge>
  return <Badge tone="warning" size="sm" className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Impayée</Badge>
}

export function FacturesTab({ clientId }: { clientId: string }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<InvoiceRow | null>(null)

  // Formulaire creation
  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState('')      // HT
  const [tvaTaux, setTvaTaux] = useState('21')
  const [dueDate, setDueDate] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [notifyClient, setNotifyClient] = useState(true)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/factures`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      setInvoices(body.invoices || [])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const resetForm = () => {
    setNumber(''); setAmount(''); setTvaTaux('21'); setDueDate(''); setPdfFile(null); setNotifyClient(true)
  }

  // Suggestion numero auto : FA-{YYYY}-{compteur}
  useEffect(() => {
    if (open && !number) {
      const year = new Date().getFullYear()
      const suggestion = `FA-${year}-${String(invoices.length + 1).padStart(3, '0')}`
      setNumber(suggestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('number', number)
      fd.append('amount', amount)
      fd.append('tvaTaux', tvaTaux)
      fd.append('dueDate', dueDate)
      if (pdfFile) fd.append('pdf', pdfFile)
      fd.append('notifyClient', notifyClient ? 'true' : 'false')

      const res = await fetch(`/api/clients/${clientId}/factures`, { method: 'POST', body: fd })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      if (!notifyClient) {
        toast.success('Facture créée (client non notifié)')
      } else if (body.emailSent) {
        toast.success('Facture créée et email envoyé au client ✓')
      } else {
        toast.success('Facture créée. L\'email n\'a pas pu être envoyé.', { duration: 6000 })
      }
      resetForm()
      setOpen(false)
      fetchInvoices()
    } finally {
      setSubmitting(false)
    }
  }

  const togglePaid = async (i: InvoiceRow) => {
    setActingId(i.id)
    try {
      const newStatus = i.status === 'PAID' ? 'PENDING' : 'PAID'
      const res = await fetch(`/api/clients/${clientId}/factures/${i.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notifyClient: true }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      if (newStatus === 'PAID') {
        toast.success(body.emailSent
          ? 'Facture marquée payée — email de confirmation envoyé ✓'
          : 'Facture marquée payée')
      } else {
        toast.success('Facture marquée impayée')
      }
      fetchInvoices()
    } finally {
      setActingId(null)
    }
  }

  const deleteInvoice = async () => {
    if (!confirmDelete) return
    setActingId(confirmDelete.id)
    try {
      const res = await fetch(`/api/clients/${clientId}/factures/${confirmDelete.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      toast.success('Facture supprimée')
      setConfirmDelete(null)
      fetchInvoices()
    } finally {
      setActingId(null)
    }
  }

  // Estimation TTC en live dans le formulaire
  const estimatedTtc = (() => {
    const amt = parseFloat(amount) || 0
    const taux = parseFloat(tvaTaux) || 0
    return amt + (amt * taux / 100)
  })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-md font-semibold tracking-tight text-text">Facturation</h2>
          <p className="text-2xs text-text-muted mt-0.5">
            {invoices.length === 0
              ? 'Aucune facture'
              : `${invoices.length} facture${invoices.length > 1 ? 's' : ''} · ${invoices.filter(i => i.status === 'PAID').length} payée${invoices.filter(i => i.status === 'PAID').length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </button>
      </div>

      {loading ? (
        <Card className="p-12 flex items-center justify-center"><Spinner /></Card>
      ) : invoices.length === 0 ? (
        <Card className="p-10">
          <EmptyState icon={Receipt} title="Aucune facture" description="Crée la première facture pour ce client." compact />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/50 text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Numéro</th>
                  <th className="px-4 py-3 text-left font-medium">Émise</th>
                  <th className="px-4 py-3 text-left font-medium">Échéance</th>
                  <th className="px-4 py-3 text-right font-medium">TTC</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(i => (
                  <tr key={i.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-text">{i.number}</td>
                    <td className="px-4 py-3 text-text-muted">{fr(i.issuedAt)}</td>
                    <td className="px-4 py-3 text-text-muted">{fr(i.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-text nums-tabular">
                      {formatCurrency(i.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(i)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {i.pdfUrl && (
                          <a
                            href={i.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium rounded-md bg-gold-50 text-gold-700 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-400"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </a>
                        )}
                        <button
                          onClick={() => togglePaid(i)}
                          disabled={actingId === i.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium rounded-md disabled:opacity-50',
                            i.status === 'PAID'
                              ? 'bg-warning-soft text-warning hover:bg-warning/20'
                              : 'bg-success-soft text-success hover:bg-success/20'
                          )}
                        >
                          {actingId === i.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : i.status === 'PAID' ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {i.status === 'PAID' ? 'Annuler paiement' : 'Marquer payée'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(i)}
                          disabled={actingId === i.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium rounded-md text-danger hover:bg-danger-soft"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal creation */}
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle facture" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Numéro</label>
              <input
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Montant HT (€)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 nums-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">TVA %</label>
              <input
                type="number"
                step="0.5"
                value={tvaTaux}
                onChange={e => setTvaTaux(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 nums-tabular"
              />
            </div>
          </div>

          {estimatedTtc > 0 && (
            <div className="bg-surface-2 rounded-lg p-3 text-sm flex items-center justify-between">
              <span className="text-text-muted">Total TTC estimé</span>
              <span className="font-semibold text-text nums-tabular">{formatCurrency(estimatedTtc)}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">PDF de la facture (optionnel)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
            />
            {pdfFile && (
              <p className="text-2xs text-text-muted mt-1">{pdfFile.name} · {(pdfFile.size / 1024).toFixed(0)} ko</p>
            )}
          </div>

          {/* Notification client */}
          <label className="flex items-start gap-2.5 p-3 rounded-lg bg-gold-50/40 dark:bg-gold-900/10 border border-gold-200/60 dark:border-gold-800/40 cursor-pointer hover:bg-gold-50/70 transition-colors">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={e => setNotifyClient(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-gold-600 focus:ring-gold-400/40"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Notifier le client par email</p>
              <p className="text-2xs text-text-muted mt-0.5">
                Le client recevra un email avec les détails de la facture et le lien vers son espace.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer la facture
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={deleteInvoice}
        loading={actingId === confirmDelete?.id}
        title="Supprimer la facture ?"
        description={confirmDelete ? `Cette action supprimera définitivement la facture ${confirmDelete.number}. Action irréversible.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
      />
    </div>
  )
}
