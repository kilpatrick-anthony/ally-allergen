'use client'

import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES } from '@/types/allergen'
import { dietaryTags, reviewLevels, type QuickAddReview } from '@/lib/quick-add-review'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { Button } from '@/components/ui/Button'

type Warnings = QuickAddReview['allergen_warnings']
type Props = { warnings: Warnings; tags: readonly string[]; onWarnings: (value: Warnings) => void; onTags: (value: string[]) => void }

export default function QuickAddAssessment({ warnings, tags, onWarnings, onTags }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const control = 'mt-1 w-full rounded-lg border p-3 text-base text-gray-900 dark:text-white'
  const validLevel = (value: unknown): value is typeof reviewLevels[number] => typeof value === 'string' && reviewLevels.includes(value as typeof reviewLevels[number])
  const groupDetails = [{ key: 'cereals_gluten', entries: GLUTEN_TYPES }, { key: 'nuts', entries: TREE_NUT_TYPES }]
  const missingMain = ALLERGEN_LIST.filter(allergen => !validLevel(warnings[allergen.id])).map(allergen => allergen.id)
  const missingSubtypes = new Map<string, string[]>()
  const inconsistentGroups = new Set<string>()
  for (const { key, entries } of groupDetails) {
    const level = warnings[key], stored = warnings[`${key}_levels`]
    if (!validLevel(level) || level === 'none') continue
    const values = typeof stored === 'object' ? stored : {}
    const missing = entries.filter(entry => !validLevel(values[entry.key])).map(entry => entry.key)
    if (missing.length) missingSubtypes.set(key, missing)
    else {
      const worst = entries.reduce((value, entry) => Math.max(value, reviewLevels.indexOf(values[entry.key] as typeof reviewLevels[number])), 0)
      if (reviewLevels[worst] !== level) inconsistentGroups.add(key)
    }
  }
  const outstanding = missingMain.length + [...missingSubtypes.values()].reduce((total, values) => total + values.length, 0) + inconsistentGroups.size

  function levelSelect(label: string, value: string, change: (value: string) => void, needsReview = false) {
    return <label className={`block text-sm font-medium ${needsReview ? 'text-red-700 dark:text-red-300' : ''}`}>{label}
      <select aria-label={label} aria-invalid={needsReview || undefined} className={`${control} ${needsReview ? 'border-red-600 bg-white ring-2 ring-red-200 dark:border-red-400 dark:bg-gray-900 dark:ring-red-900' : validLevel(value) && value !== 'none' ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100 dark:border-emerald-400 dark:bg-emerald-950 dark:ring-emerald-900' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`} value={value} onChange={event => change(event.target.value)}>
        <option value="">{text('unknown')}</option>
        {reviewLevels.map(level => <option key={level} value={level}>{text(`level_${level}`)}</option>)}
      </select>
      {needsReview && <span className="mt-1 block text-xs font-semibold">{text('allergenReviewRequired')}</span>}
    </label>
  }
  function setAllergen(key: string, value: string) {
    const next = { ...warnings }
    if (value) next[key] = value as typeof reviewLevels[number]
    else delete next[key]
    if (key === 'cereals_gluten' || key === 'nuts') {
      if (!value || value === 'none') delete next[`${key}_levels`]
      else next[`${key}_levels`] = Object.fromEntries((key === 'cereals_gluten' ? GLUTEN_TYPES : TREE_NUT_TYPES).map(type => [type.key, value as typeof reviewLevels[number]]))
    }
    onWarnings(next)
  }
  function setSubtype(group: string, subtype: string, value: string) {
    const key = `${group}_levels`, previous = warnings[key]
    const levels = { ...(typeof previous === 'object' ? previous : {}) }
    if (value) levels[subtype] = value as typeof reviewLevels[number]
    else delete levels[subtype]
    const worst = Object.values(levels).reduce((a, b) => reviewLevels.indexOf(a) > reviewLevels.indexOf(b) ? a : b, 'none')
    const entries = group === 'cereals_gluten' ? GLUTEN_TYPES : TREE_NUT_TYPES
    const allReviewed = entries.every(entry => validLevel(levels[entry.key]))
    onWarnings({ ...warnings, [key]: levels, [group]: worst === 'none' && !allReviewed ? warnings[group] : worst })
  }
  function markUnansweredNotPresent() {
    const next = { ...warnings }
    for (const allergen of ALLERGEN_LIST) if (!validLevel(next[allergen.id])) next[allergen.id] = 'none'
    for (const { key, entries } of groupDetails) {
      if (next[key] === 'none') { delete next[`${key}_levels`]; continue }
      const stored = next[`${key}_levels`]
      const levels = { ...(typeof stored === 'object' ? stored : {}) }
      for (const entry of entries) if (!validLevel(levels[entry.key])) levels[entry.key] = 'none'
      next[`${key}_levels`] = levels
    }
    onWarnings(next)
  }
  return <div className="space-y-5">
    <fieldset>
      <legend className="mb-2 font-semibold">{text('dietaryTags')}</legend>
      <div className="flex flex-wrap gap-2">{dietaryTags.map(tag => <label key={tag} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 dark:border-gray-500 dark:text-white">
        <input type="checkbox" checked={tags.includes(tag)} onChange={event => onTags(event.target.checked ? [...tags, tag] : tags.filter(value => value !== tag))} />{text(`tag_${tag}`)}
      </label>)}</div>
    </fieldset>
    <div className="space-y-3">
      <h4 className="font-semibold">{text('allergenReview')}</h4>
      <p className="text-xs text-gray-600 dark:text-gray-300">{text('allergenHighlightHelp')}</p>
      {outstanding > 0 && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
        <p className="font-semibold">{text('allergenOutstanding').replace('{count}', String(outstanding))}</p>
        <p className="mt-1">{text('markUnansweredHelp')}</p>
        <Button className="mt-3" type="button" variant="tealOutline" onClick={markUnansweredNotPresent}>{text('markUnansweredNone')}</Button>
      </div>}
      {ALLERGEN_LIST.map(allergen => {
        const level = warnings[allergen.id]
        const group = allergen.id === 'cereals_gluten' ? GLUTEN_TYPES : allergen.id === 'nuts' ? TREE_NUT_TYPES : null
        const values = warnings[`${allergen.id}_levels`]
        const groupIssue = inconsistentGroups.has(allergen.id)
        return <div key={allergen.id} className={groupIssue ? 'rounded-lg border border-red-500 p-2' : ''}>
          {levelSelect(t(`allergenNames.${allergen.id}`), typeof level === 'string' ? level : '', value => setAllergen(allergen.id, value), missingMain.includes(allergen.id) || groupIssue)}
          {group && level && level !== 'none' && <div className="ml-3 mt-2 space-y-2 border-l pl-3">
            {group.map(subtype => <div key={subtype.key}>{levelSelect(t(`allergenSubtypes.${subtype.key}`), typeof values === 'object' ? values[subtype.key] || '' : '', value => setSubtype(allergen.id, subtype.key, value), missingSubtypes.get(allergen.id)?.includes(subtype.key))}</div>)}
          </div>}
        </div>
      })}
    </div>
  </div>
}
