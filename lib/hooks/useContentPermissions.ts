'use client'

import { useEffect, useState } from 'react'

type BusinessRole = 'owner' | 'manager' | 'staff' | null

export function useContentPermissions() {
  const [role, setRole] = useState<BusinessRole>(null)

  useEffect(() => {
    let cancelled = false

    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        if (!cancelled && response.ok) {
          const nextRole = data?.user?.role
          setRole(nextRole === 'owner' || nextRole === 'manager' || nextRole === 'staff' ? nextRole : null)
        }
      } catch {
        if (!cancelled) setRole(null)
      }
    }

    void loadRole()
    return () => { cancelled = true }
  }, [])

  return {
    role,
    canDeleteContent: role === 'owner' || role === 'manager',
  }
}
