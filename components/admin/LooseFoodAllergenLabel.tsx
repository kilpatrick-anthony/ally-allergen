'use client'

import { useState } from 'react'
import { looseFoodAllergenStatements } from '@/lib/ppds'
import type { PpdsReviewSources } from '@/lib/server/ppds-labels'

const buttonClass = 'inline-flex min-h-11 items-center rounded-lg border border-[#003842] px-4 py-2 text-sm font-semibold text-[#003842] disabled:cursor-not-allowed disabled:opacity-50'

export function LooseFoodAllergenLabel({ endpoint, itemId, fingerprint, foodName, sources, onReload }: {
  endpoint: string
  itemId: string
  fingerprint: string
  foodName: string
  sources: PpdsReviewSources
  onReload: () => Promise<void>
}) {
  const [variantIds, setVariantIds] = useState(() => new Set(sources.flatMap(row =>
    row.variants.length === 1 && row.variants[0].assessed ? [row.variants[0].id] : [])))
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectedRows = sources.map(row => {
    const variants = row.variants.filter(variant => variantIds.has(variant.id))
    const complete = row.active && (row.variants.length
      ? variants.length > 0 && variants.every(variant => variant.assessed)
      : row.assessed)
    return { row, variants, complete }
  })
  const complete = selectedRows.length > 0 && selectedRows.every(entry => entry.complete)
  const { contains, precautions, needsSpecificNames } = looseFoodAllergenStatements(selectedRows.flatMap(({ row, variants }) =>
    row.variants.length ? variants.flatMap(variant => variant.allergens) : row.allergens))
  const canDownload = complete && confirmed && !needsSpecificNames

  function selectVariant(id: string, checked: boolean) {
    setVariantIds(previous => {
      const next = new Set(previous)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setConfirmed(false)
    setError('')
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
      link.download = 'allergen-only-label.pdf'
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
        {selectedRows.map(({ row, complete: rowComplete }) => (
          <div key={row.id} role="group" aria-label={row.name} className="space-y-1">
            <p className="font-semibold">{row.name}</p>
            {row.variants.map(variant => (
              <label key={variant.id} className="flex min-h-9 items-center gap-2">
                <input type="checkbox" checked={variantIds.has(variant.id)} disabled={!variant.assessed}
                  onChange={event => selectVariant(variant.id, event.target.checked)} />
                {variant.name}{variant.assessed ? '' : ' · needs assessment'}
              </label>
            ))}
            {!rowComplete && <p className="text-amber-900">Check this ingredient’s assessment and select the supplier variants used, where applicable.</p>}
          </div>
        ))}
      </fieldset>
      {complete && !needsSpecificNames && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="font-semibold">{foodName}</p>
          <p className="font-semibold">{contains.length ? `Contains ${contains.join(', ')}` : 'No declarable allergens recorded'}</p>
          {precautions.map(statement => <p key={statement}>{statement}</p>)}
        </div>
      )}
      {needsSpecificNames && <p className="text-amber-900">Identify the specific cereal or tree nut in the selected allergen assessments.</p>}
      <label className="flex min-h-11 items-start gap-2">
        <input className="mt-1" type="checkbox" checked={confirmed} disabled={busy || !complete || needsSpecificNames}
          onChange={event => setConfirmed(event.target.checked)} />
        This food is served loose or prepared to order, and the selected ingredients and allergen information match what I serve.
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} disabled={busy || !canDownload} onClick={() => void download()}>
          Download allergen-only label
        </button>
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void reload()}>Reload recipe and sources</button>
      </div>
      {error && <p role="alert" className="font-semibold text-red-800">{error}</p>}
    </section>
  )
}
