'use client'

import { useEffect, useId, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import DatasheetUploader, { type DatasheetFile } from '@/components/admin/DatasheetUploader'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface IngredientSource { id: string; name: string }
interface IngredientDatasheet {
  id: string
  ingredient_id: string
  file_name: string
  file_path: string
  supplier_name?: string | null
  display_supplier_name?: string | null
}
interface Props {
  itemType: 'prepared' | 'packaged_product'
  ingredients: IngredientSource[]
  existingDatasheets?: DatasheetFile[]
  onFilesChange: (files: DatasheetFile[]) => void
  disabled?: boolean
  maxFiles?: number
}
type LoadedSheets = { key: string; status: 'loaded' | 'error'; sheets: IngredientDatasheet[] }

export default function MenuItemDatasheets({ itemType, ingredients, existingDatasheets, onFilesChange, disabled, maxFiles = 10 }: Props) {
  const { t } = useTranslation()
  const id = useId()
  const prepared = itemType === 'prepared'
  const selectionKey = prepared ? [...new Set(ingredients.map(ingredient => ingredient.id))].sort().join(',') : ''
  const [loaded, setLoaded] = useState<LoadedSheets | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!selectionKey) return
    const controller = new AbortController()
    const selected = new Set(selectionKey.split(','))
    fetch(`/api/datasheets?${new URLSearchParams({ ingredientIds: selectionKey })}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load ingredient datasheets')
        const data = await response.json()
        if (!Array.isArray(data.datasheets)) throw new Error('Invalid datasheet response')
        return data.datasheets as IngredientDatasheet[]
      })
      .then(sheets => {
        if (controller.signal.aborted) return
        const unique = new Map(sheets.filter(sheet => selected.has(sheet.ingredient_id)).map(sheet => [sheet.id, sheet]))
        setLoaded({ key: selectionKey, status: 'loaded', sheets: [...unique.values()] })
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ key: selectionKey, status: 'error', sheets: [] })
      })
    return () => controller.abort()
  }, [selectionKey, attempt])

  // Never show results from a previous selection while the next request loads.
  const current = loaded?.key === selectionKey ? loaded : null
  const loading = Boolean(selectionKey && !current)
  const retry = () => { setLoaded(null); setAttempt(value => value + 1) }

  return <section aria-labelledby={`${id}-title`} className="space-y-6" data-no-translate>
    <h2 id={`${id}-title`} className="text-lg font-semibold text-gray-900 dark:text-white">{t('menuDatasheets.title')}</h2>
    {prepared && <section aria-labelledby={`${id}-ingredients`} className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-800 dark:bg-teal-950/20">
      <h3 id={`${id}-ingredients`} className="font-semibold text-gray-900 dark:text-white">{t('menuDatasheets.fromIngredients')}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('menuDatasheets.automaticHelp')}</p>
      {!selectionKey ? <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{t('menuDatasheets.selectIngredients')}</p>
        : loading ? <p role="status" className="mt-4 text-sm text-gray-600 dark:text-gray-300">{t('menuDatasheets.loading')}</p>
        : current?.status === 'error' ? <div className="mt-4" role="alert"><p className="text-sm text-red-700 dark:text-red-300">{t('menuDatasheets.loadFailed')}</p><button type="button" onClick={retry} className="mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-teal-800 underline focus-visible:outline focus-visible:outline-2 dark:text-teal-300">{t('regularLists.retry')}</button></div>
        : <div className="mt-4 space-y-4">{ingredients.map(ingredient => {
          const sheets = current?.sheets.filter(sheet => sheet.ingredient_id === ingredient.id) || []
          return <div key={ingredient.id}>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{ingredient.name}</h4>
            {sheets.length ? <ul className="mt-2 space-y-2">{sheets.map(sheet => {
              const supplier = sheet.display_supplier_name || sheet.supplier_name?.trim()
              return <li key={sheet.id} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-gray-900 dark:text-white">{sheet.file_name}</p>{supplier && <p className="mt-1 break-words text-xs text-gray-600 dark:text-gray-300">{t('supplierLabel')}: {supplier}</p>}</div>
                {/^https?:\/\//i.test(sheet.file_path) && <a href={sheet.file_path} target="_blank" rel="noopener noreferrer" aria-label={`${t('menuDatasheets.open')}: ${sheet.file_name}`} className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-teal-800 underline focus-visible:outline focus-visible:outline-2 dark:text-teal-300">{t('menuDatasheets.open')}<ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}
              </li>
            })}</ul> : <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('menuDatasheets.missing')}</p>}
          </div>
        })}</div>}
    </section>}
    <section aria-labelledby={`${id}-uploads`}>
      <h3 id={`${id}-uploads`} className="font-semibold text-gray-900 dark:text-white">{t(prepared ? 'menuDatasheets.extraTitle' : 'menuDatasheets.productTitle')}</h3>
      <p className="mb-4 mt-1 text-sm text-gray-600 dark:text-gray-300">{t(prepared ? 'menuDatasheets.extraHelp' : 'menuDatasheets.productHelp')}</p>
      <DatasheetUploader entityType="menu_item" existingDatasheets={existingDatasheets} onFilesChange={onFilesChange} disabled={disabled} maxFiles={maxFiles}
        uploadDescription={t('menuDatasheets.uploadHelp')} emptyMessage={t(prepared ? 'menuDatasheets.noExtra' : 'menuDatasheets.noProduct')} />
    </section>
  </section>
}
