'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { ALLERGEN_LIST, GLUTEN_TYPES, TREE_NUT_TYPES } from '@/types/allergen'
import { blankReview, missingReviewDetails, reviewLevels, type QuickAddReview as Review } from '@/lib/quick-add-review'
import type { QuickAddDraft } from '@/lib/quick-add'

type Option = { id: string; name: string }
type History = { id: string; action: string; actor_name: string; note: string; created_at: string }
type Props = { draft: QuickAddDraft; suppliers: Option[]; sites: Option[]; disabled: boolean;
  onChanged: (draft: QuickAddDraft) => void; onActivity: (busy: boolean, dirty: boolean) => void }

export default function QuickAddReview({ draft, suppliers, sites, disabled, onChanged, onActivity }: Props) {
  const { t, language } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const [review, setReview] = useState<Review>(() => ({ ...blankReview(draft.supplier_id, draft.site_id), ...draft.review }))
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
  const request = useRef<{ signature: string; id: string } | null>(null)
  const dirty = JSON.stringify(review) !== baseline || !!note
  const base = `/api/quick-add-drafts/${draft.id}`
  useEffect(() => { onActivity(working, dirty) }, [working, dirty, onActivity])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setLoadFailed(false)
    void fetch(base, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (controller.signal.aborted) return
      setPermissions(data.permissions); setHistory(data.history)
      const values = { ...blankReview(data.draft.supplier_id, data.draft.site_id), ...data.draft.review }
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
      const known = ['forbidden', 'notFound', 'unauthorized', 'invalid', 'editConflict', 'pendingPhotos', 'returnNoteRequired', 'missingSupplier', 'missingEvidence', 'missingAllergens', 'missingLabel', 'missingScope', 'locationUnavailable']
      setError(reason instanceof Error && known.includes(reason.message) ? reason.message : 'reviewUnavailable')
    } finally { lock.current = false; setWorking(false) }
  }

  const missing = missingReviewDetails(review, draft.kind)
  const blocked = disabled || working || loading || loadFailed
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
    setReview(current => {
      const warnings = { ...current.allergen_warnings }
      if (value) warnings[key] = value as typeof reviewLevels[number]
      else delete warnings[key]
      if (key === 'cereals_gluten' || key === 'nuts') delete warnings[`${key}_levels`]
      return { ...current, allergen_warnings: warnings, evidence_checked: false }
    })
  }
  function setSubtype(group: string, subtype: string, value: string) {
    setReview(current => {
      const key = `${group}_levels`
      const previous = current.allergen_warnings[key]
      const levels = { ...(typeof previous === 'object' ? previous : {}) }
      if (value) levels[subtype] = value as typeof reviewLevels[number]
      else delete levels[subtype]
      const worst = Object.values(levels).reduce((a, b) => reviewLevels.indexOf(a) > reviewLevels.indexOf(b) ? a : b, 'none')
      return { ...current, evidence_checked: false, allergen_warnings: { ...current.allergen_warnings, [key]: levels,
        // Keep a non-none group until all subtypes have been explicitly assessed.
        [group]: worst === 'none' ? current.allergen_warnings[group] : worst } }
    })
  }

  return <section className="mt-5 space-y-4 border-t pt-4 dark:border-gray-700" aria-label={text('reviewTitle')}>
    <h3 className="font-semibold">{text('reviewTitle')} · {text(draft.status)}</h3>
    {draft.return_note && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{text('returnedNote')}: {draft.return_note}</p>}
    {loading && <p role="status">{text('loading')}</p>}
    {draft.status === 'draft' && <><p className="text-sm">{text('submitHelp')}</p>
      <Button type="button" disabled={blocked} onClick={() => void transition('submit')}>{text('submit')}</Button></>}
    {draft.status === 'ready_for_review' && permissions.isCreator && <Button type="button" variant="outline" disabled={blocked || dirty} onClick={() => void transition('withdraw')}>{text('withdraw')}</Button>}
    {draft.status === 'ready_for_review' && permissions.canReview && <>
      <p className="text-sm">{text('reviewHelp')}</p>
      <fieldset disabled={blocked} className="space-y-4">
        <legend className="sr-only">{text('reviewTitle')}</legend>
        <label className="block text-sm font-medium">{text('reviewSupplier')}
          <select aria-label={text('reviewSupplier')} className={control} value={review.supplier_id || ''} onChange={event => setReview({ ...review, supplier_id: event.target.value || null, evidence_checked: false })}>
            <option value="">{text('noSupplier')}</option>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        <label className="block text-sm font-medium">{text('description')}<textarea className={control} value={review.description} maxLength={2000} onChange={event => setReview({ ...review, description: event.target.value })} /></label>
        <label className="block text-sm font-medium">{text('category')}<input className={control} value={review.category} maxLength={200} onChange={event => setReview({ ...review, category: event.target.value })} /></label>
        <div className="space-y-3">
          <h4 className="font-semibold">{text('allergenReview')}</h4>
          {ALLERGEN_LIST.map(allergen => {
            const level = review.allergen_warnings[allergen.id]
            const group = allergen.id === 'cereals_gluten' ? GLUTEN_TYPES : allergen.id === 'nuts' ? TREE_NUT_TYPES : null
            const values = review.allergen_warnings[`${allergen.id}_levels`]
            return <div key={allergen.id}>
              {levelSelect(allergen.name, typeof level === 'string' ? level : '', value => setAllergen(allergen.id, value))}
              {group && level && level !== 'none' && <div className="ml-3 mt-2 space-y-2 border-l pl-3">
                {group.map(subtype => <div key={subtype.key}>{levelSelect(subtype.name, typeof values === 'object' ? values[subtype.key] || '' : '', value => setSubtype(allergen.id, subtype.key, value))}</div>)}
              </div>}
            </div>
          })}
        </div>
        <label className="block text-sm font-medium">{text('reviewMonths')}<input type="number" min={1} max={36} className={control} value={review.preferred_review_months} onChange={event => setReview({ ...review, preferred_review_months: Number(event.target.value) })} /></label>
        {draft.kind === 'packaged_product' && <>
          <label className="block text-sm font-medium">{text('ingredientDeclaration')}<textarea className={control} maxLength={10000} value={review.ingredient_declaration} onChange={event => setReview({ ...review, ingredient_declaration: event.target.value, label_checked: false })} /></label>
          <label className="block text-sm font-medium">{text('productScope')}<select aria-label={text('productScope')} className={control} value={review.scope} onChange={event => setReview({ ...review, scope: event.target.value as Review['scope'] })}>
            <option value="">{text('chooseScope')}</option><option value="global">{text('globalScope')}</option><option value="site">{text('siteScope')}</option>
          </select></label>
          {review.scope === 'site' && <label className="block text-sm font-medium">{text('productSite')}<select aria-label={text('productSite')} className={control} value={review.site_id || ''} onChange={event => setReview({ ...review, site_id: event.target.value || null })}>
            <option value="">{text('noLocation')}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select></label>}
          <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={review.label_checked} onChange={event => setReview({ ...review, label_checked: event.target.checked })} />{text('labelChecked')}</label>
        </>}
        <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={review.evidence_checked} onChange={event => setReview({ ...review, evidence_checked: event.target.checked })} />{text('evidenceChecked')}</label>
      </fieldset>
      <p className="text-sm">{text('noDietaryClaims')}</p>
      {!!missing.length && <ul className="list-disc space-y-1 pl-5 text-sm">{missing.map(key => <li key={key}>{text(key)}</li>)}</ul>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={blocked || !!note} onClick={() => void transition('review')}>{text('saveReview')}</Button>
        <Button type="button" disabled={blocked || dirty || !!missing.length} onClick={() => void transition('approve')}>{text('approve')}</Button>
      </div>
      <p className="text-sm">{text(draft.kind === 'ingredient' ? 'ingredientApprovalHelp' : 'productApprovalHelp')}</p>
      <label className="block text-sm font-medium">{text('returnNote')}<textarea className={control} disabled={blocked} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label>
      <Button type="button" variant="outline" disabled={blocked || !note.trim() || JSON.stringify(review) !== baseline} onClick={() => void transition('return')}>{text('returnDraft')}</Button>
    </>}
    {draft.status === 'approved' && <>
      <p className="text-sm">{text(draft.kind === 'ingredient' ? 'ingredientApproved' : 'productApproved')}</p>
      {(draft.ingredient_id || draft.menu_item_id) && <Link className="inline-flex min-h-11 items-center text-teal-700 underline" href={draft.ingredient_id ? `/admin/ingredients/${draft.ingredient_id}` : `/admin/menu-builder/${draft.menu_item_id}/edit`}>{text('openApproved')}</Link>}
    </>}
    {error && <div role="alert" className="text-sm text-red-700 dark:text-red-300"><p>{text(error)}</p>
      {loadFailed && <Button type="button" variant="outline" disabled={working} onClick={() => setAttempt(value => value + 1)}>{text('retry')}</Button>}
      {error === 'editConflict' && <p>{text('reopenReview')}</p>}
    </div>}
    {!!history.length && <details><summary className="min-h-11 cursor-pointer py-3">{text('history')}</summary><ol className="space-y-2 text-sm">
      {history.map(event => <li key={event.id}><strong>{text(`action_${event.action}`)}</strong> · {event.actor_name} · {new Date(event.created_at).toLocaleString(language)}{event.note && <p className="whitespace-pre-wrap">{event.note}</p>}</li>)}
    </ol></details>}
  </section>
}
