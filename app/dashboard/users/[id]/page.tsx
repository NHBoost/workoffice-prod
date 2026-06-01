'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit, Trash2, User as UserIcon, Mail, Phone,
  Shield, MapPin, Clock, AlertTriangle, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, Badge, RoleBadge, Avatar, Spinner, EmptyState, ConfirmDialog } from '@/components/ui'

interface UserDetail {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: 'ADMIN' | 'MANAGER' | 'USER' | string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  lastPortalLoginAt: string | null
  failedLoginAttempts: number
  lockedUntil: string | null
  center: { id: string; name: string; city: string } | null
  client: { id: string; societeDenomination: string } | null
}

const dt = (d: string | null) => d
  ? new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  : '—'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-2xs font-medium text-text-muted uppercase tracking-wide col-span-1">{label}</span>
      <span className="text-sm text-text col-span-2">
        {value || <span className="text-text-subtle italic">—</span>}
      </span>
    </div>
  )
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${params.id}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Utilisateur introuvable')
        if (res.status === 404) router.push('/dashboard/users')
        return
      }
      setUser(body)
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => { fetchUser() }, [fetchUser])

  const handleDelete = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${params.id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || 'Suppression échouée')
        return
      }
      toast.success('Utilisateur supprimé')
      router.push('/dashboard/users')
      router.refresh()
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    )
  }

  const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/users" className="btn btn-ghost mt-1">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <div className="flex items-center gap-4">
            <Avatar name={user.name} email={user.email} size="lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tighter text-text">
                {user.name || user.email}
              </h1>
              <p className="text-sm text-text-muted">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                {user.isActive
                  ? <Badge tone="success" size="sm" dot>Actif</Badge>
                  : <Badge tone="neutral" size="sm">Inactif</Badge>}
                {isLocked && (
                  <Badge tone="danger" size="sm" className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Verrouillé
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/dashboard/users?edit=${user.id}`} className="btn btn-secondary">
            <Edit className="h-4 w-4" />
            Modifier
          </Link>
          <button onClick={() => setConfirmDelete(true)} className="btn btn-danger">
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1+2 : Infos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <UserIcon className="h-4 w-4 text-gold-600" />
              Informations personnelles
            </h2>
            <Row label="Nom" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Téléphone" value={user.phone} />
            <Row label="Rôle" value={<RoleBadge role={user.role} />} />
            <Row label="Centre" value={user.center ? `${user.center.name} — ${user.center.city}` : null} />
          </Card>

          {user.client && (
            <Card className="p-6">
              <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <MapPin className="h-4 w-4 text-gold-600" />
                Client lié
              </h2>
              <p className="text-sm">
                Cet utilisateur est le compte portail du client{' '}
                <Link href={`/dashboard/clients/${user.client.id}`}
                  className="font-medium text-gold-600 hover:underline">
                  {user.client.societeDenomination}
                </Link>
              </p>
            </Card>
          )}
        </div>

        {/* Col 3 : Activité */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Clock className="h-4 w-4 text-electric-600" />
              Activité
            </h2>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Créé le</span>
                <span className="text-text">{dt(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Modifié le</span>
                <span className="text-text">{dt(user.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Dernière connexion</span>
                <span className="text-text">{dt(user.lastLoginAt)}</span>
              </div>
              {user.role === 'USER' && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-muted">Dernière connexion portail</span>
                  <span className="text-text">{dt(user.lastPortalLoginAt)}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-md font-semibold text-text flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Shield className="h-4 w-4 text-info" />
              Sécurité
            </h2>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Tentatives ratées</span>
                <span className={user.failedLoginAttempts > 0 ? 'text-warning font-medium' : 'text-text'}>
                  {user.failedLoginAttempts}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Verrouillé jusqu'à</span>
                <span className={isLocked ? 'text-danger font-medium' : 'text-text'}>
                  {isLocked ? dt(user.lockedUntil) : 'Non'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={busy}
        title="Supprimer l'utilisateur ?"
        description={`Cette action supprimera définitivement le compte de ${user.name || user.email}. Si l'utilisateur est lié à un client, le lien sera rompu mais le client reste. Action irréversible.`}
        confirmLabel="Supprimer définitivement"
        tone="danger"
      />
    </div>
  )
}
