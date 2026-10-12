// app/admin/components/layout/Navigation.tsx
// components/layout/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ClipboardList,
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
  AlertTriangle,
  MessageCircle,
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
  const [reviewNotifications, setReviewNotifications] = useState(0)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (
          data?.user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
          data?.user?.role === 'super_admin'
        ) {
          setIsSuperAdmin(true)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    const load = () => fetch('/api/quick-add-notifications', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data) setReviewNotifications(data.unread || 0) })
      .catch(() => {})
    void load()
    const interval = window.setInterval(load, 60_000)
    window.addEventListener('quick-add-submitted', load)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('quick-add-submitted', load) }
  }, [])

  const openReviewNotifications = () => {
    if (!reviewNotifications) return
    setReviewNotifications(0)
    void fetch('/api/quick-add-notifications', { method: 'PATCH', keepalive: true }).catch(() => {})
  }

  const navItems: NavItem[] = [
    { name: t('admin.dashboard'),   href: '/admin',              icon: Home },
    { name: t('liveDashboard.savedDrafts'), href: '/admin/quick-add', icon: ClipboardList },
    { name: t('admin.ingredients'), href: '/admin/ingredients',  icon: Package },
    { name: t('admin.menuBuilder'), href: '/admin/menu-builder', icon: ChefHat },
    { name: t('admin.sites'),       href: '/admin/sites',        icon: Building },
    { name: t('admin.suppliers'),   href: '/admin/suppliers',    icon: ShoppingBag },
    { name: t('admin.analytics'),   href: '/admin/analytics',    icon: BarChart },
    { name: t('admin.downloads'),   href: '/admin/downloads',    icon: Download },
    { name: t('adminPortal.accessPoints'), href: '/admin/qr-codes', icon: Monitor },
    { name: t('adminPortal.compliance'), href: '/admin/compliance', icon: CheckCircle2 },
    { name: t('adminPortal.foodSafety'), href: '/admin/food-safety', icon: AlertTriangle },
    { name: t('admin.settings'),    href: '/admin/settings',     icon: Settings },
    { name: t('admin.help'),        href: '/admin/help',         icon: HelpCircle },
    { name: t('liveDashboard.contactUs'), href: '/admin/contact', icon: MessageCircle },
    ...(isSuperAdmin ? [{ name: t('adminPortal.superAdmin'), href: '/super-admin', icon: Shield }] : []),
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
            onClick={item.href === '/admin/quick-add' ? openReviewNotifications : undefined}
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
            {item.href === '/admin/quick-add' && reviewNotifications > 0 && (
              <span aria-label={`${reviewNotifications} ${t('liveDashboard.reviewLabel')}`} className="ml-auto min-w-5 rounded-full bg-amber-400 px-1.5 py-0.5 text-center text-xs font-bold text-[#003842]">
                {reviewNotifications > 99 ? '99+' : reviewNotifications}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
