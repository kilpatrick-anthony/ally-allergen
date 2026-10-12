'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import QuickAddAssessment from '@/components/admin/QuickAddAssessment'
import QuickAddPhotos, { type LabelSuggestions } from '@/components/admin/QuickAddPhotos'
import QuickAddReview from '@/components/admin/QuickAddReview'
import QuickAddIngredients, { type QuickAddIngredientOption } from '@/components/admin/QuickAddIngredients'
import QuickAddBarcode from '@/components/admin/QuickAddBarcode'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddDraft, QuickAddFields, QuickAddKind } from '@/lib/quick-add'
import { DEFAULT_INGREDIENT_CATEGORIES, DEFAULT_MENU_CATEGORIES, mergeCategories } from '@/lib/item-categories'

type Option = { id: string; name: string }
type Props = {
  onClose: () => void
  draftId?: string
  initialKind?: QuickAddKind
  siteId?: string | null
  onSaved?: () => void
  returnFocusRef?: RefObject<HTMLElement | null>
}

const blank = (kind: QuickAddKind, siteId?: string | null): QuickAddFields => ({
  kind, name: '', category: '', ingredient_ids: [], site_id: siteId || null, supplier_id: null, supplier_name: '', notes: '', allergen_warnings: {}, dietary_tags: [],
})
const fieldsOf = (draft: QuickAddDraft): QuickAddFields => ({
  kind: draft.kind, name: draft.name, category: draft.category || '', ingredient_ids: draft.ingredient_ids || [], site_id: draft.site_id, supplier_id: draft.supplier_id,
  supplier_name: draft.supplier_name, notes: draft.notes,
  allergen_warnings: draft.allergen_warnings || {}, dietary_tags: draft.dietary_tags || [],
})

export default function QuickAddDialog({ onClose, draftId, initialKind = 'ingredient', siteId, onSaved, returnFocusRef }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const router = useRouter()
  const formId = useId()
  const [fields, setFields] = useState<QuickAddFields>(() => blank(initialKind, siteId))
  const [baseline, setBaseline] = useState(() => JSON.stringify(blank(initialKind, siteId)))
  const [record, setRecord] = useState<QuickAddDraft | null>(null)
  const [sites, setSites] = useState<Option[]>([])
  const [suppliers, setSuppliers] = useState<Option[]>([])
  const [ingredients, setIngredients] = useState<QuickAddIngredientOption[]>([])
  const [ingredientCategories, setIngredientCategories] = useState<string[]>([...DEFAULT_INGREDIENT_CATEGORIES])
  const [productCategories, setProductCategories] = useState<string[]>([...DEFAULT_MENU_CATEGORIES])
  const [manualSupplier, setManualSupplier] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [unsavedPhotos, setUnsavedPhotos] = useState(false)
  const photoActivity = useCallback((working: boolean, unsaved: boolean) => {
    setPhotoBusy(working); setUnsavedPhotos(unsaved)
  }, [])
  const applySuggestions = useCallback((suggestions: LabelSuggestions) => {
    setFields(current => {
      const additions = [suggestions.description, ...suggestions.notes].filter(Boolean).join('\n')
      return { ...current, name: suggestions.name || current.name,
        supplier_id: suggestions.supplier_name ? null : current.supplier_id,
        supplier_name: suggestions.supplier_name || current.supplier_name,
        notes: additions ? [current.notes, additions].filter(Boolean).join('\n').slice(0, 2000) : current.notes,
        allergen_warnings: { ...current.allergen_warnings, ...suggestions.allergen_warnings },
        dietary_tags: [...new Set([...current.dietary_tags, ...suggestions.dietary_tags])],
      }
    })
    if (suggestions.supplier_name) setManualSupplier(true)
  }, [])
  const applyBarcodeSuggestions = useCallback((suggestions: LabelSuggestions & { category: string; barcode: string }) => {
    applySuggestions(suggestions)
    setFields(current => ({ ...current, category: suggestions.category || current.category,
      notes: [current.notes, `Barcode: ${suggestions.barcode} (Open Food Facts — verify against current label)`].filter(Boolean).join('\n').slice(0, 2000),
    }))
  }, [applySuggestions])
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewDirty, setReviewDirty] = useState(false)
  const reviewActivity = useCallback((working: boolean, changed: boolean) => {
    setReviewBusy(working); setReviewDirty(changed)
  }, [])
  const busy = useRef(false)
  const requestId = useRef<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const savedMessage = useRef<HTMLParagraphElement>(null)
  const focusName = useRef(false)
  const textDirty = JSON.stringify(fields) !== baseline
  const dirty = textDirty || unsavedPhotos || reviewDirty

  useEffect(() => {
    if (success) savedMessage.current?.focus()
    else if (focusName.current) {
      nameInput.current?.focus()
      focusName.current = false
    }
  }, [success])

  useEffect(() => {
    const controller = new AbortController()
    async function read(url: string) {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'unavailable')
      return data
    }
    setLoading(true)
    setLoadError('')
    void Promise.all([
      read('/api/sites'), read('/api/suppliers'), read('/api/ingredients/categories'), read('/api/menu-items/categories'), read('/api/ingredients?options_only=true'),
      draftId ? read(`/api/quick-add-drafts/${draftId}`) : Promise.resolve(null),
    ]).then(([siteData, supplierData, ingredientCategoryData, productCategoryData, ingredientData, draftData]) => {
      if (controller.signal.aborted) return
      setSites(siteData.sites || [])
      setSuppliers(supplierData.suppliers || [])
      setIngredients((ingredientData.ingredients || []).map((item: QuickAddIngredientOption) => ({ id: item.id, name: item.name, category: item.category })))
      setIngredientCategories(mergeCategories(DEFAULT_INGREDIENT_CATEGORIES, ingredientCategoryData.categories))
      setProductCategories(mergeCategories(DEFAULT_MENU_CATEGORIES, productCategoryData.categories))
      if (draftData) {
        const draft: QuickAddDraft = draftData.draft
        const values = fieldsOf(draft)
        setFields(values); setBaseline(JSON.stringify(values)); setRecord(draft)
        setManualSupplier(!draft.supplier_id && !!draft.supplier_name)
      } else {
        const selectedSite = siteData.sites?.some((site: Option) => site.id === siteId) ? siteId : null
        const values = blank(initialKind, selectedSite)
        setFields(values); setBaseline(JSON.stringify(values))
      }
      setError('')
    }).catch((reason: Error) => {
      if (!controller.signal.aborted) setLoadError(['notFound', 'forbidden', 'unauthorized'].includes(reason.message) ? reason.message : 'optionsFailed')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [draftId, initialKind, siteId, attempt])

  useEffect(() => {
    if (!dirty && !saving && !photoBusy && !reviewBusy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving, photoBusy, reviewBusy])

  function close() {
    if (busy.current || photoBusy || reviewBusy) return
    if (dirty && !window.confirm(text('discard'))) return
    onClose()
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy.current || photoBusy || reviewBusy) return
    if (!fields.name.trim()) { setError('nameRequired'); nameInput.current?.focus(); return }
    busy.current = true
    setSaving(true); setError('')
    try {
      requestId.current ||= crypto.randomUUID()
      const response = await fetch(record ? `/api/quick-add-drafts/${record.id}` : '/api/quick-add-drafts', {
        method: record ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, ...(record ? { version: record.version } : { id: requestId.current }) }),
        signal: AbortSignal.timeout(20000),
      })
      const result = await response.json()
      if (!response.ok) {
        const known = ['unauthorized', 'forbidden', 'notFound', 'invalid', 'locationUnavailable', 'supplierUnavailable', 'saveConflict', 'editConflict']
        throw new Error(known.includes(result.error) ? result.error : 'unavailable')
      }
      const values = fieldsOf(result.draft)
      setFields(values); setBaseline(JSON.stringify(values)); setRecord(result.draft)
      setSuccess(true); onSaved?.()
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setError(['unauthorized', 'forbidden', 'notFound', 'invalid', 'locationUnavailable', 'supplierUnavailable', 'saveConflict', 'editConflict'].includes(code) ? code : 'unavailable')
    } finally { busy.current = false; setSaving(false) }
  }

  function view(id: string) {
    onClose()
    router.push(`/admin/quick-add?draft=${encodeURIComponent(id)}`)
  }

  const control = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
  const categories = fields.kind === 'ingredient' ? ingredientCategories : productCategories
  return <Dialog.Root open onOpenChange={open => { if (!open) close() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
      <Dialog.Content onCloseAutoFocus={event => {
        if (returnFocusRef?.current) {
          event.preventDefault()
          returnFocusRef.current.focus()
        }
      }} className="fixed inset-0 z-[91] flex flex-col bg-white text-gray-900 shadow-xl dark:bg-gray-800 dark:text-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[min(92vw,38rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b p-5 dark:border-gray-700">
          <div><Dialog.Title className="text-xl font-semibold">{text(draftId || record ? 'editTitle' : 'title')}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text('intro')}</Dialog.Description></div>
          <button type="button" onClick={close} disabled={saving || photoBusy || reviewBusy} aria-label={text('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {loading ? <p role="status">{text('loading')}</p> : loadError ? <div role="alert"><p>{text(loadError)}</p><Button variant="teal" className="mt-4" onClick={() => setAttempt(value => value + 1)}>{text('retry')}</Button></div> : success ? <div>
            <p ref={savedMessage} tabIndex={-1} role="status" className="text-lg font-semibold">{text('saved')}</p><p className="mt-2 break-words">{record?.name}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!draftId && <Button variant="teal" disabled={photoBusy || reviewBusy} onClick={() => {
                if ((unsavedPhotos || reviewDirty) && !window.confirm(text('discard'))) return
                setUnsavedPhotos(false); setReviewDirty(false)
                focusName.current = true
                const values = { ...blank(fields.kind, fields.site_id), supplier_id: fields.supplier_id, supplier_name: fields.supplier_name }
                setFields(values); setBaseline(JSON.stringify(values)); setRecord(null); setSuccess(false); setError('')
                requestId.current = null
              }}>{text('another')}</Button>}
              <Button variant="tealOutline" onClick={() => { if (record) { focusName.current = true; setSuccess(false) } }}>{text('view')}</Button>
            </div>
          </div> : <form id={formId} onSubmit={save} className="space-y-4">
            <fieldset disabled={saving || photoBusy || reviewBusy || (!!record && record.status !== 'draft')} className="space-y-4">
              <legend className="sr-only">{text('title')}</legend>
              <label className="block text-sm font-medium">{text('kind')}
                <select aria-label={text('kind')} value={fields.kind} onChange={event => setFields({ ...fields, kind: event.target.value as QuickAddKind, ingredient_ids: [], category: '' })} className={control}>
                  <option value="ingredient">{text('ingredient')}</option><option value="packaged_product">{text('packaged_product')}</option><option value="prepared_item">{text('prepared_item')}</option>
                </select></label>
              <label className="block text-sm font-medium">{text('name')} *
                <input ref={nameInput} required maxLength={200} aria-invalid={error === 'nameRequired' || undefined} aria-describedby={error === 'nameRequired' ? `${formId}-error` : undefined} value={fields.name} onChange={event => { setFields({ ...fields, name: event.target.value }); if (error === 'nameRequired') setError('') }} className={control} autoComplete="off" /></label>
              <label className="block text-sm font-medium">{text('category')}
                <input aria-label={text('category')} aria-describedby={`${formId}-category-note`} list={`${formId}-categories`} maxLength={200} value={fields.category} onChange={event => setFields({ ...fields, category: event.target.value })} className={control} />
                <datalist id={`${formId}-categories`}>{categories.map(category => <option key={category} value={category} />)}</datalist>
                <span id={`${formId}-category-note`} className="mt-1 block text-xs text-gray-500 dark:text-gray-300">{text('categoryHelp')}</span>
              </label>
              <label className="block text-sm font-medium">{text('location')}
                <select aria-label={text('location')} value={fields.site_id || ''} onChange={event => setFields({ ...fields, site_id: event.target.value || null })} className={control}>
                  <option value="">{text('noLocation')}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                </select></label>
              {fields.kind === 'prepared_item' && <QuickAddIngredients ingredients={ingredients} selected={fields.ingredient_ids}
                onChange={ingredient_ids => setFields({ ...fields, ingredient_ids })} />}
              {fields.kind !== 'prepared_item' && <><label className="block text-sm font-medium">{text('supplier')}
                <select aria-label={text('supplier')} value={manualSupplier ? 'new' : fields.supplier_id || ''} onChange={event => {
                  const supplier = suppliers.find(item => item.id === event.target.value)
                  setManualSupplier(event.target.value === 'new')
                  setFields({ ...fields, supplier_id: supplier?.id || null, supplier_name: supplier?.name || '' })
                }} className={control}>
                  <option value="">{text('noSupplier')}</option><option value="new">{text('newSupplier')}</option>
                  {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select></label>
              {manualSupplier && <label className="block text-sm font-medium">{text('supplierName')}
                <input aria-label={text('supplierName')} aria-describedby={`${formId}-supplier-note`} maxLength={200} value={fields.supplier_name} onChange={event => setFields({ ...fields, supplier_name: event.target.value })} className={control} />
                <span id={`${formId}-supplier-note`} className="mt-1 block text-xs text-gray-500 dark:text-gray-300">{text('supplierNote')}</span></label>}</>}
              {fields.kind !== 'prepared_item' && <section aria-label={text('evidenceTitle')} className="space-y-3 rounded-xl border-2 border-teal-200 bg-teal-50/40 p-3 dark:border-teal-800 dark:bg-teal-950/20">
                <div><h3 className="font-semibold">{text('evidenceTitle')}</h3><p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{text('evidenceHelp')}</p></div>
                <QuickAddBarcode disabled={saving || photoBusy || reviewBusy || (!!record && record.status !== 'draft')} onApply={applyBarcodeSuggestions} />
                {record?.status === 'draft'
                  ? <QuickAddPhotos key={record.id} draftId={record.id} disabled={saving || reviewBusy} onActivity={photoActivity} onApplySuggestions={applySuggestions} />
                  : !record && <p className="rounded-lg border border-dashed border-teal-400 p-3 text-sm text-gray-700 dark:text-gray-200"><span className="font-semibold">2. {text('photos')}</span><br />{text('saveForPhotos')}</p>}
              </section>}
              <label className="block text-sm font-medium">{text('notes')}
                <textarea rows={3} maxLength={2000} value={fields.notes} onChange={event => setFields({ ...fields, notes: event.target.value })} className={control} /></label>
              {fields.kind !== 'prepared_item' && (!record || record.status === 'draft') && <details className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">{text('captureAssessment')}</summary>
                <p className="mb-4 text-sm text-gray-700 dark:text-gray-200">{text('captureAssessmentHelp')}</p>
                <QuickAddAssessment warnings={fields.allergen_warnings} tags={fields.dietary_tags}
                  onWarnings={allergen_warnings => setFields(current => ({ ...current, allergen_warnings }))}
                  onTags={dietary_tags => setFields(current => ({ ...current, dietary_tags }))} />
              </details>}
            </fieldset>
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">{text(record?.status === 'approved' ? 'approvedSafetyNote' : 'safetyNote')}</p>
            {error && <div id={`${formId}-error`} role="alert" className="text-sm text-red-700 dark:text-red-300"><p>{text(error)}</p>
              {error === 'saveConflict' && requestId.current && <Button type="button" variant="tealOutline" className="mt-2" onClick={() => { if (window.confirm(text('discard'))) view(requestId.current!) }}>{text('view')}</Button>}
              {error === 'editConflict' && <Button type="button" variant="tealOutline" className="mt-2" onClick={() => { if (window.confirm(text('discard'))) { if (draftId) setAttempt(value => value + 1); else if (record) view(record.id) } }}>{text('reload')}</Button>}
            </div>}
          </form>}
          {fields.kind !== 'prepared_item' && !loading && !loadError && record && (success || record.status !== 'draft') && <div className="mt-5 rounded-xl border-2 border-teal-200 bg-teal-50/40 p-3 dark:border-teal-800 dark:bg-teal-950/20">
            {success && <p className="font-semibold text-teal-900 dark:text-teal-100">{text('nextLabelPhotos')}</p>}
            <QuickAddPhotos key={record.id} draftId={record.id} disabled={saving || reviewBusy || record.status !== 'draft'} onActivity={photoActivity} onApplySuggestions={applySuggestions} />
          </div>}
          {!loading && !loadError && record && <QuickAddReview key={`review-${record.id}`} draft={record} suppliers={suppliers} sites={sites} ingredients={ingredients}
            categories={record.kind === 'ingredient' ? ingredientCategories : productCategories}
            disabled={saving || photoBusy || textDirty || unsavedPhotos} onActivity={reviewActivity}
            onChanged={draft => { setRecord(draft); setSuccess(false); onSaved?.() }} />}
        </div>
        {!loading && !loadError && !success && (!record || record.status === 'draft') && <div className="flex shrink-0 flex-wrap gap-3 border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700">
          <Button variant="teal" type="submit" form={formId} loading={saving} disabled={photoBusy || reviewBusy || reviewDirty}>{text(saving ? 'saving' : 'save')}</Button>
          <Button type="button" variant="ghost" disabled={saving || photoBusy || reviewBusy} onClick={close}>{text('cancel')}</Button>
        </div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
