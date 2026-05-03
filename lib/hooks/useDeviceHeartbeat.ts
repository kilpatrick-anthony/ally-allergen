// lib/hooks/useDeviceHeartbeat.ts
// Hook to send periodic heartbeats from kiosk devices

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface HeartbeatOptions {
  siteId?: string
  businessId?: string
  enabled?: boolean
  intervalMs?: number
}

export function useDeviceHeartbeat(options: HeartbeatOptions = {}) {
  const {
    siteId,
    businessId,
    enabled = true,
    intervalMs = 60000 // 1 minute default
  } = options

  const deviceIdRef = useRef<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Generate or retrieve device ID
  const getDeviceId = (): string => {
    if (deviceIdRef.current) return deviceIdRef.current

    // Try to get from localStorage first
    const stored = typeof window !== 'undefined' ? localStorage.getItem('ally_device_id') : null
    if (stored) {
      deviceIdRef.current = stored
      return stored
    }

    // Generate new device ID from browser fingerprint
    const nav = navigator as any
    const fingerprint = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
    ].join('|')

    // Simple hash
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    const deviceId = `device_${Math.abs(hash)}_${Date.now()}`
    if (typeof window !== 'undefined') {
      localStorage.setItem('ally_device_id', deviceId)
    }
    
    deviceIdRef.current = deviceId
    return deviceId
  }

  // Get device info
  const getDeviceInfo = () => {
    const pairedDeviceId = typeof window !== 'undefined'
      ? localStorage.getItem('ally_paired_device_id')
      : null

    return {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      online: navigator.onLine,
      paired_device_id: pairedDeviceId,
    }
  }

  // Send heartbeat
  const sendHeartbeat = async () => {
    if (!enabled || !siteId) return

    try {
      const deviceId = getDeviceId()
      const deviceInfo = getDeviceInfo()

      // If this tablet was properly paired, update the `devices` table via the
      // server-side API route (uses the service client, bypasses RLS).
      const pairedDeviceId = typeof window !== 'undefined'
        ? localStorage.getItem('ally_paired_device_id')
        : null

      if (pairedDeviceId) {
        await fetch('/api/device-heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, paired_device_id: pairedDeviceId }),
        })
        console.log('📡 Heartbeat sent (paired):', pairedDeviceId)
        return
      }

      // Fallback: update legacy kiosk_devices table directly for unpaired kiosks.
      const supabase = createClient()

      // Check if device exists
      const { data: existing } = await supabase
        .from('kiosk_devices')
        .select('id')
        .eq('device_id', deviceId)
        .single()

      if (existing) {
        // Update existing device
        await supabase
          .from('kiosk_devices')
          .update({
            is_online: true,
            last_heartbeat: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            device_info: deviceInfo,
            user_agent: navigator.userAgent,
            ip_address: null // Will be set by server
          })
          .eq('device_id', deviceId)

        // Log heartbeat
        await supabase
          .from('device_heartbeats')
          .insert({
            device_id: existing.id,
            timestamp: new Date().toISOString(),
            page_url: window.location.href
          })
      } else {
        // Create new device
        const { data: newDevice } = await supabase
          .from('kiosk_devices')
          .insert({
            device_id: deviceId,
            site_id: siteId,
            business_id: businessId,
            device_name: `Kiosk ${deviceId.slice(-8)}`,
            device_type: 'kiosk',
            user_agent: navigator.userAgent,
            is_online: true,
            last_heartbeat: new Date().toISOString(),
            first_seen: new Date().toISOString(),
            device_info: deviceInfo
          })
          .select('id')
          .single()

        if (newDevice) {
          // Log first heartbeat
          await supabase
            .from('device_heartbeats')
            .insert({
              device_id: newDevice.id,
              timestamp: new Date().toISOString(),
              page_url: window.location.href
            })
        }
      }

      console.log('📡 Heartbeat sent:', deviceId)
    } catch (error) {
      console.error('❌ Heartbeat error:', error)
    }
  }

  useEffect(() => {
    if (!enabled || !siteId) return

    // Send initial heartbeat
    sendHeartbeat()

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, intervalMs)

    // Send heartbeat when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Send heartbeat on beforeunload (going offline)
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      const deviceId = getDeviceId()
      const pairedDeviceId = typeof window !== 'undefined'
        ? localStorage.getItem('ally_paired_device_id')
        : null
      if (navigator.sendBeacon) {
        const blob = new Blob(
          [JSON.stringify({ device_id: deviceId, paired_device_id: pairedDeviceId, going_offline: true })],
          { type: 'application/json' }
        )
        navigator.sendBeacon('/api/device-heartbeat', blob)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, siteId, businessId, intervalMs])

  return {
    deviceId: deviceIdRef.current,
    sendHeartbeat
  }
}
