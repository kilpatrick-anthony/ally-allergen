'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

export default function DashboardDraftSummary() {
  const { t } = useTranslation()
  const [counts, setCounts] = useState<{ drafts: number; reviews: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    window.addEventListener('quick-add-saved', refresh)
    return () => window.removeEventListener('quick-add-saved', refresh)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setFailed(false)
    fetch('/api/quick-add-drafts?summary=true', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('unavailable')
        const result = await response.json()
        if (!controller.signal.aborted) setCounts(result)
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [revision])

  const empty = counts && counts.drafts + counts.reviews === 0
  return <section aria-label={t('liveDashboard.draftsReviews')} className={`${empty && !failed ? 'hidden lg:block ' : ''}rounded-xl border border-teal-200 bg-white p-4 dark:border-teal-900 dark:bg-gray-900`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-semibold text-[#003842] dark:text-teal-200"><ClipboardList className="h-5 w-5" aria-hidden="true" />{t('liveDashboard.draftsReviews')}</h2>
      <Link href="/admin/quick-add" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-300"><span className="sr-only lg:not-sr-only">{t('liveDashboard.savedDrafts')}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
    {failed ? <p role="status" className="text-sm text-gray-600 dark:text-gray-300">{t('liveDashboard.draftsUnavailable')} <button type="button" onClick={() => setRevision(value => value + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 underline">{t('quickAdd.retry')}</button></p>
      : !counts ? <p role="status" className="text-sm text-gray-500">{t('admin.loadingDashboard')}</p>
      : empty ? <p className="text-sm text-gray-600 dark:text-gray-300">{t('liveDashboard.noPendingDrafts')}</p>
      : <div className="mt-1 grid grid-cols-2 gap-3">
        <Link href="/admin/quick-add?status=draft" className="flex min-h-11 items-center gap-x-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"><strong className="shrink-0 text-xl">{counts.drafts}</strong><span>{t('liveDashboard.draftsLabel')}</span></Link>
        <Link href="/admin/quick-add?status=ready_for_review" className="flex min-h-11 items-center gap-x-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100"><strong className="shrink-0 text-xl">{counts.reviews}</strong><span>{t('liveDashboard.reviewLabel')}</span></Link>
      </div>}
  </section>
}
