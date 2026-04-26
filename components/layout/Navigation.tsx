// app/admin/components/layout/Navigation.tsx
// components/layout/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Building,
  BarChart,
  Settings,
  ShoppingBag,
  Package,
  Download,
  ChefHat,
  HelpCircle,
  Monitor,
  Shield,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useState, useEffect } from 'react'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export function Navigation() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data?.user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
          setIsSuperAdmin(true)
        }
      })
      .catch(() => {})
  }, [])

  const navItems: NavItem[] = [
    { name: t('admin.dashboard'),   href: '/admin',              icon: Home },
    { name: t('admin.ingredients'), href: '/admin/ingredients',  icon: Package },
    { name: t('admin.menuBuilder'), href: '/admin/menu-builder', icon: ChefHat },
    { name: t('admin.sites'),       href: '/admin/sites',        icon: Building },
    { name: t('admin.suppliers'),   href: '/admin/suppliers',    icon: ShoppingBag },
    { name: t('admin.analytics'),   href: '/admin/analytics',    icon: BarChart },
    { name: t('admin.downloads'),   href: '/admin/downloads',    icon: Download },
    { name: t('admin.devices'),     href: '/admin/devices',      icon: Monitor },
    { name: 'Compliance',           href: '/admin/compliance',   icon: CheckCircle2 },
    { name: t('admin.settings'),    href: '/admin/settings',     icon: Settings },
    { name: t('admin.help'),        href: '/admin/help',         icon: HelpCircle },
    ...(isSuperAdmin ? [{ name: 'Super Admin', href: '/super-admin', icon: Shield }] : []),
  ]

  return (
    <nav className="space-y-0.5 pt-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/admin' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200
              ${isActive
                ? 'bg-white text-[#003842] shadow-md font-semibold'
                : 'text-white/80 hover:bg-white/15 hover:text-white font-medium'
              }
            `}
          >
            <item.icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive ? 'text-[#42b8ac]' : 'text-white/70 group-hover:text-white'
              }`}
            />
            <span className="truncate">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}