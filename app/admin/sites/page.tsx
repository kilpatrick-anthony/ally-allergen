// app/admin/sites/page.tsx - Enhanced with Design System
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { 
  Building, MapPin, Users, Globe, Phone, Mail,
  Calendar, CheckCircle, XCircle, AlertCircle,
  Plus, Search, Filter, Edit, Trash2, Eye,
  Download, BarChart, Settings, ChevronRight,
  Wifi, Printer, Tablet, Shield, Clock
} from 'lucide-react'

// Import design system components
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
interface SiteView {
  id: string
  name: string
  slug: string
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  status: 'active' | 'inactive'
  kioskStatus: 'online' | 'offline'
  lastSync: string
}

export default function SitesPage() {
    const { t } = useTranslation()
  const [sites, setSites] = useState<SiteView[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    loadSites()
  }, [])

  const getTimeSince = (dateString?: string | null) => {
    if (!dateString) return t('admin.noData')
    const date = new Date(dateString)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    if (seconds < 60) return t('admin.justNow')
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t('admin.minutesAgoSuffix')}`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t('admin.hoursAgoSuffix')}`
    return `${Math.floor(seconds / 86400)} ${t('admin.daysAgoSuffix')}`
  }

  const loadSites = async () => {
    try {
      const [sitesResponse, devicesResponse] = await Promise.all([
        fetch('/api/sites'),
        fetch('/api/devices')
      ])

      const sitesData = await sitesResponse.json()
      const devicesData = await devicesResponse.json()

      if (!sitesResponse.ok) {
        throw new Error(sitesData.error || 'Failed to fetch sites')
      }

      if (!devicesResponse.ok) {
        throw new Error(devicesData.error || 'Failed to fetch devices')
      }

      const deviceStats = new Map<string, { online: number; total: number; lastHeartbeat?: string | null }>()
      ;(devicesData.devices || []).forEach((device: any) => {
        if (!device.site_id) return
        const current = deviceStats.get(device.site_id) || { online: 0, total: 0, lastHeartbeat: null }
        current.total += 1
        if (device.status === 'online') {
          current.online += 1
        }
        if (device.last_heartbeat) {
          const currentLatest = current.lastHeartbeat ? new Date(current.lastHeartbeat) : null
          const candidate = new Date(device.last_heartbeat)
          if (!currentLatest || candidate > currentLatest) {
            current.lastHeartbeat = device.last_heartbeat
          }
        }
        deviceStats.set(device.site_id, current)
      })

      const mappedSites: SiteView[] = (sitesData.sites || []).map((site: any) => {
        const stats = deviceStats.get(site.id)
        const onlineCount = stats?.online || 0
        const totalDevices = stats?.total || 0

        return {
          id: site.id,
          name: site.name,
          slug: site.slug,
          address: site.address || null,
          city: site.city || null,
          country: site.country || null,
          phone: site.phone || null,
          email: site.email || null,
          is_active: !!site.is_active,
          status: site.is_active ? 'active' : 'inactive',
          kioskStatus: totalDevices > 0 && onlineCount > 0 ? 'online' : 'offline',
          lastSync: getTimeSince(stats?.lastHeartbeat)
        }
      })

      setSites(mappedSites)
    } catch (error) {
      console.error('Error loading sites:', error)
      setSites([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (site.city || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || site.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: sites.length,
    active: sites.filter(s => s.status === 'active').length,
    online: sites.filter(s => s.kioskStatus === 'online').length,
    pending: 0,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.loadingSites')}</p>
        </div>
      </div>
    )
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 dark:from-teal-500 dark:to-gray-700 rounded-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.siteManagement')}</h1>
                <p className="text-gray-600 dark:text-gray-300">{t('admin.siteManagementDesc')}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" icon={<Building className="h-3 w-3" />}>
              {stats.total} {t('admin.sites').toLowerCase()}
            </Badge>
            <Badge variant={stats.online === stats.active ? 'success' : 'warning'} icon={<Wifi className="h-3 w-3" />}>
              {stats.online} {t('admin.online').toLowerCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/admin/sites/new" className="block">
          <Card className="hover:shadow-lg transition-all hover:border-amber-500 hover:bg-gradient-to-br hover:from-amber-500 hover:to-amber-600 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.addNewSite')}</p>
                <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">+</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-amber-600 transition-all">
                <Plus className="h-6 w-6 text-white transition-colors" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.createNewLocation')} →</div>
            </div>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-all hover:border-[#42b8ac] hover:bg-gradient-to-br hover:from-[#42b8ac] hover:to-[#36948a] group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.totalSites')}</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#36948a] rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-[#42b8ac] transition-all">
              <Building className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.acrossAllLocations')}</div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-all hover:border-emerald-500 hover:bg-gradient-to-br hover:from-emerald-500 hover:to-emerald-600 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.active')}</p>
              <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.active}</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-emerald-600 transition-all">
              <CheckCircle className="h-6 w-6 text-white transition-colors" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.currentlyOperating')}</div>
          </div>
        </Card>

        <Link href="/admin/kiosks" className="block">
          <Card className="hover:shadow-lg transition-all hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-500 hover:to-blue-600 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.onlineKiosks')}</p>
                <p className="text-2xl font-bold text-[#003842] dark:text-white mt-1 group-hover:text-white transition-colors">{stats.online}</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-600 transition-all">
                <Wifi className="h-6 w-6 text-white transition-colors" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors">{t('admin.clickToViewAllDevices')}</div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Actions Bar */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:flex-initial md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.search') + ' ' + t('admin.sites').toLowerCase() + '...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="all">{t('admin.allStatus')}</option>
              <option value="active">{t('admin.active')}</option>
              <option value="inactive">{t('admin.inactive')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {filteredSites.map((site) => (
          <Card key={site.id} className="hover:shadow-lg transition-shadow group">
            <div className="p-6">
              {/* Site Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                    <Building className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#003842] transition-colors">
                      {site.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={site.status === 'active' ? 'success' : 'default'}>
                        {site.status === 'active' ? t('admin.active') : t('admin.inactive')}
                      </Badge>
                      <Badge variant={site.kioskStatus === 'online' ? 'success' : 'error'} icon={<Wifi className="h-3 w-3" />}>
                        {site.kioskStatus === 'online' ? t('admin.online') : t('admin.offline')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  {site.address || t('admin.addressNotSet')}{site.city ? `, ${site.city}` : ''}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  {site.phone || t('admin.phoneNotSet')}
                </div>
                {site.email && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {site.email}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-2 text-gray-400" />
                  {t('admin.lastSync')}: {site.lastSync}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center pt-4 border-t dark:border-gray-700">
                <Link href={`/admin/sites/${site.slug}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Eye className="h-4 w-4" />}
                  >
                    {t('admin.viewSite')}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSites.length === 0 && (
        <Card className="text-center py-12">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Building className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('admin.noSitesFound')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm || selectedStatus !== 'all'
              ? t('admin.tryAdjustingSearchOrFilters')
              : t('admin.getStartedFirstSite')}
          </p>
          <Link href="/admin/sites/new">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              {t('admin.addFirstSite')}
            </Button>
          </Link>
        </Card>
      )}

      {/* Empty State CTA */}
      {sites.length === 0 && !loading && (
        <Card className="mt-8 bg-gradient-to-r from-[#f0f9f8] to-[#e6f4f1] border border-[#42b8ac]/20">
          <div className="flex items-start">
            <div className="p-3 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg mr-4">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#003842] text-lg mb-3">{t('admin.addFirstSite')}</h3>
              <p className="text-[#003842]/80 mb-4">
                {t('admin.addFirstSiteDesc')}
              </p>
              
              <Link href="/admin/sites/new">
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admin.addFirstSite')}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </Container>
  )
}
