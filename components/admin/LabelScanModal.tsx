'use client'
// components/admin/LabelScanModal.tsx
// Camera / file-upload modal that scans a product label and extracts allergen info
// using the /api/scan-label endpoint (GPT-4o vision).
//
// Usage:
//   <LabelScanModal
//     open={showScan}
//     onClose={() => setShowScan(false)}
//     onAccept={(data) => { setIngredient({ ...ingredient, ...data }) }}
//   />

import { useRef, useState, useCallback } from 'react'
import {
  Camera, Upload, X, ScanLine, CheckCircle, AlertTriangle,
  RefreshCw, ChevronRight, Info, FileText
} from 'lucide-react'
import type { AllergenWarnings } from '@/types/allergen'
import { ALLERGEN_LIST } from '@/types/allergen'

export interface ScanResult {
  name: string
  description: string
  allergen_warnings: AllergenWarnings
  notes: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onAccept: (result: ScanResult) => void
}

type Stage = 'idle' | 'preview' | 'scanning' | 'result' | 'error'

const LEVEL_LABELS: Record<string, { label: string; colour: string }> = {
  none:               { label: 'None',               colour: 'text-gray-400' },
  contains:           { label: 'Contains',           colour: 'text-red-600 font-semibold' },
  may_contain:        { label: 'May contain',        colour: 'text-amber-600 font-semibold' },
  traces:             { label: 'Traces',             colour: 'text-amber-500' },
  cross_contamination:{ label: 'Cross-contamination',colour: 'text-orange-500' },
  not_suitable:       { label: 'Not suitable',       colour: 'text-red-500 font-semibold' },
}

function AllergenResultRow({ id, name, level }: { id: string; name: string; level: string }) {
  if (level === 'none') return null
  const meta = LEVEL_LABELS[level] ?? LEVEL_LABELS.none
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{name}</span>
      <span className={`text-xs ${meta.colour}`}>{meta.label}</span>
    </div>
  )
}

// Compress + resize image client-side before uploading (keeps API cost low)
async function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function LabelScanModal({ open, onClose, onAccept }: Props) {
  const [stage, setStage]         = useState<Stage>('idle')
  const [preview, setPreview]     = useState<string | null>(null)
  const [isDocument, setIsDocument] = useState(false)
  const [docName, setDocName]     = useState('')
  const [result, setResult]       = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg]   = useState('')
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const cameraInputRef            = useRef<HTMLInputElement>(null)
  const docInputRef               = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStage('idle')
    setPreview(null)
    setIsDocument(false)
    setDocName('')
    setResult(null)
    setErrorMsg('')
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleFileSelected = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.')
      setStage('error')
      return
    }
    try {
      const dataUrl = await compressImage(file)
      setIsDocument(false)
      setPreview(dataUrl)
      setStage('preview')
    } catch {
      setErrorMsg('Could not read the image. Please try again.')
      setStage('error')
    }
  }, [])

  const handleDocSelected = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Please select a PDF or Word document (.pdf, .docx, .doc).')
      setStage('error')
      return
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      setIsDocument(true)
      setDocName(file.name)
      setPreview(dataUrl)
      setStage('preview')
    } catch {
      setErrorMsg('Could not read the document. Please try again.')
      setStage('error')
    }
  }, [])

  const handleScan = useCallback(async () => {
    if (!preview) return
    setStage('scanning')
    try {
      const body = isDocument
        ? { document: preview }
        : { image: preview }

      const res = await fetch('/api/scan-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Scan failed.')
      }

      setResult(data as ScanResult)
      setStage('result')
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
      setStage('error')
    }
  }, [preview])

  const handleAccept = useCallback(() => {
    if (result) {
      onAccept(result)
      handleClose()
    }
  }, [result, onAccept, handleClose])

  if (!open) return null

  const detectedAllergens = result
    ? ALLERGEN_LIST.filter(a => result.allergen_warnings[a.id] !== 'none')
    : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan product label"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-[#42b8ac] to-[#003842] rounded-lg">
              <ScanLine className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Scan Product Label</h2>
              <p className="text-xs text-gray-500">AI-powered allergen extraction</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── IDLE ──────────────────────────────────────────────────────── */}
          {stage === 'idle' && (
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                Take a photo or upload an image of the product label, or upload a product datasheet (PDF or Word).
                The AI will read the allergen information — you can review and correct it before saving.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Camera button (mobile: opens rear camera) */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-[#42b8ac]/40 rounded-xl hover:border-[#42b8ac] hover:bg-[#42b8ac]/5 transition-all group"
                >
                  <div className="p-3 bg-[#42b8ac]/10 rounded-full group-hover:bg-[#42b8ac]/20 transition-colors">
                    <Camera className="h-6 w-6 text-[#42b8ac]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Take Photo</span>
                  <span className="text-xs text-gray-400">Use your camera</span>
                </button>

                {/* Image file upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#42b8ac] hover:bg-[#42b8ac]/5 transition-all group"
                >
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-[#42b8ac]/20 transition-colors">
                    <Upload className="h-6 w-6 text-gray-500 group-hover:text-[#42b8ac]" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Image</span>
                  <span className="text-xs text-gray-400">JPG, PNG, WEBP</span>
                </button>
              </div>

              {/* Document upload — full width */}
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-[#42b8ac] hover:bg-[#42b8ac]/5 transition-all group mb-4"
              >
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-[#42b8ac]/20 transition-colors shrink-0">
                  <FileText className="h-6 w-6 text-gray-500 group-hover:text-[#42b8ac]" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Datasheet</span>
                  <span className="text-xs text-gray-400">PDF or Word document (.pdf, .docx)</span>
                </div>
              </button>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  For best results, ensure the <strong>ingredients list</strong> and{' '}
                  <strong>allergen warnings</strong> sections are clearly visible and well-lit (images),
                  or use a supplier datasheet in PDF/Word format.
                </p>
              </div>

              {/* Hidden inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => handleFileSelected(e.target.files?.[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileSelected(e.target.files?.[0])}
              />
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={e => handleDocSelected(e.target.files?.[0])}
              />
            </div>
          )}

          {/* ── PREVIEW ───────────────────────────────────────────────────── */}
          {stage === 'preview' && preview && (
            <div className="p-5">
              {isDocument ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4 border border-gray-200 dark:border-gray-700">
                  <div className="p-4 bg-[#42b8ac]/10 rounded-full">
                    <FileText className="h-10 w-10 text-[#42b8ac]" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center max-w-xs break-all">{docName}</p>
                  <p className="text-xs text-gray-400">Ready to scan</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Label to scan"
                    className="w-full max-h-72 object-contain"
                  />
                </div>
              )}
              <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-5">
                {isDocument
                  ? <>Document loaded. Tap <strong>Scan Document</strong> to extract allergen info.</>
                  : <>Is the label clearly readable? Then tap <strong>Scan Label</strong> to extract allergen info.</>
                }
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {isDocument ? 'Choose Different' : 'Retake'}
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  className="flex-[2] py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#42b8ac] to-[#003842] text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <ScanLine className="h-4 w-4" />
                  {isDocument ? 'Scan Document' : 'Scan Label'}
                </button>
              </div>
            </div>
          )}

          {/* ── SCANNING ──────────────────────────────────────────────────── */}
          {stage === 'scanning' && (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-[#42b8ac]/20 border-t-[#42b8ac] animate-spin" />
                <ScanLine className="absolute inset-0 m-auto h-7 w-7 text-[#42b8ac]" />
              </div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">Reading label…</p>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                AI is analysing the ingredients list and allergen declarations. This usually takes a few seconds.
              </p>
            </div>
          )}

          {/* ── RESULT ────────────────────────────────────────────────────── */}
          {stage === 'result' && result && (
            <div className="p-5">
              {/* Name */}
              <div className="flex items-start gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Detected Name</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {result.name || <em className="text-gray-400 font-normal">Not detected</em>}
                  </p>
                  {result.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{result.description}</p>
                  )}
                </div>
              </div>

              {/* Allergens */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Allergens found ({detectedAllergens.length} of 14)
                </p>
                {detectedAllergens.length === 0 ? (
                  <div className="py-3 px-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400">No allergens detected on this label.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-1">
                    {detectedAllergens.map(a => (
                      <AllergenResultRow
                        key={a.id}
                        id={a.id}
                        name={a.name}
                        level={result.allergen_warnings[a.id]}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Non-detected list */}
              <details className="mb-4 group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                  {14 - detectedAllergens.length} allergens not found
                </summary>
                <div className="mt-1.5 pl-4 space-y-1">
                  {ALLERGEN_LIST.filter(a => result.allergen_warnings[a.id] === 'none').map(a => (
                    <p key={a.id} className="text-xs text-gray-400">{a.name}</p>
                  ))}
                </div>
              </details>

              {/* AI notes */}
              {result.notes.length > 0 && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">AI notes</p>
                    {result.notes.map((n, i) => (
                      <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{n}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mb-5 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Always verify extracted information against the original label. AI may make errors —
                  you remain responsible for the accuracy of allergen declarations.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Rescan
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex-[2] py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#42b8ac] to-[#003842] text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Use these results
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ─────────────────────────────────────────────────────── */}
          {stage === 'error' && (
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Scan failed</p>
                <p className="text-sm text-gray-500">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
