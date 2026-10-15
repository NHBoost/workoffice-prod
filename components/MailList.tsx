'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Mail, Plus, CheckCircle, Inbox, RotateCcw, Trash2, Building, MapPin,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, FilterBar, DataTable, ActionMenu,
  ConfirmDialog, Button, Select, StatusBadge,
} from '@/components/ui'
import type { Column } from '@/components/ui'
import toast from 'react-hot-toast'

interface MailItem {
  id: string
  recipient: string
  sender: string | null
  status: string
  receivedAt: string
  collectedAt: string | null
  notes: string | null
  enterprise: { id: string; name: string } | null
  center: { id: string; name: string } | null
}

interface Props {
  forcedStatus?: 'received' | 'collected' | 'returned'
  title?: string
  description?: string
}

export default function MailList({ forcedStatus, title, description }: Props) {
  const [mails, setMails] = useState<MailItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(forcedStatus || 'all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MailItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchMails = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const eff = forcedStatus || statusFilter
    if (eff !== 'all') params.set('status', eff)
    setLoading(true)
    fetch(`/api/mails?${params.toString()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setMails(d.mails || []))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchMails, [search, statusFilter, forcedStatus])

  const markCollected = async (m: MailItem) => {
    setUpdatingId(m.id)
    try {
      const res = await fetch(`/api/mails/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COLLECTED' }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Courrier marqué récupéré`)
      fetchMails()
    } catch {
      toast.error('Erreur')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/mails/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Courrier supprimé')
      setConfirmDelete(null)
      fetchMails()
    } catch {
      toast.error('Erreur')
    } finally {
      setDeleting(false)
    }
  }

  const stats = {
    total: mails.length,
    received: mails.filter(m => m.status === 'RECEIVED').length,
    collected: mails.filter(m => m.status === 'COLLECTED').length,
    returned: mails.filter(m => m.status === 'RETURNED').length,
  }

  const columns: Column<MailItem>[] = useMemo(() => [
    {
      key: 'recipient',
      header: 'Destinataire',
      sortable: true,
      render: m => (
        <div>
          <p className="font-medium text-text">{m.recipient}</p>
          {m.notes && <p className="text-2xs text-text-subtle truncate max-w-[200px]">{m.notes}</p>}
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Expéditeur',
      sortable: true,
      render: m => <span className="text-sm text-text-muted">{m.sender || '—'}</span>,
    },
    {
      key: 'enterprise',
      header: 'Entreprise',
      sortable: true,
      sortValue: m => m.enterprise?.name || '',
      render: m => m.enterprise ? (
        <span className="inline-flex items-center gap-1 text-sm">
          <Building className="h-3 w-3 text-text-subtle" />
          {m.enterprise.name}
        </span>
      ) : (
        <span className="text-text-subtle">Personnel</span>
      ),
    },
    {
      key: 'receivedAt',
      header: 'Reçu',
      sortable: true,
      sortValue: m => new Date(m.receivedAt).getTime(),
      render: m => (
        <span className="text-xs text-text-muted nums-tabular">
          {new Date(m.receivedAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'collectedAt',
      header: 'Récupéré',
      render: m => m.collectedAt ? (
        <span className="text-xs text-success nums-tabular">
          {new Date(m.collectedAt).toLocaleDateString('fr-FR')}
        </span>
      ) : (
        <span className="text-2xs text-text-subtle">—</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: m => <StatusBadge status={m.status} />,
    },
    {
      key: '_actions',
      header: '',
      width: '60px',
      align: 'right',
      render: m => (
        <ActionMenu
          items={[
            ...(m.status !== 'COLLECTED'
              ? [{ label: 'Marquer récupéré', icon: CheckCircle, onClick: () => markCollected(m) }]
              : []),
            'divider',
            { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(m) },
          ]}
        />
      ),
    },
  ], [])

  const chips = []
  if (!forcedStatus && statusFilter !== 'all') {
    chips.push({
      label: { received: 'Reçus', collected: 'Récupérés', returned: 'Retournés' }[statusFilter] || statusFilter,
      value: 'status',
      onRemove: () => setStatusFilter('all'),
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title={title || 'Courriers'}
        description={description || 'Gestion du courrier reçu pour les entreprises domiciliées'}
        actions={
          <Link href="/dashboard/courriers/nouveau">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Enregistrer un courrier</Button>
          </Link>
        }
      />

      <StatGrid cols={4}>
        <KpiCard label="Total" value={stats.total} icon={Mail} tone="electric" loading={loading} />
        <KpiCard label="Reçus" value={stats.received} icon={Inbox} tone="warning" loading={loading} />
        <KpiCard label="Récupérés" value={stats.collected} icon={CheckCircle} tone="success" loading={loading} />
        <KpiCard label="Retournés" value={stats.returned} icon={RotateCcw} tone="neutral" loading={loading} />
      </StatGrid>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par destinataire ou expéditeur..."
        chips={chips}
        filters={
          !forcedStatus ? (
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="!h-9 w-auto min-w-[140px]">
              <option value="all">Tous statuts</option>
              <option value="received">Reçus</option>
              <option value="collected">Récupérés</option>
              <option value="returned">Retournés</option>
            </Select>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={mails}
        loading={loading}
        loadingRows={5}
        emptyTitle="Aucun courrier"
        emptyDescription="Aucun courrier ne correspond à votre recherche."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer ce courrier ?`}
        description={`Le courrier de ${confirmDelete?.recipient} sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
