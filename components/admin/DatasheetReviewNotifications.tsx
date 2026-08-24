// components/admin/DatasheetReviewNotifications.tsx
'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Calendar, CheckCircle, X, Bell, Eye, FileText } from 'lucide-react'
import { Card } from '../layout/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface DatasheetNotification {
  id: string
  datasheet_id: string
  file_name: string
  entity_type: 'ingredient' | 'menu_item'
  entity_name: string
  next_review_date: string
  days_until_review: number
  supplier_name?: string
  status: 'overdue' | 'due_soon' | 'upcoming'
}

interface DatasheetReviewNotificationsProps {
  onDismiss?: (notificationId: string) => void
  onViewDatasheet?: (datasheetId: string) => void
  compact?: boolean
}

export default function DatasheetReviewNotifications({
  onDismiss,
  onViewDatasheet,
  compact = false
}: DatasheetReviewNotificationsProps) {
  const { t, language } = useTranslation()
  const [notifications, setNotifications] = useState<DatasheetNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In production, fetch from API
    const mockNotifications: DatasheetNotification[] = [
      {
        id: '1',
        datasheet_id: 'ds-1',
        file_name: 'Almond_Milk_Product_Info.pdf',
        entity_type: 'ingredient',
        entity_name: 'Almond Milk',
        next_review_date: '2024-02-01',
        days_until_review: -15,
        supplier_name: 'Supplier C',
        status: 'overdue'
      },
      {
        id: '2',
        datasheet_id: 'ds-2',
        file_name: 'Acai_Berry_Specification_2024.pdf',
        entity_type: 'ingredient',
        entity_name: 'Acai Berry',
        next_review_date: '2024-03-15',
        days_until_review: 5,
        supplier_name: 'Supplier A',
        status: 'due_soon'
      },
      {
        id: '3',
        datasheet_id: 'ds-3',
        file_name: 'Smoothie_Bowl_Nutritional_Data.xlsx',
        entity_type: 'menu_item',
        entity_name: 'Berry Smoothie Bowl',
        next_review_date: '2024-02-20',
        days_until_review: 3,
        status: 'due_soon'
      }
    ]

    setTimeout(() => {
      setNotifications(mockNotifications)
      setLoading(false)
    }, 500)
  }, [])

  const handleDismiss = (notificationId: string) => {
    setNotifications(current => current.filter(n => n.id !== notificationId))
    onDismiss?.(notificationId)
  }

  const dueText = (notification: DatasheetNotification) => {
    const count = Math.abs(notification.days_until_review)
    const key = notification.status === 'overdue'
      ? count === 1 ? 'datasheetReview.overdueByDay' : 'datasheetReview.overdueByDays'
      : count === 1 ? 'datasheetReview.dueInDay' : 'datasheetReview.dueInDays'
    return t(key, { count })
  }

  const overdueCount = notifications.filter(n => n.status === 'overdue').length
  const dueSoonCount = notifications.filter(n => n.status === 'due_soon').length

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center">
          <div className="relative mx-auto mb-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{t('datasheetReview.loading')}</p>
        </div>
      </Card>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <div className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {t('datasheetReview.allUpToDate')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('datasheetReview.noneRequireReview')}
          </p>
        </div>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {notifications.slice(0, 3).map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border-l-4 ${
              notification.status === 'overdue'
                ? 'bg-red-50 border-red-500'
                : 'bg-amber-50 border-amber-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  {notification.status === 'overdue' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Calendar className="h-4 w-4 text-amber-600" />
                  )}
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.entity_name}
                  </p>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {notification.file_name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dueText(notification)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDismiss(notification.id)}
                className="ml-2 p-1 hover:bg-white rounded"
                aria-label={t('datasheetReview.dismissNamed', { name: notification.entity_name })}
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>
        ))}
        {notifications.length > 3 && (
          <p className="text-xs text-center text-gray-500 pt-2">
            {t(
              notifications.length - 3 === 1
                ? 'datasheetReview.moreNotification'
                : 'datasheetReview.moreNotifications',
              { count: notifications.length - 3 }
            )}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('datasheetReview.title')}
              </h3>
              <p className="text-sm text-gray-600">
                {t(
                  notifications.length === 1
                    ? 'datasheetReview.needsReview'
                    : 'datasheetReview.needReview',
                  { count: notifications.length }
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {overdueCount > 0 && (
              <Badge variant="error">
                {overdueCount} {t('datasheetReview.overdue')}
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge variant="warning">
                {dueSoonCount} {t('datasheetReview.dueSoon')}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card key={notification.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className={`p-3 rounded-lg ${
                  notification.status === 'overdue'
                    ? 'bg-red-100'
                    : 'bg-amber-100'
                }`}>
                  {notification.status === 'overdue' ? (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  ) : (
                    <Calendar className="h-6 w-6 text-amber-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-base font-semibold text-gray-900">
                      {notification.entity_name}
                    </h4>
                    <Badge 
                      variant={notification.entity_type === 'ingredient' ? 'info' : 'info'}
                      size="sm"
                    >
                      {notification.entity_type === 'ingredient'
                        ? t('datasheetReview.ingredient')
                        : t('datasheetReview.menuItem')}
                    </Badge>
                    {notification.status === 'overdue' && (
                      <Badge variant="error" size="sm">
                        {t('datasheetReview.overdue')}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span>{notification.file_name}</span>
                    </div>
                    {notification.supplier_name && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="font-medium">{t('datasheetReview.supplier')}</span>
                        <span>{notification.supplier_name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {t('datasheetReview.reviewDate', {
                          date: new Date(notification.next_review_date).toLocaleDateString(language)
                        })}
                      </span>
                      <span className={`font-medium ${
                        notification.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {notification.status === 'overdue'
                          ? t(
                              Math.abs(notification.days_until_review) === 1
                                ? 'datasheetReview.daysOverdue'
                                : 'datasheetReview.daysOverduePlural',
                              { count: Math.abs(notification.days_until_review) }
                            )
                          : `(${dueText(notification)})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                {onViewDatasheet && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onViewDatasheet(notification.datasheet_id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t('datasheetReview.reviewNow')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(notification.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('datasheetReview.dismiss')}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
