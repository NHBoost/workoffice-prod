'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Plus,
  Search,
  Building,
  Users,
  CalendarDays,
  Laptop,
  Edit,
  Trash2,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react'
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
  createdAt: string
  _count: {
    users: number
    enterprises: number
    meetingRooms: number
    coworkingSpaces: number
  }
}

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchCenters = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)

    setLoading(true)
    fetch(`/api/centers?${params.toString()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(data => {
        setCenters(data.centers || [])
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des centres'))
      .finally(() => setLoading(false))
  }

  useEffect(fetchCenters, [searchTerm])

  const handleDelete = async (center: Center) => {
    if (!confirm(`Supprimer le centre "${center.name}" ?`)) return
    setDeletingId(center.id)
    try {
      const res = await fetch(`/api/centers/${center.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Suppression impossible')
        return
      }
      toast.success(`Centre "${center.name}" supprimé`)
      fetchCenters()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeletingId(null)
    }
  }

  const totalUsers = centers.reduce((s, c) => s + c._count.users, 0)
  const totalEnterprises = centers.reduce((s, c) => s + c._count.enterprises, 0)
  const totalRooms = centers.reduce((s, c) => s + c._count.meetingRooms, 0)
  const totalSpaces = centers.reduce((s, c) => s + c._count.coworkingSpaces, 0)

  const stats = [
    { title: 'Centres', value: centers.length, icon: MapPin, color: 'blue' },
    { title: 'Utilisateurs', value: totalUsers, icon: Users, color: 'green' },
    { title: 'Entreprises', value: totalEnterprises, icon: Building, color: 'purple' },
    { title: 'Ressources', value: totalRooms + totalSpaces, icon: CalendarDays, color: 'orange' },
  ]

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const cls: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
          </div>
          <div className={`p-3 rounded-full ${cls[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centres</h1>
          <p className="text-gray-600">Gérez vos centres de coworking et de domiciliation</p>
        </div>
        <Link href="/dashboard/centers/nouveau" className="btn-primary">
          <Plus className="h-5 w-5" />
          Nouveau centre
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className="card">
        <div className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un centre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 form-input"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <div className="card p-6 bg-red-50 text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centers.length === 0 && (
            <div className="col-span-full card p-12 text-center text-gray-500">
              Aucun centre enregistré.
            </div>
          )}
          {centers.map(c => (
            <div key={c.id} className="card hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                    </div>
                  </div>
                  <span
                    className={`status-badge ${
                      c.isActive ? 'status-active' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {c.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p>{c.address}</p>
                  <p>
                    {c.postalCode} {c.city}
                  </p>
                  <p className="text-xs text-gray-500">{c.country}</p>
                </div>

                {(c.phone || c.email) && (
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    {c.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center truncate">
                        <Mail className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center pt-4 border-t border-gray-100">
                  <div>
                    <Users className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-900">{c._count.users}</p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div>
                    <Building className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-900">{c._count.enterprises}</p>
                    <p className="text-xs text-gray-500">Entr.</p>
                  </div>
                  <div>
                    <CalendarDays className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-900">{c._count.meetingRooms}</p>
                    <p className="text-xs text-gray-500">Salles</p>
                  </div>
                  <div>
                    <Laptop className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-900">{c._count.coworkingSpaces}</p>
                    <p className="text-xs text-gray-500">Cowork.</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                  <Link
                    href={`/dashboard/centers/${c.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.id}
                    className="p-2 text-red-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
