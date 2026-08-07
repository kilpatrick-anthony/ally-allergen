// components/auth/ProtectedRoute.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'


interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'owner' | 'admin' | 'manager' | 'staff';
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireRole,
  redirectTo = '/auth/signin'
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔒 Checking auth via server API...')
        
        // Use server-side session check instead of client-side
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        
        console.log('🔒 Session response status:', response.status)
        console.log('🔒 Session data:', JSON.stringify(data, null, 2))
        console.log('🔒 Authenticated:', data.authenticated)
        console.log('🔒 User:', data.user)
        
        if (!data.authenticated || !data.user) {
          console.log('🔒 Not authenticated, redirecting to:', redirectTo)
          router.replace(redirectTo)
          return
        }

        const user = data.user
        console.log('🔒 User authenticated:', user.id)

        // Super admin bypasses all role checks — matches both the configured
        // super admin email and any user with role='super_admin' in the DB.
        const isSuperAdmin =
          user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
          user.role === 'super_admin'

        // If role is required, check it (super admin is always allowed)
        if (requireRole && !isSuperAdmin) {
          console.log('🔒 Required role:', requireRole, '| User role:', user.role)
          
          if (!user.role || user.role !== requireRole) {
            console.log('🔒 Unauthorized role, redirecting')
            router.replace('/unauthorized')
            return
          }
        }

        console.log('🔒 Authorization successful')
        setIsAuthorized(true)
      } catch (error) {
        console.error('❌ Auth check error:', error)
        router.replace(redirectTo)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, redirectTo, requireRole])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}