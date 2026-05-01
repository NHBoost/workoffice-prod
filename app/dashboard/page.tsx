'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Building,
  Package,
  Mail,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Loader2,
} from 'lucide-react'

interface DashboardStats {
  users: { total: number; active: number }
  enterprises: { total: number; active: number; suspended: number }
  packages: { total: number }
  mail: { total: number }
  reservations: { total: number }
  revenue: { total: number }
}

interface RecentEnterprise {
  id: string
  name: string
  status: string
  domiciliationDate?: string | null
  createdAt: string
}

interface RecentUser {
  id: string
  name: string | null
  email: string
  createdAt: string
}

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '-'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [enterprises, setEnterprises] = useState<RecentEnterprise[]>([])
  const [users, setUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => {
        if (!r.ok) throw new Error('stats')
        return r.json()
      }),
      fetch('/api/dashboard/recent').then(r => {
        if (!r.ok) throw new Error('recent')
        return r.json()
      }),
    ])
      .then(([s, r]) => {
        setStats(s)
        setEnterprises(r.enterprises || [])
        setUsers(r.users || [])
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des données'))
      .finally(() => setLoading(false))
  }, [])

  const StatCard = ({
    title, value, change, icon: Icon, color = 'blue',
  }: {
    title: string; value: number | string; change?: number; icon: any; color?: string
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      indigo: 'bg-indigo-500',
      pink: 'bg-pink-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            </p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-4 flex items-center">
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ml-1 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-gray-500 ml-2">par rapport au mois dernier</span>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600">Aperçu en temps réel de votre plateforme de coworking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Utilisateurs" value={stats?.users.total ?? 0} icon={Users} color="blue" />
        <StatCard title="Entreprises actives" value={stats?.enterprises.active ?? 0} icon={Building} color="green" />
        <StatCard title="Colis" value={stats?.packages.total ?? 0} icon={Package} color="purple" />
        <StatCard title="Courriers" value={stats?.mail.total ?? 0} icon={Mail} color="orange" />
        <StatCard title="Réservations" value={stats?.reservations.total ?? 0} icon={CalendarDays} color="indigo" />
        <StatCard
          title="Chiffre d'affaires"
          value={`${((stats?.revenue.total ?? 0) / 1000).toFixed(1)}k €`}
          icon={TrendingUp}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Entreprises domiciliées</h3>
              <button className="text-gray-400 hover:text-gray-500">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {enterprises.length === 0 && (
                <p className="text-sm text-gray-500">Aucune entreprise enregistrée.</p>
              )}
              {enterprises.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(e.domiciliationDate || e.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`status-badge ${
                      e.status === 'ACTIVE'
                        ? 'status-active'
                        : e.status === 'SUSPENDED'
                        ? 'status-suspended'
                        : 'status-terminated'
                    }`}
                  >
                    {e.status === 'ACTIVE'
                      ? 'Actif'
                      : e.status === 'SUSPENDED'
                      ? 'Suspendu'
                      : 'Résilié'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Utilisateurs récents</h3>
              <button className="text-gray-400 hover:text-gray-500">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {users.length === 0 && (
                <p className="text-sm text-gray-500">Aucun utilisateur enregistré.</p>
              )}
              {users.map(u => (
                <div key={u.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {(u.name || u.email).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400">{formatDate(u.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { name: 'Utilisateurs', icon: Users, href: '/dashboard/users' },
              { name: 'Entreprises', icon: Building, href: '/dashboard/entreprises' },
              { name: 'Salles', icon: CalendarDays, href: '/dashboard/salles-reunion' },
              { name: 'Colis', icon: Package, href: '/dashboard/colis' },
              { name: 'Courriers', icon: Mail, href: '/dashboard/courriers' },
              { name: 'Facturation', icon: TrendingUp, href: '/dashboard/facturation' },
              { name: 'Paramètres', icon: MoreVertical, href: '/dashboard/settings' },
            ].map(action => (
              <a
                key={action.name}
                href={action.href}
                className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <action.icon className="h-8 w-8 text-gray-600 mb-2" />
                <span className="text-sm text-gray-900 text-center">{action.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
