'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  enterprise?: string
  center?: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'JEAN FRANCOIS',
    email: 'jf@beacoon.be',
    role: 'USER',
    enterprise: 'BEACOON',
    center: 'Bruxelles Centre',
    isActive: true,
    createdAt: '2024-01-15',
    lastLogin: '2024-01-20'
  },
  {
    id: '2',
    name: 'Philippe Defraine',
    email: 'philippe.defraine@fauquet.be',
    role: 'MANAGER',
    enterprise: 'FAUQUET DEFRAINE',
    center: 'Liège',
    isActive: true,
    createdAt: '2024-01-14',
    lastLogin: '2024-01-19'
  },
  {
    id: '3',
    name: 'CUPPENS',
    email: 'cuppens@outlook.com',
    role: 'USER',
    enterprise: 'CUPPENS CONSULTING',
    center: 'Anvers',
    isActive: true,
    createdAt: '2024-01-13',
    lastLogin: '2024-01-18'
  },
  {
    id: '4',
    name: 'Marie Dubois',
    email: 'marie.dubois@techcorp.be',
    role: 'USER',
    enterprise: 'TECH CORP',
    center: 'Bruxelles Centre',
    isActive: false,
    createdAt: '2024-01-12',
    lastLogin: '2024-01-17'
  },
  {
    id: '5',
    name: 'Pierre Martin',
    email: 'pierre.martin@innovate.be',
    role: 'ADMIN',
    enterprise: 'INNOVATE SOLUTIONS',
    center: 'Gand',
    isActive: true,
    createdAt: '2024-01-11',
    lastLogin: '2024-01-16'
  },
]

const stats = [
  { title: 'Total Utilisateurs', value: 3514, icon: Users, color: 'blue' },
  { title: 'Actifs ce mois', value: 2914, icon: Users, color: 'green' },
  { title: 'Nouveaux', value: 120, icon: UserPlus, color: 'purple' },
  { title: 'Inactifs', value: 600, icon: Users, color: 'orange' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'MANAGER' | 'USER'>('all')

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.enterprise?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive)

    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

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
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    )
  }

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      'ADMIN': 'Administrateur',
      'MANAGER': 'Gestionnaire',
      'USER': 'Utilisateur'
    }
    return roleLabels[role as keyof typeof roleLabels] || role
  }

  const getRoleColor = (role: string) => {
    const roleColors = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'USER': 'bg-gray-100 text-gray-800'
    }
    return roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 form-input"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="form-input"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="form-input"
            >
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

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Utilisateur</th>
                <th className="table-header">Rôle</th>
                <th className="table-header">Entreprise</th>
                <th className="table-header">Centre</th>
                <th className="table-header">Statut</th>
                <th className="table-header">Dernière connexion</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{user.enterprise || '-'}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{user.center || '-'}</div>
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${user.isActive ? 'status-active' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : '-'}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de 1 à {filteredUsers.length} sur {filteredUsers.length} utilisateurs
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Précédent
              </button>
              <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded">
                1
              </button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}