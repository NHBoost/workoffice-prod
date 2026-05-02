'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Send, Plus, Mail, Eye, MousePointer, Calendar, Users, Edit, Trash2,
  Play, Sparkles,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, FilterBar, ConfirmDialog, Button,
  Card, Badge, StatusBadge, EmptyState, Spinner, ActionMenu,
} from '@/components/ui'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  _count: { recipients: number }
  sentCount: number
  openedCount: number
  clickedCount: number
}

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100))

export default function MailingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState<Campaign | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null)

  const fetchCampaigns = () => {
    setLoading(true)
    fetch('/api/mailing')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setCampaigns(d.campaigns || []))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }
  useEffect(fetchCampaigns, [])

  const sendNow = async () => {
    if (!confirmSend) return
    setActingId(confirmSend.id)
    try {
      const res = await fetch(`/api/mailing/${confirmSend.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Campagne envoyée`)
      setConfirmSend(null)
      fetchCampaigns()
    } catch {
      toast.error('Erreur')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setActingId(confirmDelete.id)
    try {
      const res = await fetch(`/api/mailing/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Campagne supprimée')
      setConfirmDelete(null)
      fetchCampaigns()
    } catch {
      toast.error('Erreur')
    } finally {
      setActingId(null)
    }
  }

  const filtered = campaigns.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  )

  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
  const totalOpened = campaigns.reduce((s, c) => s + c.openedCount, 0)
  const totalClicked = campaigns.reduce((s, c) => s + c.clickedCount, 0)
  const totalRecipients = campaigns.reduce((s, c) => s + c._count.recipients, 0)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Mailing"
        description="Créez, envoyez et suivez vos campagnes email"
        actions={
          <Link href="/dashboard/mailing/nouveau">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Nouvelle campagne</Button>
          </Link>
        }
      />

      <StatGrid cols={4}>
        <KpiCard label="Campagnes" value={campaigns.length} icon={Send} tone="electric" loading={loading} />
        <KpiCard label="Destinataires" value={totalRecipients} icon={Users} tone="info" loading={loading} />
        <KpiCard
          label="Taux ouverture"
          value={`${pct(totalOpened, totalSent)}%`}
          sublabel={`${totalOpened} ouvertures`}
          icon={Eye}
          tone="success"
          loading={loading}
        />
        <KpiCard
          label="Taux clic"
          value={`${pct(totalClicked, totalSent)}%`}
          sublabel={`${totalClicked} clics`}
          icon={MousePointer}
          tone="gold"
          loading={loading}
        />
      </StatGrid>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher une campagne..."
      />

      {loading ? (
        <div className="card p-12 text-center">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Send}
            title="Aucune campagne"
            description="Lance ta première campagne pour engager tes domiciliés et augmenter ton CA."
            action={
              <Link href="/dashboard/mailing/nouveau">
                <Button iconLeft={<Plus className="h-4 w-4" />}>Créer ma première campagne</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(c => {
            const openRate = pct(c.openedCount, c.sentCount)
            const clickRate = pct(c.clickedCount, c.sentCount)

            return (
              <Card key={c.id} variant="default" className="group p-6 hover:shadow-soft-md transition-all duration-300">
                {/* Header card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Link href={`/dashboard/mailing/${c.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-electric-50 text-electric-600 dark:bg-electric-900/30 dark:text-electric-400 inline-flex items-center justify-center group-hover:bg-electric-600 group-hover:text-white transition-colors">
                        <Mail className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-md font-semibold tracking-tight text-text truncate">{c.name}</h3>
                    </div>
                    <p className="text-xs text-text-muted truncate ml-11 italic">"{c.subject}"</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status} />
                    <ActionMenu
                      items={[
                        { label: 'Voir détails', icon: Eye, href: `/dashboard/mailing/${c.id}` },
                        ...(c.status === 'DRAFT'
                          ? [{ label: 'Envoyer maintenant', icon: Play, onClick: () => setConfirmSend(c) }]
                          : []),
                        'divider',
                        { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(c) },
                      ]}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 py-4 border-y border-border">
                  <div className="text-center">
                    <Users className="h-3.5 w-3.5 mx-auto text-text-subtle mb-1" />
                    <p className="text-md font-semibold text-text nums-tabular">{c._count.recipients}</p>
                    <p className="text-2xs text-text-subtle">destinataires</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <Eye className="h-3.5 w-3.5 mx-auto text-success mb-1" />
                    <p className="text-md font-semibold text-text nums-tabular">{openRate}%</p>
                    <p className="text-2xs text-text-subtle">ouverture</p>
                  </div>
                  <div className="text-center">
                    <MousePointer className="h-3.5 w-3.5 mx-auto text-gold-500 mb-1" />
                    <p className="text-md font-semibold text-text nums-tabular">{clickRate}%</p>
                    <p className="text-2xs text-text-subtle">clic</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 mt-4">
                  <div className="text-xs text-text-muted flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {c.sentAt
                      ? `Envoyée le ${new Date(c.sentAt).toLocaleDateString('fr-FR')}`
                      : c.scheduledAt
                      ? `Programmée pour le ${new Date(c.scheduledAt).toLocaleDateString('fr-FR')}`
                      : `Créée le ${new Date(c.createdAt).toLocaleDateString('fr-FR')}`}
                  </div>
                  {c.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="primary"
                      iconLeft={<Play className="h-3.5 w-3.5" />}
                      onClick={() => setConfirmSend(c)}
                    >
                      Envoyer
                    </Button>
                  )}
                </div>

                {/* Performance bar (visuelle) */}
                {c.status === 'SENT' && c.sentCount > 0 && (
                  <div className="mt-4 -mx-6 -mb-6 px-6 py-3 bg-surface-2/40 border-t border-border">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="h-3 w-3 text-gold-500" />
                      <span className="text-2xs font-medium text-text-muted uppercase tracking-wider">Performance</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-surface">
                      <div
                        className="bg-success transition-all"
                        style={{ width: `${openRate}%` }}
                        title={`${openRate}% ouverture`}
                      />
                      <div
                        className="bg-gold-500 transition-all"
                        style={{ width: `${Math.min(clickRate, 100 - openRate)}%` }}
                        title={`${clickRate}% clic`}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmSend}
        onClose={() => setConfirmSend(null)}
        onConfirm={sendNow}
        title={`Envoyer "${confirmSend?.name}" ?`}
        description={`La campagne sera envoyée à ${confirmSend?._count.recipients} destinataire(s). Cette action est irréversible.`}
        confirmLabel="Envoyer maintenant"
        tone="info"
        loading={!!actingId}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer "${confirmDelete?.name}" ?`}
        description="La campagne et tous les destinataires associés seront supprimés."
        confirmLabel="Supprimer"
        tone="danger"
        loading={!!actingId}
      />
    </div>
  )
}
