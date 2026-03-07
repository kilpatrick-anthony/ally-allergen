// app/admin/components/layout/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Building,
  Menu,
  FileText,
  BarChart,
  Settings,
  Calendar,
  ShoppingBag,
  Package,
  Download,
  ChefHat,
  HelpCircle
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

export function Navigation() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const navigation = [
    { name: t('admin.dashboard'), href: '/admin', icon: Home },
    { name: t('admin.ingredients'), href: '/admin/ingredients', icon: Package },
    { name: t('admin.menuBuilder'), href: '/admin/menu-builder', icon: ChefHat },
    { name: t('admin.sites'), href: '/admin/sites', icon: Building },
    { name: t('admin.suppliers'), href: '/admin/suppliers', icon: ShoppingBag },
    { name: t('admin.analytics'), href: '/admin/analytics', icon: BarChart },
    { name: t('admin.downloads'), href: '/admin/downloads', icon: Download },
    { name: t('admin.settings'), href: '/admin/settings', icon: Settings },
    { name: t('admin.help'), href: '/admin/help', icon: HelpCircle }
  ]

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-200
              ${isActive 
                ? 'bg-white/20 text-white border-l-4 border-white shadow-lg backdrop-blur-sm' 
                : 'text-white hover:bg-white/10 hover:text-white hover:backdrop-blur-sm'
              }
            `}
          >
            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white'}`} />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}