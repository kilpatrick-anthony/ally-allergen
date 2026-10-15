'use client'

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

type IngredientOption = { id: string; name: string; suppliers: string[] }

export function IngredientPicker({ open, onOpenChange, ingredients, selectedIds, onToggle }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredients: IngredientOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const filtered = ingredients.filter(ingredient => ingredient.name.toLowerCase().includes(search.toLowerCase()))
  const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:focus-visible:outline-teal-300'

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[94] bg-black/50" />
      <Dialog.Content aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[95] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white text-gray-900 shadow-xl dark:bg-gray-900 dark:text-white"
        onOpenAutoFocus={event => { event.preventDefault(); searchInput.current?.focus() }}
        onCloseAutoFocus={event => { event.preventDefault(); document.getElementById('regular-recipe')?.focus() }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
          <div className="min-w-0">
            <Dialog.Title className="text-lg font-semibold">{t('admin.selectIngredientsTitle')}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('admin.chooseIngredientsForMenuItem')}</Dialog.Description>
          </div>
          <Dialog.Close aria-label={t('admin.close')} className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}>
            <X className="h-5 w-5" aria-hidden="true" />
          </Dialog.Close>
        </div>
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <label className="block text-sm font-medium">
            {t('admin.searchIngredients')}
            <input ref={searchInput} type="search" value={search} onChange={event => setSearch(event.target.value)} className={`mt-2 min-h-11 w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-gray-900 dark:border-gray-500 dark:bg-gray-800 dark:text-white ${focusRing}`} />
          </label>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {filtered.length === 0 ? <p role="status" className="py-8 text-center text-gray-600 dark:text-gray-300">{t('admin.noIngredientsFound')}</p> : filtered.map(ingredient => <label key={ingredient.id} className="flex min-h-11 cursor-pointer items-center rounded-lg border border-gray-300 p-3 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-teal-600 dark:border-gray-600 dark:hover:bg-gray-800 dark:focus-within:ring-teal-300">
            <input type="checkbox" checked={selectedIds.includes(ingredient.id)} onChange={() => onToggle(ingredient.id)} className="h-5 w-5 shrink-0 accent-teal-700" />
            <span className="ml-3 min-w-0 break-words">
              <span className="block">{ingredient.name}</span>
              <span className="block text-xs text-gray-600 dark:text-gray-300">{ingredient.suppliers.length ? ingredient.suppliers.join(', ') : t('menuBuilderPortal.noSupplierLinked')}</span>
            </span>
          </label>)}
        </div>
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <Dialog.Close className={`min-h-11 w-full rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 ${focusRing}`}>{t('admin.done')}</Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
