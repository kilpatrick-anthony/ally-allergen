'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import QuickAddAssessment from '@/components/admin/QuickAddAssessment'
import QuickAddIngredients, { type QuickAddIngredientOption } from '@/components/admin/QuickAddIngredients'
import { blankReview, missingReviewDetails, type QuickAddReview as Review } from '@/lib/quick-add-review'
import type { QuickAddDraft } from '@/lib/quick-add'

type Option = { id: string; name: string }
type History = { id: string; action: string; actor_name: string; note: string; created_at: string }
type Props = { draft: QuickAddDraft; suppliers: Option[]; sites: Option[]; ingredients: QuickAddIngredientOption[]; categories: string[]; disabled: boolean;
  onChanged: (draft: QuickAddDraft) => void; onActivity: (busy: boolean, dirty: boolean) => void }

export default function QuickAddReview({ draft, suppliers, sites, ingredients, categories, disabled, onChanged, onActivity }: Props) {
  const { t, language } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const initialReview = () => ({ ...blankReview(draft.supplier_id, draft.site_id), category: draft.category || '', ingredient_ids: draft.ingredient_ids || [], ...draft.review })
  const [review, setReview] = useState<Review>(initialReview)
  const [baseline, setBaseline] = useState(JSON.stringify(review))
  const [permissions, setPermissions] = useState({ canReview: false, isCreator: false })
  const [history, setHistory] = useState<History[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const lock = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const issues = useRef<HTMLDivElement>(null)
  const previousStatus = useRef(draft.status)
  const request = useRef<{ signature: string; id: string } | null>(null)
  const reviewDirty = JSON.stringify(review) !== baseline
  const dirty = reviewDirty || !!note
  const base = `/api/quick-add-drafts/${draft.id}`
  useEffect(() => {
    if (previousStatus.current !== draft.status) {
      heading.current?.focus()
      previousStatus.current = draft.status
    }
  }, [draft.status])
  useEffect(() => { onActivity(working, dirty) }, [working, dirty, onActivity])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadFailed(false)
    void fetch(base, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (controller.signal.aborted) return
      setPermissions(data.permissions); setHistory(data.history)
      const values = { ...blankReview(data.draft.supplier_id, data.draft.site_id), category: data.draft.category || '', ingredient_ids: data.draft.ingredient_ids || [], ...data.draft.review }
      setReview(values); setBaseline(JSON.stringify(values)); setError('')
    }).catch(() => { if (!controller.signal.aborted) { setError('reviewUnavailable'); setLoadFailed(true) } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [base, draft.version, attempt])

  async function transition(action: string) {
    if (lock.current || disabled) return
    lock.current = true; setWorking(true); setError('')
    try {
      const body = { action, version: draft.version, ...(action === 'review' ? { review } : {}), ...(action === 'return' ? { note } : {}) }
      const signature = JSON.stringify(body)
      if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() }
      const response = await fetch(`${base}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, request_id: request.current.id }), signal: AbortSignal.timeout(20000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      request.current = null; setNote(''); onChanged(data.draft)
    } catch (reason) {
      const known = ['forbidden', 'notFound', 'unauthorized', 'invalid', 'editConflict', 'pendingPhotos', 'returnNoteRequired', 'missingSupplier', 'missingEvidence', 'missingAllergens', 'missingLabel', 'missingDietaryCheck', 'missingIngredients', 'missingDescription', 'missingScope', 'locationUnavailable']
      setError(reason instanceof Error && known.includes(reason.message) ? reason.message : 'reviewUnavailable')
    } finally { lock.current = false; setWorking(false) }
  }

  function attemptApproval() {
    if (reviewDirty) { setError('saveReviewBeforeApproval'); issues.current?.focus(); return }
    if (note) { setError('clearReturnNoteBeforeApproval'); issues.current?.focus(); return }
    if (missing.length) { setError('approvalIncomplete'); issues.current?.focus(); return }
    void transition('approve')
  }

  const missing = missingReviewDetails(review, draft.kind)
  const blocked = disabled || working || loading || loadFailed
  const control = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white'

  return <section className="mt-5 space-y-4 border-t pt-4 dark:border-gray-700" aria-label={text('reviewTitle')}>
    <h3 ref={heading} tabIndex={-1} className="font-semibold">{text('reviewTitle')} · {text(draft.status)}</h3>
    {draft.return_note && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{text('returnedNote')}: {draft.return_note}</p>}
    {loading && <p role="status">{text('loading')}</p>}
    {draft.status === 'draft' && <><p className="text-sm">{text('submitHelp')}</p>
      <Button variant="teal" type="button" disabled={blocked} onClick={() => void transition('submit')}>{text('submit')}</Button></>}
    {draft.status === 'ready_for_review' && permissions.isCreator && <Button type="button" variant="tealOutline" disabled={blocked || dirty} onClick={() => void transition('withdraw')}>{text('withdraw')}</Button>}
    {draft.status === 'ready_for_review' && permissions.canReview && <>
      <p className="text-sm">{text(draft.kind === 'prepared_item' ? 'preparedReviewHelp' : 'reviewHelp')}</p>
      <div ref={issues} tabIndex={-1} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        <p className="font-semibold">{text('approvalChecklist')}</p>
        {reviewDirty && <p className="mt-1">{text('saveReviewBeforeApproval')}</p>}
        {!!note && <p className="mt-1">{text('clearReturnNoteBeforeApproval')}</p>}
        {!!missing.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{missing.map(key => <li key={key}>{text(key)}</li>)}</ul>
          : !reviewDirty && !note && <p className="mt-1">{text('readyToApprove')}</p>}
      </div>
      <fieldset disabled={blocked} className="space-y-4">
        <legend className="sr-only">{text('reviewTitle')}</legend>
        <label className="block text-sm font-medium">{text('location')}
          <select aria-label={text('location')} className={control} value={review.delivery_site_id || ''} onChange={event => setReview({ ...review, delivery_site_id: event.target.value || null })}>
            <option value="">{text('noLocation')}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select></label>
        {draft.kind !== 'prepared_item' && <label className="block text-sm font-medium">{text('reviewSupplier')}
          <select aria-label={text('reviewSupplier')} className={control} value={review.supplier_id || ''} onChange={event => setReview({ ...review, supplier_id: event.target.value || null, dietary_checked: false, evidence_checked: false })}>
            <option value="">{text('noSupplier')}</option>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>}
        <label className="block text-sm font-medium">{text('description')}<textarea className={control} value={review.description} maxLength={2000} onChange={event => setReview({ ...review, description: event.target.value })} /></label>
        <label className="block text-sm font-medium">{text('category')}<input aria-label={text('category')} aria-describedby={`review-${draft.id}-category-note`} list={`review-${draft.id}-categories`} className={control} value={review.category} maxLength={200} onChange={event => setReview({ ...review, category: event.target.value })} />
          <datalist id={`review-${draft.id}-categories`}>{categories.map(category => <option key={category} value={category} />)}</datalist>
          <span id={`review-${draft.id}-category-note`} className="mt-1 block text-xs text-gray-500 dark:text-gray-300">{text('categoryHelp')}</span>
        </label>
        {draft.kind === 'prepared_item' ? <>
          <QuickAddIngredients ingredients={ingredients} selected={review.ingredient_ids} onChange={ingredient_ids => setReview({ ...review, ingredient_ids, ingredients_checked: false })} />
          <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={review.ingredients_checked} onChange={event => setReview({ ...review, ingredients_checked: event.target.checked })} />{text('ingredientsChecked')}</label>
        </> : <QuickAddAssessment warnings={review.allergen_warnings} tags={review.dietary_tags}
          onWarnings={allergen_warnings => setReview(current => ({ ...current, allergen_warnings, dietary_checked: false, evidence_checked: false }))}
          onTags={dietary_tags => setReview(current => ({ ...current, dietary_tags: dietary_tags as Review['dietary_tags'], dietary_checked: false, evidence_checked: false }))} />}
        {draft.kind !== 'prepared_item' && !!review.dietary_tags.length && <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={review.dietary_checked} onChange={event => setReview({ ...review, dietary_checked: event.target.checked })} />{text('dietaryChecked')}</label>}
        <label className="block text-sm font-medium">{text('reviewMonths')}<input type="number" min={1} max={36} className={control} value={review.preferred_review_months} onChange={event => setReview({ ...review, preferred_review_months: Number(event.target.value) })} /></label>
        {(draft.kind === 'packaged_product' || draft.kind === 'prepared_item') && <>
          {draft.kind === 'packaged_product' && <label className="block text-sm font-medium">{text('ingredientDeclaration')}<textarea className={control} maxLength={10000} value={review.ingredient_declaration} onChange={event => setReview({ ...review, ingredient_declaration: event.target.value, label_checked: false })} /></label>}
          <label className="block text-sm font-medium">{text('productScope')}<select aria-label={text('productScope')} className={control} value={review.scope} onChange={event => setReview({ ...review, scope: event.target.value as Review['scope'] })}>
            <option value="">{text('chooseScope')}</option><option value="global">{text('globalScope')}</option><option value="site">{text('siteScope')}</option>
          </select></label>
          {review.scope === 'site' && <label className="block text-sm font-medium">{text('productSite')}<select aria-label={text('productSite')} className={control} value={review.site_id || ''} onChange={event => setReview({ ...review, site_id: event.target.value || null })}>
            <option value="">{text('noLocation')}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select></label>}
          {draft.kind === 'packaged_product' && <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={review.label_checked} onChange={event => setReview({ ...review, label_checked: event.target.checked })} />{text('labelChecked')}</label>}
        </>}
        {draft.kind !== 'prepared_item' && <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={review.evidence_checked} onChange={event => setReview({ ...review, evidence_checked: event.target.checked })} />{text('evidenceChecked')}</label>}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button variant="teal" type="button" disabled={blocked || !!note} onClick={() => void transition('review')}>{text('saveReview')}</Button>
        <Button variant="teal" type="button" disabled={blocked} onClick={attemptApproval}>{text('approve')}</Button>
      </div>
      <p className="text-sm">{text(draft.kind === 'ingredient' ? 'ingredientApprovalHelp' : draft.kind === 'prepared_item' ? 'preparedApprovalHelp' : 'productApprovalHelp')}</p>
      <label className="block text-sm font-medium">{text('returnNote')}<textarea className={control} disabled={blocked} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label>
      <Button type="button" variant="tealOutline" disabled={blocked || !note.trim() || JSON.stringify(review) !== baseline} onClick={() => void transition('return')}>{text('returnDraft')}</Button>
    </>}
    {draft.status === 'approved' && <>
      <p className="text-sm">{text(draft.kind === 'ingredient' ? 'ingredientApproved' : draft.kind === 'prepared_item' ? 'preparedApproved' : 'productApproved')}</p>
      {(draft.ingredient_id || draft.menu_item_id) && <Link className="inline-flex min-h-11 items-center text-teal-700 underline dark:text-teal-300" href={draft.ingredient_id ? `/admin/ingredients/${draft.ingredient_id}` : `/admin/menu-builder/${draft.menu_item_id}/edit`}>{text('openApproved')}</Link>}
    </>}
    {error && <div role="alert" className="text-sm text-red-700 dark:text-red-300"><p>{text(error)}</p>
      {loadFailed && <Button type="button" variant="tealOutline" disabled={working} onClick={() => setAttempt(value => value + 1)}>{text('retry')}</Button>}
      {error === 'editConflict' && <p>{text('reopenReview')}</p>}
    </div>}
    {!!history.length && <details><summary className="min-h-11 cursor-pointer py-3">{text('history')}</summary><ol className="space-y-2 text-sm">
      {history.map(event => <li key={event.id}><strong>{text(`action_${event.action}`)}</strong> · {event.actor_name} · {new Date(event.created_at).toLocaleString(language)}{event.note && <p className="whitespace-pre-wrap">{event.note}</p>}</li>)}
    </ol></details>}
  </section>
}
