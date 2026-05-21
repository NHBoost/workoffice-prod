'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit, Trash2, Building2, User, MapPin, FileText,
  Download, UserPlus, Upload, Eye, EyeOff, AlertTriangle,
  Mail, Phone, Calendar, CreditCard, Shield, CheckCircle2,
  Clock, Loader2, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, Spinner, EmptyState, ConfirmDialog } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { FORMULE_LABELS, PERIODICITE_LABELS, type Formule, type Periodicite } from '@/lib/client-schemas'

interface ClientDetail {
  id: string
  societeDenomination: string
  formeJuridique: string
  bce: string
  numeroTva: string
  adresseSiege: string
  emailSociete: string
  telephoneSociete: string
  secteurActivite: string
  dateConstitution: string

  nom: string
  prenom: string
  fonction: string
  adressePersonnelle: string
  dateNaissance: string
  lieuNaissance: string
  nationalite: string
  numeroCi: string // masque ou clair selon ?reveal
  ciDebutValidite: string
  ciFinValidite: string
  registreNational: string
  emailPerso: string
  telephonePerso: string

  centerId: string
  formule: Formule
  periodicite: Periodicite
  dateDebut: string
  dureeMois: number
  montantHt: number
  tvaTaux: number

  compteStatut: 'NON_CREE' | 'CREE' | 'CONNECTE'
  contratStatut: 'NON_GENERE' | 'ENVOYE' | 'SIGNE'

  center: { id: string; name: string; city: string; address: string }
  user: { id: string; email: string; lastPortalLoginAt: string | null } | null
  contrats: Array<{
    id: string
    type: string
    pdfPath: string
    pdfPathSigne: string | null
    status: string
    sentAt: string
    signedAt: string | null
  }>
  createdAt: string
  updatedAt: string
}

// Helpers d'affichage
const fr = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dt = (d: string | null | undefined) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

// ============ Status badges ============
function CompteBadge({ status }: { status: ClientDetail['compteStatut'] }) {
  if (status === 'NON_CREE') return <Badge tone="neutral" size="sm">Compte non créé</Badge>
  if (status === 'CREE') return <Badge tone="info" size="sm">Compte créé</Badge>
  return <Badge tone="success" size="sm" className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Connecté</Badge>
}
function ContratBadge({ status }: { status: ClientDetail['contratStatut'] }) {
  if (status === 'NON_GENERE') return <Badge tone="neutral" size="sm">Non généré</Badge>
  if (status === 'ENVOYE') return <Badge tone="warning" size="sm">Envoyé</Badge>
  return <Badge tone="success" size="sm">Signé</Badge>
}

// ============ Field display row ============
function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-2xs font-medium text-text-muted uppercase tracking-wide col-span-1">{label}</span>
      <span className={cn('text-sm text-text col-span-2', mono && 'font-mono')}>
        {value || <span className="text-text-subtle italic">—</span>}
      </span>
    </div>
  )
}

// ============ Page ============
export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reveal, setReveal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const fetchClient = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${params.id}${reveal ? '?reveal=1' : ''}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Client introuvable')
        if (res.status === 404) router.push('/dashboard/clients')
        return
      }
      setClient(body)
    } finally {
      setLoading(false)
    }
  }, [params.id, reveal, router])

  useEffect(() => { fetchClient() }, [fetchClient])

  // === Actions ===
  const createAccount = async () => {
    setBusy('account')
    try {
      const res = await fetch(`/api/clients/${params.id}/account`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(body.error || 'Erreur'); return }
      if (body.emailSent) {
        toast.success('Compte créé — email envoyé ✓')
      } else if (body.setupUrl) {
        await navigator.clipboard.writeText(body.setupUrl).catch(() => {})
        toast.success('Compte créé. Lien copié dans le presse-papier.', { duration: 8000 })
      }
      fetchClient()
    } finally { setBusy(null) }
  }

  const generateContract = async () => {
    setBusy('contract')
    try {
      const res = await fetch(`/api/clients/${params.id}/contrat`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(body.error || 'Erreur'); return }
      if (body.emailSent) {
        toast.success('Contrat généré et envoyé ✓')
      } else if (body.downloadUrl) {
        window.open(body.downloadUrl, '_blank', 'noopener,noreferrer')
        toast.success('Contrat généré. PDF ouvert dans un nouvel onglet.', { duration: 8000 })
      }
      fetchClient()
    } finally { setBusy(null) }
  }

  const uploadSigned = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      setBusy('upload')
      try {
        const fd = new FormData()
        fd.append('pdf', file)
        const res = await fetch(`/api/clients/${params.id}/contrat/signed`, { method: 'POST', body: fd })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) { toast.error(body.error || 'Upload échoué'); return }
        toast.success('Contrat signé téléversé')
        fetchClient()
      } finally { setBusy(null) }
    }
    input.click()
  }

  const downloadContract = async (contract: ClientDetail['contrats'][0], signed = false) => {
    const url = `/api/clients/${params.id}/contrat?download=${contract.id}${signed ? '&signed=1' : ''}`
    // Pour simplifier, on appelle l'API qui retourne les URLs signees et on ouvre la bonne
    setBusy(`download-${contract.id}`)
    try {
      const res = await fetch(`/api/clients/${params.id}/contrat`)
      const body = await res.json()
      const c = body.contracts?.find((x: any) => x.id === contract.id)
      const link = signed ? c?.urlSigne : c?.url
      if (link) window.open(link, '_blank', 'noopener,noreferrer')
      else toast.error('PDF indisponible')
    } finally { setBusy(null) }
  }

  const deleteClient = async () => {
    setBusy('delete')
    try {
      const res = await fetch(`/api/clients/${params.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(body.error || 'Suppression échouée'); return }
      toast.success('Client supprimé')
      router.push('/dashboard/clients')
      router.refresh()
    } finally {
      setBusy(null)
      setConfirmDelete(false)
    }
  }

  if (loading || !client) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* === Header === */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/clients" className="btn btn-ghost mt-1">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tighter text-text">
              {client.societeDenomination}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {client.formeJuridique} · BCE {client.bce} · {client.center.name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <CompteBadge status={client.compteStatut} />
              <ContratBadge status={client.contratStatut} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/dashboard/clients/${client.id}/edit`} className="btn btn-secondary">
            <Edit className="h-4 w-4" />
            Modifier
          </Link>
          <button onClick={() => setConfirmDelete(true)} className="btn btn-danger">
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      {/* === Actions cockpit === */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {client.compteStatut === 'NON_CREE' && (
            <button onClick={createAccount} disabled={!!busy} className="btn btn-secondary">
              {busy === 'account' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Créer le compte
            </button>
          )}
          {client.contratStatut === 'NON_GENERE' && (
            <button onClick={generateContract} disabled={!!busy} className="btn btn-primary">
              {busy === 'contract' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Générer le contrat
            </button>
          )}
          {client.contratStatut === 'ENVOYE' && (
            <button onClick={uploadSigned} disabled={!!busy} className="btn btn-success">
              {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Téléverser le contrat signé
            </button>
          )}
          {client.contratStatut !== 'NON_GENERE' && (
            <button onClick={generateContract} disabled={!!busy} className="btn btn-ghost">
              {busy === 'contract' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Régénérer le contrat
            </button>
          )}
        </div>
      </Card>

      {/* === Layout 2 colonnes === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1+2 : sections A/B/C */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A */}
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Building2 className="h-4 w-4 text-gold-600" />
              Société
            </h2>
            <div className="space-y-0">
              <Row label="Dénomination" value={client.societeDenomination} />
              <Row label="Forme juridique" value={client.formeJuridique} />
              <Row label="BCE" value={client.bce} mono />
              <Row label="N° TVA" value={client.numeroTva} mono />
              <Row label="Siège social" value={client.adresseSiege} />
              <Row label="Email" value={client.emailSociete} />
              <Row label="Téléphone" value={client.telephoneSociete} />
              <Row label="Secteur" value={client.secteurActivite} />
              <Row label="Constitution" value={fr(client.dateConstitution)} />
            </div>
          </Card>

          {/* Section B */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h2 className="text-md font-semibold text-text flex items-center gap-2">
                <User className="h-4 w-4 text-gold-600" />
                Représentant légal
              </h2>
              <button
                onClick={() => setReveal(r => !r)}
                className="text-2xs text-text-muted hover:text-text inline-flex items-center gap-1"
                title="Affiche/masque les données sensibles (CI + Registre national)"
              >
                {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {reveal ? 'Masquer les données sensibles' : 'Révéler les données sensibles'}
              </button>
            </div>
            <div className="space-y-0">
              <Row label="Nom complet" value={`${client.prenom} ${client.nom}`} />
              <Row label="Fonction" value={client.fonction} />
              <Row label="Adresse personnelle" value={client.adressePersonnelle} />
              <Row label="Naissance" value={`${fr(client.dateNaissance)} à ${client.lieuNaissance}`} />
              <Row label="Nationalité" value={client.nationalite} />
              <Row label="N° CI" value={client.numeroCi} mono />
              <Row label="Validité CI" value={`${fr(client.ciDebutValidite)} → ${fr(client.ciFinValidite)}`} />
              <Row label="Registre national" value={client.registreNational} mono />
              <Row label="Email perso" value={client.emailPerso} />
              <Row label="Téléphone perso" value={client.telephonePerso} />
            </div>
          </Card>

          {/* Section C */}
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <MapPin className="h-4 w-4 text-gold-600" />
              Domiciliation
            </h2>
            <div className="space-y-0">
              <Row label="Centre" value={`${client.center.name} — ${client.center.city}`} />
              <Row label="Formule" value={FORMULE_LABELS[client.formule]} />
              <Row label="Périodicité" value={PERIODICITE_LABELS[client.periodicite]} />
              <Row label="Date de début" value={fr(client.dateDebut)} />
              <Row label="Durée" value={`${client.dureeMois} mois`} />
              <Row label={`Montant HT ${PERIODICITE_LABELS[client.periodicite]?.toLowerCase()}`} value={<span className="font-semibold">{formatCurrency(client.montantHt)}</span>} />
              <Row label="TVA" value={`${client.tvaTaux}%`} />
              <Row label="Garantie (2 mensualités HT)" value={formatCurrency(client.montantHt * 2)} />
            </div>
          </Card>
        </div>

        {/* Col 3 : compte + contrats + meta */}
        <div className="space-y-6">
          {/* Compte */}
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Shield className="h-4 w-4 text-electric-600" />
              Compte portail
            </h2>
            {client.user ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  {client.user.email}
                </div>
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  {client.user.lastPortalLoginAt
                    ? `Dernière connexion : ${dt(client.user.lastPortalLoginAt)}`
                    : 'Jamais connecté'}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={UserPlus}
                title="Compte non créé"
                description="Clique sur 'Créer le compte' ci-dessus pour envoyer une invitation."
                compact
              />
            )}
          </Card>

          {/* Contrats */}
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <FileText className="h-4 w-4 text-gold-600" />
              Historique contrats ({client.contrats.length})
            </h2>
            {client.contrats.length === 0 ? (
              <EmptyState icon={FileText} title="Aucun contrat" description="Génère le premier contrat ci-dessus." compact />
            ) : (
              <ul className="space-y-3">
                {client.contrats.map(c => (
                  <li key={c.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-text">
                        {FORMULE_LABELS[c.type as Formule] ?? c.type}
                      </span>
                      <ContratBadge status={c.status as any} />
                    </div>
                    <p className="text-2xs text-text-muted">Envoyé : {dt(c.sentAt)}</p>
                    {c.signedAt && <p className="text-2xs text-text-muted">Signé : {dt(c.signedAt)}</p>}
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => downloadContract(c, false)}
                        disabled={busy === `download-${c.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium rounded bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400 hover:bg-gold-100"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </button>
                      {c.pdfPathSigne && (
                        <button
                          onClick={() => downloadContract(c, true)}
                          disabled={busy === `download-${c.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium rounded bg-success-soft text-success hover:bg-success/20"
                        >
                          <Download className="h-3 w-3" /> Signé
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Méta */}
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text mb-4 pb-3 border-b border-border">Méta</h2>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Créé le</span>
                <span className="text-text">{dt(client.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Modifié le</span>
                <span className="text-text">{dt(client.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">ID</span>
                <span className="font-mono text-text-subtle">{client.id.slice(0, 8)}…</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* === Confirm delete dialog === */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteClient}
        loading={busy === 'delete'}
        title="Supprimer le client ?"
        description={`Cette action supprimera définitivement ${client.societeDenomination} et tous ses contrats. Le compte utilisateur lié sera conservé mais détaché. Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        tone="danger"
      />
    </div>
  )
}
