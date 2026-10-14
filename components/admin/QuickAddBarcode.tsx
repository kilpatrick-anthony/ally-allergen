'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { LabelSuggestions } from '@/components/admin/QuickAddPhotos'

type Suggestions = LabelSuggestions & { barcode: string; category: string; last_updated: string | null; source_url: string }
type Props = { disabled?: boolean; onApply: (suggestions: Suggestions) => void; expanded?: boolean }

const knownErrors = ['barcodeInvalid', 'barcodeNotFound', 'barcodeUnavailable', 'unauthorized', 'forbidden']

async function decodeBarcodePhoto(url: string) {
  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'), import('@zxing/library'),
  ])
  const image = new Image()
  image.src = url
  await image.decode()
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('barcodePhotoUnreadable')

  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight))
  const source = document.createElement('canvas')
  source.width = Math.max(1, Math.round(image.naturalWidth * scale))
  source.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const sourceContext = source.getContext('2d')
  if (!sourceContext) throw new Error('barcodePhotoUnreadable')
  sourceContext.fillStyle = '#fff'; sourceContext.fillRect(0, 0, source.width, source.height)
  sourceContext.drawImage(image, 0, 0, source.width, source.height)

  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.ITF,
  ])
  const reader = new BrowserMultiFormatOneDReader(hints)
  const crops = [
    { x: 0, y: 0, width: source.width, height: source.height },
    { x: Math.round(source.width * 0.08), y: Math.round(source.height * 0.2), width: Math.round(source.width * 0.84), height: Math.round(source.height * 0.6) },
  ]
  const attempts = crops.flatMap(crop => [
    { crop, rotation: 0, contrast: false }, { crop, rotation: 90, contrast: false },
    { crop, rotation: 270, contrast: false }, { crop, rotation: 0, contrast: true },
  ])
  for (const { crop, rotation, contrast } of attempts) {
    const sideways = rotation === 90 || rotation === 270
    const canvas = document.createElement('canvas')
    canvas.width = sideways ? crop.height : crop.width
    canvas.height = sideways ? crop.width : crop.height
    const context = canvas.getContext('2d')
    if (!context) continue
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    if (contrast) context.filter = 'grayscale(1) contrast(1.8)'
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate(rotation * Math.PI / 180)
    context.drawImage(source, crop.x, crop.y, crop.width, crop.height, -crop.width / 2, -crop.height / 2, crop.width, crop.height)
    try { return reader.decodeFromCanvas(canvas).getText() } catch { await Promise.resolve() }
  }
  throw new Error('barcodePhotoUnreadable')
}

export default function QuickAddBarcode({ disabled, onApply, expanded = false }: Props) {
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
      const value = (await decodeBarcodePhoto(url)).replace(/\D/g, '')
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

  return <details open={expanded || undefined} className="rounded-lg border border-gray-300 p-3 dark:border-gray-600">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">{text('barcodeTitle')} <span className="font-normal text-gray-500 dark:text-gray-300">({text('optional')})</span></summary>
    <p id={helpId} className="mb-3 text-sm text-gray-700 dark:text-gray-200">{text('barcodeHelp')}</p>
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-48 flex-1 text-sm font-medium">{text('barcode')}
        <input inputMode="numeric" autoComplete="off" maxLength={14}
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
