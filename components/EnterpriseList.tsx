'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Building, Plus, Eye, Edit, Trash2, MapPin, Calendar, Mail as MailIcon,
  Phone, Pause, Play, XCircle, FileText, Receipt, Package as PackageIcon,
  Inbox, ExternalLink, Download,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, DataTable, ActionMenu, FilterBar, Pagination,
  Drawer, ConfirmDialog, Button, Select, StatusBadge, Avatar,
} from '@/components/ui'
import type { Column } from '@/components/ui'
import toast from 'react-hot-toast'

interface Enterprise {
  id: string
  name: string
  legalForm: string | null
  siret: string | null
  status: string
  domiciliationDate: string | null
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string
  city: string
  postalCode: string
  country: string
  createdAt: string
  center: { id: string; name: string } | null
}

const PAGE_SIZE = 10

interface Props {
  forcedStatus?: 'active' | 'suspended' | 'terminated'
  title?: string
  description?: string
}

export default function EnterpriseList({ forcedStatus, title, description }: Props) {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(forcedStatus || 'all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Enterprise | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Enterprise | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [acting, setActing] = useState(false)

  const fetchData = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    const effective = forcedStatus || statusFilter
    if (effective !== 'all') params.set('status', effective)
    params.set('limit', String(PAGE_SIZE))
    params.set('page', String(page))
    setLoading(true)
    fetch(`/api/enterprises?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => {
        setEnterprises(d.enterprises || [])
        setTotal(d.total || 0)
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchData, [searchTerm, statusFilter, page, forcedStatus])
  useEffect(() => setPage(1), [searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeCount = enterprises.filter(e => e.status === 'ACTIVE').length
  const suspendedCount = enterprises.filter(e => e.status === 'SUSPENDED').length
  const terminatedCount = enterprises.filter(e => e.status === 'TERMINATED').length

  const updateStatus = async (e: Enterprise, status: string) => {
    setActing(true)
    try {
      const res = await fetch(`/api/enterprises/${e.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Entreprise mise à jour`)
      fetchData()
      setSelected(null)
    } catch {
      toast.error('Erreur')
    } finally {
      setActing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/enterprises/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success(`${confirmDelete.name} supprimée`)
      setConfirmDelete(null)
      fetchData()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Enterprise>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Entreprise',
      sortable: true,
      render: e => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-ink-700 to-ink-900 inline-flex items-center justify-center text-white shadow-soft">
            <Building className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-text truncate">{e.name}</p>
            <p className="text-xs text-text-subtle truncate">
              {e.legalForm || '—'}{e.siret ? ` · ${e.siret}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: e => (
        <div className="text-xs">
          <p className="text-text">{e.contactPerson || '—'}</p>
          {e.email && <p className="text-text-subtle truncate max-w-[200px]">{e.email}</p>}
        </div>
      ),
    },
    {
      key: 'center',
      header: 'Centre',
      sortable: true,
      sortValue: e => e.center?.name || '',
      render: e =>
        e.center ? (
          <span className="inline-flex items-center gap-1 text-sm text-text">
            <MapPin className="h-3 w-3 text-text-subtle" />
            {e.center.name}
          </span>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: e => <StatusBadge status={e.status} />,
    },
    {
      key: 'domiciliationDate',
      header: 'Domiciliation',
      sortable: true,
      align: 'right',
      sortValue: e => new Date(e.domiciliationDate || e.createdAt).getTime(),
      render: e => (
        <span className="text-xs text-text-muted nums-tabular">
          {new Date(e.domiciliationDate || e.createdAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: '60px',
      align: 'right',
      render: e => (
        <ActionMenu
          items={[
            { label: 'Voir détails', icon: Eye, onClick: () => setSelected(e) },
            { label: 'Page complète', icon: ExternalLink, href: `/dashboard/entreprises/${e.id}` },
            'divider',
            ...(e.status === 'ACTIVE'
              ? [
                  { label: 'Suspendre', icon: Pause, onClick: () => updateStatus(e, 'SUSPENDED') },
                  { label: 'Résilier', icon: XCircle, onClick: () => updateStatus(e, 'TERMINATED') },
                ]
              : [{ label: 'Réactiver', icon: Play, onClick: () => updateStatus(e, 'ACTIVE') }]),
            'divider',
            { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(e) },
          ]}
        />
      ),
    },
  ], [])

  const chips = []
  if (!forcedStatus && statusFilter !== 'all') {
    chips.push({
      label: { active: 'Actives', suspended: 'Suspendues', terminated: 'Résiliées' }[statusFilter] || statusFilter,
      value: 'status',
      onRemove: () => setStatusFilter('all'),
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title={title || 'Entreprises'}
        description={description || 'Domiciliation et suivi des entreprises clientes'}
        actions={
          <>
            <Button variant="secondary" iconLeft={<Download className="h-4 w-4" />}>
              Exporter
            </Button>
            <Link href="/dashboard/entreprises/nouveau">
              <Button iconLeft={<Plus className="h-4 w-4" />}>Nouvelle entreprise</Button>
            </Link>
          </>
        }
      />

      {!forcedStatus && (
        <StatGrid cols={4}>
          <KpiCard label="Total" value={total} icon={Building} tone="electric" loading={loading && enterprises.length === 0} />
          <KpiCard label="Actives" value={activeCount} icon={Building} tone="success" loading={loading && enterprises.length === 0} />
          <KpiCard label="Suspendues" value={suspendedCount} icon={Building} tone="warning" loading={loading && enterprises.length === 0} />
          <KpiCard label="Résiliées" value={terminatedCount} icon={Building} tone="danger" loading={loading && enterprises.length === 0} />
        </StatGrid>
      )}

      <FilterBar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par nom, SIRET ou email..."
        chips={chips}
        filters={
          !forcedStatus ? (
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="!h-9 w-auto min-w-[140px]">
              <option value="all">Tous statuts</option>
              <option value="active">Actives</option>
              <option value="suspended">Suspendues</option>
              <option value="terminated">Résiliées</option>
            </Select>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={enterprises}
        loading={loading}
        loadingRows={6}
        onRowClick={e => setSelected(e)}
        emptyTitle="Aucune entreprise"
        emptyDescription="Aucun résultat ne correspond à votre recherche."
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      {/* Drawer détails */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? `${selected.legalForm || 'Entreprise'} · ${selected.city}` : undefined}
        size="lg"
        footer={
          selected ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>
              <Link href={`/dashboard/entreprises/${selected.id}`} className="ml-auto">
                <Button variant="secondary" iconLeft={<ExternalLink className="h-4 w-4" />}>
                  Page complète
                </Button>
              </Link>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* Status + meta */}
            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} size="md" />
              <span className="text-xs text-text-muted">
                Domiciliée le {new Date(selected.domiciliationDate || selected.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>

            {/* Section : Informations légales */}
            <section>
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-subtle mb-3">
                Informations légales
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-text-muted">Raison sociale</dt>
                  <dd className="text-text font-medium mt-0.5">{selected.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Forme juridique</dt>
                  <dd className="text-text mt-0.5">{selected.legalForm || '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-text-muted">SIRET / TVA</dt>
                  <dd className="text-text mt-0.5 font-mono text-xs">{selected.siret || '—'}</dd>
                </div>
              </dl>
            </section>

            {/* Section : Contact */}
            <section>
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-subtle mb-3">
                Contact
              </h3>
              <div className="space-y-2.5">
                {selected.contactPerson && (
                  <div className="flex items-center gap-3 text-sm">
                    <Avatar name={selected.contactPerson} size="sm" />
                    <span className="text-text font-medium">{selected.contactPerson}</span>
                  </div>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-sm hover:text-text transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-info-soft text-info inline-flex items-center justify-center">
                      <MailIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-text-muted hover:text-text">{selected.email}</span>
                  </a>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-sm hover:text-text transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-success-soft text-success inline-flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-text-muted hover:text-text">{selected.phone}</span>
                  </a>
                )}
              </div>
            </section>

            {/* Section : Adresse */}
            <section>
              <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-subtle mb-3">
                Adresse
              </h3>
              <div className="card bg-surface-2/40 p-4">
                <p className="text-sm text-text">{selected.address}</p>
                <p className="text-sm text-text-muted">
                  {selected.postalCode} {selected.city} · {selected.country}
                </p>
                {selected.center && (
                  <p className="text-xs text-text-subtle mt-2 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Centre : {selected.center.name}
                  </p>
                )}
              </div>
            </section>

            {/* Section : Actions */}
            {selected.status !== 'TERMINATED' && (
              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-subtle mb-3">
                  Changer de statut
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selected.status !== 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="primary"
                      iconLeft={<Play className="h-3.5 w-3.5" />}
                      onClick={() => updateStatus(selected, 'ACTIVE')}
                      loading={acting}
                    >
                      Réactiver
                    </Button>
                  )}
                  {selected.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      iconLeft={<Pause className="h-3.5 w-3.5" />}
                      onClick={() => updateStatus(selected, 'SUSPENDED')}
                      loading={acting}
                    >
                      Suspendre
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    iconLeft={<XCircle className="h-3.5 w-3.5" />}
                    onClick={() => updateStatus(selected, 'TERMINATED')}
                    loading={acting}
                  >
                    Résilier
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer "${confirmDelete?.name}" ?`}
        description="Cette action est irréversible. Toutes les données associées (factures, abonnements, courriers) seront perdues."
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
