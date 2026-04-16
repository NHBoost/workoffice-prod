'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'

interface PackageItem {
  id: string
  tracking: string
  recipient: string
  sender: string
  enterprise?: string
  status: 'RECEIVED' | 'COLLECTED' | 'RETURNED'
  receivedAt: string
  collectedAt?: string
  notes?: string
  urgent?: boolean
}

const mockPackages: PackageItem[] = [
  {
    id: '1',
    tracking: 'DHL123456789',
    recipient: 'Jean Dupont',
    sender: 'Amazon',
    enterprise: 'BEACOON',
    status: 'RECEIVED',
    receivedAt: '2024-01-20T09:30:00',
    urgent: false,
    notes: 'Fragile'
  },
  {
    id: '2',
    tracking: 'UPS987654321',
    recipient: 'Marie Martin',
    sender: 'LDLC',
    enterprise: 'TECH CORP',
    status: 'COLLECTED',
    receivedAt: '2024-01-19T14:15:00',
    collectedAt: '2024-01-20T08:45:00',
    urgent: false
  },
  {
    id: '3',
    tracking: 'TNT456789123',
    recipient: 'Pierre Durand',
    sender: 'Fnac',
    enterprise: 'INNOVATION LAB',
    status: 'RECEIVED',
    receivedAt: '2024-01-20T11:20:00',
    urgent: true,
    notes: 'Signature requise'
  },
  {
    id: '4',
    tracking: 'FEDX789123456',
    recipient: 'Sophie Bernard',
    sender: 'Dell',
    enterprise: 'DIGITAL SOLUTIONS',
    status: 'RECEIVED',
    receivedAt: '2024-01-18T16:30:00',
    urgent: false
  },
  {
    id: '5',
    tracking: 'CHRONO123789456',
    recipient: 'David Lambert',
    sender: 'Apple Store',
    enterprise: 'GREEN ENERGY',
    status: 'RETURNED',
    receivedAt: '2024-01-15T10:00:00',
    urgent: false,
    notes: 'Destinataire absent - retour expéditeur'
  }
]

const stats = [
  { title: 'En attente', value: 8, icon: Clock, color: 'blue' },
  { title: 'Récupérés', value: 15, icon: CheckCircle, color: 'green' },
  { title: 'Urgents', value: 3, icon: AlertCircle, color: 'red' },
  { title: 'Total ce mois', value: 125, icon: Package, color: 'purple' },
]

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>(mockPackages)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'RECEIVED' | 'COLLECTED' | 'RETURNED'>('all')
  const [urgentFilter, setUrgentFilter] = useState<boolean | null>(null)

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.enterprise?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter
    const matchesUrgent = urgentFilter === null || pkg.urgent === urgentFilter

    return matchesSearch && matchesStatus && matchesUrgent
  })

  const StatCard = ({ title, value, icon: Icon, color }: any) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500'
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

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      'RECEIVED': 'Reçu',
      'COLLECTED': 'Récupéré',
      'RETURNED': 'Retourné'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      'RECEIVED': 'bg-blue-100 text-blue-800',
      'COLLECTED': 'bg-green-100 text-green-800',
      'RETURNED': 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'RECEIVED': Clock,
      'COLLECTED': CheckCircle,
      'RETURNED': AlertCircle
    }
    return icons[status as keyof typeof icons] || Clock
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Colis</h1>
          <p className="text-gray-600">Suivez et gérez les colis de vos entreprises</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <Link href="/dashboard/colis/nouveau" className="btn-primary">
            <Plus className="h-4 w-4" />
            Nouveau colis
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un colis..."
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
              <option value="RECEIVED">Reçus</option>
              <option value="COLLECTED">Récupérés</option>
              <option value="RETURNED">Retournés</option>
            </select>

            {/* Urgent Filter */}
            <select
              value={urgentFilter === null ? 'all' : urgentFilter.toString()}
              onChange={(e) => setUrgentFilter(e.target.value === 'all' ? null : e.target.value === 'true')}
              className="form-input"
            >
              <option value="all">Tous</option>
              <option value="true">Urgents seulement</option>
              <option value="false">Non urgents</option>
            </select>

            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
              Plus de filtres
            </button>
          </div>
        </div>
      </div>

      {/* Packages List */}
      <div className="space-y-4">
        {filteredPackages.map((pkg) => {
          const StatusIcon = getStatusIcon(pkg.status)
          return (
            <div key={pkg.id} className="card">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Package Icon */}
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>

                    {/* Package Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{pkg.tracking}</h3>
                        {pkg.urgent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {getStatusLabel(pkg.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Destinataire:</span>
                          <div className="font-medium">{pkg.recipient}</div>
                          {pkg.enterprise && (
                            <div className="text-gray-500">{pkg.enterprise}</div>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">Expéditeur:</span>
                          <div className="font-medium">{pkg.sender}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Reçu le:</span>
                          <div className="font-medium">
                            {new Date(pkg.receivedAt).toLocaleString('fr-FR')}
                          </div>
                          {pkg.collectedAt && (
                            <>
                              <span className="text-gray-500">Récupéré le:</span>
                              <div className="font-medium">
                                {new Date(pkg.collectedAt).toLocaleString('fr-FR')}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {pkg.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-500">Notes:</span>
                          <div className="text-sm text-gray-700 mt-1">{pkg.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    {pkg.status === 'RECEIVED' && (
                      <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                        Marquer récupéré
                      </button>
                    )}
                    <button className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredPackages.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun colis trouvé</h3>
          <p className="text-gray-500">Aucun colis ne correspond à vos critères de recherche.</p>
        </div>
      )}
    </div>
  )
}