// app/super-admin/layout.tsx
'use client'

import { ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, LogOut } from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/signout', { method: 'POST' })
    } catch {
      // best effort
    }
    window.location.replace('/auth/signin')
  }, [])

  return (
    <div data-context="admin" className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top header */}
      <header className="bg-[#003842] border-b border-[#003842]/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg tracking-tight">AllyJen</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#42b8ac]/20 text-[#42b8ac] text-xs font-semibold tracking-wide border border-[#42b8ac]/30">
                  <Shield className="h-3 w-3" />
                  Super Admin
                </span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-white/50 font-mono">
                {process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'super-admin'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#003842] bg-white/90 hover:bg-white active:bg-rose-600 active:text-white rounded-lg transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
