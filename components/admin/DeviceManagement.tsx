// components/admin/DeviceManagement.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Tablet, Wifi, WifiOff, Monitor, Smartphone,
  Plus, Trash2, RefreshCw, X,
  AlertCircle, Copy, Check,
  Power, Clock, ExternalLink
} from 'lucide-react';
import { Card } from '@/components/layout/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface Device {
  id: string;
  device_name: string;
  device_type: 'tablet' | 'kiosk' | 'display' | 'mobile';
  status: 'online' | 'offline' | 'error';
  last_heartbeat: string | null;
  site_id: string;
  business_id: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  active_pairing_code?: string | null;
  pairing_code_expires_at?: string | null;
  active_pairing_code_redeemed?: boolean | null;
  live_minutes_since_heartbeat?: number | null;
  last_page_url?: string | null;
  is_on_expected_screen?: boolean | null;
  site?: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
  } | null;
  business?: {
    slug?: string | null;
  } | null;
}

interface DeviceManagementProps {
  siteId: string;
  siteName: string;
}

export default function DeviceManagement({ 
  siteId, 
  siteName 
}: DeviceManagementProps) {
  const { t, language } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<Device['device_type']>('tablet');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [regeneratingFor, setRegeneratingFor] = useState<string | null>(null);
  const [cardCopied, setCardCopied] = useState<string | null>(null);
  const [kioskUrlCopied, setKioskUrlCopied] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/devices?siteId=${siteId}`)
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
  }, [siteId]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const addDevice = async () => {
    if (!newDeviceName.trim()) return;
    setGeneratingCode(true);

    try {
      const response = await fetch('/api/devices/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          device_name: newDeviceName,
          device_type: newDeviceType,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create device')
      }

      setDevices((current) => [
        {
          ...data.device,
          active_pairing_code: data.pairing_code ?? null,
          pairing_code_expires_at: data.expires_at ?? null,
        },
        ...current,
      ])
      setPairingCode(data.pairing_code)
      setPairingExpiry(data.expires_at)
      setShowAddDevice(false)
      setNewDeviceName('')
    } catch (error: any) {
      console.error('Error adding device:', error)
    } finally {
      setGeneratingCode(false)
    }
  };

  const copyCode = async () => {
    if (!pairingCode) return
    await navigator.clipboard.writeText(pairingCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const dismissPairingCode = () => {
    setPairingCode(null)
    setPairingExpiry(null)
    setCodeCopied(false)
  }

  const regenerateCode = async (deviceId: string) => {
    setRegeneratingFor(deviceId)
    try {
      const response = await fetch(`/api/devices/${deviceId}/pair`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate code')
      setDevices((current) => current.map(d =>
        d.id === deviceId
          ? { ...d, active_pairing_code: data.pairing_code, pairing_code_expires_at: data.expires_at }
          : d
      ))
    } catch (error: any) {
      console.error('Error regenerating code:', error)
    } finally {
      setRegeneratingFor(null)
    }
  }

  const copyCardCode = async (deviceId: string, code: string) => {
    await navigator.clipboard.writeText(code)
    setCardCopied(deviceId)
    setTimeout(() => setCardCopied(null), 2000)
  }

  const removeDevice = async (deviceId: string) => {
    if (!confirm(t('deviceManagement.removeConfirm'))) return;

    try {
      const response = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove device')
      }
      setDevices((current) => current.filter(d => d.id !== deviceId))
    } catch (error: any) {
      console.error('Error removing device:', error)
    }
  };

  const getKioskPath = (device: Device) => {
    const kioskTarget = device.business?.slug?.trim() || device.business_id
    if (!kioskTarget || !device.site_id) return null
    const params = new URLSearchParams({ site_id: device.site_id })
    return `/kiosk/${kioskTarget}?${params.toString()}`
  }

  const getKioskUrl = (device: Device) => {
    const path = getKioskPath(device)
    if (!path) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin ? `${origin}${path}` : path
  }

  const copyKioskUrl = async (deviceId: string, url: string) => {
    await navigator.clipboard.writeText(url)
    setKioskUrlCopied(deviceId)
    setTimeout(() => setKioskUrlCopied(null), 2000)
  }

  const toggleDeviceStatus = async (deviceId: string) => {
    const current = devices.find(d => d.id === deviceId)
    if (!current) return

    const nextStatus = current.status === 'online' ? 'offline' : 'online'

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update device')
      }

      setDevices((devices) => devices.map(d => d.id === deviceId ? data.device : d))
    } catch (error: any) {
      console.error('Error updating device:', error)
    }
  };

  const getDeviceIcon = (type: Device['device_type']) => {
    switch (type) {
      case 'kiosk': return Monitor;
      case 'tablet': return Tablet;
      case 'mobile': return Smartphone;
      case 'display': return Monitor;
    }
  };

  const getTimeSince = (dateString?: string | null) => {
    if (!dateString) return t('corePortal.never')
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return t('corePortal.justNow');
    if (seconds < 3600) return t('corePortal.minutesAgo', { count: Math.floor(seconds / 60) });
    if (seconds < 86400) return t('corePortal.hoursAgo', { count: Math.floor(seconds / 3600) });
    return t('corePortal.daysAgo', { count: Math.floor(seconds / 86400) });
  };

  const getExpiryCountdown = (expiry?: string | null) => {
    if (!expiry) return null

    const expiryMs = new Date(expiry).getTime()
    const remainingMs = expiryMs - nowMs

    if (Number.isNaN(expiryMs) || remainingMs <= 0) {
      return { label: t('deviceManagement.expired'), urgency: 'expired' as const }
    }

    const totalMinutes = Math.ceil(remainingMs / 60000)
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60

    let label = ''
    if (days > 0) {
      label = `${days}d ${hours}h`
    } else if (hours > 0) {
      label = `${hours}h ${minutes}m`
    } else {
      label = `${minutes}m`
    }

    const urgency = totalMinutes <= 60 ? 'critical' : totalMinutes <= 360 ? 'warning' : 'normal'
    return { label, urgency }
  }

  const getDeviceTypeLabel = (type: Device['device_type']) => ({
    kiosk: t('deviceManagement.kioskFixed'), tablet: t('deviceManagement.tabletMobile'),
    display: t('deviceManagement.displayScreen'), mobile: t('deviceManagement.mobileDevice'),
  })[type]

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    errors: devices.filter(d => d.status === 'error').length,
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="relative h-12 w-12 mx-auto mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
        <p className="text-gray-600">{t('admin.loadingDevices')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('admin.totalDevices')}</p>
              <p className="text-2xl font-bold text-[#003842] mt-1">{stats.total}</p>
            </div>
            <Tablet className="h-8 w-8 text-[#42b8ac]" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('kioskPortal.online')}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.online}</p>
            </div>
            <Wifi className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('admin.complianceErrors')}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.errors}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('kioskPortal.offline')}</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.offline}</p>
            </div>
            <WifiOff className="h-8 w-8 text-gray-600" />
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#003842]">
              {t('deviceManagement.devicesFor', { name: siteName })}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('deviceManagement.description')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              icon={<RefreshCw className="h-5 w-5" />}
              onClick={loadDevices}
            >
              {t('admin.refresh')}
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-5 w-5" />}
              onClick={() => setShowAddDevice(true)}
            >
              {t('deviceManagement.addDevice')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Device Form */}
      {showAddDevice && (
        <Card className="border-2 border-[#42b8ac]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#003842]">{t('deviceManagement.addNewDevice')}</h3>
              <button
                type="button"
                onClick={() => setShowAddDevice(false)}
                aria-label={t('accessPoints.cancel')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              {t('deviceManagement.createFirstDescription')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-device-name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('deviceManagement.deviceName')}
                </label>
                <input
                  type="text"
                  id="new-device-name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder={t('deviceManagement.deviceNamePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="new-device-type" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('deviceManagement.deviceType')}
                </label>
                <select
                  id="new-device-type"
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as Device['device_type'])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="kiosk">{t('deviceManagement.kioskFixed')}</option>
                  <option value="tablet">{t('deviceManagement.tabletMobile')}</option>
                  <option value="display">{t('deviceManagement.displayScreen')}</option>
                  <option value="mobile">{t('deviceManagement.mobileDevice')}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDevice(false)}
              >
                {t('accessPoints.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={addDevice}
                disabled={!newDeviceName.trim() || generatingCode}
              >
                {generatingCode ? t('accessPoints.creating') : t('deviceManagement.createSetupCode')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pairing Code Modal */}
      {pairingCode && (
        <Card className="border-2 border-[#42b8ac] bg-[#f0faf9]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#003842]">{t('deviceManagement.setupCodeReady')}</h3>
              <button type="button" onClick={dismissPairingCode} aria-label={t('accessPoints.cancel')} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              {t('deviceManagement.stepOne')} <span className="font-semibold">allyjen.ie/kiosk/pair</span>.<br />
              {t('deviceManagement.stepTwo')}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white border-2 border-[#42b8ac] rounded-xl px-6 py-4 text-center">
                <p className="text-4xl font-mono font-bold tracking-[0.3em] text-[#003842]">
                  {pairingCode}
                </p>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {codeCopied
                  ? <Check className="h-5 w-5 text-green-600" />
                  : <Copy className="h-5 w-5 text-gray-500" />}
                <span className="text-xs text-gray-500">{codeCopied ? t('deviceManagement.copiedBang') : t('accessPoints.copy')}</span>
              </button>
            </div>

            {pairingExpiry && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{t('deviceManagement.codeExpires', { date: new Date(pairingExpiry).toLocaleString(language) })}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Devices List */}
      {devices.length === 0 ? (
        <Card className="text-center py-12">
          <Tablet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('deviceManagement.noDevices')}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('deviceManagement.addFirstDescription')}
          </p>
          <Button
            variant="primary"
            icon={<Plus className="h-5 w-5" />}
            onClick={() => setShowAddDevice(true)}
          >
            {t('deviceManagement.addFirstDevice')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            const expiryCountdown = getExpiryCountdown(device.pairing_code_expires_at);
            const kioskUrl = getKioskUrl(device)
            
            return (
              <Card key={device.id} className="hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        device.status === 'online'
                          ? 'bg-green-100' 
                          : 'bg-gray-100'
                      }`}>
                        <DeviceIcon className={`h-6 w-6 ${
                          device.status === 'online'
                            ? 'text-green-600' 
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {device.device_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={device.status === 'online' ? 'success' : 'default'}
                            icon={
                              device.status === 'online'
                                ? <Wifi className="h-3 w-3" />
                                : <WifiOff className="h-3 w-3" />
                            }
                          >
                            {device.status === 'online' ? t('kioskPortal.online') : t('kioskPortal.offline')}
                          </Badge>
                          {device.status === 'error' && (
                            <Badge variant="error">
                              {t('sitePortal.error')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pairing Code Section */}
                  <div className="rounded-xl border border-[#42b8ac]/30 bg-[#f0faf9] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#003842] uppercase tracking-wide">
                        {t('deviceManagement.setupCode')}
                      </span>
                      {device.active_pairing_code && device.pairing_code_expires_at && (
                        <div className="flex flex-col items-end gap-1">
                          {device.active_pairing_code_redeemed && (
                            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
                              {t('deviceManagement.alreadyUsed')}
                            </span>
                          )}
                          {expiryCountdown && (
                            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex items-center gap-1 ${
                              expiryCountdown.urgency === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : expiryCountdown.urgency === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : expiryCountdown.urgency === 'expired'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              <Clock className="h-3 w-3" />
                              {t('deviceManagement.expiresIn', { time: expiryCountdown.label })}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-500">
                            {new Date(device.pairing_code_expires_at).toLocaleString(language)}
                          </span>
                        </div>
                      )}
                    </div>

                    {device.active_pairing_code ? (
                      <div className="space-y-2">
                        <div className="bg-white border border-[#42b8ac]/40 rounded-lg px-3 py-2 text-center">
                          <span className="font-mono font-bold tracking-widest text-[#003842] text-lg">
                            {device.active_pairing_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCardCode(device.id, device.active_pairing_code!)}
                            className="flex-1"
                          >
                            {cardCopied === device.id
                              ? <Check className="h-4 w-4 mr-2 text-green-600" />
                              : <Copy className="h-4 w-4 mr-2" />}
                            {cardCopied === device.id ? t('accessPoints.copied') : t('deviceManagement.copyCode')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenerateCode(device.id)}
                            disabled={regeneratingFor === device.id}
                            className="flex-1"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingFor === device.id ? 'animate-spin' : ''}`} />
                            {regeneratingFor === device.id ? t('deviceManagement.generating') : t('deviceManagement.newCode')}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600">
                          {t('deviceManagement.openPairInstruction')}
                        </p>
                        {device.active_pairing_code_redeemed && (
                          <p className="text-xs text-blue-700">
                            {t('deviceManagement.redeemedNote')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                        <p className="text-xs text-amber-800 mb-2">
                          {t('deviceManagement.noActiveCode')}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateCode(device.id)}
                          disabled={regeneratingFor === device.id}
                          className="w-full"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingFor === device.id ? 'animate-spin' : ''}`} />
                          {regeneratingFor === device.id ? t('accessPoints.creating') : t('deviceManagement.createSetupCode')}
                        </Button>
                        <p className="text-xs text-amber-800 mt-2">
                          {t('deviceManagement.createCodeInstruction')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Device Info */}
                  <div className="space-y-2 text-sm">
                    {kioskUrl && (
                      <div className="rounded-lg border border-[#42b8ac]/30 bg-[#f0faf9] p-2.5 space-y-2">
                        <p className="text-xs font-semibold text-[#003842] uppercase tracking-wide">{t('admin.kioskUrl')}</p>
                        <p className="text-xs text-gray-700 break-all leading-relaxed">{kioskUrl}</p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyKioskUrl(device.id, kioskUrl)}
                            className="flex-1"
                          >
                            {kioskUrlCopied === device.id
                              ? <Check className="h-4 w-4 mr-2 text-green-600" />
                              : <Copy className="h-4 w-4 mr-2" />}
                            {kioskUrlCopied === device.id ? t('accessPoints.copied') : t('admin.copyUrl')}
                          </Button>
                          <a
                            href={kioskUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {t('accessPoints.open')}
                          </a>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('deviceManagement.type')}</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {getDeviceTypeLabel(device.device_type)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('deviceManagement.lastSeen')}</span>
                      <span className="font-medium text-gray-900">
                        {getTimeSince(device.last_heartbeat)}
                      </span>
                    </div>
                    {typeof device.is_on_expected_screen === 'boolean' && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('deviceManagement.screen')}</span>
                        <span
                          className={`text-xs font-semibold rounded-full px-2 py-1 ${
                            device.is_on_expected_screen
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {device.is_on_expected_screen ? t('admin.correctKioskScreen') : t('admin.wrongScreen')}
                        </span>
                      </div>
                    )}
                    {device.last_page_url && (
                      <div>
                        <p className="text-gray-600 mb-1">{t('deviceManagement.currentPage')}</p>
                        <p className="text-xs text-gray-700 break-all leading-relaxed">{device.last_page_url}</p>
                      </div>
                    )}
                    {device.ip_address && (
                      <div className="flex justify-between">
                      <span className="text-gray-600">IP:</span>
                        <span className="font-medium text-gray-900">
                          {device.ip_address}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleDeviceStatus(device.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        device.status === 'online'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      <Power className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {device.status === 'online' ? t('deviceManagement.setOffline') : t('deviceManagement.setOnline')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDevice(device.id)}
                      aria-label={t('deviceManagement.removeConfirm')}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              {t('deviceManagement.tips')}
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>{t('deviceManagement.tipOne')}</li>
              <li>{t('deviceManagement.tipTwo')}</li>
              <li>{t('deviceManagement.tipThree')}</li>
              <li>{t('deviceManagement.tipFour')}</li>
              <li>{t('deviceManagement.tipFive')}</li>
              <li>{t('deviceManagement.tipSix')}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
