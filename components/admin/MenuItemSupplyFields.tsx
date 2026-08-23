'use client'

import { ChefHat, Package, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

export type MenuItemType = 'prepared' | 'packaged_product'

export interface SupplierOption {
  id: string
  name: string
}

export interface PackagedProductFields {
  item_type: MenuItemType
  supplier_id: string | null
  manufacturer: string
  product_code: string
  barcode: string
  ingredient_declaration: string
  label_verified_at: string | null
}

interface Props {
  value: PackagedProductFields
  suppliers: SupplierOption[]
  onChange: (changes: Partial<PackagedProductFields>) => void
  onScanLabel?: () => void
}

const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#42b8ac] dark:border-gray-600 dark:bg-gray-700 dark:text-white'

export function MenuItemSupplyFields({ value, suppliers, onChange, onScanLabel }: Props) {
  const { t } = useTranslation()
  const packaged = value.item_type === 'packaged_product'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('admin.itemSupplyQuestion')}</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('admin.itemSupplyHelp')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange({ item_type: 'prepared' })}
          className={`rounded-xl border-2 p-4 text-left transition ${!packaged ? 'border-[#42b8ac] bg-[#42b8ac]/10' : 'border-gray-200 hover:border-[#42b8ac]/60 dark:border-gray-600'}`}
        >
          <ChefHat className="mb-2 h-5 w-5 text-[#0f766e]" />
          <span className="block font-semibold text-gray-900 dark:text-white">{t('admin.preparedItem')}</span>
          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{t('admin.preparedItemHelp')}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ item_type: 'packaged_product' })}
          className={`rounded-xl border-2 p-4 text-left transition ${packaged ? 'border-[#42b8ac] bg-[#42b8ac]/10' : 'border-gray-200 hover:border-[#42b8ac]/60 dark:border-gray-600'}`}
        >
          <Package className="mb-2 h-5 w-5 text-[#0f766e]" />
          <span className="block font-semibold text-gray-900 dark:text-white">{t('admin.packagedProduct')}</span>
          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{t('admin.packagedProductHelp')}</span>
        </button>
      </div>

      {packaged && (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('admin.manufacturerLabelDetails')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.manufacturerLabelHelp')}</p>
            </div>
            {onScanLabel && <Button type="button" variant="outline" size="sm" icon={<ScanLine className="h-4 w-4" />} onClick={onScanLabel}>{t('admin.scanLabel')}</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.supplier')}
              <select className={`${fieldClass} mt-1`} value={value.supplier_id || ''} onChange={e => onChange({ supplier_id: e.target.value || null })}>
                <option value="">{t('admin.selectSupplier')}</option>
                {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.manufacturerBrand')}
              <input className={`${fieldClass} mt-1`} value={value.manufacturer} onChange={e => onChange({ manufacturer: e.target.value })} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.productSkuCode')}
              <input className={`${fieldClass} mt-1`} value={value.product_code} onChange={e => onChange({ product_code: e.target.value })} />
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.barcode')}
              <input inputMode="numeric" className={`${fieldClass} mt-1`} value={value.barcode} onChange={e => onChange({ barcode: e.target.value })} />
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.fullIngredientDeclaration')}
            <textarea rows={5} className={`${fieldClass} mt-1`} value={value.ingredient_declaration} onChange={e => onChange({ ingredient_declaration: e.target.value })} placeholder={t('admin.ingredientDeclarationPlaceholder')} />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm dark:bg-gray-800">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#42b8ac]" checked={Boolean(value.label_verified_at)} onChange={e => onChange({ label_verified_at: e.target.checked ? new Date().toISOString() : null })} />
            <span><strong className="block text-gray-900 dark:text-white">{t('admin.labelDetailsChecked')}</strong><span className="text-xs text-gray-500 dark:text-gray-400">{t('admin.labelDetailsCheckedHelp')}</span></span>
          </label>
        </div>
      )}
    </div>
  )
}
