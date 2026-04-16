'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Building,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Eye,
  Edit,
  Pause,
  X,
  Download
} from 'lucide-react'

interface Enterprise {
  id: string
  name: string
  legalForm: string
  siret?: string
  status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
  domiciliationDate: string
  contactPerson: string
  email: string
  phone?: string
  address: string
  city: string
  usersCount: number
  monthlyRevenue: number
}

const mockEnterprises: Enterprise[] = [
  {
    id: '1',
    name: 'VERTASOLUTION',
    legalForm: 'SRL',
    siret: 'BE0123456789',
    status: 'ACTIVE',
    domiciliationDate: '2024-01-15',
    contactPerson: 'Jean Dupont',
    email: 'contact@vertasolution.be',
    phone: '+32 2 123 45 67',
    address: 'Rue de la Paix 123',
    city: 'Bruxelles',
    usersCount: 15,
    monthlyRevenue: 1250.00
  },
  {
    id: '2',
    name: 'GULFGUARD',
    legalForm: 'SA',
    siret: 'BE0987654321',
    status: 'ACTIVE',
    domiciliationDate: '2024-01-10',
    contactPerson: 'Marie Martin',
    email: 'info@gulfguard.be',
    phone: '+32 2 987 65 43',
    address: 'Avenue Louise 456',
    city: 'Bruxelles',
    usersCount: 8,
    monthlyRevenue: 850.00
  },
  {
    id: '3',
    name: 'SYNEOLE',
    legalForm: 'SPRL',
    siret: 'BE0555666777',
    status: 'SUSPENDED',
    domiciliationDate: '2023-12-05',
    contactPerson: 'Pierre Durand',
    email: 'contact@syneole.be',
    address: 'Chaussée de Charleroi 789',
    city: 'Bruxelles',
    usersCount: 3,
    monthlyRevenue: 350.00
  },
  {
    id: '4',
    name: 'BUILDMETAL CNC',
    legalForm: 'SRL',
    status: 'ACTIVE',
    domiciliationDate: '2024-01-01',
    contactPerson: 'Sophie Bernard',
    email: 'info@buildmetal.be',
    phone: '+32 2 111 22 33',
    address: 'Rue de l\'Industrie 321',
    city: 'Liège',
    usersCount: 12,
    monthlyRevenue: 980.00
  },
  {
    id: '5',
    name: 'TECH INNOVATE',
    legalForm: 'SA',
    status: 'TERMINATED',
    domiciliationDate: '2023-06-15',
    contactPerson: 'David Lambert',
    email: 'contact@techinnovate.be',
    address: 'Boulevard du Midi 654',
    city: 'Gand',
    usersCount: 0,
    monthlyRevenue: 0.00
  },
]

const stats = [
  { title: 'Total Entreprises', value: 2917, change: 12, icon: Building, color: 'blue' },
  { title: 'Actives', value: 2904, change: 8, icon: TrendingUp, color: 'green' },
  { title: 'Suspendues', value: 13, change: -5, icon: Pause, color: 'yellow' },
  { title: 'Résiliées', value: 169, change: 3, icon: X, color: 'red' },
]

export default function EnterprisesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>(mockEnterprises)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'>('all')
  const [selectedTab, setSelectedTab] = useState<'domiciliees' | 'suspendues' | 'resilies'>('domiciliees')

  const filteredEnterprises = enterprises.filter(enterprise => {
    const matchesSearch = enterprise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enterprise.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enterprise.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enterprise.city.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesTab = true
    if (selectedTab === 'domiciliees') {
      matchesTab = enterprise.status === 'ACTIVE'
    } else if (selectedTab === 'suspendues') {
      matchesTab = enterprise.status === 'SUSPENDED'
    } else if (selectedTab === 'resilies') {
      matchesTab = enterprise.status === 'TERMINATED'
    }

    const matchesStatus = statusFilter === 'all' || enterprise.status === statusFilter

    return matchesSearch && matchesTab && matchesStatus
  })

  const StatCard = ({ title, value, change, icon: Icon, color }: any) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500'
    }

    const isPositive = change >= 0

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
        <div className="mt-2 flex items-center">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ml-1 ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {Math.abs(change)}%
          </span>
        </div>
      </div>
    )
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      'ACTIVE': 'Actif',
      'SUSPENDED': 'Suspendu',
      'TERMINATED': 'Résilié'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      'ACTIVE': 'status-active',
      'SUSPENDED': 'status-suspended',
      'TERMINATED': 'status-terminated'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises Domiciliées</h1>
          <p className="text-gray-600">Gérez les entreprises domiciliées dans vos centres</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <Link href="/dashboard/entreprises/add" className="btn-primary">
            <Plus className="h-4 w-4" />
            Nouvelle domiciliation
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Calendar view indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-8">
          {Array.from({ length: 31 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                i === 15 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'domiciliees', label: 'Entreprises domiciliées', count: enterprises.filter(e => e.status === 'ACTIVE').length },
            { id: 'suspendues', label: 'Entreprises suspendues', count: enterprises.filter(e => e.status === 'SUSPENDED').length },
            { id: 'resilies', label: 'Entreprises résiliées', count: enterprises.filter(e => e.status === 'TERMINATED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                selectedTab === tab.id
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 form-input"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="btn-secondary">
                <Filter className="h-4 w-4" />
                Filtres
              </button>
              <button className="btn-secondary">
                <Calendar className="h-4 w-4" />
                Période
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprises Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Entreprise</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Forme juridique</th>
                <th className="table-header">SIRET</th>
                <th className="table-header">Ville</th>
                <th className="table-header">Statut</th>
                <th className="table-header">Utilisateurs</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEnterprises.map((enterprise) => (
                <tr key={enterprise.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{enterprise.name}</div>
                      <div className="text-sm text-gray-500">
                        Domicilié le {new Date(enterprise.domiciliationDate).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div>
                      <div className="text-sm text-gray-900">{enterprise.contactPerson}</div>
                      <div className="text-sm text-gray-500">{enterprise.email}</div>
                      {enterprise.phone && (
                        <div className="text-sm text-gray-500">{enterprise.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{enterprise.legalForm || '-'}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900 font-mono">{enterprise.siret || '-'}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{enterprise.city}</div>
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getStatusColor(enterprise.status)}`}>
                      {getStatusLabel(enterprise.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">{enterprise.usersCount}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/dashboard/entreprises/${enterprise.id}`}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
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
              Affichage de 1 à {filteredEnterprises.length} sur {filteredEnterprises.length} entreprises
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