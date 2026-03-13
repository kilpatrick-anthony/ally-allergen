// components/admin/NotificationsPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Card } from '../layout/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface Notification {
  type: 'datasheet' | 'ingredient' | 'menu_item' | 'supplier'
  id: string
  name: string
  lastUpdated: string
  daysOverdue: number
  frequency: string
}

interface NotificationsPanelProps {
  settings: {
    notificationsEnabled: boolean
    datasheetAuditEnabled: boolean
    ingredientsAuditEnabled: boolean
    menuAuditEnabled: boolean
    supplierAuditEnabled: boolean
    datasheetAuditFrequency: string
    ingredientsAuditFrequency: string
    menuAuditFrequency: string
    supplierAuditFrequency: string
  }
}

export function NotificationsPanel({ settings }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingReviewed, setMarkingReviewed] = useState<string | null>(null)

  useEffect(() => {
    if (settings.notificationsEnabled) {
      fetchNotifications()
    }
  }, [settings])

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({
        datasheetEnabled: settings.datasheetAuditEnabled.toString(),
        ingredientEnabled: settings.ingredientsAuditEnabled.toString(),
        menuEnabled: settings.menuAuditEnabled.toString(),
        supplierEnabled: settings.supplierAuditEnabled.toString(),
        datasheetFreq: settings.datasheetAuditFrequency,
        ingredientFreq: settings.ingredientsAuditFrequency,
        menuFreq: settings.menuAuditFrequency,
        supplierFreq: settings.supplierAuditFrequency
      })

      const response = await fetch(`/api/notifications?${params}`)
      const data = await response.json()

      if (data.notifications) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsReviewed = async (type: string, id: string) => {
    setMarkingReviewed(`${type}-${id}`)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: type, entityId: id })
      })

      if (response.ok) {
        // Remove from notifications list
        setNotifications(prev => prev.filter(n => !(n.type === type && n.id === id)))
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error)
    } finally {
      setMarkingReviewed(null)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'datasheet': return 'Datasheet'
      case 'ingredient': return 'Ingredient'
      case 'menu_item': return 'Menu Item'
      case 'supplier': return 'Supplier'
      default: return type
    }
  }

  const getTypeIcon = (type: string) => {
    // You can import and use specific icons here
    return <AlertTriangle className="h-4 w-4" />
  }

  if (!settings.notificationsEnabled) {
    return null
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Compliance Notifications</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Compliance Notifications</h3>
        {notifications.length > 0 && (
          <Badge variant="error">
            {notifications.length} overdue
          </Badge>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">All items are up to date!</p>
          <p className="text-sm text-gray-500 mt-1">No compliance reviews are currently overdue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={`${notification.type}-${notification.id}`}
                 className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                {getTypeIcon(notification.type)}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {notification.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getTypeLabel(notification.type)} • {notification.daysOverdue} days overdue
                  </p>
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(notification.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => markAsReviewed(notification.type, notification.id)}
                disabled={markingReviewed === `${notification.type}-${notification.id}`}
                className="ml-4"
              >
                {markingReviewed === `${notification.type}-${notification.id}` ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    Marking...
                  </div>
                ) : (
                  'Mark Reviewed'
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t dark:border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Notifications are checked based on your audit frequency settings
        </p>
      </div>
    </Card>
  )
}