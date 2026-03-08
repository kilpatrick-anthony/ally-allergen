// components/auth/ProtectedRoute.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

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

        // If role is required, check it
        if (requireRole) {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#42b8ac] mx-auto mb-4" />
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