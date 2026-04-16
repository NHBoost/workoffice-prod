'use client'

import { useState } from 'react'
import { Save, Building, Mail, Globe, Shield, Database, Palette } from 'lucide-react'
import toast from 'react-hot-toast'

interface Settings {
  company: {
    name: string
    address: string
    city: string
    postalCode: string
    country: string
    phone: string
    email: string
    website: string
  }
  notifications: {
    emailNotifications: boolean
    packageAlerts: boolean
    mailAlerts: boolean
    reservationAlerts: boolean
  }
  billing: {
    defaultCurrency: string
    taxRate: number
    paymentTerms: number
  }
  system: {
    timezone: string
    dateFormat: string
    language: string
  }
}

const initialSettings: Settings = {
  company: {
    name: 'WorkOffice',
    address: 'Rue de la Loi 123',
    city: 'Bruxelles',
    postalCode: '1000',
    country: 'Belgique',
    phone: '+32 2 123 45 67',
    email: 'contact@workoffice.be',
    website: 'https://workoffice.be'
  },
  notifications: {
    emailNotifications: true,
    packageAlerts: true,
    mailAlerts: true,
    reservationAlerts: false
  },
  billing: {
    defaultCurrency: 'EUR',
    taxRate: 21,
    paymentTerms: 30
  },
  system: {
    timezone: 'Europe/Brussels',
    dateFormat: 'DD/MM/YYYY',
    language: 'fr'
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'company' | 'notifications' | 'billing' | 'system'>('company')

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Here you would make an API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Paramètres enregistrés avec succès')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (section: keyof Settings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const tabs = [
    { id: 'company', label: 'Entreprise', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Mail },
    { id: 'billing', label: 'Facturation', icon: Globe },
    { id: 'system', label: 'Système', icon: Shield },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Configurez votre plateforme WorkOffice</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="btn-primary"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-600 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Company Settings */}
          {activeTab === 'company' && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Informations de l'entreprise</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Nom de l'entreprise</label>
                    <input
                      type="text"
                      value={settings.company.name}
                      onChange={(e) => handleInputChange('company', 'name', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={settings.company.email}
                      onChange={(e) => handleInputChange('company', 'email', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Téléphone</label>
                    <input
                      type="tel"
                      value={settings.company.phone}
                      onChange={(e) => handleInputChange('company', 'phone', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Site web</label>
                    <input
                      type="url"
                      value={settings.company.website}
                      onChange={(e) => handleInputChange('company', 'website', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Adresse</label>
                    <input
                      type="text"
                      value={settings.company.address}
                      onChange={(e) => handleInputChange('company', 'address', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Ville</label>
                    <input
                      type="text"
                      value={settings.company.city}
                      onChange={(e) => handleInputChange('company', 'city', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Code postal</label>
                    <input
                      type="text"
                      value={settings.company.postalCode}
                      onChange={(e) => handleInputChange('company', 'postalCode', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pays</label>
                    <select
                      value={settings.company.country}
                      onChange={(e) => handleInputChange('company', 'country', e.target.value)}
                      className="form-input"
                    >
                      <option value="Belgique">Belgique</option>
                      <option value="France">France</option>
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="Pays-Bas">Pays-Bas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Préférences de notification</h3>
                <div className="space-y-6">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          {key === 'emailNotifications' && 'Notifications par email'}
                          {key === 'packageAlerts' && 'Alertes de colis'}
                          {key === 'mailAlerts' && 'Alertes de courrier'}
                          {key === 'reservationAlerts' && 'Alertes de réservations'}
                        </label>
                        <p className="text-sm text-gray-500">
                          {key === 'emailNotifications' && 'Recevoir les notifications importantes par email'}
                          {key === 'packageAlerts' && 'Être alerté lors de la réception de colis'}
                          {key === 'mailAlerts' && 'Être alerté lors de la réception de courrier'}
                          {key === 'reservationAlerts' && 'Être alerté des nouvelles réservations'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleInputChange('notifications', key, e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Billing Settings */}
          {activeTab === 'billing' && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Configuration de facturation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Devise par défaut</label>
                    <select
                      value={settings.billing.defaultCurrency}
                      onChange={(e) => handleInputChange('billing', 'defaultCurrency', e.target.value)}
                      className="form-input"
                    >
                      <option value="EUR">Euro (EUR)</option>
                      <option value="USD">Dollar US (USD)</option>
                      <option value="GBP">Livre Sterling (GBP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Taux de TVA (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.billing.taxRate}
                      onChange={(e) => handleInputChange('billing', 'taxRate', parseFloat(e.target.value))}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Délai de paiement (jours)</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.billing.paymentTerms}
                      onChange={(e) => handleInputChange('billing', 'paymentTerms', parseInt(e.target.value))}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Configuration système</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Fuseau horaire</label>
                    <select
                      value={settings.system.timezone}
                      onChange={(e) => handleInputChange('system', 'timezone', e.target.value)}
                      className="form-input"
                    >
                      <option value="Europe/Brussels">Europe/Brussels</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Format de date</label>
                    <select
                      value={settings.system.dateFormat}
                      onChange={(e) => handleInputChange('system', 'dateFormat', e.target.value)}
                      className="form-input"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Langue</label>
                    <select
                      value={settings.system.language}
                      onChange={(e) => handleInputChange('system', 'language', e.target.value)}
                      className="form-input"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="nl">Nederlands</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}