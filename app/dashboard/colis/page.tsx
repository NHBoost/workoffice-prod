'use client'

import { useEffect, useState, useMemo } from 'react'
import { getCachedData, setCachedData } from '@/lib/client-cache'
import Link from 'next/link'
import {
  Package, Plus, CheckCircle, Inbox, RotateCcw, Trash2, Building, MapPin,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, FilterBar, DataTable, ActionMenu,
  ConfirmDialog, Button, Select, StatusBadge,
} from '@/components/ui'
import type { Column } from '@/components/ui'
import toast from 'react-hot-toast'

interface PackageItem {
  id: string
  tracking: string
  recipient: string
  sender: string | null
  status: string
  receivedAt: string
  collectedAt: string | null
  notes: string | null
  enterprise: { id: string; name: string } | null
  center: { id: string; name: string } | null
}

export default function PackagesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PackageItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const cacheKey = `packages-list:${search}:${statusFilter}`
  const cached = typeof window !== 'undefined' ? getCachedData<PackageItem[]>(cacheKey, 60_000) : null
  const [packages, setPackages] = useState<PackageItem[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const fetchPackages = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    fetch(`/api/packages?${params.toString()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => {
        const list = d.packages || []
        setPackages(list)
        setCachedData(cacheKey, list)
      })
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }
  useEffect(fetchPackages, [search, statusFilter])

  const markCollected = async (p: PackageItem) => {
    setUpdatingId(p.id)
    try {
      const res = await fetch(`/api/packages/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COLLECTED' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Colis marqué récupéré')
      fetchPackages()
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
      const res = await fetch(`/api/packages/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Colis supprimé')
      setConfirmDelete(null)
      fetchPackages()
    } catch {
      toast.error('Erreur')
    } finally {
      setDeleting(false)
    }
  }

  const stats = {
    total: packages.length,
    received: packages.filter(p => p.status === 'RECEIVED').length,
    collected: packages.filter(p => p.status === 'COLLECTED').length,
    returned: packages.filter(p => p.status === 'RETURNED').length,
  }

  const columns: Column<PackageItem>[] = useMemo(() => [
    {
      key: 'tracking',
      header: 'N° Tracking',
      sortable: true,
      render: p => <span className="font-mono text-2xs font-medium text-text">{p.tracking}</span>,
    },
    {
      key: 'recipient',
      header: 'Destinataire',
      sortable: true,
      render: p => (
        <div>
          <p className="font-medium text-text">{p.recipient}</p>
          {p.notes && <p className="text-2xs text-text-subtle truncate max-w-[200px]">{p.notes}</p>}
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Expéditeur',
      render: p => <span className="text-sm text-text-muted">{p.sender || '—'}</span>,
    },
    {
      key: 'enterprise',
      header: 'Entreprise',
      sortable: true,
      sortValue: p => p.enterprise?.name || '',
      render: p => p.enterprise ? (
        <span className="inline-flex items-center gap-1 text-sm">
          <Building className="h-3 w-3 text-text-subtle" />
          {p.enterprise.name}
        </span>
      ) : (
        <span className="text-text-subtle">Personnel</span>
      ),
    },
    {
      key: 'receivedAt',
      header: 'Reçu',
      sortable: true,
      sortValue: p => new Date(p.receivedAt).getTime(),
      render: p => (
        <span className="text-xs text-text-muted nums-tabular">
          {new Date(p.receivedAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: p => <StatusBadge status={p.status} />,
    },
    {
      key: '_actions',
      header: '',
      width: '60px',
      align: 'right',
      render: p => (
        <ActionMenu
          items={[
            ...(p.status !== 'COLLECTED'
              ? [{ label: 'Marquer récupéré', icon: CheckCircle, onClick: () => markCollected(p) }]
              : []),
            'divider',
            { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(p) },
          ]}
        />
      ),
    },
  ], [])

  const chips = []
  if (statusFilter !== 'all') {
    chips.push({
      label: { received: 'Reçus', collected: 'Récupérés', returned: 'Retournés' }[statusFilter] || statusFilter,
      value: 'status',
      onRemove: () => setStatusFilter('all'),
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Colis"
        description="Gestion des colis reçus pour les entreprises domiciliées"
        actions={
          <Link href="/dashboard/colis/nouveau">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Enregistrer un colis</Button>
          </Link>
        }
      />

      <StatGrid cols={4}>
        <KpiCard label="Total" value={stats.total} icon={Package} tone="electric" loading={loading} />
        <KpiCard label="Reçus" value={stats.received} icon={Inbox} tone="warning" loading={loading} />
        <KpiCard label="Récupérés" value={stats.collected} icon={CheckCircle} tone="success" loading={loading} />
        <KpiCard label="Retournés" value={stats.returned} icon={RotateCcw} tone="neutral" loading={loading} />
      </StatGrid>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par tracking, destinataire..."
        chips={chips}
        filters={
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="!h-9 w-auto min-w-[140px]">
            <option value="all">Tous statuts</option>
            <option value="received">Reçus</option>
            <option value="collected">Récupérés</option>
            <option value="returned">Retournés</option>
          </Select>
        }
      />

      <DataTable
        columns={columns}
        data={packages}
        loading={loading}
        emptyTitle="Aucun colis"
        emptyDescription="Commence par enregistrer un colis pour suivre les réceptions."
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer ce colis ?`}
        description={`Le colis ${confirmDelete?.tracking} sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
