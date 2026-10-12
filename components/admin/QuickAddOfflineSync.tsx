'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getQuickAddOutbox, removeQuickAddOutboxItem, saveQuickAddRecovery } from '@/lib/quick-add-offline'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function QuickAddOfflineSync() {
  const { t } = useTranslation()
  const syncing = useRef(false)
  const [pending, setPending] = useState(0)
  const sync = useCallback(async () => {
    setPending(getQuickAddOutbox().length)
    if (syncing.current || !navigator.onLine) return
    syncing.current = true
    try {
      for (const item of getQuickAddOutbox()) {
        let response: Response
        try {
          response = await fetch('/api/quick-add-drafts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item.fields, id: item.id }), signal: AbortSignal.timeout(20_000),
          })
        } catch { break }
        const result = await response.json().catch(() => null)
        if (!response.ok) {
          if ([401, 403].includes(response.status) || response.status >= 500) break
          saveQuickAddRecovery(item.id, item.fields)
          removeQuickAddOutboxItem(item.id)
          setPending(getQuickAddOutbox().length)
          window.dispatchEvent(new CustomEvent('quick-add-sync-failed', { detail: { id: item.id, error: result?.error || 'unavailable' } }))
          continue
        }
        removeQuickAddOutboxItem(item.id)
        setPending(getQuickAddOutbox().length)
        window.dispatchEvent(new CustomEvent('quick-add-synced', { detail: { id: item.id, draft: result.draft } }))
        window.dispatchEvent(new Event('quick-add-saved'))
      }
    } finally { syncing.current = false }
  }, [])

  useEffect(() => {
    void sync()
    window.addEventListener('online', sync)
    window.addEventListener('quick-add-queued', sync)
    window.addEventListener('quick-add-session-ready', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('quick-add-queued', sync)
      window.removeEventListener('quick-add-session-ready', sync)
    }
  }, [sync])

  return pending > 0 ? <div role="status" className="fixed left-4 right-20 top-16 z-40 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 shadow-md dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 lg:left-auto lg:right-6 lg:top-4 lg:max-w-sm">
    {t('quickAdd.offlinePending', { count: pending })}
  </div> : null
}
