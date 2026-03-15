// lib/hooks/useFrequentPages.ts
// Tracks which admin pages a business uses most, stored per businessId in localStorage.
// Falls back to sensible defaults before enough data is collected.

import {
  Package, ChefHat, Building, BarChart3,
  Download, Monitor, Settings, Truck, Home,
  type LucideIcon
} from 'lucide-react'

export interface AdminPage {
  href: string
  label: string
  description: string
  icon: LucideIcon
  colorClass: string    // Tailwind bg-* for the icon bubble
  iconClass: string     // Tailwind text-* for the icon
}

export const ALL_ADMIN_PAGES: AdminPage[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    description: 'Back to the main dashboard',
    icon: Home,
    colorClass: 'bg-teal-100 dark:bg-teal-900/20',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
  {
    href: '/admin/ingredients',
    label: 'Ingredients',
    description: 'Add and manage your ingredients',
    icon: Package,
    colorClass: 'bg-blue-100 dark:bg-blue-900/20',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  {
    href: '/admin/menu-builder',
    label: 'Menu Builder',
    description: 'Create and edit menu items',
    icon: ChefHat,
    colorClass: 'bg-green-100 dark:bg-green-900/20',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  {
    href: '/admin/sites',
    label: 'Locations',
    description: 'Manage your sites and kiosks',
    icon: Building,
    colorClass: 'bg-purple-100 dark:bg-purple-900/20',
    iconClass: 'text-purple-600 dark:text-purple-400',
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    description: 'View allergen guide reports',
    icon: BarChart3,
    colorClass: 'bg-[#42b8ac]/10 dark:bg-teal-900/20',
    iconClass: 'text-[#42b8ac] dark:text-teal-400',
  },
  {
    href: '/admin/downloads',
    label: 'Downloads',
    description: 'Download compliance reports',
    icon: Download,
    colorClass: 'bg-orange-100 dark:bg-orange-900/20',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  {
    href: '/admin/devices',
    label: 'Devices',
    description: 'Manage kiosk devices',
    icon: Monitor,
    colorClass: 'bg-slate-100 dark:bg-slate-900/20',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  {
    href: '/admin/suppliers',
    label: 'Suppliers',
    description: 'Manage your suppliers',
    icon: Truck,
    colorClass: 'bg-amber-100 dark:bg-amber-900/20',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    description: 'Configure your account',
    icon: Settings,
    colorClass: 'bg-gray-100 dark:bg-gray-900/20',
    iconClass: 'text-gray-600 dark:text-gray-400',
  },
]

const DEFAULT_HREFS = [
  '/admin/ingredients',
  '/admin/menu-builder',
  '/admin/sites',
  '/admin/analytics',
]

/** localStorage key for page visit counts for a given business */
function storageKey(businessId: string) {
  return `ally_freq_${businessId}`
}

/** Increment the visit count for a given path */
export function trackAdminPageVisit(path: string, businessId: string | null) {
  if (!businessId || typeof window === 'undefined') return
  // Only track known admin pages (skip the dashboard itself to keep tiles meaningful)
  const known = ALL_ADMIN_PAGES.find(p => p.href === path)
  if (!known || path === '/admin') return

  try {
    const raw = localStorage.getItem(storageKey(businessId))
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {}
    counts[path] = (counts[path] ?? 0) + 1
    localStorage.setItem(storageKey(businessId), JSON.stringify(counts))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/** Return the top `count` pages for this business, falling back to defaults */
export function getFrequentPages(businessId: string | null, count = 4): AdminPage[] {
  const pageMap = new Map(ALL_ADMIN_PAGES.map(p => [p.href, p]))

  if (!businessId || typeof window === 'undefined') {
    return DEFAULT_HREFS.slice(0, count).map(h => pageMap.get(h)!)
  }

  try {
    const raw = localStorage.getItem(storageKey(businessId))
    if (!raw) {
      return DEFAULT_HREFS.slice(0, count).map(h => pageMap.get(h)!)
    }

    const counts: Record<string, number> = JSON.parse(raw)
    const totalVisits = Object.values(counts).reduce((a, b) => a + b, 0)

    // Use defaults until we have enough signal (10+ tracked visits)
    if (totalVisits < 10) {
      return DEFAULT_HREFS.slice(0, count).map(h => pageMap.get(h)!)
    }

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([href]) => pageMap.get(href))
      .filter(Boolean) as AdminPage[]

    // If fewer than `count` have been visited, pad with defaults
    const result = [...sorted.slice(0, count)]
    for (const href of DEFAULT_HREFS) {
      if (result.length >= count) break
      if (!result.find(p => p.href === href)) {
        result.push(pageMap.get(href)!)
      }
    }
    return result.slice(0, count)
  } catch {
    return DEFAULT_HREFS.slice(0, count).map(h => pageMap.get(h)!)
  }
}
