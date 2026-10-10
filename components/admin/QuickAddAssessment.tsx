'use client'

import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES } from '@/types/allergen'
import { dietaryTags, reviewLevels, type QuickAddReview } from '@/lib/quick-add-review'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Warnings = QuickAddReview['allergen_warnings']
type Props = { warnings: Warnings; tags: readonly string[]; onWarnings: (value: Warnings) => void; onTags: (value: string[]) => void }

export default function QuickAddAssessment({ warnings, tags, onWarnings, onTags }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const control = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
  function levelSelect(label: string, value: string, change: (value: string) => void) {
    return <label className="block text-sm font-medium">{label}
      <select aria-label={label} className={control} value={value} onChange={event => change(event.target.value)}>
        <option value="">{text('unknown')}</option>
        {reviewLevels.map(level => <option key={level} value={level}>{text(`level_${level}`)}</option>)}
      </select>
    </label>
  }
  function setAllergen(key: string, value: string) {
    const next = { ...warnings }
    if (value) next[key] = value as typeof reviewLevels[number]
    else delete next[key]
    if (key === 'cereals_gluten' || key === 'nuts') delete next[`${key}_levels`]
    onWarnings(next)
  }
  function setSubtype(group: string, subtype: string, value: string) {
    const key = `${group}_levels`, previous = warnings[key]
    const levels = { ...(typeof previous === 'object' ? previous : {}) }
    if (value) levels[subtype] = value as typeof reviewLevels[number]
    else delete levels[subtype]
    const worst = Object.values(levels).reduce((a, b) => reviewLevels.indexOf(a) > reviewLevels.indexOf(b) ? a : b, 'none')
    onWarnings({ ...warnings, [key]: levels, [group]: worst === 'none' ? warnings[group] : worst })
  }
  return <div className="space-y-5">
    <fieldset>
      <legend className="mb-2 font-semibold">{text('dietaryTags')}</legend>
      <div className="flex flex-wrap gap-2">{dietaryTags.map(tag => <label key={tag} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 dark:border-gray-500 dark:text-white">
        <input type="checkbox" checked={tags.includes(tag)} onChange={event => onTags(event.target.checked ? [...tags, tag] : tags.filter(value => value !== tag))} />{tag}
      </label>)}</div>
    </fieldset>
    <div className="space-y-3">
      <h4 className="font-semibold">{text('allergenReview')}</h4>
      {ALLERGEN_LIST.map(allergen => {
        const level = warnings[allergen.id]
        const group = allergen.id === 'cereals_gluten' ? GLUTEN_TYPES : allergen.id === 'nuts' ? TREE_NUT_TYPES : null
        const values = warnings[`${allergen.id}_levels`]
        return <div key={allergen.id}>
          {levelSelect(allergen.name, typeof level === 'string' ? level : '', value => setAllergen(allergen.id, value))}
          {group && level && level !== 'none' && <div className="ml-3 mt-2 space-y-2 border-l pl-3">
            {group.map(subtype => <div key={subtype.key}>{levelSelect(subtype.name, typeof values === 'object' ? values[subtype.key] || '' : '', value => setSubtype(allergen.id, subtype.key, value))}</div>)}
          </div>}
        </div>
      })}
    </div>
  </div>
}
