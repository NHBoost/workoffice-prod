'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Download, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, EmptyState, Spinner } from '@/components/ui'
import { getCachedData, setCachedData } from '@/lib/client-cache'
import { FORMULE_LABELS, type Formule } from '@/lib/client-schemas'

interface ContractRow {
  id: string
  type: string
  status: string
  sentAt: string
  signedAt: string | null
  url: string | null
  urlSigne: string | null
}

const fr = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function PortailContratsPage() {
  // Cache court (30s) car les statuts changent en quasi temps reel
  // (admin peut televerser un signe a tout moment).
  const cacheKey = 'portail-contracts'
  const cached = typeof window !== 'undefined' ? getCachedData<ContractRow[]>(cacheKey, 30_000) : null
  const [contracts, setContracts] = useState<ContractRow[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const fetchContracts = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/contrats', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur')
        return
      }
      const list = body.contracts || []
      setContracts(list)
      setCachedData(cacheKey, list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContracts() }, [fetchContracts])

  // Refresh automatique quand l'onglet redevient actif (par exemple apres
  // que l'admin ait televerse un contrat signe dans un autre onglet).
  useEffect(() => {
    const onFocus = () => fetchContracts()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchContracts])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tighter text-text">Mes contrats</h1>
        <p className="text-sm text-text-muted mt-1">
          Téléchargez vos contrats Prestigia (version initiale et signée).
        </p>
      </div>

      {loading ? (
        <Card className="p-12 flex items-center justify-center"><Spinner /></Card>
      ) : contracts.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={FileText}
            title="Aucun contrat disponible"
            description="Votre contrat apparaîtra ici dès que Prestigia l'aura généré."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map(c => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                {c.status === 'SIGNE' ? (
                  <Badge tone="success" size="sm" className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Signé
                  </Badge>
                ) : (
                  <Badge tone="warning" size="sm" className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    En attente
                  </Badge>
                )}
              </div>
              <h3 className="text-sm font-semibold text-text mb-1">
                {FORMULE_LABELS[c.type as Formule] ?? c.type}
              </h3>
              <p className="text-2xs text-text-muted mb-3">
                Envoyé le {fr(c.sentAt)}
                {c.signedAt && <> · Signé le {fr(c.signedAt)}</>}
              </p>
              <div className="flex flex-wrap gap-2">
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gold-50 text-gold-700 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-400 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Contrat (PDF)
                  </a>
                )}
                {c.urlSigne && (
                  <a
                    href={c.urlSigne}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-success-soft text-success hover:bg-success/20 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Version signée
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
