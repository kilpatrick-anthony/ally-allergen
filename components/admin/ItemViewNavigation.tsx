'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { adjacentItems, orderedNavigationItems, type ItemCollection, type NavigationItem } from '@/lib/item-navigation'
import { listContextHref } from '@/lib/list-navigation'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface Props { collection: ItemCollection; currentId: string; returnTo: string; ready: boolean }

export default function ItemViewNavigation({ collection, currentId, returnTo, ready }: Props) {
  const { t } = useTranslation()
  const [result, setResult] = useState<{ context: string; items: NavigationItem[]; error: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const base = `/admin/${collection}`
  const context = `${collection}:${returnTo}`
  const emptyCategory = t('admin.uncategorized')

  useEffect(() => {
    if (!ready) return
    const controller = new AbortController()
    const api = collection === 'ingredients' ? '/api/ingredients' : '/api/menu-items'
    fetch(api, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Unable to load item navigation')
      const data = await response.json()
      const rows = collection === 'ingredients' ? data.ingredients : data.menuItems
      if (!Array.isArray(rows)) throw new Error('Invalid item list')
      if (!controller.signal.aborted) setResult({ context, items: orderedNavigationItems(collection, rows, returnTo, emptyCategory), error: false })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ context, items: [], error: true })
    })
    return () => controller.abort()
  }, [collection, returnTo, ready, context, attempt, emptyCategory])

  const current = ready && result?.context === context ? result : null
  const { previous, next, position, total } = adjacentItems(current?.items || [], currentId)
  const controlClass = 'flex min-h-11 items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-[#003842] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-gray-600 dark:bg-gray-800 dark:text-teal-200 lg:fixed lg:top-1/2 lg:z-30 lg:h-12 lg:w-12 lg:-translate-y-1/2 lg:rounded-full lg:px-0'
  const button = (item: NavigationItem | null, side: 'previous' | 'next') => {
    const label = t(`itemNavigation.${side}`)
    const content = <>{side === 'previous' && <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />}<span className="lg:sr-only">{label}</span>{side === 'next' && <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />}</>
    const classes = `${controlClass} ${side === 'previous' ? 'lg:left-[232px]' : 'lg:right-3'}`
    return item ? <Link href={listContextHref(`${base}/${encodeURIComponent(item.id)}`, returnTo)} aria-label={label} title={label} prefetch={false} className={`${classes} hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950`}>{content}</Link>
      : <button type="button" disabled aria-label={label} title={label} className={`${classes} cursor-not-allowed opacity-40`}>{content}</button>
  }

  return <nav aria-label={t('itemNavigation.label')} className="mb-5 flex items-center justify-between gap-2" data-no-translate>
    {button(previous, 'previous')}
    <div className="flex-1 text-center text-xs text-gray-600 dark:text-gray-300" role="status">
      {current?.error ? <><span>{t('itemNavigation.failed')}</span><button type="button" onClick={() => { setResult(null); setAttempt(value => value + 1) }} className="ml-1 min-h-11 rounded px-2 font-semibold text-teal-800 underline dark:text-teal-300">{t('regularLists.retry')}</button></>
        : !current ? t('itemNavigation.loading') : position ? t('itemNavigation.position', { position, total }) : t('itemNavigation.outside')}
    </div>
    {button(next, 'next')}
  </nav>
}
