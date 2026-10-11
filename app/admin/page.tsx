// app/admin/page.tsx - Production-ready dashboard with onboarding
'use client'

import QuickAddEntry from '@/components/admin/QuickAddEntry'
import DashboardDraftSummary from '@/components/admin/DashboardDraftSummary'

import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package, ChefHat, Building, Shield,
  ArrowRight, Star, Monitor, FileText, Languages
} from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Badge } from '@/components/ui/Badge'
import { NotificationsPanel } from '@/components/admin/NotificationsPanel'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { getFrequentPages, type AdminPage } from '@/lib/hooks/useFrequentPages'

interface DashboardStats {
  ingredients: number
  menuItems: number
  datasheets: number
  suppliers: number
  sites: number
}

const EMPTY_STATS: DashboardStats = {
  ingredients: 0,
  menuItems: 0,
  datasheets: 0,
  suppliers: 0,
  sites: 0,
}

export default function AdminDashboard() {
  const { t, language } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [frequentPages, setFrequentPages] = useState<AdminPage[]>([])
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    datasheetAuditEnabled: true,
    ingredientsAuditEnabled: true,
    menuAuditEnabled: true,
    supplierAuditEnabled: true,
    datasheetAuditFrequency: '1 month',
    ingredientsAuditFrequency: '1 month',
    menuAuditFrequency: '1 month',
    supplierAuditFrequency: '1 month'
  })

  useEffect(() => {
    const checkForData = async () => {
      try {
        // Super admins should land in the super-admin portal, not onboarding/admin.
        const sessionRes = await fetch('/api/auth/session')
        const session = sessionRes.ok ? await sessionRes.json() : null
        const isSuperAdmin = Boolean(
          session?.authenticated &&
          (session?.user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
            session?.user?.role === 'super_admin')
        )

        if (isSuperAdmin) {
          router.replace('/super-admin')
          return
        }

        const summaryRes = await fetch('/api/dashboard/summary', { cache: 'no-store' })
        const summary = await summaryRes.json()
        if (!summaryRes.ok) {
          throw new Error(summary.error || 'Failed to load dashboard summary')
        }

        const nextStats: DashboardStats = { ...EMPTY_STATS, ...summary.stats }
        setStats(nextStats)

        // First-login fast path: push users into setup wizard until they create first site.
        if (nextStats.sites === 0) {
          router.replace('/onboarding')
          return
        }

        setHasData(
          nextStats.ingredients > 0 ||
          nextStats.menuItems > 0 ||
          nextStats.datasheets > 0 ||
          nextStats.suppliers > 0
        )

        // Load businessId from sessionStorage (written by the admin layout)
        const biz = typeof window !== 'undefined' ? sessionStorage.getItem('ally_biz') : null
        setFrequentPages(getFrequentPages(biz))

        // Load notification settings from localStorage
        if (typeof window !== 'undefined') {
          setSettings({
            notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
            datasheetAuditEnabled: localStorage.getItem('datasheetAuditEnabled') !== 'false',
            ingredientsAuditEnabled: localStorage.getItem('ingredientsAuditEnabled') !== 'false',
            menuAuditEnabled: localStorage.getItem('menuAuditEnabled') !== 'false',
            supplierAuditEnabled: localStorage.getItem('supplierAuditEnabled') !== 'false',
            datasheetAuditFrequency: localStorage.getItem('datasheetAuditFrequency') || '1 month',
            ingredientsAuditFrequency: localStorage.getItem('ingredientsAuditFrequency') || '1 month',
            menuAuditFrequency: localStorage.getItem('menuAuditFrequency') || '1 month',
            supplierAuditFrequency: localStorage.getItem('supplierAuditFrequency') || '1 month'
          })
        }
      } catch (error) {
        console.error('Error checking for data:', error)
      } finally {
        setLoading(false)
      }
    }

    checkForData()
  }, [router])

  const frequentPageCopy: Record<string, { label: string; description: string }> = {
    '/admin': { label: t('liveDashboard.dashboard'), description: t('liveDashboard.dashboardDescription') },
    '/admin/ingredients': { label: t('liveDashboard.ingredients'), description: t('liveDashboard.ingredientsDescription') },
    '/admin/menu-builder': { label: t('liveDashboard.menuBuilder'), description: t('liveDashboard.menuBuilderDescription') },
    '/admin/sites': { label: t('liveDashboard.locations'), description: t('liveDashboard.locationsDescription') },
    '/admin/analytics': { label: t('liveDashboard.analytics'), description: t('liveDashboard.analyticsDescription') },
    '/admin/downloads': { label: t('liveDashboard.downloads'), description: t('liveDashboard.downloadsDescription') },
    '/admin/devices': { label: t('liveDashboard.devices'), description: t('liveDashboard.devicesDescription') },
    '/admin/suppliers': { label: t('liveDashboard.suppliers'), description: t('liveDashboard.suppliersDescription') },
    '/admin/settings': { label: t('liveDashboard.settings'), description: t('liveDashboard.settingsDescription') },
  }

  const languagePrompt = (
    <Link href="/admin/settings#language-settings" aria-label={t('liveDashboard.changeLanguage')}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#003842] hover:bg-teal-50 dark:text-teal-200 dark:hover:bg-gray-800">
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span lang={language}>{{ en: 'English', ga: 'Gaeilge', pt: 'Português', fr: 'Français', es: 'Español', de: 'Deutsch' }[language]}</span>
    </Link>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  // Show established business dashboard
  if (hasData) {
    const statCards = [
      {
        label: t('liveDashboard.menuItems'),
        value: stats.menuItems,
        detail: t('liveDashboard.acrossMenus'),
        href: '/admin/menu-builder',
        icon: ChefHat,
        iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      },
      {
        label: t('liveDashboard.ingredients'),
        value: stats.ingredients,
        detail: t(
          stats.suppliers === 1 ? 'liveDashboard.supplierLinked' : 'liveDashboard.suppliersLinked',
          { count: stats.suppliers }
        ),
        href: '/admin/ingredients',
        icon: Package,
        iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      },
      {
        label: t('liveDashboard.datasheets'),
        value: stats.datasheets,
        detail: t('liveDashboard.activeDocuments'),
        href: '/admin/downloads/datasheets',
        icon: FileText,
        iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      },
      {
        label: t('liveDashboard.locations'),
        value: stats.sites,
        detail: t('liveDashboard.sitesManaged'),
        href: '/admin/sites',
        icon: Building,
        iconClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      },
    ]

    return (
      <Container>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">{t('admin.dashboardTitle')}</h1>
          <div className="flex items-center gap-2">
            {languagePrompt}
            <div className="hidden lg:block"><QuickAddEntry showDrafts={false} onSaved={() => window.dispatchEvent(new Event('quick-add-saved'))} /></div>
          </div>
        </div>
        <div className="flex flex-col">
        <div className="order-1 mb-5 lg:order-2"><DashboardDraftSummary /></div>
        {/* At-a-glance stats */}
        <div className="order-4 grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6 lg:order-1">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href} className="group">
                <Card padding="sm" className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-[#42b8ac]/40 group-hover:shadow-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold text-[#003842] dark:text-white">{stat.value}</p>
                      <p className="mt-1 hidden text-xs lg:block text-gray-500 dark:text-gray-400">{stat.detail}</p>
                    </div>
                    <div className={`hidden rounded-lg p-2 sm:block ${stat.iconClass}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Frequently Used */}
        <div className="order-3 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-[#42b8ac]" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('admin.frequentlyUsed')}
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {frequentPages.map((page) => {
              const Icon = page.icon
              const copy = frequentPageCopy[page.href] ?? page
              return (
                <Link key={page.href} href={page.href}>
                  <Card padding="sm" className="hover:shadow-lg transition-all cursor-pointer group h-full">
                    <div className="flex items-center gap-3">
                      <div className={`hidden sm:block p-2 rounded-lg flex-shrink-0 ${page.colorClass}`}>
                        {typeof Icon === 'function' && React.createElement(Icon as React.ComponentType<{className: string}>, { className: `h-6 w-6 ${page.iconClass}` })}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#42b8ac] transition-colors break-words">
                          {copy.label}
                        </h3>
                        <p className="hidden lg:block text-sm text-gray-500 dark:text-gray-400 truncate">
                          {copy.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
            {t('admin.frequentlyUsedHint')}
          </p>
        </div>

        {/* Notifications Panel */}
        <div className="order-2 mb-5 lg:order-4">
          <NotificationsPanel settings={settings} compactMobile />
        </div>

        </div>
        {/* Business Responsibility Disclaimer */}
        <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 pt-0.5">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {t('businessDisclaimerTitle')}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                {t('businessDisclaimerText')}
              </p>
            </div>
          </div>
        </div>
      </Container>
    )
  }

  // Show welcome screen for new businesses
  return (
    <Container>
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#003842] via-[#004d5e] to-[#42b8ac] text-white mb-12 overflow-hidden relative">
        {/* Decorative background circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-[#42b8ac]/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-10">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{t('admin.welcomeToAllyJen')}</h1>
            <p className="text-white/70 text-sm sm:text-base max-w-md">{t('admin.welcomeSubtitle')}</p>
          </div>
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
              alt="AllyJen"
              className="h-16 w-auto object-contain drop-shadow-[0_2px_12px_rgba(66,184,172,0.4)]"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">{languagePrompt}<div className="hidden lg:block"><QuickAddEntry showDrafts={false} onSaved={() => window.dispatchEvent(new Event('quick-add-saved'))} /></div></div>
      <div className="mb-6"><DashboardDraftSummary /></div>

      {/* Quick Start Guide */}
      <Card className="mb-8 bg-gradient-to-br from-[#42b8ac]/5 to-[#003842]/5">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mb-2">{t('admin.gettingStarted')}</h2>
          <p className="text-gray-600 dark:text-gray-300">{t('admin.gettingStartedDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Link href="/admin/sites/new">
            <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 border-transparent hover:border-[#42b8ac]">
              <div className="text-center h-full flex flex-col">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 mx-auto">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div className="mb-4">
                  <Badge variant="info" size="sm">{t('liveDashboard.step', { count: 1 })}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('admin.addFirstLocation')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                  {t('admin.addFirstLocationDesc')}
                </p>
                <div className="flex items-center justify-center text-[#42b8ac] font-medium mt-auto">
                  {t('admin.addLocation')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Step 2 */}
          <Link href="/admin/devices">
            <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 border-transparent hover:border-[#42b8ac]">
              <div className="text-center h-full flex flex-col">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4 mx-auto">
                  <Monitor className="h-8 w-8 text-white" />
                </div>
                <div className="mb-4">
                  <Badge variant="info" size="sm">{t('liveDashboard.step', { count: 2 })}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('admin.pairFirstDevice')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                  {t('admin.pairFirstDeviceDesc')}
                </p>
                <div className="flex items-center justify-center text-[#42b8ac] font-medium mt-auto">
                  {t('admin.openDeviceMonitoring')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Step 3 */}
          <Link href="/admin/menu-builder">
            <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 border-transparent hover:border-[#42b8ac]">
              <div className="text-center h-full flex flex-col">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 mx-auto">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
                <div className="mb-4">
                  <Badge variant="info" size="sm">{t('liveDashboard.step', { count: 3 })}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('admin.buildYourMenu')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                  {t('admin.buildYourMenuDesc')}
                </p>
                <div className="flex items-center justify-center text-[#42b8ac] font-medium mt-auto">
                  {t('admin.openMenuBuilder')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </Card>

      {/* Frequently Used */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-[#42b8ac]" />
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('admin.frequentlyUsed')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {frequentPages.map((page) => {
            const Icon = page.icon
            const copy = frequentPageCopy[page.href] ?? page
            return (
              <Link key={page.href} href={page.href}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${page.colorClass}`}>
                      {typeof Icon === 'function' && React.createElement(Icon as React.ComponentType<{className: string}>, { className: `h-6 w-6 ${page.iconClass}` })}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#42b8ac] transition-colors truncate">
                        {copy.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {copy.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
          {t('admin.frequentlyUsedHint')}
        </p>
      </div>
    </Container>
  )
}
