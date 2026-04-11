// app/admin/page.tsx - Production-ready dashboard with onboarding
'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package, ChefHat, Building, Shield,
  Check, ArrowRight, ChevronRight,
  BookOpen, Zap, Star
} from 'lucide-react'

import { Container } from '../components/layout/Container'
import { Card } from '../components/layout/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { NotificationsPanel } from '@/components/admin/NotificationsPanel'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { getFrequentPages, type AdminPage } from '@/lib/hooks/useFrequentPages'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
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
        // Check if user has any data
        const [ingredientsRes, menuItemsRes, datasheetsRes, suppliersRes] = await Promise.all([
          fetch('/api/ingredients?limit=1'),
          fetch('/api/menu-items?limit=1'),
          fetch('/api/datasheets?limit=1'),
          fetch('/api/suppliers?limit=1')
        ])

        const ingredientsData = ingredientsRes.ok ? await ingredientsRes.json() : []
        const menuItemsData = menuItemsRes.ok ? await menuItemsRes.json() : []
        const datasheetsData = datasheetsRes.ok ? await datasheetsRes.json() : []
        const suppliersData = suppliersRes.ok ? await suppliersRes.json() : []

        const hasIngredients = Array.isArray(ingredientsData) && ingredientsData.length > 0
        const hasMenuItems = Array.isArray(menuItemsData) && menuItemsData.length > 0
        const hasDatasheets = Array.isArray(datasheetsData) && datasheetsData.length > 0
        const hasSuppliers = Array.isArray(suppliersData) && suppliersData.length > 0

        setHasData(hasIngredients || hasMenuItems || hasDatasheets || hasSuppliers)

        // Load businessId from sessionStorage (written by the admin layout)
        const biz = typeof window !== 'undefined' ? sessionStorage.getItem('ally_biz') : null
        setBusinessId(biz)
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
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show established business dashboard
  if (hasData) {
    return (
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.dashboardTitle')}</h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('admin.dashboardSubtitle')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="mb-8">
          <NotificationsPanel settings={settings} />
        </div>

        {/* Frequently Used */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-[#42b8ac]" />
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Frequently Used
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {frequentPages.map((page) => {
              const Icon = page.icon
              return (
                <Link key={page.href} href={page.href}>
                  <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg flex-shrink-0 ${page.colorClass}`}>
                        {typeof Icon === 'function' && React.createElement(Icon as React.ComponentType<{className: string}>, { className: `h-6 w-6 ${page.iconClass}` })}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#42b8ac] transition-colors truncate">
                          {page.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {page.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
            These tiles update automatically based on the pages you visit most
          </p>
        </div>
      </Container>
    )
  }

  // Show welcome screen for new businesses
  return (
    <Container>
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#003842] to-[#42b8ac] text-white mb-12 overflow-hidden">
        <div className="relative w-full">
          <img
            src="/Home%20Image%202%20(1400%20x%20350%20px)%20(800%20x%20400%20px).svg"
            alt=""
            aria-hidden="true"
            className="w-full object-cover block sm:hidden"
          />
          <img
            src="/Home%20Image%202%20(1400%20x%20350%20px)%20(1).svg"
            alt=""
            aria-hidden="true"
            className="w-full object-cover hidden sm:block"
          />
        </div>
      </div>

      {/* Quick Start Guide */}
      <Card className="mb-8 bg-gradient-to-br from-[#42b8ac]/5 to-[#003842]/5">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#003842] dark:text-[#42b8ac] mb-2">{t('admin.gettingStarted')}</h2>
          <p className="text-gray-600 dark:text-gray-300">{t('admin.gettingStartedDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Link href="/admin/ingredients">
            <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 border-transparent hover:border-[#42b8ac]">
              <div className="text-center h-full flex flex-col">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 mx-auto">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div className="mb-4">
                  <Badge variant="info" size="sm">Step 1</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('admin.addFirstIngredient')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                  {t('admin.addFirstIngredientDesc')}
                </p>
                <div className="flex items-center justify-center text-[#42b8ac] font-medium mt-auto">
                  {t('admin.getStarted')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Step 2 */}
          <Link href="/admin/menu-builder">
            <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 border-transparent hover:border-[#42b8ac]">
              <div className="text-center h-full flex flex-col">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4 mx-auto">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
                <div className="mb-4">
                  <Badge variant="info" size="sm">Step 2</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('admin.createYourMenu')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                  {t('admin.createYourMenuDesc')}
                </p>
                <div className="flex items-center justify-center text-[#42b8ac] font-medium mt-auto">
                  {t('admin.buildMenu')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Step 3 */}
          <Link href="/admin/sites">
            <Card className="h-full hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-2 border-transparent hover:border-[#42b8ac]">
              <div className="text-center h-full flex flex-col">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 mx-auto">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div className="mb-4">
                  <Badge variant="info" size="sm">Step 3</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('admin.setUpLocations')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                  {t('admin.setUpLocationsDesc')}
                </p>
                <div className="flex items-center justify-center text-[#42b8ac] font-medium mt-auto">
                  {t('admin.addLocations')}
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
            Frequently Used
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {frequentPages.map((page) => {
            const Icon = page.icon
            return (
              <Link key={page.href} href={page.href}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group h-full">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg flex-shrink-0 ${page.colorClass}`}>
                      {typeof Icon === 'function' && React.createElement(Icon as React.ComponentType<{className: string}>, { className: `h-6 w-6 ${page.iconClass}` })}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#42b8ac] transition-colors truncate">
                        {page.label}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {page.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
          These tiles update automatically based on the pages you visit most
        </p>
      </div>
    </Container>
  )
}
