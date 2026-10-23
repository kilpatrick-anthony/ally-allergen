'use client'

import { useEffect, useId, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Props = {
  kind: 'ingredients' | 'menu-items'
  category: string
  subcategory?: string | null
  options: string[]
  onChange: (fields: { category: string; subcategory: string }) => void
}

export function CategoryFields({ kind, category, subcategory, options, onChange }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const [children, setChildren] = useState<Record<string, string[]>>({})
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/${kind}/categories`, { signal: controller.signal }).then(async response => {
      if (response.ok) setChildren((await response.json()).subcategories || {})
    }).catch(() => {})
    return () => controller.abort()
  }, [kind])
  const fieldClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50'
  return <div className="space-y-4">
    <div>
      <label htmlFor="regular-category" className="block text-sm font-medium mb-2">{t('admin.category')}</label>
      <input id="regular-category" className={fieldClass} maxLength={100} list={`${id}-categories`} value={category} onChange={event => onChange({ category: event.target.value, subcategory: '' })} />
      <datalist id={`${id}-categories`}>{options.map(value => <option key={value} value={value} />)}</datalist>
    </div>
    <div>
      <label htmlFor={`${id}-subcategory`} className="block text-sm font-medium mb-2">{t('categoryManagement.subcategory')}</label>
      <input id={`${id}-subcategory`} aria-describedby={`${id}-hint`} className={fieldClass} maxLength={100} disabled={!category.trim()} list={`${id}-subcategories`} value={subcategory || ''} onChange={event => onChange({ category, subcategory: event.target.value })} />
      <datalist id={`${id}-subcategories`}>{(Object.hasOwn(children, category) ? children[category] : []).map(value => <option key={value} value={value} />)}</datalist>
      <p id={`${id}-hint`} className="text-xs text-gray-500 mt-2">{t('categoryManagement.hint')}</p>
    </div>
  </div>
}
