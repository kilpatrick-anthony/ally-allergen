'use client'
// components/admin/AdminTopBar.tsx
// Sticky top bar rendered at the top of every admin page.
// Shows: current page icon + name (with breadcrumb for sub-pages) | user initials chip.

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import {
  Home, Package, ChefHat, Building, ShoppingBag,
  BarChart, Download, Monitor, CheckCircle2, Settings,
  HelpCircle, Shield, type LucideIcon,
} from 'lucide-react'

interface PageMeta {
  label: string
  icon: LucideIcon
  parent?: string
}

const PAGE_MAP: Record<string, PageMeta> = {
  '/admin':                       { label: 'Dashboard',       icon: Home },
  '/admin/ingredients':           { label: 'Ingredients',     icon: Package },
  '/admin/ingredients/new':       { label: 'New Ingredient',  icon: Package,     parent: 'Ingredients' },
  '/admin/menu-builder':          { label: 'Menu Builder',    icon: ChefHat },
  '/admin/menu-builder/new':      { label: 'New Item',        icon: ChefHat,     parent: 'Menu Builder' },
  '/admin/sites':                 { label: 'Sites',           icon: Building },
  '/admin/sites/new':             { label: 'New Site',        icon: Building,    parent: 'Sites' },
  '/admin/suppliers':             { label: 'Suppliers',       icon: ShoppingBag },
  '/admin/analytics':             { label: 'Analytics',       icon: BarChart },
  '/admin/downloads':             { label: 'Downloads',       icon: Download },
  '/admin/devices':               { label: 'Devices',         icon: Monitor },
  '/admin/compliance':            { label: 'Compliance',      icon: CheckCircle2 },
  '/admin/settings':              { label: 'Settings',        icon: Settings },
  '/admin/help':                  { label: 'Help & Support',  icon: HelpCircle },
  '/super-admin':                 { label: 'Super Admin',     icon: Shield },
}

function resolvePage(pathname: string): PageMeta {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname]
  const keys = Object.keys(PAGE_MAP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (pathname.startsWith(key + '/')) return PAGE_MAP[key]
  }
  return { label: 'Admin', icon: Home }
}

interface AdminTopBarProps {
  userName: string
  userEmail: string
}

export function AdminTopBar({ userName, userEmail }: AdminTopBarProps) {
  const pathname = usePathname()
  const page = resolvePage(pathname)
  const Icon = page.icon

  const displayName = userName || userEmail.split('@')[0] || 'Admin'
  const initials = displayName
    .split(/[\s._-]/)
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'A'

  return (
    <div className="sticky top-14 lg:top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/70 dark:border-gray-700/60 shadow-[0_1px_12px_-2px_rgba(0,56,66,0.08)]">
      {/* Left: page breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#003842] to-[#42b8ac] shrink-0">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        {page.parent && (
          <>
            <span className="text-sm text-gray-400 dark:text-gray-500 hidden sm:block">{page.parent}</span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 hidden sm:block shrink-0" />
          </>
        )}
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {page.label}
        </span>
      </div>

      {/* Right: user chip */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <span className="text-xs text-gray-600 dark:text-gray-300 hidden sm:block max-w-[150px] truncate font-medium">
            {displayName}
          </span>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#003842] to-[#42b8ac] flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </div>
  )
}
