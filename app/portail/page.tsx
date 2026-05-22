'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Mail, CheckCircle2, Eye, Inbox, FileText, Loader2, ExternalLink,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, EmptyState, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import { getCachedData, setCachedData } from '@/lib/client-cache'

interface MailRow {
  id: string
  sender: string | null
  type: string
  status: string
  receivedAt: string
  readAt: string | null
  notes: string | null
  pdfPath: string | null
  pdfUrl: string | null
}

const fr = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Courrier standard',
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

export default function PortailCourrierPage() {
  const cacheKey = 'portail-mails'
  const cached = typeof window !== 'undefined' ? getCachedData<MailRow[]>(cacheKey, 60_000) : null
  const [mails, setMails] = useState<MailRow[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [unreadCount, setUnreadCount] = useState(0)
  const [marking, setMarking] = useState<string | null>(null)

  const fetchMails = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/courriers', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      const list = body.mails || []
      setMails(list)
      setUnreadCount(body.unreadCount ?? 0)
      setCachedData(cacheKey, list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMails() }, [fetchMails])

  const markAsRead = async (mailId: string) => {
    setMarking(mailId)
    try {
      const res = await fetch(`/api/portail/courriers/${mailId}`, { method: 'PATCH' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      // Update local
      setMails(prev => prev.map(m => m.id === mailId ? { ...m, readAt: body.readAt } : m))
      setUnreadCount(c => Math.max(0, c - 1))
    } finally {
      setMarking(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter text-text">
            Mes courriers
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {unreadCount > 0
              ? `${unreadCount} courrier${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`
              : 'Tous tes courriers sont à jour'}
          </p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <Card className="p-12 flex items-center justify-center">
          <Spinner />
        </Card>
      ) : mails.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Inbox}
            title="Aucun courrier pour l'instant"
            description="Tes courriers réceptionnés à Prestigia apparaîtront ici dès qu'ils seront scannés."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {mails.map(m => {
              const isUnread = !m.readAt
              return (
                <li
                  key={m.id}
                  className={cn(
                    'p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors',
                    isUnread && 'bg-gold-50/40 dark:bg-gold-900/10'
                  )}
                >
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                    isUnread
                      ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400'
                      : 'bg-surface-2 text-text-muted'
                  )}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className={cn('text-sm', isUnread ? 'font-semibold text-text' : 'text-text-muted')}>
                        {m.sender || 'Expéditeur inconnu'}
                      </p>
                      <Badge tone={TYPE_TONE[m.type] ?? 'neutral'} size="sm">{TYPE_LABELS[m.type] ?? m.type}</Badge>
                      {isUnread && <Badge tone="gold" size="sm">Non lu</Badge>}
                    </div>
                    <p className="text-2xs text-text-subtle mt-1">
                      Reçu le {fr(m.receivedAt)}
                      {m.readAt && ` · Lu le ${fr(m.readAt)}`}
                    </p>
                    {m.notes && <p className="text-xs text-text-muted mt-1 italic">{m.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.pdfUrl && (
                      <a
                        href={m.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-info-soft text-info hover:bg-info/20 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Voir le scan
                      </a>
                    )}
                    {isUnread && (
                      <button
                        onClick={() => markAsRead(m.id)}
                        disabled={marking === m.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-success-soft text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
                      >
                        {marking === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Marquer lu
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
