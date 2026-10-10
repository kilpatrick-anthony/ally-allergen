'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import QuickAddAssessment from '@/components/admin/QuickAddAssessment'
import QuickAddPhotos from '@/components/admin/QuickAddPhotos'
import QuickAddReview from '@/components/admin/QuickAddReview'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddDraft, QuickAddFields, QuickAddKind } from '@/lib/quick-add'

type Option = { id: string; name: string }
type Props = {
  onClose: () => void
  draftId?: string
  initialKind?: QuickAddKind
  siteId?: string | null
  onSaved?: () => void
}

const blank = (kind: QuickAddKind, siteId?: string | null): QuickAddFields => ({
  kind, name: '', site_id: siteId || null, supplier_id: null, supplier_name: '', notes: '', allergen_warnings: {}, dietary_tags: [],
})
const fieldsOf = (draft: QuickAddDraft): QuickAddFields => ({
  kind: draft.kind, name: draft.name, site_id: draft.site_id, supplier_id: draft.supplier_id,
  supplier_name: draft.supplier_name, notes: draft.notes,
  allergen_warnings: draft.allergen_warnings || {}, dietary_tags: draft.dietary_tags || [],
})

export default function QuickAddDialog({ onClose, draftId, initialKind = 'ingredient', siteId, onSaved }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const router = useRouter()
  const formId = useId()
  const [fields, setFields] = useState<QuickAddFields>(() => blank(initialKind, siteId))
  const [baseline, setBaseline] = useState(() => JSON.stringify(blank(initialKind, siteId)))
  const [record, setRecord] = useState<QuickAddDraft | null>(null)
  const [sites, setSites] = useState<Option[]>([])
  const [suppliers, setSuppliers] = useState<Option[]>([])
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
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewDirty, setReviewDirty] = useState(false)
  const reviewActivity = useCallback((working: boolean, changed: boolean) => {
    setReviewBusy(working); setReviewDirty(changed)
  }, [])
  const busy = useRef(false)
  const requestId = useRef<string | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const textDirty = JSON.stringify(fields) !== baseline
  const dirty = textDirty || unsavedPhotos || reviewDirty

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
      read('/api/sites'), read('/api/suppliers'),
      draftId ? read(`/api/quick-add-drafts/${draftId}`) : Promise.resolve(null),
    ]).then(([siteData, supplierData, draftData]) => {
      if (controller.signal.aborted) return
      setSites(siteData.sites || [])
      setSuppliers(supplierData.suppliers || [])
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
  return <Dialog.Root open onOpenChange={open => { if (!open) close() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
      <Dialog.Content className="fixed inset-0 z-[91] flex flex-col bg-white text-gray-900 shadow-xl dark:bg-gray-800 dark:text-white sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-[min(92vw,38rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b p-5 dark:border-gray-700">
          <div><Dialog.Title className="text-xl font-semibold">{text(draftId || record ? 'editTitle' : 'title')}</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text('intro')}</Dialog.Description></div>
          <button type="button" onClick={close} disabled={saving || photoBusy || reviewBusy} aria-label={text('close')} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {loading ? <p role="status">{text('loading')}</p> : loadError ? <div role="alert"><p>{text(loadError)}</p><Button className="mt-4" onClick={() => setAttempt(value => value + 1)}>{text('retry')}</Button></div> : success ? <div>
            <p role="status" className="text-lg font-semibold">{text('saved')}</p><p className="mt-2 break-words">{record?.name}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!draftId && <Button disabled={photoBusy || reviewBusy} onClick={() => {
                if ((unsavedPhotos || reviewDirty) && !window.confirm(text('discard'))) return
                setUnsavedPhotos(false); setReviewDirty(false)
                const values = { ...blank(fields.kind, fields.site_id), supplier_id: fields.supplier_id, supplier_name: fields.supplier_name }
                setFields(values); setBaseline(JSON.stringify(values)); setRecord(null); setSuccess(false); setError('')
                requestId.current = null
              }}>{text('another')}</Button>}
              <Button variant="outline" onClick={() => { if (record) { setSuccess(false) } }}>{text('view')}</Button>
            </div>
          </div> : <form id={formId} onSubmit={save} className="space-y-4">
            <fieldset disabled={saving || photoBusy || reviewBusy || (!!record && record.status !== 'draft')} className="space-y-4">
              <legend className="sr-only">{text('title')}</legend>
              <label className="block text-sm font-medium">{text('kind')}
                <select aria-label={text('kind')} value={fields.kind} onChange={event => setFields({ ...fields, kind: event.target.value as QuickAddKind })} className={control}>
                  <option value="ingredient">{text('ingredient')}</option><option value="packaged_product">{text('packaged_product')}</option>
                </select></label>
              <label className="block text-sm font-medium">{text('name')} *
                <input ref={nameInput} required maxLength={200} value={fields.name} onChange={event => setFields({ ...fields, name: event.target.value })} className={control} autoComplete="off" /></label>
              <label className="block text-sm font-medium">{text('location')}
                <select aria-label={text('location')} value={fields.site_id || ''} onChange={event => setFields({ ...fields, site_id: event.target.value || null })} className={control}>
                  <option value="">{text('noLocation')}</option>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                </select></label>
              <label className="block text-sm font-medium">{text('supplier')}
                <select aria-label={text('supplier')} value={manualSupplier ? 'new' : fields.supplier_id || ''} onChange={event => {
                  const supplier = suppliers.find(item => item.id === event.target.value)
                  setManualSupplier(event.target.value === 'new')
                  setFields({ ...fields, supplier_id: supplier?.id || null, supplier_name: supplier?.name || '' })
                }} className={control}>
                  <option value="">{text('noSupplier')}</option><option value="new">{text('newSupplier')}</option>
                  {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select></label>
              {manualSupplier && <label className="block text-sm font-medium">{text('supplierName')}
                <input aria-label={text('supplierName')} maxLength={200} value={fields.supplier_name} onChange={event => setFields({ ...fields, supplier_name: event.target.value })} className={control} />
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-300">{text('supplierNote')}</span></label>}
              <label className="block text-sm font-medium">{text('notes')}
                <textarea rows={3} maxLength={2000} value={fields.notes} onChange={event => setFields({ ...fields, notes: event.target.value })} className={control} /></label>
              {(!record || record.status === 'draft') && <details className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">{text('captureAssessment')}</summary>
                <p className="mb-4 text-sm text-gray-700 dark:text-gray-200">{text('captureAssessmentHelp')}</p>
                <QuickAddAssessment warnings={fields.allergen_warnings} tags={fields.dietary_tags}
                  onWarnings={allergen_warnings => setFields(current => ({ ...current, allergen_warnings }))}
                  onTags={dietary_tags => setFields(current => ({ ...current, dietary_tags }))} />
              </details>}
            </fieldset>
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100">{text(record?.status === 'approved' ? 'approvedSafetyNote' : 'safetyNote')}</p>
            {error && <div role="alert" className="text-sm text-red-700 dark:text-red-300"><p>{text(error)}</p>
              {error === 'saveConflict' && requestId.current && <Button type="button" variant="outline" className="mt-2" onClick={() => { if (window.confirm(text('discard'))) view(requestId.current!) }}>{text('view')}</Button>}
              {error === 'editConflict' && <Button type="button" variant="outline" className="mt-2" onClick={() => { if (window.confirm(text('discard'))) { if (draftId) setAttempt(value => value + 1); else if (record) view(record.id) } }}>{text('reload')}</Button>}
            </div>}
          </form>}
          {!loading && !loadError && (record
            ? <QuickAddPhotos key={record.id} draftId={record.id} disabled={saving || reviewBusy || record.status !== 'draft'} onActivity={photoActivity} />
            : <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{text('saveForPhotos')}</p>)}
          {!loading && !loadError && record && <QuickAddReview key={`review-${record.id}`} draft={record} suppliers={suppliers} sites={sites}
            disabled={saving || photoBusy || textDirty || unsavedPhotos} onActivity={reviewActivity}
            onChanged={draft => { setRecord(draft); setSuccess(false); onSaved?.() }} />}
        </div>
        {!loading && !loadError && !success && (!record || record.status === 'draft') && <div className="flex shrink-0 flex-wrap gap-3 border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700">
          <Button type="submit" form={formId} loading={saving} disabled={photoBusy || reviewBusy || reviewDirty}>{text(saving ? 'saving' : 'save')}</Button>
          <Button type="button" variant="ghost" disabled={saving || photoBusy || reviewBusy} onClick={close}>{text('cancel')}</Button>
        </div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
