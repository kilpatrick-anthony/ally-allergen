'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { LabelSuggestions } from '@/components/admin/QuickAddPhotos'

type Suggestions = LabelSuggestions & { barcode: string; category: string; last_updated: string | null; source_url: string }
type Props = { disabled?: boolean; onApply: (suggestions: Suggestions) => void }

const knownErrors = ['barcodeInvalid', 'barcodeNotFound', 'barcodeUnavailable', 'unauthorized', 'forbidden']

export default function QuickAddBarcode({ disabled, onApply }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const helpId = useId()
  const [barcode, setBarcode] = useState('')
  const [busy, setBusy] = useState(false)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Suggestions | null>(null)

  async function lookup(value = barcode, fromPhoto = false) {
    if (busy || (readingPhoto && !fromPhoto) || disabled) return
    setBusy(true); setError(''); setResult(null)
    try {
      const response = await fetch(`/api/product-barcode?barcode=${encodeURIComponent(value.trim())}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResult(data.suggestions)
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setError(knownErrors.includes(code) ? code : 'barcodeUnavailable')
    } finally { setBusy(false) }
  }

  async function readPhoto(file: File) {
    if (busy || readingPhoto || disabled) return
    setReadingPhoto(true); setError(''); setResult(null)
    let url = ''
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('barcodePhotoTooLarge')
      if (!file.type.startsWith('image/')) throw new Error('barcodePhotoUnreadable')
      url = URL.createObjectURL(file)
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url)
      const value = result.getText().replace(/\D/g, '')
      if (!/^\d{8,14}$/.test(value)) throw new Error('barcodePhotoUnreadable')
      setBarcode(value)
      setReadingPhoto(false)
      await lookup(value, true)
      return
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setError(['barcodePhotoTooLarge', 'barcodePhotoUnreadable'].includes(code) ? code : 'barcodePhotoUnreadable')
    } finally {
      if (url) URL.revokeObjectURL(url)
      setReadingPhoto(false)
    }
  }

  const working = busy || readingPhoto

  return <details className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">{text('barcodeTitle')}</summary>
    <p id={helpId} className="mb-3 text-sm text-gray-700 dark:text-gray-200">{text('barcodeHelp')}</p>
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-48 flex-1 text-sm font-medium">{text('barcode')}
        <input inputMode="numeric" autoComplete="off" pattern="[0-9]{8,14}" minLength={8} maxLength={14} required
          aria-describedby={helpId} value={barcode} onChange={event => { setBarcode(event.target.value.replace(/\D/g, '').slice(0, 14)); setError(''); setResult(null) }}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void lookup() } }}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
      </label>
      <Button type="button" variant="tealOutline" loading={busy} disabled={disabled || working} onClick={() => void lookup()}>{text(busy ? 'barcodeLooking' : 'barcodeLookup')}</Button>
    </div>
    <div className="mt-3">
      <label className={`relative inline-flex min-h-11 items-center rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-teal-600 ${working || disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        {text(readingPhoto ? 'barcodeReading' : 'barcodeTakePhoto')}
        <input type="file" accept="image/*" capture="environment" disabled={disabled || working}
          aria-label={text('barcodeTakePhoto')} aria-describedby={`${helpId}-photo`} className="absolute inset-0 w-full opacity-0"
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void readPhoto(file) }} />
      </label>
      <p id={`${helpId}-photo`} className="mt-1 text-xs text-gray-500 dark:text-gray-300">{text('barcodePhotoHelp')}</p>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{text(error)}</p>}
    {result && <div className="mt-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-950 dark:bg-teal-950 dark:text-teal-50">
      <p role="status" className="font-semibold">{result.name || text('barcodeFound')}</p>
      <p className="mt-1">{text('barcodeReview')}</p>
      {result.last_updated && <p className="mt-1">{text('barcodeUpdated')}: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(result.last_updated))}</p>}
      <a className="mt-1 inline-block underline" href={result.source_url} target="_blank" rel="noopener noreferrer">{text('barcodeSource')}</a>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="teal" onClick={() => { onApply(result); setResult(null) }}>{text('applySuggestions')}</Button>
        <Button type="button" variant="ghost" onClick={() => setResult(null)}>{text('dismissSuggestions')}</Button>
      </div>
    </div>}
  </details>
}
