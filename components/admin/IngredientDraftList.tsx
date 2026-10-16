'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { listContextHref } from '@/lib/list-navigation'

type Draft = { id: string; payload: { name: string; category?: string } }
export function IngredientDraftList({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError(false); setLoading(true)
    fetch('/api/ingredient-drafts', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error()
      const result = await response.json()
      if (!Array.isArray(result.drafts)) throw new Error()
      if (!controller.signal.aborted) setDrafts(result.drafts)
    }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  return <section data-no-translate aria-labelledby="ingredient-drafts-heading" className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
    <details open={drafts.length > 0 || error}><summary id="ingredient-drafts-heading" className="min-h-11 cursor-pointer py-2 text-lg font-semibold">{t('ingredientDrafts.title')}{!loading && !error && ` (${drafts.length})`}</summary>
    <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{t('ingredientDrafts.help')}</p>
    {loading ? <p role="status" className="mt-3">{t('ingredientDrafts.loading')}</p> : error ? <div role="alert" className="mt-3"><p>{t('ingredientDrafts.loadFailed')}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{t('regularLists.retry')}</Button></div> : drafts.length ?
      <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-700">{drafts.map(draft => <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
        <span className="min-w-0 break-words font-medium">{draft.payload.name}</span>
        <Link aria-label={`${t('ingredientDrafts.resume')}: ${draft.payload.name}`} className="inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-teal-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-teal-200" href={listContextHref(`/admin/ingredients/drafts/${draft.id}/edit`, returnTo)}>{t('ingredientDrafts.resume')}</Link>
      </li>)}</ul> : <p className="mt-3 text-sm">{t('ingredientDrafts.empty')}</p>}
  </details></section>
}
