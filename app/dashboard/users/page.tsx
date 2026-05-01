'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Loader2,
} from 'lucide-react'

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

const roleLabel = (r: string) =>
  ({ ADMIN: 'Administrateur', MANAGER: 'Gestionnaire', USER: 'Utilisateur' }[r] || r)
const roleColor = (r: string) =>
  ({
    ADMIN: 'bg-red-100 text-red-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    USER: 'bg-gray-100 text-gray-800',
  }[r] || 'bg-gray-100 text-gray-800')

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'MANAGER' | 'USER'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (roleFilter !== 'all') params.set('role', roleFilter)
    params.set('limit', '50')

    setLoading(true)
    fetch(`/api/users?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        setUsers(data.users || [])
        setTotal(data.total || 0)
        setError(null)
      })
      .catch(() => setError('Erreur lors du chargement des utilisateurs'))
      .finally(() => setLoading(false))
  }, [searchTerm, statusFilter, roleFilter])

  const stats = [
    { title: 'Total Utilisateurs', value: total, icon: Users, color: 'blue' },
    { title: 'Actifs', value: users.filter(u => u.isActive).length, icon: Users, color: 'green' },
    { title: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, icon: UserPlus, color: 'purple' },
    { title: 'Inactifs', value: users.filter(u => !u.isActive).length, icon: Users, color: 'orange' },
  ]

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
    }
    return (
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString('fr-FR')}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Gérez les utilisateurs de votre plateforme</p>
        </div>
        <Link href="/dashboard/users/add" className="btn-primary">
          <UserPlus className="h-5 w-5" />
          Ajouter un utilisateur
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 form-input"
                />
              </div>
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="form-input">
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="form-input">
              <option value="all">Tous les rôles</option>
              <option value="ADMIN">Administrateur</option>
              <option value="MANAGER">Gestionnaire</option>
              <option value="USER">Utilisateur</option>
            </select>
            <button className="btn-secondary">
              <Download className="h-4 w-4" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Utilisateur</th>
                  <th className="table-header">Rôle</th>
                  <th className="table-header">Centre</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Créé le</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Aucun utilisateur trouvé.</td></tr>
                )}
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {(user.name || user.email).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name || '—'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`status-badge ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
                    </td>
                    <td className="table-cell">{user.center?.name || '—'}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${user.isActive ? 'status-active' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 text-gray-400 hover:text-gray-600"><Eye className="h-4 w-4" /></button>
                        <button className="p-1 text-gray-400 hover:text-gray-600"><Edit className="h-4 w-4" /></button>
                        <button className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {users.length} utilisateur(s) affiché(s) sur {total}
          </div>
        </div>
      </div>
    </div>
  )
}
