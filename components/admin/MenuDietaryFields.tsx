'use client'

import { useRef, useState } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { Button } from '@/components/ui/Button'

const claims = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy Free', 'Halal', 'Kosher', 'Organic', 'Fair Trade', 'Lactose-Free', 'Coeliac-Friendly']

export function MenuDietaryFields({ prepared, value, onChange }: { prepared: boolean; value: string[]; onChange: (value: string[]) => void }) {
  const { t } = useTranslation()
  const [custom, setCustom] = useState('')
  const customInput = useRef<HTMLInputElement>(null)
  return <section aria-label={t('admin.dietaryClaims')}>
    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('admin.dietaryClaims')}</h2>
    <p className="mt-1 mb-4 text-sm text-gray-600 dark:text-gray-300">{t(prepared ? 'regularForms.derivedDietary' : 'admin.dietaryClaimsHelp')}</p>
    {prepared ? (
      value.length ? <ul className="flex flex-wrap gap-2">{value.map(claim => <li key={claim} className="rounded-full border border-teal-500 px-3 py-1 text-sm text-teal-800 dark:text-teal-200">{claim}</li>)}</ul>
        : <p className="text-sm text-gray-600 dark:text-gray-300">{t('regularForms.noDerivedDietary')}</p>
    ) : <>
      <div className="flex flex-wrap gap-2">
        {Array.from(new Set([...claims, ...value])).map(claim => <button key={claim} type="button" aria-pressed={value.includes(claim)} onClick={() => {
          const selected = value.includes(claim)
          onChange(selected ? value.filter(item => item !== claim) : [...value, claim])
          if (selected && !claims.includes(claim)) requestAnimationFrame(() => customInput.current?.focus())
        }}
          className={`min-h-11 rounded-full border px-3 py-2 text-sm ${value.includes(claim) ? 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200' : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200'}`}>{claim}</button>)}
      </div>
      <label className="mt-4 block text-sm text-gray-700 dark:text-gray-200">
        {t('regularForms.customClaim')}
        <input ref={customInput} data-unsaved-draft value={custom} onChange={event => setCustom(event.target.value)} className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
      </label>
      <Button className="mt-2" variant="outline" disabled={!custom.trim()} onClick={() => { if (!value.includes(custom.trim())) onChange([...value, custom.trim()]); setCustom(''); customInput.current?.focus() }}>{t('admin.add')}</Button>
    </>}
  </section>
}
