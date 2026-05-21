'use client'

import { useState, useEffect, useMemo } from 'react'
import { getCachedData, setCachedData } from '@/lib/client-cache'
import Link from 'next/link'
import {
  UserPlus, Eye, Edit, Trash2, Download, Mail as MailIcon, Phone,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, DataTable, ActionMenu, FilterBar,
  Pagination, RoleBadge, Avatar, Badge, Select, Button,
} from '@/components/ui'
import { Users as UsersIcon, CheckCircle2, UserX, UserPlus as UserPlusIcon } from 'lucide-react'
import type { Column } from '@/components/ui'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string | null
  email: string
  role: 'ADMIN' | 'MANAGER' | 'USER' | string
  isActive: boolean
  createdAt: string
  phone: string | null
  center: { id: string; name: string } | null
}

const PAGE_SIZE = 10

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const cacheKey = `users-list:${search}:${statusFilter}:${roleFilter}:${page}`
  const cached = typeof window !== 'undefined' ? getCachedData<{users: User[], total: number}>(cacheKey, 2 * 60_000) : null
  const [users, setUsers] = useState<User[]>(cached?.users ?? [])
  const [total, setTotal] = useState(cached?.total ?? 0)
  const [loading, setLoading] = useState(!cached)

  const fetchUsers = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (roleFilter !== 'all') params.set('role', roleFilter)
    params.set('limit', String(PAGE_SIZE))
    params.set('page', String(page))
    fetch(`/api/users?${params.toString()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => {
        const list = d.users || []
        setUsers(list)
        setTotal(d.total || 0)
        setCachedData(cacheKey, { users: list, total: d.total || 0 })
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchUsers, [search, statusFilter, roleFilter, page])

  // Reset page sur changement de filtre
  useEffect(() => setPage(1), [search, statusFilter, roleFilter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeCount = users.filter(u => u.isActive).length
  const adminCount = users.filter(u => u.role === 'ADMIN').length

  const columns: Column<User>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Utilisateur',
      sortable: true,
      sortValue: u => u.name || u.email,
      render: u => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} email={u.email} size="md" />
          <div className="min-w-0">
            <p className="font-medium text-text truncate">{u.name || '—'}</p>
            <p className="text-xs text-text-subtle truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      sortable: true,
      render: u => <RoleBadge role={u.role} />,
    },
    {
      key: 'center',
      header: 'Centre',
      sortable: true,
      sortValue: u => u.center?.name || '',
      render: u =>
        u.center ? (
          <span className="text-sm">{u.center.name}</span>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: u => (
        <div className="flex flex-col gap-0.5 text-2xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <MailIcon className="h-3 w-3" />
            {u.email}
          </span>
          {u.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {u.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Statut',
      sortable: true,
      sortValue: u => (u.isActive ? 1 : 0),
      render: u =>
        u.isActive ? (
          <Badge tone="success" size="sm" dot>Actif</Badge>
        ) : (
          <Badge tone="neutral" size="sm">Inactif</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Inscription',
      sortable: true,
      align: 'right',
      render: u => (
        <span className="text-xs text-text-muted nums-tabular">
          {new Date(u.createdAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: '60px',
      align: 'right',
      render: u => (
        <ActionMenu
          items={[
            { label: 'Voir le profil', icon: Eye, onClick: () => toast('Détail à venir') },
            { label: 'Modifier', icon: Edit, onClick: () => toast('Edition à venir') },
            'divider',
            { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => toast.error('Suppression à venir') },
          ]}
        />
      ),
    },
  ], [])

  // Filtres actifs (chips)
  const chips = []
  if (statusFilter !== 'all') {
    chips.push({
      label: statusFilter === 'active' ? 'Actifs' : 'Inactifs',
      value: 'status',
      onRemove: () => setStatusFilter('all'),
    })
  }
  if (roleFilter !== 'all') {
    chips.push({
      label: { ADMIN: 'Admins', MANAGER: 'Managers', USER: 'Utilisateurs' }[roleFilter] || roleFilter,
      value: 'role',
      onRemove: () => setRoleFilter('all'),
    })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes utilisateurs et leurs permissions"
        actions={
          <>
            <Button variant="secondary" iconLeft={<Download className="h-4 w-4" />}>
              Exporter
            </Button>
            <Link href="/dashboard/users/add">
              <Button iconLeft={<UserPlus className="h-4 w-4" />}>
                Ajouter un utilisateur
              </Button>
            </Link>
          </>
        }
      />

      <StatGrid cols={4} gap="md">
        <KpiCard
          label="Total utilisateurs"
          value={total}
          icon={UsersIcon}
          tone="electric"
          loading={loading && users.length === 0}
        />
        <KpiCard
          label="Actifs"
          value={activeCount}
          sublabel={`${total > 0 ? Math.round((activeCount / total) * 100) : 0}% de l'effectif`}
          icon={CheckCircle2}
          tone="success"
          loading={loading && users.length === 0}
        />
        <KpiCard
          label="Administrateurs"
          value={adminCount}
          icon={UserPlusIcon}
          tone="gold"
          loading={loading && users.length === 0}
        />
        <KpiCard
          label="Inactifs"
          value={total - activeCount}
          icon={UserX}
          tone="neutral"
          loading={loading && users.length === 0}
        />
      </StatGrid>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par nom ou email..."
        chips={chips}
        onReset={() => {
          setStatusFilter('all')
          setRoleFilter('all')
        }}
        filters={
          <>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="!h-9 w-auto min-w-[140px]"
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </Select>
            <Select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="!h-9 w-auto min-w-[140px]"
            >
              <option value="all">Tous rôles</option>
              <option value="ADMIN">Administrateurs</option>
              <option value="MANAGER">Managers</option>
              <option value="USER">Utilisateurs</option>
            </Select>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        loadingRows={6}
        emptyTitle="Aucun utilisateur"
        emptyDescription="Aucun résultat ne correspond à votre recherche."
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
