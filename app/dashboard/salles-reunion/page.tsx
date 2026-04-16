'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Plus,
  Users,
  Clock,
  Euro,
  Wifi,
  Monitor,
  Coffee,
  Projector,
  MoreVertical,
  Settings,
  BarChart3
} from 'lucide-react'

interface MeetingRoom {
  id: string
  name: string
  capacity: number
  hourlyRate: number
  equipment: string[]
  isActive: boolean
  reservationsToday: number
  occupancyRate: number
  monthlyRevenue: number
  image?: string
}

const mockRooms: MeetingRoom[] = [
  {
    id: '1',
    name: 'Créative',
    capacity: 8,
    hourlyRate: 25,
    equipment: ['WiFi', 'Écran TV', 'Projecteur', 'Whiteboard'],
    isActive: true,
    reservationsToday: 3,
    occupancyRate: 75,
    monthlyRevenue: 1250,
  },
  {
    id: '2',
    name: 'Efficace',
    capacity: 6,
    hourlyRate: 20,
    equipment: ['WiFi', 'Écran TV', 'Webcam'],
    isActive: true,
    reservationsToday: 2,
    occupancyRate: 60,
    monthlyRevenue: 890,
  },
  {
    id: '3',
    name: 'Virtuo',
    capacity: 12,
    hourlyRate: 35,
    equipment: ['WiFi', 'Écran TV', 'Projecteur', 'Système de visioconférence', 'Whiteboard'],
    isActive: true,
    reservationsToday: 4,
    occupancyRate: 85,
    monthlyRevenue: 1850,
  },
  {
    id: '4',
    name: 'Liberty',
    capacity: 4,
    hourlyRate: 15,
    equipment: ['WiFi', 'Écran TV'],
    isActive: true,
    reservationsToday: 1,
    occupancyRate: 45,
    monthlyRevenue: 560,
  },
  {
    id: '5',
    name: 'Versatile',
    capacity: 10,
    hourlyRate: 30,
    equipment: ['WiFi', 'Écran TV', 'Projecteur', 'Système audio', 'Whiteboard'],
    isActive: true,
    reservationsToday: 3,
    occupancyRate: 70,
    monthlyRevenue: 1340,
  },
  {
    id: '6',
    name: 'Élégant',
    capacity: 8,
    hourlyRate: 28,
    equipment: ['WiFi', 'Écran TV', 'Webcam', 'Machine à café'],
    isActive: false,
    reservationsToday: 0,
    occupancyRate: 0,
    monthlyRevenue: 0,
  }
]

const stats = [
  { title: 'Salles disponibles', value: 6, icon: CalendarDays, color: 'blue' },
  { title: 'Réservations aujourd\'hui', value: 13, icon: Clock, color: 'green' },
  { title: 'Taux d\'occupation', value: '67%', icon: BarChart3, color: 'purple' },
  { title: 'Revenus mensuels', value: '5,8k €', icon: Euro, color: 'orange' },
]

const equipmentIcons: { [key: string]: any } = {
  'WiFi': Wifi,
  'Écran TV': Monitor,
  'Machine à café': Coffee,
  'Projecteur': Projector,
  'Webcam': Monitor,
  'Système de visioconférence': Monitor,
  'Système audio': Monitor,
  'Whiteboard': Monitor,
}

export default function MeetingRoomsPage() {
  const [rooms, setRooms] = useState<MeetingRoom[]>(mockRooms)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    }

    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    )
  }

  const RoomCard = ({ room }: { room: MeetingRoom }) => (
    <div className={`card ${!room.isActive ? 'opacity-60' : ''}`}>
      <div className="p-6">
        {/* Room Image Placeholder */}
        <div className="w-full h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
          <CalendarDays className="h-12 w-12 text-gray-400" />
        </div>

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Users className="h-4 w-4 mr-1" />
              {room.capacity} personnes
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary-600">{room.hourlyRate}€/h</div>
            {!room.isActive && (
              <div className="text-xs text-red-600">Indisponible</div>
            )}
          </div>
        </div>

        {/* Equipment */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {room.equipment.slice(0, 3).map((item) => {
              const IconComponent = equipmentIcons[item] || Monitor
              return (
                <div key={item} className="flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  <IconComponent className="h-3 w-3 mr-1" />
                  {item}
                </div>
              )
            })}
            {room.equipment.length > 3 && (
              <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                +{room.equipment.length - 3} autres
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <div className="text-gray-500">Aujourd'hui</div>
            <div className="font-medium">{room.reservationsToday} réservations</div>
          </div>
          <div>
            <div className="text-gray-500">Taux d'occupation</div>
            <div className="font-medium">{room.occupancyRate}%</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Link
            href={`/dashboard/salles-reunion/${room.id}/reservations`}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Voir réservations
          </Link>
          <div className="flex items-center space-x-2">
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <Settings className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <BarChart3 className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salles de Réunion</h1>
          <p className="text-gray-600">Gérez vos espaces de réunion et leurs réservations</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/dashboard/salles-reunion/reservations" className="btn-secondary">
            <CalendarDays className="h-4 w-4" />
            Réservations
          </Link>
          <Link href="/dashboard/salles-reunion/statistiques" className="btn-secondary">
            <BarChart3 className="h-4 w-4" />
            Statistiques
          </Link>
          <Link href="/dashboard/salles-reunion/ajouter" className="btn-primary">
            <Plus className="h-4 w-4" />
            Ajouter une salle
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {rooms.filter(r => r.isActive).length} salles disponibles
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
          >
            <div className="grid grid-cols-2 gap-1 w-4 h-4">
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
            </div>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400'}`}
          >
            <div className="space-y-1 w-4 h-4">
              <div className="bg-current h-1 rounded"></div>
              <div className="bg-current h-1 rounded"></div>
              <div className="bg-current h-1 rounded"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className={`grid gap-6 ${
        viewMode === 'grid'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1'
      }`}>
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  )
}