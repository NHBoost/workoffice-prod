'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Building,
  Package,
  Mail,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical
} from 'lucide-react'

interface DashboardStats {
  users: { total: number; change: number }
  enterprises: { total: number; change: number }
  packages: { total: number; change: number }
  mail: { total: number; change: number }
  reservations: { total: number; change: number }
  revenue: { total: number; change: number }
}

const mockStats: DashboardStats = {
  users: { total: 2319, change: 12 },
  enterprises: { total: 2917, change: -3 },
  packages: { total: 3597, change: 8 },
  mail: { total: 149, change: 15 },
  reservations: { total: 156, change: 5 },
  revenue: { total: 85420, change: 7 }
}

const recentEnterprises = [
  { id: 1, name: 'GULFGUARD', status: 'active', date: '12/01/2024' },
  { id: 2, name: 'TECH CONSULTING', status: 'active', date: '11/01/2024' },
  { id: 3, name: 'INNOVATION LAB', status: 'suspended', date: '10/01/2024' },
  { id: 4, name: 'DIGITAL SOLUTIONS', status: 'active', date: '09/01/2024' },
  { id: 5, name: 'GREEN ENERGY', status: 'active', date: '08/01/2024' },
]

const recentUsers = [
  { id: 1, name: 'Jean Dupont', email: 'jean.dupont@example.com', enterprise: 'GULFGUARD' },
  { id: 2, name: 'Marie Martin', email: 'marie.martin@example.com', enterprise: 'TECH CONSULTING' },
  { id: 3, name: 'Pierre Durand', email: 'pierre.durand@example.com', enterprise: 'INNOVATION LAB' },
  { id: 4, name: 'Sophie Bernard', email: 'sophie.bernard@example.com', enterprise: 'DIGITAL SOLUTIONS' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(mockStats)

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = 'blue'
  }: {
    title: string
    value: number | string
    change: number
    icon: any
    color?: string
  }) => {
    const isPositive = change >= 0
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      indigo: 'bg-indigo-500',
      pink: 'bg-pink-500'
    }

    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ml-1 ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {Math.abs(change)}%
          </span>
          <span className="text-sm text-gray-500 ml-2">
            par rapport au mois dernier
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Administrateur</h1>
          <p className="text-gray-600">Aperçu de votre plateforme de coworking</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Utilisateurs"
          value={stats.users.total}
          change={stats.users.change}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Entreprises"
          value={stats.enterprises.total}
          change={stats.enterprises.change}
          icon={Building}
          color="green"
        />
        <StatCard
          title="Colis"
          value={stats.packages.total}
          change={stats.packages.change}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Courriers"
          value={stats.mail.total}
          change={stats.mail.change}
          icon={Mail}
          color="orange"
        />
        <StatCard
          title="Réservations"
          value={stats.reservations.total}
          change={stats.reservations.change}
          icon={CalendarDays}
          color="indigo"
        />
        <StatCard
          title="Chiffre d'affaires"
          value={`${(stats.revenue.total / 1000).toFixed(0)}k €`}
          change={stats.revenue.change}
          icon={TrendingUp}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Enterprises */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Entreprises domiciliées</h3>
              <button className="text-gray-400 hover:text-gray-500">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {recentEnterprises.map((enterprise) => (
                <div key={enterprise.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{enterprise.name}</p>
                      <p className="text-xs text-gray-500">{enterprise.date}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enterprise.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {enterprise.status === 'active' ? 'Actif' : 'Suspendu'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Utilisateurs récents</h3>
              <button className="text-gray-400 hover:text-gray-500">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400">{user.enterprise}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { name: 'Utilisateurs', icon: Users, href: '/dashboard/users' },
              { name: 'Entreprises', icon: Building, href: '/dashboard/entreprises' },
              { name: 'Facturation', icon: TrendingUp, href: '/dashboard/facturation' },
              { name: 'Courriers', icon: Mail, href: '/dashboard/courriers' },
              { name: 'Colis', icon: Package, href: '/dashboard/colis' },
              { name: 'Mailing', icon: Mail, href: '/dashboard/mailing' },
              { name: 'Paramètres', icon: MoreVertical, href: '/dashboard/settings' },
            ].map((action) => (
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