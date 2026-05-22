'use client'

import { useEffect, useState, useCallback, FormEvent } from 'react'
import {
  Mail, Plus, Upload, X, Loader2, Eye, CheckCircle2, Inbox,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, EmptyState, Spinner, Modal } from '@/components/ui'
import { cn } from '@/lib/utils'

interface MailRow {
  id: string
  recipient: string
  sender: string | null
  type: string
  status: string
  receivedAt: string
  readAt: string | null
  pdfPath: string | null
  pdfUrl: string | null
  notes: string | null
}

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  RECOMMANDE: 'Recommandé',
  COLIS: 'Colis',
  OFFICIEL: 'Officiel',
}

const TYPE_TONE: Record<string, 'neutral' | 'warning' | 'info' | 'gold'> = {
  STANDARD: 'neutral',
  RECOMMANDE: 'warning',
  COLIS: 'gold',
  OFFICIEL: 'info',
}

const fr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function CourriersTab({ clientId }: { clientId: string }) {
  const [mails, setMails] = useState<MailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Formulaire ajout
  const [sender, setSender] = useState('')
  const [type, setType] = useState('STANDARD')
  const [notes, setNotes] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [notifyClient, setNotifyClient] = useState(true) // notify par defaut

  const fetchMails = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/courriers`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      setMails(body.mails || [])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchMails() }, [fetchMails])

  const resetForm = () => {
    setSender('')
    setType('STANDARD')
    setNotes('')
    setPdfFile(null)
    setNotifyClient(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      if (sender) fd.append('sender', sender)
      fd.append('type', type)
      if (notes) fd.append('notes', notes)
      if (pdfFile) fd.append('pdf', pdfFile)
      fd.append('notifyClient', notifyClient ? 'true' : 'false')

      const res = await fetch(`/api/clients/${clientId}/courriers`, { method: 'POST', body: fd })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      // Message contextuel selon le succes de la notif email
      if (!notifyClient) {
        toast.success('Courrier attribué (client non notifié)')
      } else if (body.emailSent) {
        toast.success('Courrier attribué et email envoyé au client ✓')
      } else {
        toast.success('Courrier attribué. L\'email n\'a pas pu être envoyé.', { duration: 6000 })
      }
      resetForm()
      setOpen(false)
      fetchMails()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-md font-semibold tracking-tight text-text">Courriers</h2>
          <p className="text-2xs text-text-muted mt-0.5">
            {mails.length === 0
              ? 'Aucun courrier attribué'
              : `${mails.length} courrier${mails.length > 1 ? 's' : ''} · ${mails.filter(m => !m.readAt).length} non lu${mails.filter(m => !m.readAt).length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Attribuer un courrier
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <Card className="p-12 flex items-center justify-center"><Spinner /></Card>
      ) : mails.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Inbox}
            title="Aucun courrier"
            description="Téléverse un scan PDF pour l'attribuer à ce client."
            compact
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {mails.map(m => (
              <li
                key={m.id}
                className={cn(
                  'p-4 flex items-center gap-3 transition-colors',
                  !m.readAt && 'bg-gold-50/40 dark:bg-gold-900/10'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                  !m.readAt
                    ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400'
                    : 'bg-surface-2 text-text-muted'
                )}>
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-sm font-medium text-text">
                      {m.sender || 'Expéditeur inconnu'}
                    </p>
                    <Badge tone={TYPE_TONE[m.type] ?? 'neutral'} size="sm">{TYPE_LABELS[m.type] ?? m.type}</Badge>
                    {m.readAt ? (
                      <Badge tone="success" size="sm" className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Lu
                      </Badge>
                    ) : (
                      <Badge tone="warning" size="sm">Non lu</Badge>
                    )}
                  </div>
                  <p className="text-2xs text-text-subtle mt-1">
                    Reçu le {fr(m.receivedAt)}
                    {m.readAt && <> · Lu le {fr(m.readAt)}</>}
                  </p>
                  {m.notes && <p className="text-xs text-text-muted mt-1 italic truncate">{m.notes}</p>}
                </div>
                {m.pdfUrl && (
                  <a
                    href={m.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-info-soft text-info hover:bg-info/20 transition-colors shrink-0"
                  >
                    <Eye className="h-3 w-3" />
                    Voir
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Modal d'ajout */}
      <Modal open={open} onClose={() => setOpen(false)} title="Attribuer un courrier" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40"
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Expéditeur <span className="text-text-subtle">(optionnel)</span>
            </label>
            <input
              type="text"
              value={sender}
              onChange={e => setSender(e.target.value)}
              placeholder="ex: SPF Finances, Mutuelle..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Scan PDF</label>
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

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Notes <span className="text-text-subtle">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Commentaire interne"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 resize-none"
            />
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
                Un email sera envoyé au client pour l'informer du nouveau courrier
                {(type === 'RECOMMANDE' || type === 'OFFICIEL') && (
                  <span className="text-warning font-medium"> · marqué comme prioritaire</span>
                )}
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Attribuer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
