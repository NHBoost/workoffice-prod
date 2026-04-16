'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building,
  MapPin,
  CalendarDays,
  Laptop,
  CreditCard,
  Mail,
  Package,
  Send,
  MessageCircle,
  BarChart3,
  Settings,
  QrCode,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Utilisateurs', href: '/dashboard/users', icon: Users },
  { name: 'Entreprises', href: '/dashboard/entreprises', icon: Building },
  { name: 'Centres', href: '/dashboard/centres', icon: MapPin },
  { name: 'Salles de réunion', href: '/dashboard/salles-reunion', icon: CalendarDays },
  { name: 'Espaces coworking', href: '/dashboard/espaces-coworking', icon: Laptop },
  { name: 'Facturation', href: '/dashboard/facturation', icon: CreditCard },
  { name: 'Courriers', href: '/dashboard/courriers', icon: Mail },
  { name: 'Colis', href: '/dashboard/colis', icon: Package },
  { name: 'Mailing', href: '/dashboard/mailing', icon: Send },
  { name: 'Messages', href: '/dashboard/messaging', icon: MessageCircle },
  { name: 'KPIs Personnel', href: '/dashboard/kpis', icon: BarChart3 },
  { name: 'Scan QR Code', href: '/dashboard/scan-qr', icon: QrCode },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 ease-in-out`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-2">
                <div className="w-5 h-5 bg-white rounded transform rotate-45"></div>
              </div>
              <span className="text-lg font-semibold text-gray-900">WorkOffice</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                    ${isActive
                      ? 'text-primary-600 bg-primary-50 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className={`${collapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'} flex-shrink-0`} />
                  {!collapsed && item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User info */}
        {!collapsed && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">DA</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">David Admin</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}