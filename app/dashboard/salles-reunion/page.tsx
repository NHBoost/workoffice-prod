'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Plus,
  Search,
  Users,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react'
import { parseJsonArray } from '@/lib/json-array'

interface MeetingRoom {
  id: string
  name: string
  description: string | null
  capacity: number
  equipment: string
  hourlyRate: number
  isActive: boolean
  createdAt: string
  center: { id: string; name: string } | null
  _count?: { reservations: number }
}

export default function MeetingRoomsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)

    setLoading(true)
    fetch(`/api/meeting-rooms?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setRooms(data.rooms || [])
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des salles'))
      .finally(() => setLoading(false))
  }, [searchTerm])

  const stats = [
    { title: 'Total salles', value: rooms.length, icon: CalendarDays, color: 'blue' },
    { title: 'Actives', value: rooms.filter(r => r.isActive).length, icon: CalendarDays, color: 'green' },
    {
      title: 'Capacité totale',
      value: rooms.reduce((sum, r) => sum + r.capacity, 0),
      icon: Users, color: 'purple',
    },
    {
      title: 'Réservations',
      value: rooms.reduce((sum, r) => sum + (r._count?.reservations || 0), 0),
      icon: CalendarDays, color: 'orange',
    },
  ]

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const cls: Record<string, string> = {
      blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
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
          <h1 className="text-2xl font-bold text-gray-900">Salles de réunion</h1>
          <p className="text-gray-600">Gérez le catalogue de vos salles et leurs équipements</p>
        </div>
        <Link href="/dashboard/salles-reunion/ajouter" className="btn-primary">
          <Plus className="h-5 w-5" />
          Ajouter une salle
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="card">
        <div className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une salle..."
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
          {rooms.length === 0 && (
            <div className="col-span-full card p-12 text-center text-gray-500">
              Aucune salle trouvée.
            </div>
          )}
          {rooms.map(room => {
            const equipment = parseJsonArray(room.equipment)
            return (
              <div key={room.id} className="card hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{room.description || '—'}</p>
                    </div>
                    <span className={`status-badge ${room.isActive ? 'status-active' : 'bg-gray-100 text-gray-700'}`}>
                      {room.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      Capacité : <span className="ml-1 font-medium text-gray-900">{room.capacity} pers.</span>
                    </div>
                    {room.center && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        {room.center.name}
                      </div>
                    )}
                  </div>

                  {equipment.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Équipements</p>
                      <div className="flex flex-wrap gap-1">
                        {equipment.map((eq, i) => (
                          <span key={i} className="px-2 py-1 text-xs bg-gray-100 rounded">{eq}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Tarif</p>
                      <p className="text-lg font-bold text-primary-600">{room.hourlyRate.toFixed(2)} €/h</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
