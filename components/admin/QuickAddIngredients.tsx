'use client'

import { useId, useMemo, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

export type QuickAddIngredientOption = { id: string; name: string; category?: string | null }

export default function QuickAddIngredients({ ingredients, selected, onChange }: {
  ingredients: QuickAddIngredientOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const searchId = useId()
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return term ? ingredients.filter(item => `${item.name} ${item.category || ''}`.toLocaleLowerCase().includes(term)) : ingredients
  }, [ingredients, query])
  const selectedSet = new Set(selected)

  return <div className="space-y-3">
    <label htmlFor={searchId} className="block text-sm font-medium">{text('recipeIngredients')}</label>
    <input id={searchId} type="search" value={query} onChange={event => setQuery(event.target.value)}
      placeholder={text('searchIngredients')} className="w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
    <p className="text-xs text-gray-500 dark:text-gray-300">{text('recipeIngredientsHelp')}</p>
    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-300 p-2 dark:border-gray-600">
      {!visible.length && <p className="p-2 text-sm text-gray-500 dark:text-gray-300">{text('noIngredients')}</p>}
      {visible.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
        <input type="checkbox" aria-label={item.name} checked={selectedSet.has(item.id)} onChange={event => onChange(event.target.checked
          ? [...selected, item.id]
          : selected.filter(id => id !== item.id))} />
        <span className="min-w-0"><span className="block break-words text-sm font-medium">{item.name}</span>
          {item.category && <span className="block text-xs text-gray-500 dark:text-gray-300">{item.category}</span>}
        </span>
      </label>)}
    </div>
    <p className="text-sm font-medium">{text('selectedIngredients')}: {selected.length}</p>
  </div>
}
