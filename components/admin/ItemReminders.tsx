'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { reminderDueAt } from '@/lib/item-reminders'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Reminder = { id: string; name: string; href: string; due: string }

export default function ItemReminders() {
  const { t, language } = useTranslation()
  const [items, setItems] = useState<Reminder[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/business/data', { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load reminders')
        return response.json()
      }).then(data => {
        const now = Date.now()
        const reminders: Reminder[] = []
        for (const [collection, path] of [['ingredients', 'ingredients'], ['menuItems', 'menu-builder']] as const) {
          for (const item of data[collection] || []) {
            if (item.status === 'archived' || item.is_active === false) continue
            const due = reminderDueAt(item)
            if (due && due.getTime() <= now) reminders.push({ id: `${path}-${item.id}`, name: item.name, href: `/admin/${path}/${item.id}/edit`, due: due.toISOString() })
          }
        }
        setItems(reminders.sort((a, b) => a.due.localeCompare(b.due)))
      }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [])
  if (!items && !failed) return null
  return <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800" aria-label={t('reminders.title')}>
    <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"><Calendar className="h-5 w-5" aria-hidden="true" />{t('reminders.title')}</h2>
    {failed ? <p role="status">{t('reminders.loadError')}</p> : items?.length ? <ul className="divide-y divide-gray-100 dark:divide-gray-700">{items.map(item => <li key={item.id}><Link href={item.href} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-3 text-teal-800 underline dark:text-teal-300"><span data-no-translate>{item.name}</span><span className="text-sm">{t('reminders.due')} · {new Date(item.due).toLocaleDateString(language)}</span></Link></li>)}</ul> : <p className="text-sm text-gray-600 dark:text-gray-300">{t('reminders.empty')}</p>}
  </section>
}
