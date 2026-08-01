// app/super-admin/components/BusinessDetailsModal.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getPlanDefinition } from '@/lib/plans'

interface Business {
  id: string
  name: string
  contactEmail: string
  contactName?: string
  phone?: string
  address?: string
  status: 'active' | 'inactive' | 'trial' | 'suspended'
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  createdAt: string
  trialEndsAt?: string
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trial'
  revenue?: number
  setupMilestones?: {
    sitesCount?: number
    devicesCount?: number
    menuItemsCount?: number
  }
  deviceStatus?: {
    online?: number
    offline?: number
  }
  lastActivityAt?: string | null
}

interface BusinessSummary {
  sites: Array<{
    id: string
    name: string
    slug?: string
    address?: string | null
    city?: string | null
    country?: string | null
    eircode?: string | null
    is_active?: boolean
    deviceCount?: number
    onlineDeviceCount?: number
    lastActivityAt?: string | null
  }>
  devices: Array<{
    id: string
    device_name: string
    device_type?: string
    status?: string
    site_id?: string | null
    last_heartbeat?: string | null
    created_at?: string
    site?: { name?: string; slug?: string } | null
  }>
  recentActivity: Array<{
    id: string
    event_type: string
    site_id?: string | null
    siteName?: string | null
    search_query?: string | null
    created_at: string
  }>
}

interface BusinessDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  business: Business | null
  onEdit?: (business: Business) => void
  onImpersonate?: (business: Business) => void
  onResetPassword?: (business: Business) => void
  onSetPassword?: (business: Business) => void
  onToggleStatus?: (business: Business) => void
}

export function BusinessDetailsModal({
  isOpen,
  onClose,
  business,
  onEdit,
  onImpersonate,
  onResetPassword,
  onSetPassword,
  onToggleStatus
}: BusinessDetailsModalProps) {
  const [summary, setSummary] = useState<BusinessSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')

  useEffect(() => {
    if (!isOpen || !business?.id) {
      setSummary(null)
      setSummaryError('')
      return
    }

    let cancelled = false
    const loadSummary = async () => {
      setSummaryLoading(true)
      setSummaryError('')
      try {
        const response = await fetch(`/api/super-admin/business/${business.id}/summary`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load business monitoring data')
        }

        if (!cancelled) setSummary(result)
      } catch (error: any) {
        if (!cancelled) {
          setSummary(null)
          setSummaryError(error.message || 'Failed to load business monitoring data')
        }
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [isOpen, business?.id])

  if (!business) return null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'trial':
        return <Badge variant="warning">Trial</Badge>
      case 'inactive':
        return <Badge variant="warning">Inactive</Badge>
      case 'suspended':
        return <Badge variant="error">Suspended</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getSubscriptionBadge = (subscriptionStatus?: string) => {
    switch (subscriptionStatus) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'past_due':
        return <Badge variant="warning">Past Due</Badge>
      case 'canceled':
        return <Badge variant="error">Canceled</Badge>
      case 'trial':
        return <Badge variant="info">Trial</Badge>
      default:
        return <Badge variant="default">Unknown</Badge>
    }
  }

  const planDetails = getPlanDefinition(business.plan)
  const setupSteps = [
    { label: 'Sites', count: business.setupMilestones?.sitesCount || 0 },
    { label: 'Devices', count: business.setupMilestones?.devicesCount || 0 },
    { label: 'Active Menu Items', count: business.setupMilestones?.menuItemsCount || 0 },
  ]
  const setupComplete = setupSteps.filter(step => step.count > 0).length
  const lastActivity = business.lastActivityAt
    ? new Date(business.lastActivityAt).toLocaleString()
    : 'No kiosk activity recorded'

  const formatActivity = (eventType: string) =>
    eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())

  const formatDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : 'Not recorded'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Business Details" size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {business.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Business ID: {business.id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(business.status)}
            {getSubscriptionBadge(business.subscriptionStatus)}
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">{business.contactEmail}</span>
              </div>
              {business.contactName && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{business.contactName}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{business.phone}</span>
                </div>
              )}
              {business.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">{business.address}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                <Badge variant="default">{planDetails.title}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Price:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {planDetails.priceLabel.replace('EUR', '€')}
                  {planDetails.priceSuffix ? ` ${planDetails.priceSuffix}` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                {getSubscriptionBadge(business.subscriptionStatus)}
              </div>
              {business.revenue && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Monthly Revenue:</span>
                  <span className="font-semibold text-green-600">€{business.revenue.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Setup & Monitoring
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {setupSteps.map(step => (
              <div key={step.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{step.label}</span>
                  {step.count > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{step.count}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Device Health</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {business.deviceStatus?.online || 0} online / {business.deviceStatus?.offline || 0} offline
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Kiosk Activity</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{lastActivity}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-[#42b8ac]"
              style={{ width: `${(setupComplete / setupSteps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sites & Devices
            </h4>
            {summaryLoading && (
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading monitoring data...</span>
            )}
          </div>

          {summaryError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {summaryError}
            </div>
          )}

          {summary && summary.sites.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No sites have been created for this customer yet.
            </div>
          )}

          {summary && summary.sites.length > 0 && (
            <div className="space-y-3">
              {summary.sites.map(site => (
                <div key={site.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-gray-900 dark:text-white">{site.name}</h5>
                        {site.is_active === false ? (
                          <Badge variant="warning">Inactive</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {[site.address, site.city, site.eircode, site.country].filter(Boolean).join(', ') || 'No address recorded'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        Last activity: {formatDateTime(site.lastActivityAt)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-right">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Devices</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{site.deviceCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                        <p className="font-semibold text-green-600">{site.onlineDeviceCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {summary && summary.devices.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-3 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <span className="col-span-5">Device</span>
                <span className="col-span-3">Site</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-2">Heartbeat</span>
              </div>
              {summary.devices.map(device => (
                <div key={device.id} className="flex flex-col gap-2 border-t border-gray-100 dark:border-gray-700 px-4 py-3 text-sm md:grid md:grid-cols-12 md:gap-3">
                  <span className="font-medium text-gray-900 dark:text-white md:col-span-5">{device.device_name}</span>
                  <span className="text-gray-600 dark:text-gray-300 md:col-span-3">{device.site?.name || 'Unassigned'}</span>
                  <span className="md:col-span-2">
                    {device.status === 'online' ? (
                      <Badge variant="success">Online</Badge>
                    ) : (
                      <Badge variant="warning">Offline</Badge>
                    )}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 md:col-span-2">{formatDateTime(device.last_heartbeat)}</span>
                </div>
              ))}
            </div>
          )}

          {summary && summary.recentActivity.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Kiosk Activity</h5>
              {summary.recentActivity.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatActivity(event.event_type)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{event.siteName || 'No site attached'}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(event.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan Features */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Plan Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {planDetails.adminFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(business.createdAt).toLocaleDateString()}
              </span>
            </div>
            {business.trialEndsAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Trial Ends:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(business.trialEndsAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {business.status === 'trial' && business.trialEndsAt && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Days Remaining:</span>
                <span className={`font-semibold ${
                  new Date(business.trialEndsAt) < new Date() ? 'text-red-600' : 'text-green-600'
                }`}>
                  {Math.max(0, Math.ceil((new Date(business.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onResetPassword?.(business)}>
              Send Reset Email
            </Button>
            <Button variant="outline" onClick={() => onSetPassword?.(business)}>
              Set Password
            </Button>
            {business.contactEmail && (
              <Button variant="outline" onClick={() => onImpersonate?.(business)}>
                Enter Admin Portal
              </Button>
            )}
            <Button
              variant={business.status === 'suspended' ? 'primary' : 'outline'}
              onClick={() => onToggleStatus?.(business)}
            >
              {business.status === 'suspended' ? 'Activate' : 'Suspend'}
            </Button>
          </div>
          <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => onEdit?.(business)}>
            Edit Business
          </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
