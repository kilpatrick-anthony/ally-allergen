'use client'

import { useEffect, useId, useState } from 'react'
import { FileText, ScanLine, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { LabelSuggestions } from './QuickAddPhotos'
import { ALLERGEN_LIST } from '@/types/allergen'

type Datasheet = { id: string; file_name: string; content_type: string; byte_size: number; state: string; created_at: string }
type Props = { draftId: string; disabled?: boolean; excludeIds?: string[]; onActivity?: (busy: boolean) => void; onApplySuggestions?: (suggestions: LabelSuggestions) => void }

export default function QuickAddDatasheets({ draftId, disabled, excludeIds, onActivity, onApplySuggestions }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const helpId = useId()
  const base = `/api/quick-add-drafts/${draftId}/datasheets`
  const [items, setItems] = useState<Datasheet[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ id: string; values: LabelSuggestions } | null>(null)

  async function extract(item: Datasheet) {
    if (blocked || extracting) return
    setExtracting(item.id); onActivity?.(true); setError(''); setSuggestions(null)
    try {
      const response = await fetch(`${base}/${item.id}/extract`, { method: 'POST', signal: AbortSignal.timeout(55000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setSuggestions({ id: item.id, values: result.suggestions })
    } catch (reason) {
      const code = reason instanceof Error ? reason.name === 'TimeoutError' ? 'datasheetExtractionTimeout' : reason.message : ''
      setError(['datasheetLegacyWord', 'datasheetUnreadable', 'datasheetExtractionUnavailable', 'datasheetExtractionFailed', 'datasheetExtractionBusy', 'datasheetExtractionTimeout', 'editConflict', 'notFound', 'forbidden', 'unauthorized'].includes(code) ? code : 'datasheetExtractionFailed')
    } finally { setExtracting(null); onActivity?.(false) }
  }

  useEffect(() => {
    const controller = new AbortController()
    void fetch(base, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setItems(result.datasheets)
    }).catch(() => { if (!controller.signal.aborted) setError('datasheetLoadFailed') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [base])

  async function upload(file: File) {
    if (disabled || working || extracting) return
    setWorking(true); onActivity?.(true); setError('')
    try {
      const id = crypto.randomUUID()
      const response = await fetch(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }, body: file, signal: AbortSignal.timeout(30000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setItems(current => [...current, result.datasheet])
      setSelectedId(result.datasheet.id)
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setError(['datasheetTooLarge','datasheetFormat','datasheetLimit','datasheetConflict','editConflict'].includes(code) ? code : 'datasheetUploadFailed')
    } finally { setWorking(false); onActivity?.(false) }
  }

  async function remove(item: Datasheet) {
    if (disabled || working || extracting || !window.confirm(`${text('removeDatasheetConfirm')}\n\n${item.file_name}`)) return
    setWorking(true); onActivity?.(true); setError('')
    try {
      const response = await fetch(`${base}/${item.id}`, { method: 'DELETE', signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error((await response.json()).error)
      setItems(current => current.filter(current => current.id !== item.id))
      if (suggestions?.id === item.id) setSuggestions(null)
    } catch { setError('datasheetRemoveFailed') }
    finally { setWorking(false); onActivity?.(false) }
  }

  const visible = items.filter(item => !excludeIds?.includes(item.id))
  const analysable = visible.filter(item => item.state === 'ready')
  const selected = analysable.find(item => item.id === selectedId) || analysable[analysable.length - 1]
  const blocked = disabled || working || loading || !!extracting
  return <section aria-label={text('datasheets')} className="mt-5 space-y-3 border-t pt-4 dark:border-gray-700">
    <h3 className="font-semibold">{text('datasheets')} <span className="font-normal text-gray-500 dark:text-gray-300">({text('optional')})</span></h3>
    <p id={helpId} className="text-sm text-gray-600 dark:text-gray-300">{text('datasheetHelp')}</p>
    {loading ? <p role="status">{text('loading')}</p> : <>
      <div className="flex flex-wrap items-end gap-3">
      <label className={`relative inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-teal-600 ${blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <Upload className="h-4 w-4" aria-hidden="true" />{text('uploadDatasheet')}
        <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={blocked} aria-describedby={helpId} className="absolute inset-0 w-full opacity-0" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file) }} />
      </label>
      {onApplySuggestions && <>
        {analysable.length > 1 && <label className="min-w-0 max-w-full text-sm font-medium">{text('datasheetToAnalyse')}
          <select aria-label={text('datasheetToAnalyse')} value={selected?.id || ''} disabled={blocked} onChange={event => setSelectedId(event.target.value)} className="mt-1 block min-h-11 w-full max-w-full rounded-lg border bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            {analysable.map(item => <option key={item.id} value={item.id}>{item.file_name}</option>)}
          </select>
        </label>}
        <Button type="button" icon={ScanLine} variant="tealOutline" disabled={blocked || !selected}
          aria-label={selected ? `${text('analyseDatasheet')}: ${selected.file_name}` : text('analyseDatasheet')}
          onClick={() => { if (selected) void extract(selected) }}>{text(extracting ? 'analysingDatasheet' : 'analyseDatasheet')}</Button>
      </>}
      </div>
      {working && <p role="status">{text('datasheetWorking')}</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{text(error)}</p>}
      {!!items.length && <ul className="space-y-2">{visible.map(item => <li key={item.id} className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
        <a href={`${base}/${item.id}`} className="flex min-w-0 items-center gap-2 font-medium text-teal-700 underline dark:text-teal-300"><FileText className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">{item.file_name}</span></a>
        <Button type="button" variant="ghost" size="sm" icon={Trash2} disabled={blocked} aria-label={`${text('removeDatasheet')}: ${item.file_name}`} onClick={() => void remove(item)}>{text('removeDatasheet')}</Button>
        </div>
        {suggestions?.id === item.id && <div className="space-y-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-950 dark:bg-teal-950 dark:text-teal-50">
          <p role="status" className="font-semibold">{text('suggestionsReady')}</p><p>{text('datasheetSuggestionsReview')}</p>
          {suggestions.values.name && <p className="break-words"><span className="font-medium">{text('suggestedName')}: </span>{suggestions.values.name}</p>}
          <dl className="space-y-1">{ALLERGEN_LIST.map(allergen => {
            const level = suggestions.values.allergen_warnings[allergen.id]
            return typeof level === 'string' && level !== 'none' ? <div key={allergen.id}><dt className="inline font-medium">{t(`allergenNames.${allergen.id}`)}: </dt><dd className="inline">{text(`level_${level}`)}</dd></div> : null
          })}</dl>
          {suggestions.values.dietary_tags.length > 0 && <p>{text('dietaryTags')}: {suggestions.values.dietary_tags.map(tag => text(`tag_${tag}`)).join(', ')}</p>}
          {suggestions.values.notes.length > 0 && <ul className="list-disc pl-4">{suggestions.values.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="teal" disabled={disabled} onClick={() => { onApplySuggestions?.(suggestions.values); setSuggestions(null) }}>{text('applySuggestions')}</Button>
            <Button type="button" variant="ghost" onClick={() => setSuggestions(null)}>{text('dismissSuggestions')}</Button>
          </div>
        </div>}
      </li>)}</ul>}
    </>}
  </section>
}
