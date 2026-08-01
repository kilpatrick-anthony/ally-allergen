// app/api/check-offline-devices/route.ts
// This endpoint checks for offline devices and sends email alerts
// Should be called by a cron job every 5 minutes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// Email sending function (you'll need to implement with your email service)
async function sendOfflineAlert(
  deviceName: string,
  siteName: string,
  siteEmail: string | null,
  adminEmail: string | null,
  lastSeen: string
) {
  // TODO: Implement email sending with Resend, SendGrid, etc.

  // Example with fetch to an email API:
  /*
  const emailData = {
    to: [siteEmail, adminEmail].filter(Boolean),
    subject: `⚠️ Kiosk Device Offline: ${siteName}`,
    html: `
      <h2>Device Offline Alert</h2>
      <p>The following device has gone offline:</p>
      <ul>
        <li><strong>Device:</strong> ${deviceName}</li>
        <li><strong>Location:</strong> ${siteName}</li>
        <li><strong>Last Seen:</strong> ${lastSeen}</li>
      </ul>
      <p>Please check the device and network connection.</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/devices">View Device Status Dashboard</a></p>
    `
  }

  await fetch('YOUR_EMAIL_API_ENDPOINT', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailData)
  })
  */

  // For now, just return success
  return { success: true, sentTo: [siteEmail, adminEmail].filter(Boolean) }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authorization (optional - protect this endpoint)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find devices that haven't sent heartbeat in 5+ minutes and are currently marked online
    const offlineThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: staleDevices, error } = await supabase
      .from('device_status_summary')
      .select('*')
      .eq('is_online', true)
      .lt('last_heartbeat', offlineThreshold)

    if (error) throw error

    const results = []

    for (const device of staleDevices || []) {
      // Mark device as offline
      await supabase
        .from('kiosk_devices')
        .update({
          is_online: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', device.id)

      // Create offline alert record
      const { data: alert } = await supabase
        .from('device_offline_alerts')
        .insert({
          device_id: device.id,
          site_id: device.site_id,
          business_id: device.business_id,
          went_offline_at: new Date().toISOString()
        })
        .select()
        .single()

      // Send email alerts
      const emailResult = await sendOfflineAlert(
        device.device_name,
        device.site_name,
        device.site_email,
        device.admin_email,
        device.last_heartbeat
      )

      // Update alert record with email status
      if (alert) {
        await supabase
          .from('device_offline_alerts')
          .update({
            email_sent_to_site: !!device.site_email && emailResult.success,
            email_sent_to_admin: !!device.admin_email && emailResult.success,
            site_email_sent_at: device.site_email && emailResult.success ? new Date().toISOString() : null,
            admin_email_sent_at: device.admin_email && emailResult.success ? new Date().toISOString() : null
          })
          .eq('id', alert.id)
      }

      results.push({
        device: device.device_name,
        site: device.site_name,
        emailsSent: emailResult.sentTo
      })
    }

    return NextResponse.json({
      success: true,
      checked: new Date().toISOString(),
      offlineDevicesFound: results.length,
      results
    })
  } catch (error) {
    console.error('Check offline devices error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow manual trigger from admin panel
  return GET(request)
}
