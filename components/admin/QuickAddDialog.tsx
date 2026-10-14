'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { Barcode, Camera, FileText, PencilLine, X } from 'lucide-react'
import QuickAddAssessment from '@/components/admin/QuickAddAssessment'
import QuickAddPhotos, { type LabelSuggestions } from '@/components/admin/QuickAddPhotos'
import QuickAddDatasheets from '@/components/admin/QuickAddDatasheets'
import QuickAddReview from '@/components/admin/QuickAddReview'
import QuickAddIngredients, { type QuickAddIngredientOption } from '@/components/admin/QuickAddIngredients'
import QuickAddBarcode from '@/components/admin/QuickAddBarcode'
import QuickAddPendingEvidence, { type PendingEvidence } from '@/components/admin/QuickAddPendingEvidence'
import QuickAddRecipePreview from '@/components/admin/QuickAddRecipePreview'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddDraft, QuickAddFields, QuickAddKind } from '@/lib/quick-add'
import { DEFAULT_INGREDIENT_CATEGORIES, DEFAULT_MENU_CATEGORIES, mergeCategories } from '@/lib/item-categories'
import { clearQuickAddRecovery, loadQuickAddOptions, loadQuickAddRecovery, queueQuickAddDraft, saveQuickAddOptions, saveQuickAddRecovery, type QuickAddOptionSnapshot } from '@/lib/quick-add-offline'
import { saveOfflineQuickAddPhoto } from '@/lib/quick-add-offline-photos'

type Option = { id: string; name: string }
type Props = {
  onClose: () => void
  page?: boolean
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

export default function QuickAddDialog({ onClose, page = false, draftId, initialKind = 'ingredient', siteId, onSaved, returnFocusRef }: Props) {
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
  const [queuedOffline, setQueuedOffline] = useState(false)
  const [restoredOffline, setRestoredOffline] = useState(false)
  const [captureMethod, setCaptureMethod] = useState<'barcode' | 'photo' | 'datasheet' | 'manual' | null>(draftId ? 'photo' : null)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([])
  const [attachmentRevision, setAttachmentRevision] = useState(0)
  const [datasheetBusy, setDatasheetBusy] = useState(false)
  const [stagingBusy, setStagingBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [unsavedPhotos, setUnsavedPhotos] = useState(false)
  const photoActivity = useCallback((working: boolean, unsaved: boolean) => {
    setPhotoBusy(working); setUnsavedPhotos(unsaved)
  }, [])
  const applySuggestions = useCallback((suggestions: LabelSuggestions) => {
    setAssessmentOpen(true)
    setSuccess(false)
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
  const onSavedRef = useRef(onSaved)
  const nameInput = useRef<HTMLInputElement>(null)
  const savedMessage = useRef<HTMLParagraphElement>(null)
  const focusName = useRef(false)
  const textDirty = JSON.stringify(fields) !== baseline
  const evidenceBusy = photoBusy || datasheetBusy || stagingBusy
  const dirty = textDirty || unsavedPhotos || reviewDirty || pendingEvidence.length > 0

  useEffect(() => { onSavedRef.current = onSaved }, [onSaved])

  useEffect(() => {
    if (success) savedMessage.current?.focus()
    else if (focusName.current) {
      nameInput.current?.focus()
      focusName.current = false
    }
  }, [success])

  useEffect(() => {
    if (draftId || record || !textDirty) return
    requestId.current ||= crypto.randomUUID()
    const timeout = window.setTimeout(() => { saveQuickAddRecovery(requestId.current!, fields) }, 300)
    return () => window.clearTimeout(timeout)
  }, [draftId, fields, record, textDirty])

  useEffect(() => {
    const synced = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; draft: QuickAddDraft }>).detail
      if (!detail || detail.id !== requestId.current) return
      const values = fieldsOf(detail.draft)
      setFields(values); setBaseline(JSON.stringify(values)); setRecord(detail.draft)
      setQueuedOffline(false); setSuccess(true); setRestoredOffline(false)
      onSavedRef.current?.()
    }
    window.addEventListener('quick-add-synced', synced)
    return () => window.removeEventListener('quick-add-synced', synced)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function read(url: string) {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'unavailable')
      return data
    }
    function applyLoaded(options: QuickAddOptionSnapshot, draftData: { draft: QuickAddDraft } | null) {
      setSites(options.sites)
      setSuppliers(options.suppliers)
      setIngredients(options.ingredients)
      setIngredientCategories(mergeCategories(DEFAULT_INGREDIENT_CATEGORIES, options.ingredientCategories))
      setProductCategories(mergeCategories(DEFAULT_MENU_CATEGORIES, options.productCategories))
      if (draftData) {
        const draft = draftData.draft
        const values = fieldsOf(draft)
        setFields(values); setBaseline(JSON.stringify(values)); setRecord(draft)
        setManualSupplier(!draft.supplier_id && !!draft.supplier_name)
      } else {
        const recovered = loadQuickAddRecovery()
        const selectedSite = options.sites.some(site => site.id === siteId) ? siteId : null
        const values = recovered?.fields || blank(initialKind, selectedSite)
        setFields(values); setBaseline(JSON.stringify(blank(initialKind, selectedSite)))
        if (recovered) { requestId.current = recovered.id; setManualSupplier(!values.supplier_id && !!values.supplier_name); setRestoredOffline(true) }
      }
      setError('')
    }
    setLoading(true)
    setLoadError('')
    void Promise.all([
      read('/api/sites'), read('/api/suppliers'), read('/api/ingredients/categories'), read('/api/menu-items/categories'), read('/api/ingredients?options_only=true'),
      draftId ? read(`/api/quick-add-drafts/${draftId}`) : Promise.resolve(null),
    ]).then(([siteData, supplierData, ingredientCategoryData, productCategoryData, ingredientData, draftData]) => {
      if (controller.signal.aborted) return
      const options: QuickAddOptionSnapshot = {
        sites: siteData.sites || [], suppliers: supplierData.suppliers || [],
        ingredientCategories: ingredientCategoryData.categories || [], productCategories: productCategoryData.categories || [],
        ingredients: (ingredientData.ingredients || []).map((item: QuickAddIngredientOption) => ({ id: item.id, name: item.name, category: item.category })),
        saved_at: new Date().toISOString(),
      }
      saveQuickAddOptions(options)
      applyLoaded(options, draftData)
    }).catch((reason: Error) => {
      if (controller.signal.aborted) return
      const cached = !draftId ? loadQuickAddOptions() : null
      if (cached) applyLoaded(cached, null)
      else setLoadError(['notFound', 'forbidden', 'unauthorized'].includes(reason.message) ? reason.message : 'optionsFailed')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [draftId, initialKind, siteId, attempt])

  useEffect(() => {
    if (!dirty && !saving && !evidenceBusy && !reviewBusy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving, evidenceBusy, reviewBusy])

  function close() {
    if (busy.current || evidenceBusy || reviewBusy) return
    if (dirty && !window.confirm(text('discard'))) return
    if (dirty && requestId.current) clearQuickAddRecovery(requestId.current)
    onClose()
  }

  async function changePendingEvidence(next: PendingEvidence[]) {
    const removed = pendingEvidence.filter(item => !next.some(entry => entry.id === item.id))
    if (!record || !removed.length) { setPendingEvidence(next); return }
    setStagingBusy(true); setError('')
    try {
      for (const item of removed) {
        const response = await fetch(`/api/quick-add-drafts/${record.id}/${item.kind === 'photo' ? 'photos' : 'datasheets'}/${item.id}`, { method: 'DELETE', signal: AbortSignal.timeout(20000) })
        if (!response.ok) throw new Error('remove')
        setPendingEvidence(current => current.filter(entry => entry.id !== item.id))
      }
      setAttachmentRevision(value => value + 1)
    } catch { setError('filesUploadFailed') }
    finally { setStagingBusy(false) }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy.current || evidenceBusy || reviewBusy) return
    if (!fields.name.trim()) { setError('nameRequired'); nameInput.current?.focus(); return }
    busy.current = true
    setSaving(true); setError('')
    try {
      requestId.current ||= crypto.randomUUID()
      if (!record && !navigator.onLine) {
        if (pendingEvidence.some(item => item.kind === 'datasheet')) { setError('datasheetOffline'); return }
        for (const item of pendingEvidence) await saveOfflineQuickAddPhoto(requestId.current, item.id, item.blob)
        if (!queueQuickAddDraft(requestId.current, fields)) throw new Error('unavailable')
        setPendingEvidence([])
        setQueuedOffline(true); setSuccess(true); setBaseline(JSON.stringify(fields)); setRestoredOffline(false)
        window.dispatchEvent(new Event('quick-add-queued'))
        return
      }
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
      clearQuickAddRecovery(requestId.current)
      setQueuedOffline(false); setRestoredOffline(false)
      const failed: PendingEvidence[] = []
      for (const item of pendingEvidence) {
        try {
          const extension = item.name.split('.').pop()?.toLowerCase()
          const mime = item.kind === 'photo' ? 'image/jpeg' : extension === 'pdf' ? 'application/pdf' : extension === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          const upload = await fetch(`/api/quick-add-drafts/${result.draft.id}/${item.kind === 'photo' ? 'photos' : 'datasheets'}/${item.id}`, {
            method: 'PUT', headers: { 'Content-Type': mime, ...(item.kind === 'datasheet' ? { 'X-File-Name': encodeURIComponent(item.name) } : {}) },
            body: item.blob, signal: AbortSignal.timeout(60000),
          })
          if (!upload.ok) {
            const result = await upload.json().catch(() => ({}))
            const known = ['photoFormat', 'photoInvalid', 'photoTooLarge', 'photoLimit', 'photoConflict', 'datasheetFormat', 'datasheetTooLarge', 'datasheetLimit', 'datasheetConflict', 'editConflict']
            throw new Error(known.includes(result.error) ? result.error : item.kind === 'photo' ? 'photoFailed' : 'datasheetUploadFailed')
          }
        } catch (reason) { failed.push({ ...item, error: reason instanceof Error && reason.name !== 'TimeoutError' && reason.name !== 'TypeError' ? reason.message : item.kind === 'photo' ? 'photoFailed' : 'datasheetUploadFailed' }) }
      }
      setPendingEvidence(failed)
      setAttachmentRevision(value => value + 1)
      if (failed.length) { setError('filesUploadFailed'); onSaved?.(); return }
      setSuccess(true); onSaved?.()
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      if (!record && !pendingEvidence.length && requestId.current && !navigator.onLine && queueQuickAddDraft(requestId.current, fields)) {
        setQueuedOffline(true); setSuccess(true); setBaseline(JSON.stringify(fields)); setRestoredOffline(false)
        window.dispatchEvent(new Event('quick-add-queued'))
        return
      }
      setError(['unauthorized', 'forbidden', 'notFound', 'invalid', 'locationUnavailable', 'supplierUnavailable', 'saveConflict', 'editConflict'].includes(code) ? code : 'unavailable')
    } finally { busy.current = false; setSaving(false) }
  }

  function view(id: string) {
    onClose()
    router.push(`/admin/quick-add?draft=${encodeURIComponent(id)}`)
  }

  const control = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
  const categories = fields.kind === 'ingredient' ? ingredientCategories : productCategories
  const content = <>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b p-5 dark:border-gray-700">
          {page ? <h1 className="text-xl font-semibold">{text(draftId || record ? 'editTitle' : fields.kind)}</h1>
            : <><Dialog.Title className="text-xl font-semibold">{text(draftId || record ? 'editTitle' : 'title')}</Dialog.Title><Dialog.Description className="sr-only">{text('evidenceHelp')}</Dialog.Description></>}
          <button type="button" onClick={close} disabled={saving || evidenceBusy || reviewBusy} aria-label={text('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X aria-hidden="true" /></button>
        </div>
        <div className={page ? 'p-4 sm:p-5' : 'min-h-0 overflow-y-auto p-4 sm:p-5'}>
          {loading ? <p role="status">{text('loading')}</p> : loadError ? <div role="alert"><p>{text(loadError)}</p><Button variant="teal" className="mt-4" onClick={() => setAttempt(value => value + 1)}>{text('retry')}</Button></div> : success ? <div>
            <p ref={savedMessage} tabIndex={-1} role="status" className="text-lg font-semibold">{text(queuedOffline ? 'queuedOffline' : 'saved')}</p><p className="mt-2 break-words">{record?.name || fields.name}</p>
            {queuedOffline && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{text('queuedOfflineHelp')}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              {!draftId && <Button variant="teal" disabled={evidenceBusy || reviewBusy} onClick={() => {
                if ((unsavedPhotos || reviewDirty) && !window.confirm(text('discard'))) return
                setUnsavedPhotos(false); setReviewDirty(false)
                focusName.current = true
                const values = { ...blank(fields.kind, fields.site_id), supplier_id: fields.supplier_id, supplier_name: fields.supplier_name }
                setFields(values); setBaseline(JSON.stringify(values)); setRecord(null); setSuccess(false); setError('')
                setQueuedOffline(false); setRestoredOffline(false)
                setCaptureMethod(null); setAssessmentOpen(false); setPendingEvidence([])
                requestId.current = null
              }}>{text('another')}</Button>}
              {record && <Button variant="tealOutline" onClick={() => { focusName.current = true; setSuccess(false) }}>{text('view')}</Button>}
            </div>
            {queuedOffline && requestId.current && fields.kind !== 'prepared_item' && <div className="mt-5 rounded-xl border-2 border-teal-200 bg-teal-50/40 p-3 dark:border-teal-800 dark:bg-teal-950/20">
              <QuickAddPhotos key={`offline-${requestId.current}`} draftId={requestId.current} offlineDraft onActivity={photoActivity} onApplySuggestions={applySuggestions} />
            </div>}
          </div> : <form id={formId} onSubmit={save} noValidate className="space-y-4">
            {restoredOffline && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{text('restoredOffline')}</p>}
            <fieldset disabled={saving || evidenceBusy || reviewBusy || (!!record && record.status !== 'draft')} className="space-y-5 min-w-0">
              <legend className="sr-only">{text('title')}</legend>
              <label className="block text-sm font-medium">{text('kind')}
                <select aria-label={text('kind')} value={fields.kind} disabled={!!record || pendingEvidence.length > 0} onChange={event => { setFields({ ...fields, kind: event.target.value as QuickAddKind, ingredient_ids: [], category: '' }); setCaptureMethod(null); setAssessmentOpen(false) }} className={control}>
                  <option value="ingredient">{text('ingredient')}</option><option value="packaged_product">{text('packaged_product')}</option><option value="prepared_item">{text('prepared_item')}</option>
                </select></label>
              {fields.kind !== 'prepared_item' && <section id={`${formId}-capture-options`} aria-label={text('captureStart')} className="space-y-3 scroll-mt-6">
                <div><h2 className="text-lg font-semibold">{text('captureStart')}</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text('captureStartHelp')}</p></div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    { key: 'barcode', icon: Barcode, label: 'captureBarcode', help: 'captureBarcodeHelp' },
                    { key: 'photo', icon: Camera, label: 'capturePhoto', help: 'capturePhotoHelp' },
                    { key: 'datasheet', icon: FileText, label: 'captureDatasheet', help: 'captureDatasheetHelp' },
                    { key: 'manual', icon: PencilLine, label: 'captureManual', help: 'captureManualHelp' },
                  ] as const).map(({ key, icon: Icon, label, help }) => <button type="button" key={key} aria-pressed={captureMethod === key} aria-controls={`${formId}-capture-${key}`} onClick={() => { setCaptureMethod(key); if (key === 'manual') setAssessmentOpen(true) }}
                    className={`flex min-h-16 items-center gap-3 rounded-xl border-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${captureMethod === key ? 'border-teal-700 bg-teal-50 dark:border-teal-300 dark:bg-teal-950' : 'border-gray-200 hover:border-teal-600 dark:border-gray-600'}`}>
                    <Icon className="h-6 w-6 shrink-0 text-teal-800 dark:text-teal-200" aria-hidden="true" /><span><span className="block text-sm font-semibold">{text(label)}</span><span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">{text(help)}</span></span>
                  </button>)}
                </div>
              </section>}
              <div className={`grid min-w-0 gap-5 ${fields.kind !== 'prepared_item' && captureMethod && captureMethod !== 'manual' ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
              {fields.kind !== 'prepared_item' && <div hidden={!captureMethod || captureMethod === 'manual'} className="min-w-0 self-start space-y-4 rounded-xl border border-teal-200 bg-teal-50/30 p-4 dark:border-teal-800 dark:bg-teal-950/20 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                <div id={`${formId}-capture-barcode`} hidden={captureMethod !== 'barcode'}><QuickAddBarcode expanded={captureMethod === 'barcode'} disabled={saving || evidenceBusy || reviewBusy || (!!record && record.status !== 'draft')} onApply={applyBarcodeSuggestions} /></div>
                <div id={`${formId}-capture-photo`} hidden={captureMethod !== 'photo'}>
                  {(!record || pendingEvidence.some(item => item.kind === 'photo')) && <QuickAddPendingEvidence kind="photo" items={pendingEvidence} onChange={changePendingEvidence} disabled={saving || photoBusy || datasheetBusy || stagingBusy || reviewBusy} onBusy={setStagingBusy} />}
                  {record && <QuickAddPhotos key={`${record.id}-${attachmentRevision}`} draftId={record.id} excludeIds={pendingEvidence.map(item => item.id)} disabled={saving || datasheetBusy || stagingBusy || reviewBusy || record.status !== 'draft'} onActivity={photoActivity} onApplySuggestions={applySuggestions} />}
                </div>
                <div id={`${formId}-capture-datasheet`} hidden={captureMethod !== 'datasheet'}>
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{text('datasheetAnalysisHelp')}</p>
                  {(!record || pendingEvidence.some(item => item.kind === 'datasheet')) && <QuickAddPendingEvidence kind="datasheet" items={pendingEvidence} onChange={changePendingEvidence} disabled={saving || photoBusy || datasheetBusy || stagingBusy || reviewBusy} onBusy={setStagingBusy} />}
                  {record && <QuickAddDatasheets key={`${record.id}-${attachmentRevision}`} draftId={record.id} excludeIds={pendingEvidence.map(item => item.id)} disabled={saving || photoBusy || stagingBusy || reviewBusy || record.status !== 'draft'} onActivity={setDatasheetBusy} onApplySuggestions={applySuggestions} />}
                </div>
                <a href={`#${formId}-item-details`} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline dark:text-teal-200">{text('captureContinue')}</a>
              </div>}
              <div id={`${formId}-item-details`} className="min-w-0 space-y-4 scroll-mt-6">
              {fields.kind !== 'prepared_item' && captureMethod && <a href={`#${formId}-capture-options`} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-800 underline dark:text-teal-200 lg:hidden">{text('backToCapture')}</a>}
              <h2 className="text-lg font-semibold">{text('itemDetails')}</h2>
              <label className="block text-sm font-medium">{text('name')} *
                <input ref={nameInput} required maxLength={200} aria-invalid={error === 'nameRequired' || undefined} aria-describedby={error === 'nameRequired' ? `${formId}-error` : undefined} value={fields.name} onChange={event => { setFields({ ...fields, name: event.target.value }); if (error === 'nameRequired') setError('') }} className={control} autoComplete="off" /></label>
              {fields.kind === 'prepared_item' && <QuickAddIngredients ingredients={ingredients} selected={fields.ingredient_ids}
                onChange={ingredient_ids => setFields({ ...fields, ingredient_ids })} />}
              {fields.kind === 'prepared_item' && fields.ingredient_ids.length > 0 && <QuickAddRecipePreview selected={fields.ingredient_ids} />}
              <label className="block text-sm font-medium">{text('category')}
                <input aria-label={text('category')} aria-describedby={`${formId}-category-note`} list={`${formId}-categories`} maxLength={200} value={fields.category} onChange={event => setFields({ ...fields, category: event.target.value })} className={control} />
                <datalist id={`${formId}-categories`}>{categories.map(category => <option key={category} value={category} />)}</datalist>
                <span id={`${formId}-category-note`} className="mt-1 block text-xs text-gray-500 dark:text-gray-300">{text('categoryHelp')}</span>
              </label>
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
              {fields.kind !== 'prepared_item' && (!record || record.status === 'draft') && <details id={`${formId}-capture-manual`} open={assessmentOpen} onToggle={event => setAssessmentOpen(event.currentTarget.open)} className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">{text('captureAssessment')}</summary>
                <QuickAddAssessment warnings={fields.allergen_warnings} tags={fields.dietary_tags}
                  onWarnings={allergen_warnings => setFields(current => ({ ...current, allergen_warnings }))}
                  onTags={dietary_tags => setFields(current => ({ ...current, dietary_tags }))} />
              </details>}
              <details className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">{text('additionalDetails')}</summary>
                <div className="space-y-4 pt-2">
                  <label className="block text-sm font-medium">{text('location')}
                    <select aria-label={text('location')} value={fields.site_id || ''} onChange={event => setFields({ ...fields, site_id: event.target.value || null })} className={control}>
                      <option value="">{text('noLocation')}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">{text('notes')}
                    <textarea rows={3} maxLength={2000} value={fields.notes} onChange={event => setFields({ ...fields, notes: event.target.value })} className={control} />
                  </label>
                </div>
              </details>
              </div>
              </div>
            </fieldset>
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">{text(record?.status === 'approved' ? 'approvedSafetyNote' : 'safetyNote')}</p>
            {error && <div id={`${formId}-error`} role="alert" className="text-sm text-red-700 dark:text-red-300"><p>{text(error)}</p>
              {error === 'saveConflict' && requestId.current && <Button type="button" variant="tealOutline" className="mt-2" onClick={() => { if (window.confirm(text('discard'))) view(requestId.current!) }}>{text('view')}</Button>}
              {error === 'editConflict' && <Button type="button" variant="tealOutline" className="mt-2" onClick={() => { if (window.confirm(text('discard'))) { if (draftId) setAttempt(value => value + 1); else if (record) view(record.id) } }}>{text('reload')}</Button>}
            </div>}
          </form>}
          {fields.kind !== 'prepared_item' && !loading && !loadError && record && (success || record.status !== 'draft') && <div className="mt-5 rounded-xl border-2 border-teal-200 bg-teal-50/40 p-3 dark:border-teal-800 dark:bg-teal-950/20">
            {success && <p className="font-semibold text-teal-900 dark:text-teal-100">{text('optionalEvidence')}</p>}
            <QuickAddPhotos key={record.id} draftId={record.id} disabled={saving || datasheetBusy || reviewBusy || record.status !== 'draft'} onActivity={photoActivity} onApplySuggestions={applySuggestions} />
            <QuickAddDatasheets key={`datasheet-${record.id}`} draftId={record.id} disabled={saving || photoBusy || reviewBusy || record.status !== 'draft'} onActivity={setDatasheetBusy} onApplySuggestions={applySuggestions} />
          </div>}
          {!loading && !loadError && record && <QuickAddReview key={`review-${record.id}`} draft={record} suppliers={suppliers} sites={sites} ingredients={ingredients}
            categories={record.kind === 'ingredient' ? ingredientCategories : productCategories}
            disabled={saving || evidenceBusy || textDirty || unsavedPhotos || pendingEvidence.length > 0} onActivity={reviewActivity}
            onChanged={draft => { setRecord(draft); setSuccess(false); onSaved?.() }} />}
        </div>
        {!loading && !loadError && !success && (!record || record.status === 'draft') && <div className="sticky bottom-0 z-20 flex shrink-0 flex-wrap gap-3 border-t bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-gray-800">
          <Button variant="teal" className="flex-1 sm:flex-none" type="submit" form={formId} loading={saving} disabled={evidenceBusy || reviewBusy || reviewDirty}>{text(saving ? 'saving' : 'save')}</Button>
          <Button type="button" variant="ghost" disabled={saving || evidenceBusy || reviewBusy} onClick={close}>{text('cancel')}</Button>
        </div>}
  </>
  if (page) return <section data-no-translate className="mx-auto my-4 flex w-full max-w-6xl flex-col rounded-2xl bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white sm:my-8">{content}</section>
  return <Dialog.Root open onOpenChange={open => { if (!open) close() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
      <Dialog.Content data-no-translate onCloseAutoFocus={event => {
        if (returnFocusRef?.current) {
          event.preventDefault()
          returnFocusRef.current.focus()
        }
      }} className="fixed inset-0 z-[91] flex flex-col bg-white text-gray-900 shadow-xl dark:bg-gray-800 dark:text-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[min(94vw,72rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">{content}</Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
