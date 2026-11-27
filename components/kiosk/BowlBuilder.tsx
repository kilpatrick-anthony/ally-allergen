'use client'

import { useId, useRef, useState } from 'react'
import { defaultBowlChoices, evaluateBowl, type BowlChoices, type BowlGroup, type BowlIngredient, type PublishedBowl } from '@/lib/bowl-selection'
import { bowlTranslations } from '@/lib/bowl-translations'
import { translations, type LanguageCode } from '@/lib/translations'
import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES } from '@/types/allergen'
import type { AllergenSelection } from '@/lib/allergen-assessment'

const filters: AllergenSelection[] = [
  ...ALLERGEN_LIST.map(({ id }) => ({ allergen: id })),
  ...GLUTEN_TYPES.map(({ key }) => ({ allergen: 'cereals_gluten' as const, subtype: key })),
  { allergen: 'cereals_gluten', subtype: 'spelt' },
  { allergen: 'cereals_gluten', subtype: 'kamut' },
  ...TREE_NUT_TYPES.map(({ key }) => ({ allergen: 'nuts' as const, subtype: key })),
]

function filterKey(selection: AllergenSelection) {
  return selection.subtype ?? selection.allergen
}

const choiceClass = 'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium has-checked:border-[#0e7066] has-checked:bg-[#eef8f6]'

export function BowlBuilder({ groups, fixed, initialAllergens = [], language = 'en', guidance, dietaryName, summaryId }: {
  groups: readonly BowlGroup[]
  fixed?: readonly BowlIngredient[]
  initialAllergens?: readonly AllergenSelection[]
  language?: LanguageCode
  guidance?: string | null
  dietaryName?: (claim: string) => string
  summaryId?: string
}) {
  const copy = bowlTranslations[language]
  const t = translations[language]
  const filterName = (selection: AllergenSelection) =>
    selection.subtype ? t.allergenSubtypes[selection.subtype] : t.allergenNames[selection.allergen]
  const groupName = (name: string) => {
    const key = name.toLowerCase()
    return key === 'base' || key === 'toppings' || key === 'drizzle' ? copy[key] : name
  }
  const formId = useId()
  const [choices, setChoices] = useState<BowlChoices>(() => defaultBowlChoices(groups))
  const [checkedAllergens, setCheckedAllergens] = useState<ReturnType<typeof filterKey>[]>(() => initialAllergens.map(filterKey))
  const selectedFilters = filters.filter(selection => checkedAllergens.includes(filterKey(selection)))
  const summaryFilters = selectedFilters.length ? selectedFilters : filters.slice(0, ALLERGEN_LIST.length)
  const summary = evaluateBowl(groups, choices, summaryFilters, fixed)

  function toggleAllergen(selection: AllergenSelection) {
    const key = filterKey(selection)
    setCheckedAllergens(current => {
      if (current.includes(key)) return current.filter(value => value !== key)
      const conflicts = filters.filter(option => option.allergen === selection.allergen &&
        Boolean(option.subtype) !== Boolean(selection.subtype)).map(filterKey)
      return [...current.filter(value => !conflicts.includes(value)), key]
    })
  }

  function changeChoice(group: BowlGroup, id: string, checked: boolean) {
    setChoices(current => {
      if (group.kind !== 'multiple') return { ...current, [group.name]: id ? [id] : [] }
      const previous = current[group.name] ?? []
      return { ...current, [group.name]: checked ? [...previous, id] : previous.filter(value => value !== id) }
    })
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <div className="space-y-5">
        <details className="rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">{copy.filters}{checkedAllergens.length ? ` (${checkedAllergens.length})` : ''}</summary>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            {filters.map(selection => {
              const key = filterKey(selection)
              return (
                <label key={key} className={choiceClass}>
                  <input type="checkbox" checked={checkedAllergens.includes(key)} onChange={() => toggleAllergen(selection)} />
                  {filterName(selection)}
                </label>
              )
            })}
          </div>
        </details>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          {!!fixed?.length && <p className="text-sm"><strong>{copy.fixed}</strong> · {fixed.map(ingredient => ingredient.name).join(', ')}</p>}
          {groups.map(group => {
            const picked = choices[group.name] ?? []
            return (
              <fieldset key={group.name} className="space-y-2">
                <legend className="mb-1 font-semibold">{groupName(group.name)}</legend>
                {group.kind === 'optional' && (
                  <label className={choiceClass}>
                    <input type="radio" name={`${formId}-${group.name}`} checked={picked.length === 0} onChange={() => changeChoice(group, '', true)} />
                    {copy.skip}
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
            {copy.reset}
          </button>
        </div>
      </div>

      <section id={summaryId} tabIndex={summaryId ? -1 : undefined} aria-labelledby={`${formId}-summary`} className="scroll-mt-32 rounded-xl border border-slate-200 bg-white p-5 min-w-0 break-words md:sticky md:top-24">
        <h2 id={`${formId}-summary`} className="text-2xl font-bold">{copy.summary}</h2>
        <div aria-live="polite" className="mt-3 space-y-4">
          <p className="text-sm text-slate-700">{summary.selected.map(ingredient => ingredient.name).join(' · ')}</p>
          {!summary.ready && <p>{copy.complete}</p>}
          {summary.ready && !selectedFilters.length && summary.assessments.every(result => !result.warnings.length && !result.incomplete.length) && (
            <p className="text-sm">{copy.clear}</p>
          )}
          {summary.assessments.map(({ allergen, warnings, incomplete }) => {
            const key = filterKey(allergen)
            const name = filterName(allergen)
            if (!warnings.length && !incomplete.length && (!selectedFilters.length || !summary.ready)) return null
            return (
              <div key={key} className="rounded-lg bg-slate-50 p-3">
                <h3 className="font-semibold">{name}</h3>
                {[true, false].map(declared => {
                  const entries = warnings.filter(({ level }) => (level === 'contains') === declared)
                  return entries.length > 0 && (
                    <div key={String(declared)} className="mt-2 text-sm">
                      <h4 className="font-semibold">{declared ? copy.declared : copy.precautionary}</h4>
                      <ul className="mt-1 space-y-1">
                        {entries.map(({ ingredient, level, subtype }) => (
                          <li key={`${ingredient.id}-${level}-${subtype ?? ''}`}>
                            {t.allergenLevelText[level].replace('{allergen}', subtype ? t.allergenSubtypes[subtype] : name)} · {ingredient.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
                {incomplete.length > 0 && (
                  <p className="mt-2 text-sm text-amber-900">{copy.incomplete} · {incomplete.map(ingredient => ingredient.name).join(', ')}</p>
                )}
                {!warnings.length && !incomplete.length && <p className="mt-1 text-sm">{copy.clear}</p>}
              </div>
            )
          })}
          {summary.ready && (
            <div className="border-t border-slate-200 pt-3">
              <h3 className="font-semibold">{copy.dietary}</h3>
              <p className="mt-1 text-sm">{summary.dietary.map(label => dietaryName?.(label) ?? label).join(' · ') || copy.noClaim}</p>
            </div>
          )}
          <p className="border-t border-slate-200 pt-3 text-sm">{copy.guidance}</p>
          {guidance && <p className="text-sm">{guidance}</p>}
        </div>
      </section>
    </div>
  )
}

export function BowlLauncher({ itemName, bowl, initialAllergens, language, guidance, dietaryName, showItemName = false }: {
  itemName: string
  bowl: PublishedBowl
  initialAllergens: readonly AllergenSelection[]
  language: LanguageCode
  guidance?: string | null
  dietaryName?: (claim: string) => string
  showItemName?: boolean
}) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const copy = bowlTranslations[language]
  return (
    <>
      <button type="button" className="mt-3 min-h-11 rounded-lg border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-[#075e54]"
        onClick={() => { dialog.current?.showModal(); setOpen(true) }}>
        {copy.open}{showItemName && <> · {itemName}</>}
      </button>
      <dialog ref={dialog} aria-labelledby={id} lang={language} onClose={() => setOpen(false)}
        className="m-auto max-h-[92dvh] w-[calc(100%_-_1.5rem)] max-w-5xl overflow-y-auto rounded-2xl bg-[#f4f8f7] text-[#003842] shadow-xl backdrop:bg-black/60">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-4">
          <div className="min-w-0 break-words">
            <h2 id={id} className="text-xl font-bold">{copy.open}</h2>
            <p>{itemName}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={() => dialog.current?.close()}
              className="min-h-11 rounded-lg border border-slate-400 px-3 text-sm font-semibold">{translations[language].close}</button>
            <button type="button" className="min-h-11 px-2 text-sm font-semibold underline md:hidden"
              onClick={() => document.getElementById(`${id}-summary`)?.focus()}>{copy.summary}</button>
          </div>
        </header>
        {open && (
          <div className="p-3 sm:p-4">
            <BowlBuilder key={bowl.sourceVersion} groups={bowl.groups} fixed={bowl.fixed} initialAllergens={initialAllergens}
              language={language} guidance={guidance} dietaryName={dietaryName} summaryId={`${id}-summary`} />
          </div>
        )}
      </dialog>
    </>
  )
}
