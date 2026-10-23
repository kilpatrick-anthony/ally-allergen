'use client'

import { useEffect, useState } from 'react'
import { listContextHref, safeListReturnPath } from '@/lib/list-navigation'

export function useListReturnPath(base: string) {
  const [returnTo, setReturnTo] = useState(base)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReturnTo(safeListReturnPath(base, new URLSearchParams(window.location.search).get('returnTo')))
    setReady(true)
  }, [base])
  return { returnTo, ready, withReturnTo: (path: string) => listContextHref(path, returnTo) }
}
