'use client'

import { useState } from 'react'
import Link from 'next/link'
import { labelRecipeIngredients, looseFoodAllergenStatements, ppdsLabelLayoutInput, type LabelTextRun } from '@/lib/ppds'
import type { PpdsReviewSources } from '@/lib/server/ppds-labels'

const buttonClass = 'inline-flex min-h-11 items-center rounded-lg border border-[#003842] px-4 py-2 text-sm font-semibold text-[#003842] disabled:cursor-not-allowed disabled:opacity-50'
const linkClass = 'font-semibold underline'

export function LooseFoodAllergenLabel({ endpoint, itemId, fingerprint, foodName, sources, onReload }: {
  endpoint: string
  itemId: string
  fingerprint: string
  foodName: string
  sources: PpdsReviewSources
  onReload: () => Promise<void>
}) {
  const [variantIds, setVariantIds] = useState(() => new Set(sources.flatMap(row =>
    row.variants.length === 1 ? [row.variants[0].id] : [])))
  const [confirmedVariantIds, setConfirmedVariantIds] = useState<Set<string>>(() => new Set())
  const [includeIngredients, setIncludeIngredients] = useState(false)
  const [ingredients, setIngredients] = useState(() => sources.map(row => row.name).join(', ').slice(0, 2400))
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedRows = sources.map(row => {
    const variants = row.variants.filter(variant => variantIds.has(variant.id))
    const complete = row.active && (row.variants.length
      ? variants.length > 0 && variants.every(variant =>
        variant.assessed || (variant.assessmentComplete && confirmedVariantIds.has(variant.id)))
      : row.assessed)
    return { row, variants, complete }
  })
  const complete = selectedRows.length > 0 && selectedRows.every(entry => entry.complete)
  const allergens = selectedRows.flatMap(({ row, variants }) =>
    row.variants.length ? variants.flatMap(variant => variant.allergens) : row.allergens)
  const { contains, precautions, needsSpecificNames } = looseFoodAllergenStatements(allergens)
  let ingredientRuns: LabelTextRun[] | undefined
  let ingredientError = ''
  if (includeIngredients) {
    const declaration = ppdsLabelLayoutInput.shape.ingredients.safeParse(ingredients)
    if (!declaration.success) {
      ingredientError = ingredients.trim() ? 'Check the characters in the ingredients list.' : 'Enter the full ingredients list.'
    } else if (complete && !needsSpecificNames) {
      try {
        ingredientRuns = labelRecipeIngredients(declaration.data, allergens, sources.length)
      } catch (failure) {
        ingredientError = failure instanceof Error ? failure.message : 'Check the ingredients list.'
      }
    }
  }
  const canDownload = complete && confirmed && !needsSpecificNames && !ingredientError

  function confirmVariant(id: string, checked: boolean) {
    setConfirmedVariantIds(previous => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setConfirmed(false)
    setError('')
  }

  function selectVariant(id: string, checked: boolean) {
    setVariantIds(previous => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    confirmVariant(id, false)
  }

  async function download() {
    if (!canDownload) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'download-loose-label',
          itemId,
          expected: fingerprint,
          confirmedLooseFood: confirmed,
          confirmedVariantIds: confirmedVariantIds.size ? [...confirmedVariantIds] : undefined,
          ingredients: includeIngredients ? ingredients.trim() : undefined,
          selections: selectedRows.flatMap(({ row, variants }) =>
            variants.map(variant => ({ sourceId: row.id, variantId: variant.id }))),
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) {
        const failure = await response.json().catch(() => null)
        throw new Error(failure?.error || 'Could not create the allergen-only label.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = includeIngredients ? 'allergen-and-ingredients-label.pdf' : 'allergen-only-label.pdf'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create the allergen-only label.')
    } finally {
      setBusy(false)
    }
  }

  async function reload() {
    setError('')
    setConfirmed(false)
    setConfirmedVariantIds(new Set())
    setBusy(true)
    try {
      await onReload()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not reload the recipe.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 text-sm">
      <p>Use this label for food served loose or prepared to order. Display it where customers can read it before ordering.</p>
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4" disabled={busy}>
        <legend className="px-1 font-semibold">Ingredients used in this batch</legend>
        {selectedRows.map(({ row, variants }) => (
          <div key={row.id} role="group" aria-label={row.name} className="space-y-1">
            <p className="font-semibold">{row.name}</p>
            {row.variants.map(variant => {
              const selected = variantIds.has(variant.id)
              const recorded = looseFoodAllergenStatements(variant.allergens)
              const supportingFiles = row.documents.filter(doc => doc.href && doc.canSetReviewDate && variant.documentIds.includes(doc.id))
              return (
                <div key={variant.id} className="space-y-2">
                  <label className="flex min-h-9 items-center gap-2">
                    <input type="checkbox" checked={selected} onChange={event => selectVariant(variant.id, event.target.checked)} />
                    {variant.name}{variant.assessed ? '' : ' · needs review'}
                  </label>
                  {selected && !variant.assessed && (
                    <div className="ml-6 space-y-2 text-amber-950">
                      {variant.assessmentComplete ? (
                        <>
                          <p>{recorded.contains.length ? `Recorded as containing ${recorded.contains.join(', ')}.` : 'No contained allergens are recorded.'}
                            {recorded.precautions.length ? ` ${recorded.precautions.join('. ')}.` : ''}
                          </p>
                          {supportingFiles.map(doc => <p key={doc.id}>
                            <a className={linkClass} href={doc.href ?? undefined} target="_blank" rel="noreferrer">{doc.name}</a>
                          </p>)}
                          <label className="flex items-start gap-2">
                            <input className="mt-1" type="checkbox" checked={confirmedVariantIds.has(variant.id)}
                              onChange={event => confirmVariant(variant.id, event.target.checked)} />
                            I checked the recorded allergen answers for {variant.name} against the current supplier label or specification for this printout.
                          </label>
                        </>
                      ) : (
                        <p>Complete the allergen answers in <Link className={linkClass}
                          href={`/admin/ingredients/${encodeURIComponent(row.id)}/edit`} target="_blank" rel="noreferrer">{row.name}</Link>,
                          then reload the recipe.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {row.variants.length > 0 && variants.length === 0 && <p className="text-amber-900">Select the supplier variants used in this batch.</p>}
            {(!row.active || (!row.variants.length && !row.assessed)) && (
              <p className="text-amber-900">Check the ingredient is active and its allergen assessment is complete in <Link className={linkClass}
                href={`/admin/ingredients/${encodeURIComponent(row.id)}/edit`} target="_blank" rel="noreferrer">{row.name}</Link>.
              </p>
            )}
          </div>
        ))}
      </fieldset>
      <fieldset className="space-y-2" disabled={busy}>
        <label className="flex min-h-9 items-center gap-2 font-medium">
          <input type="checkbox" checked={includeIngredients} onChange={event => {
            setIncludeIngredients(event.target.checked)
            setConfirmed(false)
          }} />
          Include ingredients list
        </label>
        {includeIngredients && (
          <>
            <label className="block space-y-1 font-medium">Full ingredients list
              <textarea rows={3} maxLength={2400} className="block w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
                value={ingredients} onChange={event => {
                  setIngredients(event.target.value.replace(/\s*\n\s*/g, ' '))
                  setConfirmed(false)
                }} />
            </label>
            <p>Use the recipe names as a starting point. Check the order by weight and add compound ingredients from the supplier wording.</p>
            {ingredientError && <p className="text-amber-900">{ingredientError}</p>}
          </>
        )}
      </fieldset>
      {complete && !needsSpecificNames && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="font-semibold">{foodName}</p>
          {includeIngredients ? ingredientRuns && (
            <p><strong>Ingredients: </strong>{ingredientRuns.map(({ text, bold }, index) =>
              bold ? <strong key={index}>{text}</strong> : text)}</p>
          ) : <p className="font-semibold">{contains.length ? `Contains ${contains.join(', ')}` : 'No declarable allergens recorded'}</p>}
          {precautions.map(statement => <p key={statement}>{statement}</p>)}
        </div>
      )}
      {needsSpecificNames && <p className="text-amber-900">Identify the specific cereal or tree nut in the selected allergen assessments.</p>}
      <label className="flex min-h-11 items-start gap-2">
        <input className="mt-1" type="checkbox" checked={confirmed} disabled={busy || !complete || needsSpecificNames || !!ingredientError}
          onChange={event => setConfirmed(event.target.checked)} />
        This food is served loose or prepared to order, and the selected ingredients and allergen information match what I serve.
        {includeIngredients && ' I also checked that the ingredients list is complete and in the correct order.'}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} disabled={busy || !canDownload} onClick={() => void download()}>
          {includeIngredients ? 'Download label with ingredients' : 'Download allergen-only label'}
        </button>
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void reload()}>Reload recipe and sources</button>
      </div>
      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
    </section>
  )
}
