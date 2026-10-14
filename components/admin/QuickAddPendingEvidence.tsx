'use client'

import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { LabelSuggestions } from './QuickAddPhotos'
import { ALLERGEN_LIST } from '@/types/allergen'
import { prepareQuickAddPhoto } from './QuickAddPhotos'

export type PendingEvidence = { id: string; kind: 'photo' | 'datasheet'; name: string; blob: Blob; error?: string }

export default function QuickAddPendingEvidence({ kind, items, onChange, disabled, onBusy, onApplySuggestions }: {
  kind: PendingEvidence['kind']; items: PendingEvidence[]; onChange: (items: PendingEvidence[]) => void
  disabled: boolean; onBusy: (busy: boolean) => void; onApplySuggestions?: (values: LabelSuggestions) => void
}) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const helpId = useId()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ id: string; values: LabelSuggestions } | null>(null)
  async function extract(item: PendingEvidence) {
    if (disabled || working || extracting) return
    setExtracting(item.id); onBusy(true); setError(''); setSuggestions(null)
    try {
      const extension = item.name.split('.').pop()?.toLowerCase()
      const mime = extension === 'pdf' ? 'application/pdf' : extension === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const response = await fetch('/api/quick-add-datasheets/extract', {
        method: 'POST', headers: { 'Content-Type': mime, 'X-File-Name': encodeURIComponent(item.name) },
        body: item.blob, signal: AbortSignal.timeout(55000),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setSuggestions({ id: item.id, values: result.suggestions })
    } catch (reason) {
      const code = reason instanceof Error ? reason.name === 'TimeoutError' ? 'datasheetExtractionTimeout' : reason.message : ''
      setError(['datasheetLegacyWord', 'datasheetUnreadable', 'datasheetTooLarge', 'datasheetFormat', 'datasheetExtractionUnavailable', 'datasheetExtractionFailed', 'datasheetExtractionBusy', 'datasheetExtractionTimeout', 'unauthorized', 'forbidden'].includes(code) ? code : 'datasheetExtractionFailed')
    } finally { setExtracting(null); onBusy(false) }
  }
  const visible = items.filter(item => item.kind === kind)
  async function choose(files: File[]) {
    if (disabled || working || !files.length) return
    setWorking(true); onBusy(true); setError('')
    try {
      if (visible.length + files.length > (kind === 'photo' ? 12 : 3)) throw new Error(kind === 'photo' ? 'photoLimit' : 'datasheetLimit')
      const additions: PendingEvidence[] = []
      for (const file of files) {
        if (kind === 'datasheet') {
          if (file.size > 6 * 1024 * 1024) throw new Error('datasheetTooLarge')
          if (!file.size || !/\.(pdf|docx?)$/i.test(file.name)) throw new Error('datasheetFormat')
        }
        const blob = kind === 'photo' ? await prepareQuickAddPhoto(file) : file
        additions.push({ id: crypto.randomUUID(), kind, name: file.name, blob })
      }
      onChange([...items, ...additions])
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'photoFailed') }
    finally { setWorking(false); onBusy(false) }
  }
  const blocked = disabled || working || !!extracting
  return <section className="space-y-3" aria-label={text(kind === 'photo' ? 'photos' : 'datasheets')}>
    <p id={helpId} className="text-sm text-gray-600 dark:text-gray-300">{text(kind === 'photo' ? 'photoHelp' : 'datasheetHelp')}</p>
    <div className="flex flex-wrap gap-3">
      {kind === 'photo' && <label className="relative inline-flex min-h-11 items-center rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-teal-600">
        {text('takePhoto')}<input type="file" accept="image/*" capture="environment" aria-label={text('takePhoto')} aria-describedby={helpId} disabled={blocked}
          className="absolute inset-0 w-full opacity-0" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void choose(files) }} />
      </label>}
      <label className="relative inline-flex min-h-11 items-center rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-teal-600">
        {text(kind === 'photo' ? 'choosePhotos' : 'uploadDatasheet')}
        <input type="file" multiple accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif' : '.pdf,.doc,.docx'}
          aria-label={text(kind === 'photo' ? 'choosePhotos' : 'uploadDatasheet')} aria-describedby={helpId} disabled={blocked}
          className="absolute inset-0 w-full opacity-0" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void choose(files) }} />
      </label>
    </div>
    <p className="text-xs text-gray-600 dark:text-gray-300">{text('filesSaveHelp')}</p>
    {working && <p role="status">{text('photoWorking')}</p>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{text(error)}</p>}
    <ul className="space-y-2">{visible.map(item => <li key={item.id} className="rounded-lg border p-3">
      {kind === 'photo' && <PendingPhoto blob={item.blob} name={item.name} />}
      <p className="break-words text-sm font-medium">{item.name}</p>
      {item.error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{text(item.error)}</p>}
      <p className={`text-xs ${item.error ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>{text(item.error ? 'filesRetryHelp' : 'filesPending')}</p>
      {kind === 'datasheet' && onApplySuggestions && <Button type="button" variant="tealOutline" disabled={blocked} aria-label={`${text('analyseDatasheet')}: ${item.name}`} onClick={() => void extract(item)}>{text(extracting === item.id ? 'analysingDatasheet' : 'analyseDatasheet')}</Button>}
      {suggestions?.id === item.id && <div className="my-3 space-y-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-950 dark:bg-teal-950 dark:text-teal-50">
        <p role="status" className="font-semibold">{text('suggestionsReady')}</p>
        <p>{text('datasheetSuggestionsReview')}</p>
        {suggestions.values.name && <p className="break-words">{text('suggestedName')}: {suggestions.values.name}</p>}
        {suggestions.values.description && <p>{suggestions.values.description}</p>}
        <dl>{ALLERGEN_LIST.map(allergen => {
          const level = suggestions.values.allergen_warnings[allergen.id]
          return typeof level === 'string' && level !== 'none' ? <div key={allergen.id}><dt className="inline font-medium">{t(`allergenNames.${allergen.id}`)}: </dt><dd className="inline">{text(`level_${level}`)}</dd></div> : null
        })}</dl>
        {suggestions.values.dietary_tags.length > 0 && <p>{text('dietaryTags')}: {suggestions.values.dietary_tags.map(tag => text(`tag_${tag}`)).join(', ')}</p>}
        {suggestions.values.notes.length > 0 && <ul className="list-disc pl-4">{suggestions.values.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="teal" disabled={blocked} onClick={() => { onApplySuggestions?.(suggestions.values); setSuggestions(null) }}>{text('applySuggestions')}</Button>
          <Button type="button" variant="ghost" disabled={blocked} onClick={() => setSuggestions(null)}>{text('dismissSuggestions')}</Button>
        </div>
      </div>}
      <Button type="button" variant="ghost" disabled={blocked} onClick={() => { if (suggestions?.id === item.id) setSuggestions(null); onChange(items.filter(entry => entry.id !== item.id)) }}>{text(kind === 'photo' ? 'removePhoto' : 'removeDatasheet')}</Button>
    </li>)}</ul>
  </section>
}

function PendingPhoto({ blob, name }: { blob: Blob; name: string }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const preview = URL.createObjectURL(blob); setUrl(preview); return () => URL.revokeObjectURL(preview) }, [blob])
  // Local previews must not pass through the shared image cache.
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={name} className="mb-2 h-40 w-full rounded object-contain" /> : null
}
