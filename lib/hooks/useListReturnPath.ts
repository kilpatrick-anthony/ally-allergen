'use client'

import { useEffect, useState } from 'react'
import { listContextHref, safeListReturnPath } from '@/lib/list-navigation'

export function useListReturnPath(base: string) {
  const [returnTo, setReturnTo] = useState(base)
  useEffect(() => {
    setReturnTo(safeListReturnPath(base, new URLSearchParams(window.location.search).get('returnTo')))
  }, [base])
  return { returnTo, withReturnTo: (path: string) => listContextHref(path, returnTo) }
}
