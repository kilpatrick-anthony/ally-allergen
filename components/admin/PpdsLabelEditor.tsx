'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Jurisdiction } from '@/lib/location-jurisdiction'
import { publishedDate } from '@/lib/location-jurisdiction'
import { classifyPpds, isSingleAllergenName, missingDeclaredAllergens, PPDS_CLASSIFICATIONS, PPDS_LABEL_SIZE, ppdsAnswers, selectedLabelAllergenSources, type PpdsAnswers, type PpdsClassification, type PpdsLabelInput } from '@/lib/ppds'
import type { PpdsPrintLabel } from '@/lib/pdf/ppds-label'
import type { PpdsReviewSources, StoredPpdsLabel } from '@/lib/server/ppds-labels'
import { LooseFoodAllergenLabel } from './LooseFoodAllergenLabel'

type HistoryEntry = { id: string; date: string; actor: string; documents: string[]; approved: boolean; classification: PpdsClassification }
type Review = {
  canApprove: boolean
  canCreateLooseLabel: boolean
  fingerprint: string
  foodName: string
  ingredientDeclaration: string | null
  sources: PpdsReviewSources
  stale: string | null
  current: { id: string; answers: Partial<PpdsAnswers>; classification: PpdsClassification; label: StoredPpdsLabel | null; date: string } | null
}
type Preview = { label: PpdsPrintLabel; xHeight: number; minimumXHeight: number; verified: boolean }
type Intent = 'classify' | 'review' | 'preview-layout' | 'preview' | 'approve'
type SourceSelections = Record<string, Record<string, string>>
type DraftSources = { revisionId: string | null; specifications: PpdsLabelInput['specifications'] }

const classificationFields: {
  key: keyof PpdsAnswers
  label: string
  options: { value: string; label: string }[]
}[] = [
  { key: 'packer', label: 'Who packs the food?', options: [
    { value: 'same_business', label: 'The business selling it (or preparing it loose)' },
    { value: 'other_business', label: 'Another business supplies it already packed' },
  ] },
  { key: 'place', label: 'Where is it packed relative to where it is sold?', options: [
    { value: 'same_site', label: 'On the same premises or in the same site complex. For remote sales, our own dispatch kitchen.' },
    { value: 'mobile_or_temporary', label: 'Packed by us for sale from our mobile or temporary outlet' },
    { value: 'different_fixed_site', label: 'Packed at another fixed site' },
  ] },
  { key: 'enclosed', label: 'Must the packaging be opened or changed to alter the food?', options: [
    { value: 'yes', label: 'Yes, it is fully or partly enclosed' },
    { value: 'no', label: 'No, it is sold loose or the packaging does not enclose the food' },
  ] },
  { key: 'timing', label: 'When is it packed?', options: [
    { value: 'before_choice', label: 'Before the customer selects or orders it' },
    { value: 'after_choice', label: 'Only after the customer selects or orders it, or sold loose' },
  ] },
  { key: 'sales', label: 'How can the customer select or order it?', options: [
    { value: 'in_person', label: 'In person' },
    { value: 'remote_only', label: 'Online or by phone only' },
    { value: 'both', label: 'Both in person and remotely' },
  ] },
]

const fieldClass = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900'
const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-[#003842] px-4 py-2 text-sm font-semibold text-[#003842] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function PpdsLabelEditor({ siteSlug, jurisdiction, item }: {
  siteSlug: string; jurisdiction: Jurisdiction; item: { id: string; name: string }
}) {
  const isIrishLocation = jurisdiction === 'IE'
  const href = jurisdiction === 'SCT'
    ? 'https://www.foodstandards.gov.scot/business-guidance/running-a-food-business/packaging-and-labelling/prepacked-for-direct-sale'
    : 'https://www.gov.uk/government/publications/food-allergen-labelling-and-information-requirements-technical-guidance'

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-bold">{isIrishLocation ? 'Ingredient and allergen labels' : 'Allergen and PPDS labels'}</h3>
      {isIrishLocation ? (
        <p className="text-sm">Create an ingredient declaration or an allergen-only label for food served loose. Check any additional package labelling requirements separately.</p>
      ) : (
        <p className="text-sm">Classify an item for this location. A sandwich sealed in advance and sold from the same café is an example of PPDS. <a href={href} className="font-semibold underline">PPDS guidance</a></p>
      )}
      <p className="text-sm font-semibold">Menu item: {item.name}</p>
      <LabelReview key={item.id} siteSlug={siteSlug} itemId={item.id} isIrishLocation={isIrishLocation} />
    </section>
  )
}

function LabelReview({ siteSlug, itemId, isIrishLocation }: {
  siteSlug: string; itemId: string; isIrishLocation: boolean
}) {
  const endpoint = `/api/sites/${encodeURIComponent(siteSlug)}/ppds`
  const [review, setReview] = useState<Review | null>(null)
  const [labelType, setLabelType] = useState<'ingredients' | 'allergens'>('ingredients')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [answers, setAnswers] = useState<Partial<PpdsAnswers>>({})
  const [foodName, setFoodName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [precaution, setPrecaution] = useState('')
  const [area, setArea] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [selections, setSelections] = useState<SourceSelections>({})
  const [verified, setVerified] = useState(false)
  const [suitable, setSuitable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const load = useCallback(async (signal?: AbortSignal, draft?: DraftSources) => {
    const response = await fetch(`${endpoint}?item=${itemId}`, { cache: 'no-store', signal })
    const data = await response.json() as Review & { error?: string }
    if (!response.ok) throw new Error(data.error || 'Could not load the label review.')
    if (signal?.aborted) return
    setReview(data)
    setHistory([])
    setHistoryLoaded(false)
    setHistoryError('')
    const label = data.current?.label?.input
    const keepDraft = draft && draft.revisionId === (data.current?.id ?? null)
    if (!keepDraft) {
      setAnswers(data.current?.answers || {})
      setFoodName(label?.foodName ?? data.foodName)
      setIngredients(label?.ingredients ?? data.ingredientDeclaration ?? '')
      setPrecaution(label?.precaution ?? '')
      setArea(label ? String(label.areaCm2) : '')
      setWidth(label ? String(label.widthMm) : '')
      setHeight(label ? String(label.heightMm) : '')
      setSuitable(false)
    }
    const savedSelections: SourceSelections = {}
    for (const { sourceId, variantId, documentId } of (keepDraft ? draft.specifications : label?.specifications) ?? []) {
      const row = data.sources.find(source => source.id === sourceId)
      if (!row || (row.variants.length ? !row.variants.some(variant => variant.id === variantId) : variantId)) continue
      savedSelections[sourceId] ??= {}
      savedSelections[sourceId][variantId ?? ''] = documentId
    }
    setSelections(savedSelections)
    setPreview(null)
    setVerified(false)
    if (draft && !keepDraft) setNotice('A newer review was saved. The latest version is now open.')
  }, [endpoint, itemId])

  useEffect(() => {
    const request = new AbortController()
    let active = true
    let timeoutId: number
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        request.abort()
        reject(new Error('The server did not finish loading this item’s label review within 30 seconds. The PDF download has not started yet. Retry, and contact support if it happens again.'))
      }, 30_000)
    })
    setReview(null)
    setError('')
    void Promise.race([load(request.signal), timeout]).catch(err => {
      if (active) {
        setError(err instanceof Error ? err.message : 'Could not load the label review.')
      }
    }).finally(() => {
      window.clearTimeout(timeoutId)
    })
    return () => {
      active = false
      window.clearTimeout(timeoutId)
      request.abort()
    }
  }, [load, loadAttempt])

  function clearPreview() {
    setPreview(null)
    setError('')
    setNotice('')
  }

  function selectSpecification(sourceId: string, variantId: string, documentId: string | null) {
    setSelections(previous => {
      const forSource = { ...previous[sourceId] }
      if (documentId === null) delete forSource[variantId]
      else forSource[variantId] = documentId
      return { ...previous, [sourceId]: forSource }
    })
    clearPreview()
    setVerified(false)
  }

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await task()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete the label review.')
    } finally {
      setBusy(false)
    }
  }

  async function loadHistory() {
    if (historyLoading || historyLoaded) return
    setHistoryLoading(true)
    setHistoryError('')
    const timeout = AbortSignal.timeout(30_000)
    try {
      const response = await fetch(`${endpoint}?item=${itemId}&history=true`, { cache: 'no-store', signal: timeout })
      const data = await response.json() as { history?: HistoryEntry[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Could not load revision history.')
      if (!Array.isArray(data.history)) throw new Error('The revision history could not be read.')
      setHistory(data.history)
      setHistoryLoaded(true)
    } catch (error) {
      setHistoryError(timeout.aborted
        ? 'Loading revision history timed out. Retry if you need to view older versions.'
        : error instanceof Error ? error.message : 'Could not load revision history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const parsedAnswers = ppdsAnswers.safeParse(answers)
  const classification = isIrishLocation ? 'ingredient_label' : parsedAnswers.success ? classifyPpds(parsedAnswers.data) : null
  const classificationChanged = Boolean(!isIrishLocation && review?.current && classification &&
    classificationFields.some(({ key }) => answers[key] !== review.current?.answers[key]))
  const specifications = review?.sources.flatMap(row => Object.entries(selections[row.id] ?? {}).map(([variantId, documentId]) => ({
    sourceId: row.id, documentId, variantId: variantId || null,
  }))) ?? []
  const specificationsSelected = review?.sources.length && review.sources.every(row => {
    const choices = Object.entries(selections[row.id] ?? {})
    return choices.length > 0 && choices.every(([variantId, documentId]) =>
      row.documents.some(doc => doc.id === documentId && doc.current) &&
      (!row.variants.length || row.variants.some(variant =>
        variant.id === variantId && variant.assessed && variant.documentIds.includes(documentId))))
  })
  const approvedSpecifications = review?.current?.label?.input.specifications
  const specificationsChanged = !!approvedSpecifications && (
    approvedSpecifications.length !== specifications.length ||
    approvedSpecifications.some(({ sourceId, variantId, documentId }) => selections[sourceId]?.[variantId ?? ''] !== documentId)
  )
  const canPreview = Boolean(foodName.trim())
  const allergenSources = selectedLabelAllergenSources(review?.sources ?? [], specifications)
    .filter(source => source.containedAllergens?.length)
  const allergenNames = [...new Set(allergenSources.flatMap(source => source.containedAllergens ?? []))]
  const missingAllergens = missingDeclaredAllergens(ingredients, allergenNames)
  const needsFullList = !ingredients.trim() ||
    ((review?.sources.length ?? 0) > 1 && isSingleAllergenName(ingredients, allergenNames))
  const approvalChecks = [
    needsFullList && 'Enter the full ingredients list, including the recipe and relevant compound ingredients.',
    !needsFullList && missingAllergens.length > 0 && `Name ${missingAllergens.join(', ')} where it appears in the supplier’s ingredients.`,
    !specificationsSelected && 'Select a current specification for every ingredient used and complete any outstanding variant assessments.',
    !area && 'Enter the measured area of the largest package surface.',
    !verified && 'Confirm the recipe, ingredient order and supplier wording.',
    !suitable && 'Confirm the label suits the package.',
  ].filter(Boolean)
  const readyForApproval = approvalChecks.length === 0

  async function saveReviewDate(documentId: string, nextReviewDate: string) {
    const response = await fetch(`/api/datasheets/${encodeURIComponent(documentId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ next_review_date: nextReviewDate }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error || 'Could not save the specification review date.')
    }
    setNotice('Specification review date saved.')
    await load(AbortSignal.timeout(30_000), { revisionId: review?.current?.id ?? null, specifications })
  }

  async function submit(intent: Intent) {
    if (!review || (!isIrishLocation && !parsedAnswers.success)) return
    const widthMm = width ? Number(width) : PPDS_LABEL_SIZE.defaultWidthMm
    const heightMm = height ? Number(height) : PPDS_LABEL_SIZE.defaultHeightMm
    // Estimate an unmeasured draft with the larger font. Approval uses the measured surface.
    const areaCm2 = area ? Number(area) : Math.max(80, widthMm * heightMm / 100)
    const layout = { foodName, ingredients: ingredients.trim(), precaution, areaCm2, widthMm, heightMm }
    const label = intent === 'approve' || intent === 'preview' ? {
      ...layout,
      specifications,
      recipeVerified: verified, templateSuitable: suitable,
    } : undefined
    const request = AbortSignal.timeout(30_000)
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId, expected: review.fingerprint, previous: review.current?.id || null,
          answers: parsedAnswers.success ? parsedAnswers.data : undefined, intent, label,
          layout: intent === 'preview-layout' ? layout : undefined,
          selections: intent === 'preview-layout' ? specifications.map(({ sourceId, variantId }) => ({ sourceId, variantId })) : undefined,
        }),
        signal: request,
      })
    } catch (error) {
      if (request.aborted) throw new Error('Saving the label review timed out. Retry, and contact support if it happens again.')
      throw error
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not save the classification or label.')
    if (intent === 'preview' || intent === 'preview-layout') {
      setPreview({ ...data, verified: intent === 'preview' })
    } else {
      await load()
      setNotice(intent === 'approve' ? 'Label approved. Download it and print at Actual size (100%).' : 'Classification saved.')
    }
  }

  async function printLabel() {
    if (!review?.current) return
    const request = new AbortController()
    const timeoutId = window.setTimeout(() => request.abort(), 30_000)
    try {
      const response = await fetch(`${endpoint}?item=${itemId}&print=${review.current.id}`, { cache: 'no-store', signal: request.signal })
      if (!response.ok) {
        const failure = await response.json()
        await load()
        throw new Error(failure.error || 'Could not fetch the approved label.')
      }
      const pdf = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = pdf
      link.download = `${isIrishLocation ? 'ingredient-label' : 'ppds'}-${review.current.id}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(pdf), 30_000)
    } catch (error) {
      if (request.signal.aborted) {
        throw new Error('Downloading the approved label timed out. Retry, and contact support if it happens again.')
      }
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  if (!review) return error ? (
    <div className="space-y-2">
      <p role="alert" className="text-sm text-red-800">{error}</p>
      <button type="button" className={actionClass} onClick={() => setLoadAttempt(attempt => attempt + 1)}>
        Retry loading label review
      </button>
    </div>
  ) : <p role="status" className="text-sm">Loading label review…</p>

  const canEditLabel = review.canApprove && (isIrishLocation || classification === 'ppds')
  const typeControl = review.canApprove && review.canCreateLooseLabel && (
    <label className="block max-w-sm space-y-1 text-sm font-semibold">
      Label type
      <select className={fieldClass} value={labelType} disabled={busy}
        onChange={event => setLabelType(event.target.value === 'allergens' ? 'allergens' : 'ingredients')}>
        <option value="ingredients">Full ingredient label</option>
        <option value="allergens">Allergen-only label for loose or made-to-order food</option>
      </select>
    </label>
  )
  if (typeControl && labelType === 'allergens') {
    return (
      <div className="space-y-4">
        {typeControl}
        <LooseFoodAllergenLabel key={review.fingerprint} endpoint={endpoint} itemId={itemId}
          fingerprint={review.fingerprint} foodName={review.foodName} sources={review.sources}
          onReload={() => load(AbortSignal.timeout(30_000), { revisionId: review.current?.id ?? null, specifications })} />
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {typeControl}
      {review.stale && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900" role="status">{review.stale}</p>}
      {review.current && <p className="text-sm">
        Saved review <strong>{PPDS_CLASSIFICATIONS[review.current.classification].title}</strong>
        {review.current.label && !review.stale && ` · Label approved ${publishedDate(review.current.date)}`}
      </p>}
      {!isIrishLocation && review.canApprove ? (
        <fieldset className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-2" disabled={busy}>
          <legend className="px-1 text-sm font-bold">How this location sells the item</legend>
          {classificationFields.map(({ key, label, options }) => (
            <label key={key} className="block space-y-1 text-sm font-medium">{label}
              <select className={fieldClass} value={answers[key] ?? ''} onChange={event => {
                setAnswers(previous => ({ ...previous, [key]: event.target.value }))
                clearPreview()
              }}>
                <option value="">Choose an answer</option>
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                <option value="uncertain">Unsure</option>
              </select>
            </label>
          ))}
          {classification && <div className="space-y-2 sm:col-span-2">
            <p className="text-sm"><strong>{PPDS_CLASSIFICATIONS[classification].title}.</strong> {PPDS_CLASSIFICATIONS[classification].detail}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={actionClass} disabled={busy || (!classificationChanged && review.current?.classification === classification)}
                onClick={() => void run(() => submit('classify'))}>Save classification</button>
              {classification === 'ppds' && <button type="button" className={actionClass} disabled={busy || review.current?.classification === 'review'}
                onClick={() => void run(() => submit('review'))}>Flag for separate review</button>}
            </div>
          </div>}
        </fieldset>
      ) : !review.canApprove ? <p className="text-sm">An owner or manager can approve and print labels.</p> : null}

      {canEditLabel && (
        <>
          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4" disabled={busy}>
            <legend className="px-1 text-sm font-bold">Recipe and supplier specifications</legend>
            <p className="text-sm">Select the supplier variants used in this batch. You can check the label size while sources are awaiting review. Approval requires completed assessments and a current specification for each selected source.</p>
            {review.sources.map(row => (
              <div key={row.id} role="group" aria-label={row.name} className="space-y-2 border-t border-gray-200 pt-2 text-sm">
                <p className="font-semibold">{row.name}</p>
                {row.variants.length ? row.variants.map(variant => {
                  const documentId = selections[row.id]?.[variant.id]
                  const selected = documentId !== undefined
                  return (
                    <div key={variant.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
                      <label className="flex items-center gap-2 font-medium">
                        <input type="checkbox" checked={selected}
                          onChange={event => selectSpecification(row.id, variant.id, event.target.checked ? '' : null)} />
                        {variant.name}{variant.assessed ? '' : ' · needs assessment'}
                      </label>
                      {selected && (
                        <>
                          {!variant.assessed && (
                            <p className="text-amber-900">
                              Complete this variant’s allergen assessment in <Link href={`/admin/ingredients/${encodeURIComponent(row.id)}/edit`} target="_blank" rel="noreferrer" className="font-semibold underline">Ingredients</Link> before approval.
                            </p>
                          )}
                          <SpecificationSelect
                            label={`Specification for ${variant.name}`}
                            documents={row.documents.filter(doc => variant.documentIds.includes(doc.id))}
                            value={documentId}
                            onChange={value => selectSpecification(row.id, variant.id, value)}
                            onSaveReviewDate={(id, date) => void run(() => saveReviewDate(id, date))}
                          />
                        </>
                      )}
                    </div>
                  )
                }) : (
                  <SpecificationSelect
                    label={`Specification for ${row.name}`}
                    documents={row.documents}
                    value={selections[row.id]?.[''] ?? ''}
                    onChange={value => selectSpecification(row.id, '', value)}
                    onSaveReviewDate={(id, date) => void run(() => saveReviewDate(id, date))}
                  />
                )}
              </div>
            ))}
          </fieldset>

          <fieldset className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-3" disabled={busy}>
            <legend className="px-1 text-sm font-bold">Label declaration and size</legend>
            <label className="sm:col-span-3 text-sm font-medium">Food name
              <input className={fieldClass} maxLength={160} value={foodName} onChange={event => { setFoodName(event.target.value); clearPreview() }} />
            </label>
            <label className="sm:col-span-3 text-sm font-medium">Full ingredients list
              <textarea className={fieldClass} rows={4} maxLength={2400} value={ingredients} onChange={event => {
                setIngredients(event.target.value.replace(/\s*\n\s*/g, ' '))
                setVerified(false)
                clearPreview()
              }} />
            </label>
            <p className="sm:col-span-3 text-sm">Order ingredients by descending weight at manufacture. Include compound ingredients where required and name each declarable allergen wherever it appears. Use specific cereal and nut names and identify derivatives, for example whey (milk).</p>
            {allergenSources.length > 0 && (
              <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-3">
                <p className="font-semibold">Allergens in the selected ingredients</p>
                <p>Use the supplier’s wording in the full ingredients list. The label maker automatically bolds the allergen names it finds in that text.</p>
                <ul className="list-disc pl-5">
                  {allergenSources.map(source => (
                    <li key={source.id}>
                      {source.name} contains <strong>{source.containedAllergens?.join(', ')}</strong>
                    </li>
                  ))}
                </ul>
                {missingAllergens.length > 0 && (
                  <p>Still missing from the ingredients list <strong>{missingAllergens.join(', ')}</strong></p>
                )}
              </div>
            )}
            <label className="sm:col-span-3 text-sm font-medium">Separate “May contain” statement (if applicable)
              <input className={fieldClass} maxLength={200} value={precaution} onChange={event => {
                setPrecaution(event.target.value)
                setVerified(false)
                clearPreview()
              }} />
            </label>
            <label className="text-sm font-medium">Largest package surface (cm²)
              <input className={fieldClass} type="number" min={10} max={10000} step="any" value={area}
                onChange={event => { setArea(event.target.value); clearPreview() }} />
            </label>
            <label className="text-sm font-medium">Label width (mm)
              <input className={fieldClass} type="number" min={PPDS_LABEL_SIZE.minimumWidthMm} max={200} step="any" value={width}
                placeholder={String(PPDS_LABEL_SIZE.defaultWidthMm)}
                onChange={event => { setWidth(event.target.value); clearPreview() }} />
            </label>
            <label className="text-sm font-medium">Label height (mm)
              <input className={fieldClass} type="number" min={PPDS_LABEL_SIZE.minimumHeightMm} max={280} step="any" value={height}
                placeholder={String(PPDS_LABEL_SIZE.defaultHeightMm)}
                onChange={event => { setHeight(event.target.value); clearPreview() }} />
            </label>
            <p className="sm:col-span-3 text-sm">Minimum label size {PPDS_LABEL_SIZE.minimumWidthMm} × {PPDS_LABEL_SIZE.minimumHeightMm} mm. Blank dimensions use {PPDS_LABEL_SIZE.defaultWidthMm} × {PPDS_LABEL_SIZE.defaultHeightMm} mm. Enter the actual largest package surface before approval. Flag packages under 10 cm² for separate review.</p>
            <label className="flex items-start gap-2 text-sm sm:col-span-3">
              <input type="checkbox" className="mt-1" checked={verified} onChange={event => { setVerified(event.target.checked); clearPreview() }} />
              I checked the complete declaration, ingredient order, compound ingredients and any precautionary statement against the verified recipe and selected specifications.
            </label>
            <label className="flex items-start gap-2 text-sm sm:col-span-3">
              <input type="checkbox" className="mt-1" checked={suitable} onChange={event => { setSuitable(event.target.checked); clearPreview() }} />
              The label fits the package surface and this product has no additional labelling requirements that need a separate review.
            </label>
          </fieldset>

          {!canPreview && <p className="text-sm">Enter the food name to preview.</p>}
        </>
      )}

      {review.canApprove && (
        <div className="flex flex-wrap items-center gap-2">
          {canEditLabel && <button type="button" className={actionClass} disabled={busy || !canPreview}
            onClick={() => void run(() => submit(readyForApproval ? 'preview' : 'preview-layout'))}>Check size and preview</button>}
          <button type="button" className={actionClass} disabled={busy}
            onClick={() => void run(() => load(undefined, { revisionId: review.current?.id ?? null, specifications }))}>Reload recipe and sources</button>
          {canEditLabel && preview?.verified && <button type="button" className={actionClass} disabled={busy || !readyForApproval}
            onClick={() => void run(() => submit('approve'))}>Approve this label</button>}
        </div>
      )}

      {preview && (
        <div className="max-w-md space-y-2 rounded-lg border-2 border-gray-300 bg-white p-4 text-sm print:hidden">
          <p className="text-xs font-bold uppercase text-amber-900">{preview.verified ? 'Preview only' : 'Draft layout only'}</p>
          {!preview.verified && approvalChecks.length > 0 && (
            <div>
              <p className="font-semibold">Before printing</p>
              <ul className="list-disc space-y-1 pl-5">
                {approvalChecks.map(check => check && <li key={check}>{check}</li>)}
              </ul>
            </div>
          )}
          <p className="font-bold">{preview.label.foodName}</p>
          <p><strong>Ingredients: </strong>{preview.label.ingredients.some(run => run.text)
            ? preview.label.ingredients.map(({ text, bold }, index) => bold ? <strong key={index}>{text}</strong> : text)
            : 'Full ingredients list pending'}</p>
          {preview.label.precaution && <p>{preview.label.precaution}</p>}
          <p className="text-xs">PDF size {preview.label.widthMm} × {preview.label.heightMm} mm. Calculated x-height {preview.xHeight.toFixed(2)} mm (minimum {preview.minimumXHeight} mm).</p>
        </div>
      )}

      {review.canApprove && review.current?.label && !review.stale && !classificationChanged && !specificationsChanged && (
        <button type="button" className={actionClass} disabled={busy} onClick={() => void run(printLabel)}>
          Download approved label at actual size
        </button>
      )}
      {review.canApprove && review.current?.label && !review.stale && specificationsChanged && (
        <p role="status" className="text-sm">Approve a new label for the selected specifications before downloading.</p>
      )}
      {error && <p className="text-sm font-medium text-red-800" role="alert">{error}</p>}
      {notice && <p className="text-sm font-medium text-teal-800" role="status">{notice}</p>}

      <details className="rounded-lg border border-gray-200 p-3" onToggle={event => {
        if (event.currentTarget.open) void loadHistory()
      }}>
        <summary className="cursor-pointer text-sm font-semibold">Recent revision history</summary>
        {historyLoading && <p role="status" className="mt-2 text-sm">Loading revision history…</p>}
        {historyError && <div className="mt-2 space-y-2">
          <p role="alert" className="text-sm text-red-800">{historyError}</p>
          <button type="button" className={actionClass} onClick={() => void loadHistory()}>Retry loading history</button>
        </div>}
        {historyLoaded && history.length === 0 && <p className="mt-2 text-sm">No revisions recorded yet.</p>}
        {historyLoaded && history.length > 0 && <ul className="mt-2 divide-y divide-gray-200 break-words text-sm">
          {history.map(entry => <li key={entry.id} className="py-2">
            <p>{publishedDate(entry.date)} · {entry.approved ? 'Label approved' : PPDS_CLASSIFICATIONS[entry.classification].title}</p>
            <p className="text-xs">Revision {entry.id}</p>
            {entry.documents.length > 0 && <p className="text-xs">Specifications {entry.documents.join(', ')}</p>}
          </li>)}
        </ul>}
      </details>
    </div>
  )
}

function SpecificationSelect({ label, documents, value, onChange, onSaveReviewDate }: {
  label: string
  documents: PpdsReviewSources[number]['documents']
  value: string
  onChange: (value: string) => void
  onSaveReviewDate: (id: string, date: string) => void
}) {
  const selectedDocument = documents.find(doc => doc.id === value)
  const canSetReviewDate = !!(selectedDocument?.canSetReviewDate && selectedDocument.href && !selectedDocument.current)
  return (
    <div className="space-y-2">
      <label className="block font-medium">{label}
        <select className={fieldClass} value={selectedDocument ? value : ''} onChange={event => onChange(event.target.value)}>
          <option value="">Choose a specification</option>
          {documents.map(doc => <option key={doc.id} value={doc.id}>
            {[doc.name, doc.supplier, doc.version, doc.current ? `review by ${doc.reviewDate}` : doc.reviewDate ? 'needs review' : 'no review date'].filter(Boolean).join(' · ')}
          </option>)}
        </select>
      </label>
      {selectedDocument?.href && (
        <a className="font-semibold underline" href={selectedDocument.href} target="_blank" rel="noreferrer">Open selected specification</a>
      )}
      {canSetReviewDate && selectedDocument && (
        <form key={selectedDocument.id} className="space-y-2 text-amber-900" onSubmit={event => {
          event.preventDefault()
          const date = new FormData(event.currentTarget).get('reviewDate')
          if (typeof date === 'string' && date) onSaveReviewDate(selectedDocument.id, date)
        }}>
          <p>{selectedDocument.reviewDate ? 'This specification needs review.' : 'This specification has no next review date.'} Open the file and confirm it is the current supplier specification before setting a date.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="font-medium">Next review date
              <input className={fieldClass} type="date" name="reviewDate" required
                min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} />
            </label>
            <button type="submit" className={actionClass}>Save review date</button>
          </div>
        </form>
      )}
      {!canSetReviewDate && (selectedDocument ? !selectedDocument.current : !documents.some(doc => doc.current)) && (
        <p className="text-amber-900">Choose a current specification or update it in <Link className="font-semibold underline" href="/admin/downloads/datasheets" target="_blank" rel="noreferrer">Datasheets</Link> before approval.</p>
      )}
    </div>
  )
}
