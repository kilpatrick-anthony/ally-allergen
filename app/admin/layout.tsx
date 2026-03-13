// app/admin/layout.tsx
'use client'

export const dynamic = 'force-dynamic'

import { ReactNode, useEffect, useState } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Building2, User, LogOut, Menu, X } from 'lucide-react'
import { Navigation } from '../components/layout/Navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'
import SpeechController from '@/components/SpeechController'

interface BrandColors {
  primary_color: string
  secondary_color: string
  logo_url: string | null
}

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary_color: '#003842',
    secondary_color: '#42b8ac',
    logo_url: null
  })
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    // Load user info from session API
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        
        if (data.authenticated && data.user) {
          setUserEmail(data.user.email || '')
          setUserName(data.user.name || data.user.email?.split('@')[0] || 'Admin User')
        }
      } catch (error) {
        console.error('Failed to load user info:', error)
      }
    }
    loadUser()

    setBrandColors({
      primary_color: '#003842',
      secondary_color: '#42b8ac',
      logo_url: null
    })
    
    const timer = setTimeout(() => {
      setLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    console.log('Logging out...')

    // Clear server cookie first (best-effort)
    try {
      await fetch('/api/signout', { method: 'POST' })
    } catch (err) {
      console.warn('Failed to clear server cookie:', err)
    }

    // Sign out from Supabase (fire and forget)
    const supabase = createClient()
    supabase.auth.signOut().catch(err => {
      console.error('Sign out error (non-blocking):', err)
    })

    // Immediate redirect to sign-in
    try {
      window.location.replace('/auth/signin')
    } catch {
      // fallback
      window.location.href = '/auth/signin'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">{t('admin.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute requireRole="owner">
      <SpeechController />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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
        <div className={`fixed inset-y-0 left-0 w-[224px] bg-gradient-to-br from-[#003842] to-[#42b8ac] border-r border-[#42b8ac]/20 shadow-lg z-50 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Logo */}
          <div className="w-full px-4 flex items-center justify-center">
            <img
              src="/Nav%20bar%20AllyJen%20Logo%20(500%20x%20150%20px).svg"
              alt="AllyJen Logo"
              className="h-32 w-auto object-contain"
            />
          </div>

          {/* Navigation - scrollable with discreet thin scrollbar */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 -mt-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:border-none [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/25">
            <Navigation />
          </div>

          {/* Footer - user profile */}
          <div className="p-4 border-t border-white/20 bg-gradient-to-t from-black/20 to-transparent footer-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
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
        <div className="lg:pl-[224px] pt-14 lg:pt-0">
          <main className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
            {children}
          </main>
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