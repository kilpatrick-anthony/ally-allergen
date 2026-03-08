// lib/analytics/tracker.ts
import { createClient } from '@/lib/supabase/client'

interface TrackPageViewParams {
  slug: string
  sessionId: string
  pagePath: string
  filtersApplied?: string[]
  searchQuery?: string
  timeOnPage?: number
}

interface TrackQRScanParams {
  slug: string
  source?: string
  referrer?: string
}

interface TrackPDFDownloadParams {
  slug: string
  downloadType: 'full' | 'filtered'
}

class AnalyticsTracker {
  private supabase = typeof window !== 'undefined' ? createClient() : null
  private sessionId: string | null = null

  constructor() {
    this.initializeSession()
  }

  private initializeSession() {
    if (typeof window === 'undefined') return
    
    // Generate or retrieve session ID
    this.sessionId = localStorage.getItem('analytics_session_id')
    if (!this.sessionId) {
      this.sessionId = crypto.randomUUID()
      localStorage.setItem('analytics_session_id', this.sessionId)
    }
  }

  async trackPageView(params: TrackPageViewParams) {
    try {
      if (!this.supabase) return
      const { data: deviceData } = this.getDeviceInfo()
      
      await this.supabase.from('page_views').insert({
        slug: params.slug,
        session_id: this.sessionId,
        page_path: params.pagePath,
        filters_applied: params.filtersApplied || [],
        search_query: params.searchQuery,
        time_on_page: params.timeOnPage || 0,
        device_type: deviceData.deviceType,
        user_agent: deviceData.userAgent,
        viewed_at: new Date().toISOString()
      })

      // Update session
      await this.updateSession(params.slug)
      
    } catch (error) {
      console.error('Error tracking page view:', error)
    }
  }

  async trackQRScan(params: TrackQRScanParams) {
    try {
      if (!this.supabase) return
      const { data: deviceData, location } = await this.getDeviceInfoWithLocation()
      
      await this.supabase.from('qr_code_scans').insert({
        slug: params.slug,
        source: params.source || 'direct',
        referrer: params.referrer,
        user_agent: deviceData.userAgent,
        device_type: deviceData.deviceType,
        country: location.country,
        city: location.city,
        scanned_at: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Error tracking QR scan:', error)
    }
  }

  async trackPDFDownload(params: TrackPDFDownloadParams) {
    try {
      if (!this.supabase) return
      const { data: deviceData } = this.getDeviceInfo()
      
      await this.supabase.from('pdf_downloads').insert({
        slug: params.slug,
        download_type: params.downloadType,
        device_type: deviceData.deviceType,
        user_agent: deviceData.userAgent,
        downloaded_at: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Error tracking PDF download:', error)
    }
  }

  private getDeviceInfo() {
    if (typeof window === 'undefined') {
      return { data: { deviceType: 'Unknown', userAgent: 'Server' } }
    }
    
    const userAgent = navigator.userAgent
    let deviceType = 'desktop'
    
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = 'mobile'
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet'
    }
    
    return { data: { deviceType, userAgent } }
  }

  private async getDeviceInfoWithLocation() {
    const deviceData = this.getDeviceInfo()
    let location = { country: 'Unknown', city: 'Unknown' }
    
    try {
      // Simple IP geolocation - for production use a paid service
      const response = await fetch('https://ipapi.co/json/')
      if (response.ok) {
        const data = await response.json()
        location = {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown'
        }
      }
    } catch (error) {
      // Silently fail - location is not critical
      console.log('Location detection failed')
    }
    
    return { ...deviceData, location }
  }

  private async updateSession(slug: string) {
    try {
      if (!this.supabase) return
      // Check if session exists
      const { data: existingSession } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', this.sessionId)
        .single()

      if (existingSession) {
        // Update existing session
        await this.supabase
          .from('user_sessions')
          .update({
            total_page_views: existingSession.total_page_views + 1,
            ended_at: new Date().toISOString()
          })
          .eq('session_id', this.sessionId)
      } else {
        // Create new session
        const { data: deviceData } = this.getDeviceInfo()
        await this.supabase.from('user_sessions').insert({
          slug: slug,
          session_id: this.sessionId!,
          device_type: deviceData.deviceType,
          user_agent: deviceData.userAgent,
          total_page_views: 1,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error updating session:', error)
    }
  }
}

// Create a single instance
export const analytics = new AnalyticsTracker()