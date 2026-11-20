'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Jurisdiction } from '@/lib/location-jurisdiction'
import { publishedDate } from '@/lib/location-jurisdiction'
import { classifyPpds, PPDS_CLASSIFICATIONS, ppdsAnswers, type PpdsAnswers, type PpdsClassification } from '@/lib/ppds'
import type { PpdsPrintLabel } from '@/lib/pdf/ppds-label'
import type { PpdsReviewSources, StoredPpdsLabel } from '@/lib/server/ppds-labels'

type HistoryEntry = { id: string; date: string; actor: string; documents: string[]; approved: boolean; classification: PpdsClassification }
type Review = {
  fingerprint: string
  foodName: string
  ingredientDeclaration: string | null
  sources: PpdsReviewSources
  stale: string | null
  current: { id: string; answers: Partial<PpdsAnswers>; classification: PpdsClassification; label: StoredPpdsLabel | null; date: string } | null
  history: HistoryEntry[]
}
type Preview = { label: PpdsPrintLabel; xHeight: number; minimumXHeight: number }
type Intent = 'classify' | 'review' | 'preview' | 'approve'

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

export function PpdsLabelEditor({ siteSlug, jurisdiction, items, canApprove }: {
  siteSlug: string; jurisdiction: Jurisdiction; items: { id: string; name: string }[]; canApprove: boolean
}) {
  const isIrishLocation = jurisdiction === 'IE'
  const [itemId, setItemId] = useState('')
  const [statuses, setStatuses] = useState<Record<string, PpdsClassification | 'approved'>>({})
  const [statusError, setStatusError] = useState('')
  const overviewPath = `/api/sites/${encodeURIComponent(siteSlug)}/ppds`
  const refreshStatuses = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(overviewPath, { cache: 'no-store', signal })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      if (!signal?.aborted) {
        setStatuses(Object.fromEntries(payload.items.map((item: { itemId: string; state: string }) => [item.itemId, item.state])))
        setStatusError('')
      }
    } catch {
      if (!signal?.aborted) setStatusError('Could not refresh label statuses.')
    }
  }, [overviewPath])
  useEffect(() => {
    const controller = new AbortController()
    void refreshStatuses(controller.signal)
    return () => controller.abort()
  }, [refreshStatuses])

  const reviewCount = items.filter(item => statuses[item.id] === 'review').length
  const href = jurisdiction === 'SCT'
    ? 'https://www.foodstandards.gov.scot/business-guidance/running-a-food-business/packaging-and-labelling/prepacked-for-direct-sale'
    : 'https://www.gov.uk/government/publications/food-allergen-labelling-and-information-requirements-technical-guidance'

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-bold">{isIrishLocation ? 'Optional ingredient labels' : 'Ingredient and PPDS labels'}</h3>
      {isIrishLocation ? (
        <p className="text-sm">Create an optional, printable ingredient declaration from verified menu and supplier data. This is not a complete food package label or a check of all local requirements. Confirm the full label separately before use.</p>
      ) : (
        <p className="text-sm">Classify an item for this location. A sandwich sealed in advance and sold from the same café is an example of PPDS. <a href={href} className="font-semibold underline">PPDS guidance</a></p>
      )}
      {reviewCount > 0 && <p className="text-sm font-semibold text-amber-900">{reviewCount} {reviewCount === 1 ? 'item needs' : 'items need'} label review.</p>}
      {statusError && <p role="status" className="text-sm text-amber-900">{statusError}</p>}
      <label className="block space-y-1 text-sm font-semibold">Menu item
        <select className={fieldClass} value={itemId} onChange={event => setItemId(event.target.value)}>
          <option value="">Choose an active menu item</option>
          {items.map(item => <option key={item.id} value={item.id}>{item.name}
            {statuses[item.id] === 'review' ? ' · Needs review' : statuses[item.id] === 'approved' ? ' · Label approved' : ''}
          </option>)}
        </select>
      </label>
      {items.some(item => item.id === itemId) && <LabelReview key={itemId} siteSlug={siteSlug} itemId={itemId}
        isIrishLocation={isIrishLocation} canApprove={canApprove} onUpdated={refreshStatuses} />}
    </section>
  )
}

function LabelReview({ siteSlug, itemId, isIrishLocation, canApprove, onUpdated }: {
  siteSlug: string; itemId: string; isIrishLocation: boolean; canApprove: boolean; onUpdated: () => Promise<void>
}) {
  const endpoint = `/api/sites/${encodeURIComponent(siteSlug)}/ppds`
  const [review, setReview] = useState<Review | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [answers, setAnswers] = useState<Partial<PpdsAnswers>>({})
  const [foodName, setFoodName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [precaution, setPrecaution] = useState('')
  const [area, setArea] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [documents, setDocuments] = useState<Record<string, string>>({})
  const [variants, setVariants] = useState<Record<string, string>>({})
  const [verified, setVerified] = useState(false)
  const [suitable, setSuitable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${endpoint}?item=${itemId}`, { cache: 'no-store', signal })
    const data = await response.json() as Review & { error?: string }
    if (!response.ok) throw new Error(data.error || 'Could not load the label review.')
    if (signal?.aborted) return
    setReview(data)
    setAnswers(data.current?.answers || {})
    const label = data.current?.label?.input
    setFoodName(label?.foodName ?? data.foodName)
    setIngredients(label?.ingredients ?? data.ingredientDeclaration ?? '')
    setPrecaution(label?.precaution ?? '')
    setArea(label ? String(label.areaCm2) : '')
    setWidth(label ? String(label.widthMm) : '')
    setHeight(label ? String(label.heightMm) : '')
    setDocuments(Object.fromEntries((label?.specifications || []).map(entry => [entry.sourceId, entry.documentId])))
    setVariants(Object.fromEntries((label?.specifications || []).filter(entry => entry.variantId).map(entry => [entry.sourceId, entry.variantId as string])))
    setPreview(null)
    setVerified(false)
    setSuitable(false)
  }, [endpoint, itemId])

  useEffect(() => {
    const request = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      request.abort()
    }, 30_000)
    setReview(null)
    setError('')
    void load(request.signal).catch(err => {
      if (!request.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Could not load the label review.')
      }
    }).finally(() => {
      window.clearTimeout(timeoutId)
      if (timedOut) setError('Loading the label review timed out. Check your connection and retry.')
    })
    return () => {
      window.clearTimeout(timeoutId)
      request.abort()
    }
  }, [load, loadAttempt])

  function clearPreview() {
    setPreview(null)
    setError('')
    setNotice('')
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

  const parsedAnswers = ppdsAnswers.safeParse(answers)
  const classification = isIrishLocation ? 'ingredient_label' : parsedAnswers.success ? classifyPpds(parsedAnswers.data) : null
  const classificationChanged = Boolean(!isIrishLocation && review?.current && classification &&
    classificationFields.some(({ key }) => answers[key] !== review.current?.answers[key]))
  const specificationsSelected = review?.sources.length && review.sources.every(row =>
    row.documents.some(doc => doc.id === documents[row.id] && doc.current) &&
    (!row.variants.length || row.variants.some(variant => variant.id === variants[row.id] && variant.assessed)))
  const canPreview = Boolean(foodName.trim() && ingredients.trim() && area && width && height && verified && suitable && specificationsSelected)

  async function submit(intent: Intent) {
    if (!review || (!isIrishLocation && !parsedAnswers.success)) return
    const label = intent === 'approve' || intent === 'preview' ? {
      foodName, ingredients, precaution, areaCm2: Number(area), widthMm: Number(width), heightMm: Number(height),
      specifications: review.sources.map(source => ({
        sourceId: source.id, documentId: documents[source.id], variantId: variants[source.id] || null,
      })),
      recipeVerified: verified, templateSuitable: suitable,
    } : undefined
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId, expected: review.fingerprint, previous: review.current?.id || null,
        answers: parsedAnswers.success ? parsedAnswers.data : undefined, intent, label,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not save the classification or label.')
    if (intent === 'preview') {
      setPreview(data)
    } else {
      await Promise.all([load(), onUpdated()])
      setNotice(intent === 'approve' ? 'Label approved. Download it and print at Actual size (100%).' : 'Classification saved.')
    }
  }

  async function printLabel() {
    if (!review?.current) return
    const response = await fetch(`${endpoint}?item=${itemId}&print=${review.current.id}`, { cache: 'no-store' })
    if (!response.ok) {
      const failure = await response.json()
      await Promise.all([load(), onUpdated()])
      throw new Error(failure.error || 'Could not fetch the approved label.')
    }
    const pdf = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = pdf
    link.download = `${isIrishLocation ? 'ingredient-label' : 'ppds'}-${review.current.id}.pdf`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(pdf), 30_000)
  }

  if (!review) return error ? (
    <div className="space-y-2">
      <p role="alert" className="text-sm text-red-800">{error}</p>
      <button type="button" className={actionClass} onClick={() => setLoadAttempt(attempt => attempt + 1)}>
        Retry loading label review
      </button>
    </div>
  ) : <p role="status" className="text-sm">Loading label review…</p>

  return (
    <div className="space-y-4">
      {review.stale && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900" role="status">{review.stale}</p>}
      {review.current && <p className="text-sm">
        Saved review <strong>{PPDS_CLASSIFICATIONS[review.current.classification].title}</strong>
        {review.current.label && !review.stale && ` · Label approved ${publishedDate(review.current.date)}`}
      </p>}
      {!isIrishLocation && canApprove ? (
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
      ) : !canApprove ? <p className="text-sm">An owner or manager can approve and print labels.</p> : null}

      {canApprove && (isIrishLocation || classification === 'ppds') && (
        <>
          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4" disabled={busy}>
            <legend className="px-1 text-sm font-bold">Recipe and supplier specifications</legend>
            <p className="text-sm">Select a current specification for every recipe ingredient or for the complete product. Open and check the documents, including the exact supplier variant used.</p>
            {review.sources.map(row => (
              <div key={row.id} className="space-y-2 border-t border-gray-200 pt-2 text-sm">
                <p className="font-semibold">{row.name}</p>
                {row.variants.length > 0 && <label className="block font-medium">Supplier variant
                  <select className={fieldClass} value={variants[row.id] || ''} onChange={event => {
                    setVariants(previous => ({ ...previous, [row.id]: event.target.value }))
                    clearPreview()
                    setVerified(false)
                  }}>
                    <option value="">Choose an assessed variant</option>
                    {row.variants.map(variant => <option key={variant.id} value={variant.id} disabled={!variant.assessed}>
                      {variant.name}{variant.assessed ? '' : ' · needs assessment'}
                    </option>)}
                  </select>
                </label>}
                <label className="block font-medium">Specification
                  <select className={fieldClass} value={documents[row.id] || ''} onChange={event => {
                    setDocuments(previous => ({ ...previous, [row.id]: event.target.value }))
                    clearPreview()
                    setVerified(false)
                  }}>
                    <option value="">Choose a current document</option>
                    {row.documents.map(doc => <option key={doc.id} value={doc.id} disabled={!doc.current}>
                      {[doc.name, doc.supplier, doc.version, doc.current ? `review by ${doc.reviewDate}` : 'needs review'].filter(Boolean).join(' · ')}
                    </option>)}
                  </select>
                </label>
                {row.documents.find(doc => doc.id === documents[row.id])?.href && (
                  <a className="font-semibold underline" href={row.documents.find(doc => doc.id === documents[row.id])?.href || undefined}
                    target="_blank" rel="noreferrer">Open selected specification</a>
                )}
                {!row.documents.some(doc => doc.current) && <p className="text-amber-900">Add or update a specification with a review date in <Link className="font-semibold underline" href="/admin/downloads/datasheets">Datasheets</Link>.</p>}
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
              <input className={fieldClass} type="number" min={20} max={200} step="any" value={width}
                onChange={event => { setWidth(event.target.value); clearPreview() }} />
            </label>
            <label className="text-sm font-medium">Label height (mm)
              <input className={fieldClass} type="number" min={15} max={280} step="any" value={height}
                onChange={event => { setHeight(event.target.value); clearPreview() }} />
            </label>
            <p className="sm:col-span-3 text-sm">Flag packages under 10 cm² or products that need additional label information for separate review.</p>
            <label className="flex items-start gap-2 text-sm sm:col-span-3">
              <input type="checkbox" className="mt-1" checked={verified} onChange={event => { setVerified(event.target.checked); clearPreview() }} />
              I checked the complete declaration, ingredient order, compound ingredients and any precautionary statement against the verified recipe and selected specifications.
            </label>
            <label className="flex items-start gap-2 text-sm sm:col-span-3">
              <input type="checkbox" className="mt-1" checked={suitable} onChange={event => { setSuitable(event.target.checked); clearPreview() }} />
              The label fits the package surface and this product has no additional labelling requirements that need a separate review.
            </label>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={actionClass} disabled={busy || !canPreview} onClick={() => void run(() => submit('preview'))}>Check size and preview</button>
            {preview && <button type="button" className={actionClass} disabled={busy} onClick={() => void run(() => submit('approve'))}>Approve this label</button>}
          </div>
        </>
      )}

      {preview && (
        <div className="max-w-md space-y-2 rounded-lg border-2 border-gray-300 bg-white p-4 text-sm">
          <p className="text-xs font-bold uppercase text-amber-900">Preview only</p>
          <p className="font-bold">{preview.label.foodName}</p>
          <p><strong>Ingredients: </strong>{preview.label.ingredients.map(({ text, bold }, index) => bold ? <strong key={index}>{text}</strong> : text)}</p>
          {preview.label.precaution && <p>{preview.label.precaution}</p>}
          <p className="text-xs">PDF size {preview.label.widthMm} × {preview.label.heightMm} mm. Calculated x-height {preview.xHeight.toFixed(2)} mm (minimum {preview.minimumXHeight} mm).</p>
        </div>
      )}

      {canApprove && review.current?.label && !review.stale && !classificationChanged && (
        <button type="button" className={actionClass} disabled={busy} onClick={() => void run(printLabel)}>
          Download approved label at actual size
        </button>
      )}
      {canApprove && <button type="button" className={`${actionClass} ml-2`} disabled={busy} onClick={() => void run(async () => { await Promise.all([load(), onUpdated()]) })}>Reload recipe and sources</button>}
      {error && <p className="text-sm font-medium text-red-800" role="alert">{error}</p>}
      {notice && <p className="text-sm font-medium text-teal-800" role="status">{notice}</p>}

      {review.history.length > 0 && <details className="rounded-lg border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Recent revision history</summary>
        <ul className="mt-2 divide-y divide-gray-200 break-words text-sm">
          {review.history.map(entry => <li key={entry.id} className="py-2">
            <p>{publishedDate(entry.date)} · {entry.approved ? 'Label approved' : PPDS_CLASSIFICATIONS[entry.classification].title}</p>
            <p className="text-xs">Revision {entry.id}</p>
            {entry.documents.length > 0 && <p className="text-xs">Specifications {entry.documents.join(', ')}</p>}
          </li>)}
        </ul>
      </details>}
    </div>
  )
}
