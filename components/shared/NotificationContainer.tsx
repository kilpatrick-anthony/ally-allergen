'use client'

import { useNotification, NotificationType } from '@/lib/hooks/useNotification'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification()
  const { t } = useTranslation()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const portalContext = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/kiosk')
      ? 'kiosk'
      : undefined

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'info':
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getColors = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-100',
          icon: 'text-green-600 dark:text-green-400',
          accent: 'bg-green-200 dark:bg-green-900'
        }
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-100',
          icon: 'text-red-600 dark:text-red-400',
          accent: 'bg-red-200 dark:bg-red-900'
        }
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-800 dark:text-amber-100',
          icon: 'text-amber-600 dark:text-amber-400',
          accent: 'bg-amber-200 dark:bg-amber-900'
        }
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-100',
          icon: 'text-blue-600 dark:text-blue-400',
          accent: 'bg-blue-200 dark:bg-blue-900'
        }
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 px-4" data-context={portalContext}>
      <div className="flex flex-col gap-3 max-w-md w-full">
        {notifications.map(notification => {
          const colors = getColors(notification.type)
          return (
            <div
              key={notification.id}
              role="alert"
              className={`
                pointer-events-auto
                ${colors.bg} ${colors.border} ${colors.text}
                border rounded-lg shadow-lg
                p-4 flex items-start gap-3
                animate-in fade-in slide-in-from-top-4 duration-300
              `}
            >
              <div className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 pr-2">
                <p className="text-sm font-medium leading-relaxed">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className={`
                  flex-shrink-0 rounded-lg p-1 
                  transition-colors hover:bg-white/20 active:bg-white/30
                `}
                aria-label={t('shared.closeNotification')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
