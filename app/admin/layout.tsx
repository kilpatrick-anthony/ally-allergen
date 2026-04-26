// app/admin/layout.tsx
'use client'

import { ReactNode, useCallback, useEffect, useState, useRef } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Building2, User, LogOut, Menu, X } from 'lucide-react'
import { Navigation } from '@/components/layout/Navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'
import SpeechController from '@/components/SpeechController'
import { trackAdminPageVisit } from '@/lib/hooks/useFrequentPages'
import { FsaiNewsTicker } from '@/components/admin/FsaiNewsTicker'
import { JenCoach } from '@/components/admin/JenCoach'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [userName, setUserName] = useState<string>('')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  const supabaseRef = useRef(createClient())

  const handleLogout = useCallback(async () => {
    console.log('Logging out...')

    // Clear server cookie first (best-effort)
    try {
      await fetch('/api/signout', { method: 'POST' })
    } catch (err) {
      console.warn('Failed to clear server cookie:', err)
    }

    // Sign out from Supabase (fire and forget)
    const supabase = supabaseRef.current
    supabase.auth.signOut().catch(err => {
      console.error('Sign out error (non-blocking):', err)
    })

    // Clear per-session UI state so it resets on next login
    sessionStorage.removeItem('jencoach_dismissed')

    // Immediate redirect to sign-in
    try {
      window.location.replace('/auth/signin')
    } catch {
      // fallback
      window.location.href = '/auth/signin'
    }
  }, [])

  useEffect(() => {
    setIsSidebarOpen(false)
    // Track page visits — businessId may not be loaded yet; fall back to sessionStorage
    const biz = businessId ?? (typeof window !== 'undefined' ? sessionStorage.getItem('ally_biz') : null)
    trackAdminPageVisit(pathname, biz)
  }, [pathname, businessId])

  useEffect(() => {
    // Load user info from session API
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        
        if (data.authenticated && data.user) {
          setUserEmail(data.user.email || '')
          setUserName(data.user.name || data.user.email?.split('@')[0] || 'Admin User')
          const biz = data.user.businessId || null
          setBusinessId(biz)
          if (biz && typeof window !== 'undefined') {
            sessionStorage.setItem('ally_biz', biz)
          }
        }
      } catch (error) {
        console.error('Failed to load user info:', error)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const parseTimeout = (value: string) => {
      const minutes = parseInt(value, 10)
      if (isNaN(minutes) || minutes <= 0) return 15 * 60 * 1000
      return value.includes('hour')
        ? minutes * 60 * 60 * 1000
        : minutes * 60 * 1000
    }

    let timeoutString = localStorage.getItem('sessionTimeout') || '15 minutes'
    let timeoutMs = parseTimeout(timeoutString)

    let lastActivity = Date.now()
    const updateActivity = () => {
      lastActivity = Date.now()
    }

    const events: Array<keyof DocumentEventMap> = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => document.addEventListener(event, updateActivity, { passive: true, capture: true }))

    const intervalId = window.setInterval(() => {
      const currentTimeout = localStorage.getItem('sessionTimeout') || '15 minutes'
      if (currentTimeout !== timeoutString) {
        timeoutString = currentTimeout
        timeoutMs = parseTimeout(currentTimeout)
      }
      if (Date.now() - lastActivity >= timeoutMs) {
        handleLogout()
      }
    }, 30_000)

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'sessionTimeout' && typeof event.newValue === 'string') {
        timeoutString = event.newValue
        timeoutMs = parseTimeout(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.clearInterval(intervalId)
      events.forEach(event => document.removeEventListener(event, updateActivity, { capture: true }))
      window.removeEventListener('storage', onStorage)
    }
  }, [handleLogout])

  return (
    <ProtectedRoute requireRole="owner">
      <SpeechController />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900" data-context="admin">
        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#003842] h-14 flex items-center px-4 shadow-md">
          {isSidebarOpen ? (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close navigation menu"
              className="text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 w-[224px] bg-gradient-to-b from-[#002e38] via-[#003e4a] to-[#2a7068] border-r border-[#42b8ac]/15 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.25)] z-50 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Logo */}
          <div className="w-full px-4 pt-2 flex items-center justify-center">
            <img
              src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
              alt="AllyJen Logo"
              className="h-28 w-auto object-contain drop-shadow-[0_2px_8px_rgba(66,184,172,0.3)]"
            />
          </div>

          {/* Navigation - scrollable with subtle indicator */}
          <div className="relative flex-1 min-h-0">
            <div className="h-full overflow-y-auto px-3 pb-4 -mt-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/35">
              <Navigation />
            </div>
            {/* Faint animated gradient at bottom to hint at scrollability */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#2a7068]/70 to-transparent animate-pulse" />
          </div>

          {/* Footer - user profile */}
          <div className="p-3 border-t border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#42b8ac] to-[#003842] flex items-center justify-center shrink-0 shadow-sm">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {userName || 'Admin User'}
                </div>
                <div className="text-xs text-white/70">Administrator</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
            >
              <LogOut className="h-4 w-4" />
              {t('admin.logout')}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:pl-[224px] pt-14 lg:pt-0 flex flex-col min-h-screen">
          <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 admin-dot-grid dark:admin-dot-grid-dark">
            {children}
          </main>
          {/* Food safety news ticker — pinned to the bottom of every admin page */}
          <FsaiNewsTicker />
          {/* Jen — compliance coach floating widget */}
          <JenCoach />
        </div>
      </div>
    </ProtectedRoute>
  )
}

function adjustColor(color: string, amount: number): string {
  color = color.replace('#', '')
  const r = clamp(parseInt(color.substring(0, 2), 16) + amount)
  const g = clamp(parseInt(color.substring(2, 4), 16) + amount)
  const b = clamp(parseInt(color.substring(4, 6), 16) + amount)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value))
}