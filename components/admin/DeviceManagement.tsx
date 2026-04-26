// components/admin/DeviceManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Tablet, Wifi, WifiOff, Monitor, Smartphone,
  Plus, Trash2, RefreshCw, X,
  AlertCircle, Copy, Check,
  Power, Clock
} from 'lucide-react';
import { Card } from '@/components/layout/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
}

interface DeviceManagementProps {
  siteId: string;
  siteName: string;
}

export default function DeviceManagement({ 
  siteId, 
  siteName 
}: DeviceManagementProps) {
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
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    loadDevices();
  }, [siteId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const loadDevices = async () => {
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
  };

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

      setDevices([
        {
          ...data.device,
          active_pairing_code: data.pairing_code ?? null,
          pairing_code_expires_at: data.expires_at ?? null,
        },
        ...devices,
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
      setDevices(devices.map(d =>
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
    if (!confirm('Are you sure you want to remove this device?')) return;

    try {
      const response = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove device')
      }
      setDevices(devices.filter(d => d.id !== deviceId))
    } catch (error: any) {
      console.error('Error removing device:', error)
    }
  };

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

      setDevices(devices.map(d => d.id === deviceId ? data.device : d))
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
    if (!dateString) return 'Never'
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getExpiryCountdown = (expiry?: string | null) => {
    if (!expiry) return null

    const expiryMs = new Date(expiry).getTime()
    const remainingMs = expiryMs - nowMs

    if (Number.isNaN(expiryMs) || remainingMs <= 0) {
      return { label: 'Expired', urgency: 'expired' as const }
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
        <p className="text-gray-600">Loading devices...</p>
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
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-[#003842] mt-1">{stats.total}</p>
            </div>
            <Tablet className="h-8 w-8 text-[#42b8ac]" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.online}</p>
            </div>
            <Wifi className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Errors</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.errors}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offline</p>
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
              Devices for {siteName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Add, pair, and monitor devices for this location
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              icon={<RefreshCw className="h-5 w-5" />}
              onClick={loadDevices}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-5 w-5" />}
              onClick={() => setShowAddDevice(true)}
            >
              Add Device
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Device Form */}
      {showAddDevice && (
        <Card className="border-2 border-[#42b8ac]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#003842]">Add New Device</h3>
              <button
                onClick={() => setShowAddDevice(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Create the device first, then use the setup code to link the physical kiosk.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g., Main Entrance Kiosk"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Type
                </label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value as Device['device_type'])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
                >
                  <option value="kiosk">Kiosk (Fixed Display)</option>
                  <option value="tablet">Tablet (Mobile)</option>
                  <option value="display">Display Screen</option>
                  <option value="mobile">Mobile Device</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDevice(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={addDevice}
                disabled={!newDeviceName.trim() || generatingCode}
              >
                {generatingCode ? 'Creating…' : 'Create Setup Code'}
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
              <h3 className="text-lg font-semibold text-[#003842]">Setup Code Ready</h3>
              <button onClick={dismissPairingCode} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Step 1: On the kiosk, open <span className="font-semibold">allyjen.ie/kiosk/pair</span>.<br />
              Step 2: Enter this code to link the device.
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white border-2 border-[#42b8ac] rounded-xl px-6 py-4 text-center">
                <p className="text-4xl font-mono font-bold tracking-[0.3em] text-[#003842]">
                  {pairingCode}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {codeCopied
                  ? <Check className="h-5 w-5 text-green-600" />
                  : <Copy className="h-5 w-5 text-gray-500" />}
                <span className="text-xs text-gray-500">{codeCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {pairingExpiry && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>Code expires {new Date(pairingExpiry).toLocaleString()} - one-time use for setup only</span>
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
            No Devices Added
          </h3>
          <p className="text-gray-600 mb-6">
            Add your first kiosk or tablet to get started
          </p>
          <Button
            variant="primary"
            icon={<Plus className="h-5 w-5" />}
            onClick={() => setShowAddDevice(true)}
          >
            Add First Device
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            const expiryCountdown = getExpiryCountdown(device.pairing_code_expires_at);
            
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
                            {device.status === 'online' ? 'Online' : 'Offline'}
                          </Badge>
                          {device.status === 'error' && (
                            <Badge variant="error">
                              Error
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
                        Setup Code
                      </span>
                      {device.active_pairing_code && device.pairing_code_expires_at && (
                        <div className="flex flex-col items-end gap-1">
                          {device.active_pairing_code_redeemed && (
                            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
                              Already used
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
                              Code expires in {expiryCountdown.label}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-500">
                            {new Date(device.pairing_code_expires_at).toLocaleString()}
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
                            {cardCopied === device.id ? 'Copied' : 'Copy Code'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenerateCode(device.id)}
                            disabled={regeneratingFor === device.id}
                            className="flex-1"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingFor === device.id ? 'animate-spin' : ''}`} />
                            {regeneratingFor === device.id ? 'Generating…' : 'New Code'}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-600">
                          Open <span className="font-semibold">allyjen.ie/kiosk/pair</span> on the kiosk and enter this code.
                        </p>
                        {device.active_pairing_code_redeemed && (
                          <p className="text-xs text-blue-700">
                            This code was used successfully and will remain visible until it expires.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                        <p className="text-xs text-amber-800 mb-2">
                          No active setup code for this device.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateCode(device.id)}
                          disabled={regeneratingFor === device.id}
                          className="w-full"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingFor === device.id ? 'animate-spin' : ''}`} />
                          {regeneratingFor === device.id ? 'Creating…' : 'Create Setup Code'}
                        </Button>
                        <p className="text-xs text-amber-800 mt-2">
                          Create a code, then enter it on allyjen.ie/kiosk/pair.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Device Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {device.device_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Seen:</span>
                      <span className="font-medium text-gray-900">
                        {getTimeSince(device.last_heartbeat)}
                      </span>
                    </div>
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
                      onClick={() => toggleDeviceStatus(device.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        device.status === 'online'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      <Power className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {device.status === 'online' ? 'Set Offline' : 'Set Online'}
                      </span>
                    </button>
                    <button
                      onClick={() => removeDevice(device.id)}
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
              Device Management Tips
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Click <strong>Add Device</strong>, enter a name, and click <strong>Create Setup Code</strong></li>
              <li>On the kiosk, go to <strong>allyjen.ie/kiosk/pair</strong> and enter the setup code</li>
              <li>Each setup code is one-time use and for linking only</li>
              <li>The kiosk then opens the correct allergen menu for this site automatically</li>
              <li>Devices send a heartbeat every minute so status updates automatically</li>
              <li>Offline devices continue showing cached allergen data</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
