// app/admin/kiosks/page.tsx
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { 
  Tablet, Wifi, WifiOff, Monitor, Smartphone,
  Building, MapPin, Clock, Settings, RefreshCw,
  ArrowLeft, Search
} from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Device {
  id: string
  device_name: string
  device_type: 'tablet' | 'kiosk' | 'display' | 'mobile'
  status: 'online' | 'offline' | 'error'
  last_heartbeat: string | null
  site: {
    id: string
    name: string
    slug: string
    city: string | null
  } | null
}

export default function AllKiosksPage() {
  const { t } = useTranslation()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | Device['device_type']>('all')

  const loadAllDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/devices')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch devices')
      }

      setDevices(data.devices || [])
    } catch (error: any) {
      console.error('Error loading devices:', error)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAllDevices()
  }, [loadAllDevices])

  const getDeviceIcon = (type: Device['device_type']) => {
    switch (type) {
      case 'kiosk': return Monitor
      case 'tablet': return Tablet
      case 'mobile': return Smartphone
      case 'display': return Monitor
    }
  }
  const getTimeSince = (dateString?: string | null) => {
    if (!dateString) return t('corePortal.never')
    const date = new Date(dateString)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    
    if (seconds < 60) return t('corePortal.justNow')
    if (seconds < 3600) return t('corePortal.minutesAgo', { count: Math.floor(seconds / 60) })
    if (seconds < 86400) return t('corePortal.hoursAgo', { count: Math.floor(seconds / 3600) })
    return t('corePortal.daysAgo', { count: Math.floor(seconds / 86400) })
  }

  const getDeviceTypeLabel = (type: Device['device_type']) => ({
    kiosk: t('admin.kiosks'),
    tablet: t('corePortal.tablets'),
    display: t('corePortal.displays'),
    mobile: t('corePortal.mobile'),
  })[type]

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (device.site?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' ? device.status === 'online' : device.status !== 'online')
    const matchesType = typeFilter === 'all' || device.device_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status !== 'online').length,
    kiosks: devices.filter(d => d.device_type === 'kiosk').length,
    tablets: devices.filter(d => d.device_type === 'tablet').length
  }

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative h-12 w-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
            </div>
            <p className="text-gray-600">{t('admin.loading')}</p>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin/sites"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('admin.backToSites')}
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg flex-shrink-0">
                <Tablet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('admin.allKiosksDevices')}</h1>
                <p className="text-gray-600">
                  {t('admin.allKiosksDevicesDesc')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={loadAllDevices}
              className="self-start flex-shrink-0"
            >
              {t('admin.refresh')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin.devices')}</p>
                <p className="text-2xl font-bold text-[#003842] mt-1">{stats.total}</p>
              </div>
              <Tablet className="h-8 w-8 text-[#42b8ac]" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('kioskPortal.online')}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.online}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('kioskPortal.offline')}</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{stats.offline}</p>
              </div>
              <WifiOff className="h-8 w-8 text-gray-600" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('admin.kiosks')}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.kiosks}</p>
              </div>
              <Monitor className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('corePortal.tablets')}</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.tablets}</p>
              </div>
              <Tablet className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('admin.search') + ' ' + t('admin.devices').toLowerCase() + '...'}
                  aria-label={t('admin.search') + ' ' + t('admin.devices').toLowerCase()}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>
            </div>
            
            <select
              aria-label={t('admin.allStatus')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            >
              <option value="all">{t('admin.allStatus')}</option>
              <option value="online">{t('corePortal.onlineOnly')}</option>
              <option value="offline">{t('corePortal.offlineOnly')}</option>
            </select>

            <select
              aria-label={t('corePortal.allTypes')}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
            >
              <option value="all">{t('corePortal.allTypes')}</option>
              <option value="kiosk">{t('admin.kiosks')}</option>
              <option value="tablet">{t('corePortal.tablets')}</option>
              <option value="display">{t('corePortal.displays')}</option>
              <option value="mobile">{t('corePortal.mobile')}</option>
            </select>
          </div>
        </Card>

        {/* Devices List */}
        <div className="space-y-4">
          {filteredDevices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.device_type)
            
            return (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      device.status === 'online'
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}>
                      {typeof DeviceIcon === 'function' && React.createElement(DeviceIcon as React.ComponentType<{className: string}>, { className: `h-6 w-6 ${
                        device.status === 'online'
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }` })}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {device.device_name}
                        </h3>
                        <Badge variant={device.status === 'online' ? 'success' : 'default'}>
                          {device.status === 'online' ? t('kioskPortal.online') : t('kioskPortal.offline')}
                        </Badge>
                        <Badge variant="info">
                          {getDeviceTypeLabel(device.device_type)}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {device.site ? (
                            <Link
                              href={`/admin/sites/${device.site.slug}`}
                              className="hover:text-[#42b8ac] hover:underline"
                            >
                              {device.site.name}
                            </Link>
                          ) : (
                            <span>{t('corePortal.unassigned')}</span>
                          )}
                        </div>
                        {device.site?.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {device.site.city}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t('admin.lastSeenLabel')} {getTimeSince(device.last_heartbeat)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {device.site && (
                      <Link href={`/admin/sites/${device.site.slug}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Settings className="h-4 w-4" />}
                      >
                        {t('corePortal.manage')}
                      </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredDevices.length === 0 && (
          <Card className="text-center py-12">
            <Tablet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('corePortal.noDevicesFound')}</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? t('admin.tryAdjustingSearch')
                : t('corePortal.addDevicesEmpty')}
            </p>
          </Card>
        )}
      </div>
    </Container>
  )
}
