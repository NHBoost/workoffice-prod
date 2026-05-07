'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Loader2, Calendar, Euro, TrendingUp, Clock } from 'lucide-react'

interface Reservation {
  id: string
  totalAmount: number
  startTime: string
  endTime: string
  status: string
  meetingRoom: { id: string; name: string }
  user: { id: string; name: string | null }
}

const COLORS = ['#C9A227', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#EA580C']

export default function MeetingRoomStatsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reservations')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(d => setReservations(d.reservations || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  // Agrégations
  const totalRevenue = reservations.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + r.totalAmount, 0)
  const totalHours = reservations
    .filter(r => r.status !== 'CANCELLED')
    .reduce((s, r) => s + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3600000, 0)
  const confirmed = reservations.filter(r => r.status === 'CONFIRMED').length
  const cancelled = reservations.filter(r => r.status === 'CANCELLED').length

  // Réservations par salle
  const byRoom: Record<string, { name: string; count: number; hours: number; revenue: number }> = {}
  reservations
    .filter(r => r.status !== 'CANCELLED')
    .forEach(r => {
      const k = r.meetingRoom.name
      if (!byRoom[k]) byRoom[k] = { name: k, count: 0, hours: 0, revenue: 0 }
      byRoom[k].count++
      byRoom[k].hours += (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3600000
      byRoom[k].revenue += r.totalAmount
    })
  const roomData = Object.values(byRoom).map(r => ({
    ...r,
    hours: Math.round(r.hours * 10) / 10,
  }))

  // Statuts pie
  const statusData = [
    { name: 'Confirmées', value: confirmed, color: '#16A34A' },
    { name: 'En attente', value: reservations.filter(r => r.status === 'PENDING').length, color: '#2563EB' },
    { name: 'Annulées', value: cancelled, color: '#DC2626' },
  ].filter(s => s.value > 0)

  // Réservations par jour (7 derniers jours)
  const weekData: { day: string; count: number }[] = []
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const count = reservations.filter(r => {
      const t = new Date(r.startTime)
      return t >= d && t < next && r.status !== 'CANCELLED'
    }).length
    weekData.push({ day: days[d.getDay()], count })
  }

  const StatCard = ({ title, value, icon: Icon, color, sub }: any) => {
    const cls: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      purple: 'bg-purple-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques des salles</h1>
        <p className="text-gray-600">Analyse de l’utilisation des salles de réunion</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Réservations totales"
          value={reservations.length}
          icon={Calendar}
          color="blue"
          sub={`${confirmed} confirmées · ${cancelled} annulées`}
        />
        <StatCard
          title="Chiffre d’affaires"
          value={`${totalRevenue.toLocaleString('fr-FR')} €`}
          icon={Euro}
          color="green"
        />
        <StatCard
          title="Heures réservées"
          value={`${Math.round(totalHours)} h`}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Taux de conversion"
          value={`${reservations.length === 0 ? 0 : Math.round((confirmed / reservations.length) * 100)} %`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Réservations par salle</h2>
          <p className="text-sm text-gray-500 mb-4">Nombre et heures cumulées</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roomData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#C9A227" name="Réservations" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hours" fill="#2563EB" name="Heures" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Statuts</h2>
          <p className="text-sm text-gray-500 mb-4">Répartition des réservations</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }: any) => `${name} (${Math.round(percent * 100)}%)`}
              >
                {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Activité 7 derniers jours</h2>
          <p className="text-sm text-gray-500 mb-4">Nombre de réservations par jour</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tableau revenus par salle */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenus par salle</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="table-header">Salle</th>
              <th className="table-header text-right">Réservations</th>
              <th className="table-header text-right">Heures</th>
              <th className="table-header text-right">Chiffre d’affaires</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {roomData.map(r => (
              <tr key={r.name}>
                <td className="table-cell font-medium">{r.name}</td>
                <td className="table-cell text-right">{r.count}</td>
                <td className="table-cell text-right">{r.hours} h</td>
                <td className="table-cell text-right font-semibold">{r.revenue.toLocaleString('fr-FR')} €</td>
              </tr>
            ))}
            {roomData.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">Aucune donnée</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
