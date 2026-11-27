'use client'

import { useId, useState } from 'react'
import { defaultBowlChoices, evaluateBowl, type BowlChoices, type BowlGroup } from '@/lib/bowl-selection'
import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES, getAllergenLevelText } from '@/types/allergen'
import type { AllergenSelection } from '@/lib/allergen-assessment'

const filters = [
  ...ALLERGEN_LIST.map(({ id, name }) => ({
    key: id, name: id === 'cereals_gluten' ? 'Cereals containing gluten' : name,
    selection: { allergen: id } satisfies AllergenSelection,
  })),
  ...GLUTEN_TYPES.map(({ key, name }) => ({
    key, name, selection: { allergen: 'cereals_gluten', subtype: key } satisfies AllergenSelection,
  })),
  ...TREE_NUT_TYPES.map(({ key, name }) => ({
    key, name, selection: { allergen: 'nuts', subtype: key } satisfies AllergenSelection,
  })),
]

const choiceClass = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium has-checked:border-[#0e7066] has-checked:bg-[#eef8f6]'

export function BowlBuilder({ groups }: { groups: readonly BowlGroup[] }) {
  const formId = useId()
  const [choices, setChoices] = useState<BowlChoices>(() => defaultBowlChoices(groups))
  const [checkedAllergens, setCheckedAllergens] = useState<string[]>([])
  const selectedFilters = filters.filter(({ key }) => checkedAllergens.includes(key))
  const summaryFilters = selectedFilters.length ? selectedFilters : filters.slice(0, ALLERGEN_LIST.length)
  const summary = evaluateBowl(groups, choices, summaryFilters.map(({ selection }) => selection))

  function toggleAllergen(key: string) {
    setCheckedAllergens(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key])
  }

  function changeChoice(group: BowlGroup, id: string, checked: boolean) {
    setChoices(current => {
      if (group.kind !== 'multiple') return { ...current, [group.name]: id ? [id] : [] }
      const previous = current[group.name] ?? []
      return { ...current, [group.name]: checked ? [...previous, id] : previous.filter(value => value !== id) }
    })
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <details className="rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">Check specific allergens{checkedAllergens.length ? ` (${checkedAllergens.length})` : ''}</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {filters.map(({ key, name }) => (
              <label key={key} className={choiceClass}>
                <input type="checkbox" checked={checkedAllergens.includes(key)} onChange={() => toggleAllergen(key)} />
                {name}
              </label>
            ))}
          </div>
        </details>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          {groups.map(group => {
            const picked = choices[group.name] ?? []
            return (
              <fieldset key={group.name} className="space-y-2">
                <legend className="mb-1 font-semibold">{group.name}</legend>
                {group.kind === 'optional' && (
                  <label className={choiceClass}>
                    <input type="radio" name={`${formId}-${group.name}`} checked={picked.length === 0} onChange={() => changeChoice(group, '', true)} />
                    No {group.name.toLowerCase()}
                  </label>
                )}
                {group.options.map(option => (
                  <label key={option.id} className={choiceClass}>
                    <input
                      type={group.kind === 'multiple' ? 'checkbox' : 'radio'}
                      name={`${formId}-${group.name}`}
                      checked={picked.includes(option.id)}
                      onChange={event => changeChoice(group, option.id, event.target.checked)}
                    />
                    {option.name}
                  </label>
                ))}
              </fieldset>
            )
          })}
          <button type="button" className="min-h-11 text-sm font-semibold text-[#075e54] underline" onClick={() => setChoices(defaultBowlChoices(groups))}>
            Reset bowl choices
          </button>
        </div>
      </div>

      <section aria-labelledby={`${formId}-summary`} className="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
        <h2 id={`${formId}-summary`} className="text-2xl font-bold">Your bowl</h2>
        <div aria-live="polite" className="mt-3 space-y-4">
          <p className="text-sm text-slate-700">{summary.selected.map(ingredient => ingredient.name).join(' · ')}</p>
          {!summary.ready && <p>Complete your bowl choices to check the selection.</p>}
          {summary.ready && !selectedFilters.length && summary.assessments.every(result => !result.warnings.length && !result.incomplete.length) && (
            <p className="text-sm">No warnings recorded for the selected ingredients.</p>
          )}
          {summary.assessments.map(({ warnings, incomplete }, index) => {
            const { key, name } = summaryFilters[index]
            if (!warnings.length && !incomplete.length && (!selectedFilters.length || !summary.ready)) return null
            return (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <h3 className="font-semibold">{name}</h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {warnings.map(({ ingredient, level }) => (
                    <li key={ingredient.id}>{getAllergenLevelText(level, name.toLowerCase())} · {ingredient.name}</li>
                  ))}
                  {incomplete.length > 0 && (
                    <li>Information incomplete · {incomplete.map(ingredient => ingredient.name).join(', ')}. Check with staff.</li>
                  )}
                  {!warnings.length && !incomplete.length && <li>No warning recorded for the selected ingredients.</li>}
                </ul>
              </div>
            )
          })}
          {summary.ready && (
            <div className="border-t border-slate-200 pt-3">
              <h3 className="font-semibold">Dietary information</h3>
              <p className="mt-1 text-sm">{summary.dietary.join(' · ') || 'No shared dietary claim recorded for this selection.'}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
