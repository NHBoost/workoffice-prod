'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Loader2, UserPlus, FileText, Upload, CheckCircle2,
  Mail, Phone, Calendar, MoreVertical, Building2, AlertCircle,
  Eye, Edit, Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, Badge, EmptyState, Spinner, ActionMenu, ConfirmDialog } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { FORMULE_LABELS, type Formule } from '@/lib/client-schemas'

interface ClientRow {
  id: string
  societeDenomination: string
  formeJuridique: string
  bce: string
  emailPerso: string
  nom: string
  prenom: string
  fonction: string
  formule: Formule
  dateDebut: string
  montantHt: number
  compteStatut: 'NON_CREE' | 'CREE' | 'CONNECTE'
  contratStatut: 'NON_GENERE' | 'ENVOYE' | 'SIGNE'
  createdAt: string
  center: { id: string; name: string; city: string }
  user: { id: string; lastPortalLoginAt: string | null } | null
  _count: { contrats: number }
}

// ============ Status badges ============

function CompteBadge({ status, lastLogin }: { status: ClientRow['compteStatut']; lastLogin: string | null }) {
  if (status === 'NON_CREE') return <Badge tone="neutral" size="sm">Non créé</Badge>
  if (status === 'CREE' && !lastLogin) return <Badge tone="info" size="sm">Créé (jamais connecté)</Badge>
  return (
    <Badge tone="success" size="sm" className="inline-flex items-center gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Connecté
    </Badge>
  )
}

function ContratBadge({ status }: { status: ClientRow['contratStatut'] }) {
  if (status === 'NON_GENERE') return <Badge tone="neutral" size="sm">Non généré</Badge>
  if (status === 'ENVOYE') return <Badge tone="warning" size="sm">Envoyé</Badge>
  return <Badge tone="success" size="sm">Signé</Badge>
}

// ============ Page ============

export default function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterCompte, setFilterCompte] = useState('')
  const [filterContrat, setFilterContrat] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<ClientRow | null>(null)

  const fetchClients = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterCompte) params.set('compteStatut', filterCompte)
    if (filterContrat) params.set('contratStatut', filterContrat)
    fetch(`/api/clients?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setClients(d.clients || []))
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [search, filterCompte, filterContrat])

  useEffect(() => {
    const t = setTimeout(fetchClients, 200)
    return () => clearTimeout(t)
  }, [fetchClients])

  // ============ Actions ============

  const createAccount = async (clientId: string) => {
    setBusyId(clientId)
    try {
      const res = await fetch(`/api/clients/${clientId}/account`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur lors de la création du compte')
        return
      }
      if (body.emailSent) {
        toast.success('Compte créé — email envoyé au client ✓')
      } else if (body.setupUrl) {
        // Fallback : email non envoye (Resend pas configure), on copie l'URL
        await navigator.clipboard.writeText(body.setupUrl).catch(() => {})
        toast.success(
          'Compte créé. L\'email n\'a pas pu être envoyé — le lien d\'activation a été copié dans le presse-papier.',
          { duration: 8000 }
        )
        console.log('🔗 setupUrl:', body.setupUrl)
      } else {
        toast.success('Compte créé')
      }
      fetchClients()
    } finally {
      setBusyId(null)
    }
  }

  const generateContract = async (clientId: string) => {
    setBusyId(clientId)
    try {
      const res = await fetch(`/api/clients/${clientId}/contrat`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Erreur lors de la génération du contrat')
        if (body.missing?.length) {
          console.warn('Variables manquantes dans le template:', body.missing)
        }
        return
      }
      if (body.missing?.length) {
        console.warn('Variables non remplies dans le PDF :', body.missing)
      }
      if (body.emailSent) {
        toast.success('Contrat généré et envoyé par email ✓')
      } else if (body.downloadUrl) {
        // Fallback : ouvre le PDF dans un nouvel onglet
        window.open(body.downloadUrl, '_blank', 'noopener,noreferrer')
        toast.success(
          'Contrat généré. L\'email n\'a pas pu être envoyé — le PDF s\'ouvre dans un nouvel onglet.',
          { duration: 8000 }
        )
      } else {
        toast.success('Contrat généré')
      }
      fetchClients()
    } finally {
      setBusyId(null)
    }
  }

  const uploadSigned = async (clientId: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      setBusyId(clientId)
      try {
        const fd = new FormData()
        fd.append('pdf', file)
        const res = await fetch(`/api/clients/${clientId}/contrat/signed`, {
          method: 'POST',
          body: fd,
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(body.error || 'Upload échoué')
          return
        }
        toast.success('Contrat signé téléversé')
        fetchClients()
      } finally {
        setBusyId(null)
      }
    }
    input.click()
  }

  const deleteClient = async () => {
    if (!confirmDeleteId) return
    setBusyId(confirmDeleteId.id)
    try {
      const res = await fetch(`/api/clients/${confirmDeleteId.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Suppression échouée')
        return
      }
      toast.success(`Client ${confirmDeleteId.societeDenomination} supprimé`)
      setConfirmDeleteId(null)
      fetchClients()
    } finally {
      setBusyId(null)
    }
  }

  // ============ Render ============

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tighter text-text relative">
            Clients
            <span className="absolute -bottom-1 left-0 h-0.5 w-12 rounded-full bg-gradient-to-r from-gold-400 to-gold-600/0" />
          </h1>
          <p className="text-sm text-text-muted mt-2">
            Encodage, comptes et contrats de domiciliation
          </p>
        </div>
        <Link href="/dashboard/clients/nouveau" className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter un client
        </Link>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle" />
            <input
              type="search"
              placeholder="Rechercher par société, nom, email, BCE..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500"
            />
          </div>
          <select value={filterCompte} onChange={e => setFilterCompte(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40">
            <option value="">Compte : tous</option>
            <option value="NON_CREE">Non créé</option>
            <option value="CREE">Créé</option>
            <option value="CONNECTE">Connecté</option>
          </select>
          <select value={filterContrat} onChange={e => setFilterContrat(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40">
            <option value="">Contrat : tous</option>
            <option value="NON_GENERE">Non généré</option>
            <option value="ENVOYE">Envoyé</option>
            <option value="SIGNE">Signé</option>
          </select>
        </div>
      </Card>

      {/* Liste */}
      {loading ? (
        <Card className="p-12 flex items-center justify-center">
          <Spinner />
        </Card>
      ) : clients.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Building2}
            title="Aucun client encodé"
            description="Commence par ajouter ton premier client via le bouton ci-dessus."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/50 text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Société</th>
                  <th className="px-4 py-3 text-left font-medium">Représentant</th>
                  <th className="px-4 py-3 text-left font-medium">Centre</th>
                  <th className="px-4 py-3 text-left font-medium">Formule</th>
                  <th className="px-4 py-3 text-right font-medium">Mensuel HT</th>
                  <th className="px-4 py-3 text-center font-medium">Compte</th>
                  <th className="px-4 py-3 text-center font-medium">Contrat</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/clients/${c.id}`} className="font-medium text-text hover:text-gold-600">
                        {c.societeDenomination}
                      </Link>
                      <p className="text-2xs text-text-subtle">{c.formeJuridique} · BCE {c.bce}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text">{c.prenom} {c.nom}</p>
                      <p className="text-2xs text-text-subtle truncate max-w-[200px]">{c.emailPerso}</p>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{c.center.name}</td>
                    <td className="px-4 py-3 text-text-muted">{FORMULE_LABELS[c.formule]}</td>
                    <td className="px-4 py-3 text-right font-medium nums-tabular">
                      {formatCurrency(c.montantHt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CompteBadge status={c.compteStatut} lastLogin={c.user?.lastPortalLoginAt ?? null} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ContratBadge status={c.contratStatut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Actions contextuelles selon le statut */}
                        {c.compteStatut === 'NON_CREE' && (
                          <button
                            onClick={() => createAccount(c.id)}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-info-soft text-info hover:bg-info/20 disabled:opacity-50 transition-colors"
                            title="Crée le compte et envoie l'email d'activation"
                          >
                            {busyId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                            Compte
                          </button>
                        )}
                        {c.contratStatut === 'NON_GENERE' && (
                          <button
                            onClick={() => generateContract(c.id)}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-gold-50 text-gold-700 hover:bg-gold-100 dark:bg-gold-900/30 dark:text-gold-400 disabled:opacity-50 transition-colors"
                            title="Génère le PDF et l'envoie par email"
                          >
                            {busyId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                            Contrat
                          </button>
                        )}
                        {c.contratStatut === 'ENVOYE' && (
                          <button
                            onClick={() => uploadSigned(c.id)}
                            disabled={busyId === c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-success-soft text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
                            title="Téléverse le contrat signé par le client"
                          >
                            {busyId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Signé
                          </button>
                        )}

                        {/* Menu kebab : voir / editer / supprimer */}
                        <ActionMenu
                          items={[
                            {
                              label: 'Voir le détail',
                              icon: Eye,
                              onClick: () => router.push(`/dashboard/clients/${c.id}`),
                            },
                            {
                              label: 'Modifier',
                              icon: Edit,
                              onClick: () => router.push(`/dashboard/clients/${c.id}/edit`),
                            },
                            {
                              label: 'Supprimer',
                              icon: Trash2,
                              danger: true,
                              onClick: () => setConfirmDeleteId(c),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog confirmation suppression */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={deleteClient}
        loading={busyId === confirmDeleteId?.id}
        title="Supprimer le client ?"
        description={
          confirmDeleteId
            ? `Cette action supprimera définitivement ${confirmDeleteId.societeDenomination} (${confirmDeleteId.prenom} ${confirmDeleteId.nom}) et tous ses contrats. Le compte utilisateur lié sera conservé mais détaché. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer définitivement"
        tone="danger"
      />
    </div>
  )
}
