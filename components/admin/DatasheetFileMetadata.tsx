'use client'

import { recordedDatasheetSupplier } from '@/lib/datasheet-supplier'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Props = {
  sheet: { file_size: number; supplier_name?: string | null; display_supplier_name?: string | null; version?: string | null }
  ingredientName?: string
}

export function DatasheetFileMetadata({ sheet, ingredientName }: Props) {
  const { t } = useTranslation()
  const supplier = recordedDatasheetSupplier(sheet.supplier_name) || recordedDatasheetSupplier(sheet.display_supplier_name)
  return <div data-no-translate className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
    {ingredientName && <><span className="break-words text-purple-700 dark:text-purple-300">{ingredientName}</span><span aria-hidden="true">•</span></>}
    <span>{t('ingredientsPortal.fileSizeMb', { size: (sheet.file_size / 1024 / 1024).toFixed(2) })}</span>
    <span aria-hidden="true">•</span>
    <span className="min-w-0 break-words">{supplier || t('ingredientsPortal.supplierNotRecorded')}</span>
    {sheet.version && <><span aria-hidden="true">•</span><span className="break-words">{t('ingredientsPortal.versionPrefix', { version: sheet.version })}</span></>}
  </div>
}
