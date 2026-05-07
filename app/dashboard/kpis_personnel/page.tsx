'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Euro, Users, Calendar,
  Building, Package, Mail, Loader2,
} from 'lucide-react'

interface KPIs {
  summary: {
    totalRevenue: number
    lastMonthRevenue: number
    revenueGrowth: number
    totalUsers: number
    activeUsers: number
    totalReservations: number
    totalPackages: number
    totalMails: number
  }
  revenuePerMonth: { month: string; revenue: number }[]
  newEnterprises: { month: string; count: number }[]
  enterprisesByStatus: { name: string; value: number; color: string }[]
  reservationsPerCenter: { center: string; count: number }[]
  subscriptionsByType: { type: string; count: number; revenue: number }[]
}

const COLORS = ['#C9A227', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#EA580C']

export default function KPIsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/kpis')
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then(setKpis)
      .catch(() => setError('Erreur de chargement des KPIs'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }
  if (error || !kpis) {
    return <div className="p-6"><div className="card p-6 bg-red-50 text-red-700">{error}</div></div>
  }

  const { summary } = kpis

  const StatCard = ({ title, value, icon: Icon, color, sub }: any) => {
    const cls: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
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
        <h1 className="text-2xl font-bold text-gray-900">KPIs & Analytics</h1>
        <p className="text-gray-600">Vue d’ensemble des indicateurs clés de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Chiffre d’affaires (12 mois)"
          value={`${summary.totalRevenue.toLocaleString('fr-FR')} €`}
          icon={Euro}
          color="green"
          sub={
            <span className={summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
              {summary.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(summary.revenueGrowth)} % vs mois précédent
            </span>
          }
        />
        <StatCard
          title="Utilisateurs actifs"
          value={summary.activeUsers}
          icon={Users}
          color="blue"
          sub={`${summary.totalUsers} utilisateurs au total`}
        />
        <StatCard
          title="Réservations totales"
          value={summary.totalReservations}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Colis + courriers traités"
          value={summary.totalPackages + summary.totalMails}
          icon={Package}
          color="orange"
          sub={`${summary.totalPackages} colis · ${summary.totalMails} courriers`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue area chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Revenus mensuels</h2>
              <p className="text-sm text-gray-500">Factures payées (12 derniers mois)</p>
            </div>
            <div className="flex items-center text-sm text-green-600">
              {summary.revenueGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
              )}
              {summary.revenueGrowth}%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={kpis.revenuePerMonth}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `${v} €`} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} €`} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#C9A227"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Nouvelles entreprises bar chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Nouvelles entreprises</h2>
          <p className="text-sm text-gray-500 mb-4">Domiciliations par mois</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kpis.newEnterprises}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Statuts entreprises pie chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Répartition des entreprises</h2>
          <p className="text-sm text-gray-500 mb-4">Par statut actuel</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={kpis.enterprisesByStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }: any) => `${name} (${Math.round(percent * 100)}%)`}
              >
                {kpis.enterprisesByStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Réservations par centre */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Réservations par centre</h2>
          <p className="text-sm text-gray-500 mb-4">Taux d’utilisation des salles</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kpis.reservationsPerCenter} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="center" stroke="#9ca3af" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#16A34A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Abonnements par type */}
      {kpis.subscriptionsByType.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Abonnements actifs par type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.subscriptionsByType.map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">{s.type}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {s.revenue.toLocaleString('fr-FR')} € de revenu mensuel
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
