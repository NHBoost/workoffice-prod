'use client'

import { useState, useEffect } from 'react'
import { getCachedData, setCachedData } from '@/lib/client-cache'
import Link from 'next/link'
import {
  MapPin, Plus, Building, Users, CalendarDays, Laptop, Edit, Trash2,
  Phone, Mail as MailIcon, ExternalLink,
} from 'lucide-react'
import {
  PageHeader, KpiCard, StatGrid, FilterBar, Card, Badge, Spinner,
  EmptyState, Button, ActionMenu, ConfirmDialog,
} from '@/components/ui'
import toast from 'react-hot-toast'

interface Center {
  id: string
  name: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string | null
  email: string | null
  isActive: boolean
  _count?: {
    enterprises: number
    meetingRooms: number
    coworkingSpaces: number
    users: number
  }
}

export default function CentersPage() {
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Center | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Cache localStorage : centres changent rarement, 5 min OK
  const cacheKey = `centers-list:${search}`
  const cached = typeof window !== 'undefined' ? getCachedData<Center[]>(cacheKey, 5 * 60_000) : null
  const [centers, setCenters] = useState<Center[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const fetchCenters = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    fetch(`/api/centers?${params.toString()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => {
        const list = d.centers || []
        setCenters(list)
        setCachedData(cacheKey, list)
      })
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }
  useEffect(fetchCenters, [search])

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/centers/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erreur')
        return
      }
      toast.success('Centre supprimé')
      setConfirmDelete(null)
      fetchCenters()
    } catch {
      toast.error('Erreur')
    } finally {
      setDeleting(false)
    }
  }

  const total = centers.length
  const totalEnterprises = centers.reduce((s, c) => s + (c._count?.enterprises || 0), 0)
  const totalRooms = centers.reduce((s, c) => s + (c._count?.meetingRooms || 0), 0)
  const totalUsers = centers.reduce((s, c) => s + (c._count?.users || 0), 0)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Centres"
        description="Gestion multi-centres : domiciliation, salles et espaces coworking"
        actions={
          <Link href="/dashboard/centers/nouveau">
            <Button iconLeft={<Plus className="h-4 w-4" />}>Nouveau centre</Button>
          </Link>
        }
      />

      <StatGrid cols={4}>
        <KpiCard label="Centres" value={total} icon={MapPin} tone="electric" loading={loading} />
        <KpiCard label="Entreprises domiciliées" value={totalEnterprises} icon={Building} tone="success" loading={loading} />
        <KpiCard label="Salles" value={totalRooms} icon={CalendarDays} tone="gold" loading={loading} />
        <KpiCard label="Utilisateurs" value={totalUsers} icon={Users} tone="info" loading={loading} />
      </StatGrid>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un centre par nom ou ville..."
      />

      {loading ? (
        <Card className="p-12 text-center"><Spinner size="lg" /></Card>
      ) : centers.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={MapPin}
            title="Aucun centre"
            description="Crée ton premier centre pour démarrer."
            action={
              <Link href="/dashboard/centers/nouveau">
                <Button iconLeft={<Plus className="h-4 w-4" />}>Créer un centre</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {centers.map(c => (
            <Card key={c.id} variant="default" className="overflow-hidden group hover:shadow-soft-md transition-all duration-300">
              {/* Header avec gradient */}
              <div className="relative h-28 bg-gradient-to-br from-electric-600 via-electric-700 to-ink-800 overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(201,162,39,0.6) 0, transparent 50%)',
                }} />
                <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
                  {c.isActive ? (
                    <Badge tone="success" size="sm" dot className="!bg-white/15 !text-white !ring-white/20 backdrop-blur">
                      Actif
                    </Badge>
                  ) : (
                    <Badge tone="neutral" size="sm" className="!bg-white/15 !text-white !ring-white/20 backdrop-blur">
                      Inactif
                    </Badge>
                  )}
                  <ActionMenu
                    align="right"
                    trigger={
                      <div className="h-8 w-8 rounded-md bg-white/10 backdrop-blur ring-1 ring-white/20 inline-flex items-center justify-center text-white">
                        <Edit className="h-3.5 w-3.5" />
                      </div>
                    }
                    items={[
                      { label: 'Voir détails', icon: ExternalLink, href: `/dashboard/centers/${c.id}` },
                      { label: 'Modifier', icon: Edit, href: `/dashboard/centers/${c.id}/edit` },
                      'divider',
                      { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => setConfirmDelete(c) },
                    ]}
                  />
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-lg font-semibold tracking-tight text-white">{c.name}</h3>
                  <p className="text-2xs text-white/70 inline-flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {c.city}, {c.country}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Address */}
                <p className="text-xs text-text-muted leading-relaxed">
                  {c.address}<br />
                  {c.postalCode} {c.city}
                </p>

                {/* Contact */}
                {(c.email || c.phone) && (
                  <div className="space-y-1.5">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-2xs text-text-muted hover:text-text transition-colors">
                        <MailIcon className="h-3 w-3" />
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-2xs text-text-muted hover:text-text transition-colors">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </a>
                    )}
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <Building className="h-3.5 w-3.5 mx-auto text-text-subtle mb-1" />
                    <p className="text-md font-semibold text-text nums-tabular">{c._count?.enterprises || 0}</p>
                    <p className="text-2xs text-text-subtle">Entreprises</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <CalendarDays className="h-3.5 w-3.5 mx-auto text-text-subtle mb-1" />
                    <p className="text-md font-semibold text-text nums-tabular">{c._count?.meetingRooms || 0}</p>
                    <p className="text-2xs text-text-subtle">Salles</p>
                  </div>
                  <div className="text-center">
                    <Users className="h-3.5 w-3.5 mx-auto text-text-subtle mb-1" />
                    <p className="text-md font-semibold text-text nums-tabular">{c._count?.users || 0}</p>
                    <p className="text-2xs text-text-subtle">Users</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={`Supprimer "${confirmDelete?.name}" ?`}
        description="Cette action est irréversible. Toutes les ressources liées seront affectées."
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
