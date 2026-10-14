'use client'

import { useEffect, useState } from 'react'
import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES, computeWorstCaseAllergens, type AllergenWarnings } from '@/types/allergen'
import { deriveEffectiveIngredientSafety, type SupplierProfileMap } from '@/lib/ingredient-supplier-profiles'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Ingredient = { id: string; allergen_warnings?: AllergenWarnings; certifications?: string[]; supplier_profiles?: SupplierProfileMap }

export default function QuickAddRecipePreview({ selected }: { selected: string[] }) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/ingredients', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('ingredients')
      const result = await response.json()
      if (!controller.signal.aborted) setIngredients(result.ingredients || [])
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [])
  const chosen = selected.map(id => ingredients?.find(item => item.id === id))
  const safety = chosen.map(item => item && (deriveEffectiveIngredientSafety(item.supplier_profiles || {}) || { allergen_warnings: item.allergen_warnings || {} as AllergenWarnings, certifications: item.certifications || [] }))
  const complete = safety.every(item => item && ALLERGEN_LIST.every(allergen => !!item.allergen_warnings[allergen.id])) && chosen.every(item => item && Object.values(item.supplier_profiles || {}).every(profile => profile.assessment_status === 'assessed'))
  const warnings = computeWorstCaseAllergens(safety.flatMap(item => item ? [item.allergen_warnings] : []))
  const tags = complete ? safety.reduce<string[]>((common, item, index) => index === 0 ? item?.certifications || [] : common.filter(tag => item?.certifications.includes(tag)), []) : []
  return <section aria-label={text('recipePreview')} className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-800 dark:bg-teal-950/20">
    <h3 className="font-semibold">{text('recipePreview')}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">{text('recipePreviewHelp')}</p>
    {failed ? <p role="status" className="text-sm">{text('optionsFailed')}</p> : !ingredients ? <p role="status">{text('loading')}</p> : <>
      {!complete && <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{text('allergenReviewRequired')}</p>}
      <dl className="space-y-2 text-sm">{ALLERGEN_LIST.map(allergen => {
        const level = warnings[allergen.id]
        if (!level || level === 'none') return null
        const subtypes = allergen.id === 'cereals_gluten' ? GLUTEN_TYPES : allergen.id === 'nuts' ? TREE_NUT_TYPES : []
        const levels = allergen.id === 'cereals_gluten' ? warnings.cereals_gluten_levels : allergen.id === 'nuts' ? warnings.nuts_levels : undefined
        return <div key={allergen.id}><dt className="font-semibold">{t(`allergenNames.${allergen.id}`)}</dt><dd>{text(`level_${level}`)}
          {subtypes.map(type => { const subtypeLevel = levels?.[type.key as keyof typeof levels]; return subtypeLevel && subtypeLevel !== 'none' ? <span key={type.key} className="block pl-3">{t(`allergenSubtypes.${type.key}`)}: {text(`level_${subtypeLevel}`)}</span> : null })}
        </dd></div>
      })}</dl>
      {tags.length > 0 && <p className="text-sm"><span className="font-semibold">{text('dietaryTags')}: </span>{tags.map(tag => text(`tag_${tag}`)).join(', ')}</p>}
    </>}
  </section>
}
