// components/admin/TrialBanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, Zap, X } from 'lucide-react'
import Link from 'next/link'

interface TrialStatus {
  isTrialActive: boolean
  isTrialExpired: boolean
  daysRemaining: number
  trialEndsAt: string | null
  planType: string
}

interface TrialBannerProps {
  className?: string
}

export function TrialBanner({ className = '' }: TrialBannerProps) {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchTrialStatus()
  }, [])

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch('/api/trial/check')
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
      }
    } catch (error) {
      console.error('Failed to fetch trial status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !status || dismissed) return null

  // Don't show banner if on paid plan
  if (status.planType !== 'trial' && status.planType !== 'free') return null

  // Trial expired - urgent message
  if (status.isTrialExpired) {
    return (
      <div className={`bg-red-50 border-l-4 border-red-500 p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                Your trial has expired
              </h3>
              <p className="text-sm text-red-800 mb-3">
                Upgrade now to continue using AllyJen and access all features.
              </p>
              <Link
                href="/admin/settings?tab=billing"
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Trial active - friendly reminder
  if (status.isTrialActive) {
    const urgency = status.daysRemaining <= 2 ? 'urgent' : 'normal'
    const bgColor = urgency === 'urgent' ? 'bg-orange-50' : 'bg-blue-50'
    const borderColor = urgency === 'urgent' ? 'border-orange-500' : 'border-blue-500'
    const textColor = urgency === 'urgent' ? 'text-orange-900' : 'text-blue-900'
    const iconColor = urgency === 'urgent' ? 'text-orange-600' : 'text-blue-600'
    const buttonColor = urgency === 'urgent' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#42b8ac] hover:bg-[#3aa89d]'

    return (
      <div className={`${bgColor} border-l-4 ${borderColor} p-4 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Clock className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
            <div className="flex-1">
              <h3 className={`text-sm font-semibold ${textColor} mb-1`}>
                {status.daysRemaining === 0 
                  ? 'Last day of your trial!' 
                  : `${status.daysRemaining} day${status.daysRemaining > 1 ? 's' : ''} left in your trial`
                }
              </h3>
              <p className={`text-sm ${textColor} mb-3`}>
                Upgrade to unlock unlimited PDF downloads, multiple locations, and more.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/settings?tab=billing"
                  className={`inline-flex items-center px-4 py-2 ${buttonColor} text-white text-sm font-medium rounded-lg transition-colors`}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  View Plans
                </Link>
                <button
                  onClick={() => setDismissed(true)}
                  className={`text-sm ${textColor} hover:underline`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className={`${iconColor} hover:opacity-70 transition-opacity ml-2`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
