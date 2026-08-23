// components/admin/NotificationsPanel.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Bell, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Card } from '../layout/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface ComplianceItem {
  id: string
  name: string
  type: 'ingredient' | 'menu_item'
  status: 'compliant' | 'warning' | 'error'
}

interface ComplianceSummary {
  ingredients: ComplianceItem[]
  menuItems: ComplianceItem[]
  totalNonCompliant: number
  totalErrors: number
  totalWarnings: number
}

interface NotificationsPanelProps {
  settings: {
    notificationsEnabled: boolean
  }
}

export function NotificationsPanel({ settings }: NotificationsPanelProps) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<ComplianceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)

      const response = await fetch('/api/compliance/status?scope=all', {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Compliance request failed with status ${response.status}`)
      }

      const data = await response.json()
      if (!data.compliance) {
        throw new Error('No compliance summary returned')
      }

      setSummary(data.compliance)
    } catch (fetchError) {
      console.error('Error fetching dashboard compliance summary:', fetchError)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (settings.notificationsEnabled) {
      fetchCompliance()
    }
  }, [fetchCompliance, settings.notificationsEnabled])

  if (!settings.notificationsEnabled) {
    return null
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">{t('admin.complianceNotifications')}</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#42b8ac]/20 border-t-[#42b8ac]" />
            <div
              className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#003842]"
              style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
            />
          </div>
          <span className="sr-only">{t('admin.loadingComplianceSummary')}</span>
        </div>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold">{t('admin.complianceNotifications')}</h3>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/10">
          <p className="text-sm text-red-800 dark:text-red-200">
            {t('admin.unableLoadComplianceSummary')}
          </p>
          <Button className="mt-4" size="sm" variant="outline" icon={RefreshCw} onClick={fetchCompliance}>
            {t('admin.tryAgain')}
          </Button>
        </div>
      </Card>
    )
  }

  const issues = [...summary.ingredients, ...summary.menuItems]
    .filter((item) => item.status !== 'compliant')
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'error' ? -1 : 1))
    .slice(0, 5)

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Bell className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">{t('admin.complianceNotifications')}</h3>
        {summary.totalNonCompliant > 0 && (
          <Badge variant={summary.totalErrors > 0 ? 'error' : 'warning'}>
            {t('admin.itemsNeedAttention', { count: summary.totalNonCompliant })}
          </Badge>
        )}
      </div>

      {summary.totalNonCompliant === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-600" />
          <p className="text-gray-600 dark:text-gray-400">{t('admin.allComplianceChecksPassed')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('admin.noComplianceIssues')}</p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/10">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{t('admin.complianceErrors')}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-red-800 dark:text-red-200">{summary.totalErrors}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{t('admin.complianceWarnings')}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{summary.totalWarnings}</p>
            </div>
          </div>

          <div className="space-y-2">
            {issues.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === 'ingredient' ? `/admin/ingredients/${item.id}/edit` : `/admin/menu-builder/${item.id}/edit`}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-[#42b8ac] hover:bg-[#42b8ac]/5 dark:border-gray-700"
              >
                {item.status === 'error' ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {item.status === 'error' ? t('admin.notCompliant') : t('admin.reviewDueSoon')}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 border-t pt-4 dark:border-gray-700">
        <Link
          href="/admin/compliance"
          className="block text-center text-sm font-medium text-[#007f7a] hover:text-[#003842] hover:underline dark:text-[#42b8ac]"
        >
          {t('admin.reviewComplianceDetails')}
        </Link>
      </div>
    </Card>
  )
}
