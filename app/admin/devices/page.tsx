// app/admin/devices/page.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { 
  Wifi, WifiOff, Monitor, Clock, AlertCircle, CheckCircle,
  RefreshCw, MapPin, Calendar, Activity, Smartphone, Tablet,
  Bell, Plus, Copy, ExternalLink, Check
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Device {
  id: string
  device_id: string
  device_name: string
  device_type: string
  is_online: boolean
  last_heartbeat: string
  site_name: string
  site_id: string
  site_slug: string
  site_email: string
  business_name: string
  business_id: string
  business_slug: string
  admin_email: string
  minutes_since_heartbeat: number
  active_alerts: number
  total_sessions: number
  total_interactions: number
  first_seen: string
}

interface Stats {
  total: number
  online: number
  offline: number
  alerts: number
}

export default function DeviceMonitoringPage() {
  const { t } = useTranslation()
  const [devices, setDevices] = useState<Device[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, online: 0, offline: 0, alerts: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKioskFor, setCopiedKioskFor] = useState<string | null>(null)

  const fetchDevices = async () => {
    try {
      setRefreshing(true)
      setError(null)

      const response = await fetch('/api/devices')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || t('admin.failedToDownload'))

      const list: Device[] = (data.devices || []).map((d: any) => ({
        ...d,
        is_online: d.status === 'online',
        minutes_since_heartbeat: d.last_heartbeat
          ? (Date.now() - new Date(d.last_heartbeat).getTime()) / 60000
          : 9999,
        site_name: d.site?.name ?? d.site_name ?? '',
        site_slug: d.site?.slug ?? d.site_slug ?? '',
        site_id: d.site_id ?? '',
        site_email: '',
        business_name: '',
        business_id: d.business_id ?? '',
        business_slug: d.business?.slug ?? '',
        admin_email: '',
        active_alerts: 0,
        total_sessions: 0,
        total_interactions: 0,
        first_seen: d.created_at ?? '',
      }))

      setDevices(list)

      const total = list.length
      const online = list.filter(d => d.is_online).length
      const offline = total - online
      const alerts = list.reduce((sum, d) => sum + (d.active_alerts || 0), 0)

      setStats({ total, online, offline, alerts })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.failedToDownload'))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()

    // Auto-refresh every minute
    const interval = setInterval(fetchDevices, 60000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const filteredDevices = devices.filter(d => {
    if (filter === 'online') return d.is_online
    if (filter === 'offline') return !d.is_online
    return true
  })

  const formatLastSeen = (heartbeat: string, minutes: number) => {
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${Math.floor(minutes)} min ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`
    return `${Math.floor(minutes / 1440)} days ago`
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'tablet': return Tablet
      case 'mobile': return Smartphone
      default: return Monitor
    }
  }

  const getKioskUrl = (device: Device) => {
    const kioskTarget = (device.business_slug || '').trim() || device.business_id
    if (!kioskTarget || !device.site_id) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({ site_id: device.site_id })
    const path = `/kiosk/${kioskTarget}?${params.toString()}`
    return origin ? `${origin}${path}` : path
  }

  const copyKioskUrl = async (deviceId: string, url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedKioskFor(deviceId)
    setTimeout(() => setCopiedKioskFor(null), 2000)
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading devices...</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.deviceMonitoring')}</h1>
            <p className="text-gray-600 mt-2">
              {t('admin.deviceMonitoringDesc')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Need to add a device? Set it up from Sites so it can be assigned to a location.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/sites"
              className="inline-flex items-center justify-center rounded-lg bg-[#42b8ac] px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#36948a]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.addLocation')}
            </Link>
            <Button
              onClick={fetchDevices}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card>
            <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Devices</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('admin.totalDevices')}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <Monitor className="h-10 w-10 text-gray-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Online</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.online}</p>
                </div>
                <Wifi className="h-10 w-10 text-green-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Offline</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.offline}</p>
                </div>
                <WifiOff className="h-10 w-10 text-red-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('admin.activeAlerts')}</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">{stats.alerts}</p>
                </div>
                <AlertCircle className="h-10 w-10 text-amber-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filter === 'online' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('online')}
              >
                <Wifi className="h-4 w-4 mr-1" />
                Online ({stats.online})
              </Button>
              <Button
                variant={filter === 'offline' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('offline')}
              >
                <WifiOff className="h-4 w-4 mr-1" />
                Offline ({stats.offline})
              </Button>
            </div>
          </div>
        </Card>

        {/* Devices List */}
        <div className="space-y-4">
          {filteredDevices.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('admin.noData')}</p>
                <p className="text-sm text-gray-400 mt-2">
                  Devices will appear here once kiosks are accessed
                </p>
                <Link
                  href="/admin/sites"
                  className="inline-flex items-center justify-center mt-4 rounded-lg border border-[#42b8ac] px-4 py-2 text-sm font-medium text-[#42b8ac] hover:bg-[#f0f9f8]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Device and Assign Location
                </Link>
              </div>
            </Card>
          ) : (
            filteredDevices.map(device => {
              const DeviceIcon = getDeviceIcon(device.device_type)
              const isOffline = !device.is_online
              const isStale = device.minutes_since_heartbeat > 3
              const kioskUrl = getKioskUrl(device)

              return (
                <Card key={device.id}>
                  <div className="p-5">

                    {/* ── Row 1: icon · name · badges · status pill ── */}
                    <div className="flex items-center gap-3 mb-4">
                      {/* Device icon with online dot */}
                      <div className="relative flex-shrink-0">
                        <div className={`p-2.5 rounded-lg ${isOffline ? 'bg-red-50' : 'bg-green-50'}`}>
                          <DeviceIcon className={`h-5 w-5 ${isOffline ? 'text-red-500' : 'text-green-600'}`} />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 block w-2.5 h-2.5 rounded-full border-2 border-white ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
                      </div>

                      {/* Name */}
                      <h3 className="font-semibold text-gray-900 flex-1 min-w-0 truncate">
                        {device.device_name}
                      </h3>

                      {/* Status pill */}
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                        isOffline
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {isOffline
                          ? <><WifiOff className="h-3 w-3" /> Offline</>
                          : <><Wifi className="h-3 w-3" /> Online</>
                        }
                      </span>

                      {device.active_alerts > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 flex-shrink-0">
                          <Bell className="h-3 w-3" />
                          {device.active_alerts} alert{device.active_alerts > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* ── Row 2: info grid ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        {device.site_slug ? (
                          <Link
                            href={`/admin/sites/${device.site_slug}?tab=devices`}
                            className="inline-flex items-center text-[#003842] hover:text-[#42b8ac] font-medium truncate"
                          >
                            {device.site_name || 'Open location'}
                          </Link>
                        ) : (
                          <span className="truncate">{device.site_name || '—'}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">Last seen: {formatLastSeen(device.last_heartbeat, device.minutes_since_heartbeat)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{device.total_sessions || 0} sessions</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Since {new Date(device.first_seen).toLocaleDateString()}</span>
                      </div>

                      {kioskUrl && (
                        <div className="sm:col-span-2 rounded-lg border border-[#42b8ac]/30 bg-[#f0faf9] p-2.5 mt-1">
                          <p className="text-[11px] font-semibold text-[#003842] uppercase tracking-wide mb-1">Kiosk URL</p>
                          <p className="text-xs text-gray-700 break-all leading-relaxed mb-2">{kioskUrl}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyKioskUrl(device.id, kioskUrl)}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition-colors"
                            >
                              {copiedKioskFor === device.id
                                ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                                : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                              {copiedKioskFor === device.id ? 'Copied' : 'Copy URL'}
                            </button>
                            <a
                              href={kioskUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Open
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Stale warning ── */}
                    {!isOffline && isStale && (
                      <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-sm text-amber-800">
                        No heartbeat for {Math.floor(device.minutes_since_heartbeat)} min — possible connectivity issue.
                      </div>
                    )}

                    {/* ── Alert emails ── */}
                    {(device.site_email || device.admin_email) && (
                      <div className="mb-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-1.5">Offline alerts sent to:</p>
                        <div className="flex flex-wrap gap-2">
                          {device.site_email && (
                            <Badge variant="info">Site: {device.site_email}</Badge>
                          )}
                          {device.admin_email && (
                            <Badge variant="info">Admin: {device.admin_email}</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Footer action ── */}
                    {device.site_slug && (
                      <div className="pt-3 border-t border-gray-100">
                        <Link
                          href={`/admin/sites/${device.site_slug}?tab=devices`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#42b8ac] px-3 py-1.5 text-xs font-medium text-[#42b8ac] hover:bg-[#f0faf9] transition-colors"
                        >
                          Manage in Location
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </Container>
  )
}
