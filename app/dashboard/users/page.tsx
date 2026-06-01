'use client'

import { useState, useEffect, useMemo, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getCachedData, setCachedData } from '@/lib/client-cache'
import Link from 'next/link'
import {
  UserPlus, Eye, Edit, Trash2, Download, Mail as MailIcon, Phone, Loader2, Save,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, DataTable, ActionMenu, FilterBar,
  Pagination, RoleBadge, Avatar, Badge, Select, Button, Modal, ConfirmDialog,
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
  const router = useRouter()
  const { data: session } = useSession()
  const isManager = session?.user?.role === 'MANAGER'
  const isAdmin = session?.user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

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

  // === Actions sur un utilisateur ===
  const handleDelete = async () => {
    if (!confirmDelete) return
    setActingId(confirmDelete.id)
    try {
      const res = await fetch(`/api/users/${confirmDelete.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Suppression échouée')
        return
      }
      toast.success(`${confirmDelete.name || confirmDelete.email} supprimé`)
      setConfirmDelete(null)
      fetchUsers()
    } finally {
      setActingId(null)
    }
  }

  const handleUpdateUser = async (updates: { role?: string; isActive?: boolean; phone?: string | null }) => {
    if (!editUser) return
    setActingId(editUser.id)
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Mise à jour échouée')
        return
      }
      toast.success('Utilisateur mis à jour')
      setEditUser(null)
      fetchUsers()
    } finally {
      setActingId(null)
    }
  }

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
      render: u => {
        // Menu construit dynamiquement selon le role courant.
        // MANAGER ne peut pas supprimer (action reservee ADMIN).
        const items: any[] = [
          { label: 'Voir le profil', icon: Eye, onClick: () => router.push(`/dashboard/users/${u.id}`) },
          { label: 'Modifier le rôle', icon: Edit, onClick: () => setEditUser(u) },
        ]
        if (isAdmin) {
          items.push('divider', { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(u) })
        }
        return <ActionMenu items={items} />
      },
    },
  ], [router, isAdmin])

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
        description={isManager
          ? `Utilisateurs de votre centre uniquement`
          : 'Gérez les comptes utilisateurs et leurs permissions'}
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
        {isAdmin ? (
          <KpiCard
            label="Administrateurs"
            value={adminCount}
            icon={UserPlusIcon}
            tone="gold"
            loading={loading && users.length === 0}
          />
        ) : (
          <KpiCard
            label="Managers"
            value={users.filter(u => u.role === 'MANAGER').length}
            icon={UserPlusIcon}
            tone="gold"
            loading={loading && users.length === 0}
          />
        )}
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
              {isAdmin && <option value="ADMIN">Administrateurs</option>}
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

      {/* Modal édition rôle + statut */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleUpdateUser}
          submitting={actingId === editUser.id}
          canPromoteToAdmin={isAdmin}
        />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={actingId === confirmDelete?.id}
        title="Supprimer l'utilisateur ?"
        description={confirmDelete
          ? `Cette action supprimera définitivement ${confirmDelete.name || confirmDelete.email}. Si l'utilisateur est lié à un client portail, le lien sera rompu. Action irréversible.`
          : ''}
        confirmLabel="Supprimer définitivement"
        tone="danger"
      />
    </div>
  )
}

// ============================================================
// Modal d'édition rôle + statut + téléphone
// ============================================================

interface EditUserModalProps {
  user: User
  onClose: () => void
  onSave: (updates: { role?: string; isActive?: boolean; phone?: string | null }) => Promise<void>
  submitting: boolean
  canPromoteToAdmin: boolean // ADMIN seul peut promouvoir vers ADMIN
}

function EditUserModal({ user, onClose, onSave, submitting, canPromoteToAdmin }: EditUserModalProps) {
  const [role, setRole] = useState(user.role)
  const [isActive, setIsActive] = useState(user.isActive)
  const [phone, setPhone] = useState(user.phone ?? '')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const updates: any = {}
    if (role !== user.role) updates.role = role
    if (isActive !== user.isActive) updates.isActive = isActive
    if (phone !== (user.phone ?? '')) updates.phone = phone || null
    if (Object.keys(updates).length === 0) {
      toast('Aucune modification')
      onClose()
      return
    }
    await onSave(updates)
  }

  return (
    <Modal open onClose={onClose} title="Modifier l'utilisateur" size="md">
      <div className="mb-4 p-3 rounded-lg bg-surface-2 flex items-center gap-3">
        <Avatar name={user.name} email={user.email} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">{user.name || '—'}</p>
          <p className="text-xs text-text-muted truncate">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Rôle</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40"
          >
            <option value="USER">USER — Client (accès portail uniquement)</option>
            <option value="MANAGER">MANAGER — Staff (gère son centre)</option>
            {canPromoteToAdmin && (
              <option value="ADMIN">ADMIN — Administrateur (accès total)</option>
            )}
          </select>
          <p className="text-2xs text-text-subtle mt-1">
            ⚠️ Changer un USER → MANAGER ou ADMIN lui donne accès au dashboard admin.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+32 470 12 34 56"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface text-text outline-none focus:ring-2 focus:ring-gold-400/40"
          />
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-2 cursor-pointer hover:bg-surface-3 transition-colors">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-gold-600 focus:ring-gold-400/40"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">Compte actif</p>
            <p className="text-2xs text-text-muted mt-0.5">
              {isActive ? 'L\'utilisateur peut se connecter.' : 'L\'utilisateur ne peut plus se connecter.'}
            </p>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  )
}
