// app/admin/ingredients/bulk/page.tsx
// Bulk import ingredients by uploading label images or ingredient document files.
// Images → /api/scan-label (GPT-4o vision)
// PDF / DOCX / DOC / TXT → /api/parse-document (GPT-4o text)
// Users review/edit extracted drafts, then create all approved ones.
'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Upload, X, CheckCircle, AlertCircle,
  Loader2, Trash2, Check, Package, Sparkles,
  ChevronDown, ChevronUp, Info, FileText, File
} from 'lucide-react'
import { Container } from '../../../components/layout/Container'
import { Card } from '../../../components/layout/Card'
import { Button } from '../../../components/ui/Button'
// ── Types ─────────────────────────────────────────────────────────────────────

type ScanStatus = 'pending' | 'scanning' | 'done' | 'error'
type RowStatus = 'approved' | 'rejected'
type AllergenLevel = 'none' | 'contains' | 'may_contain' | 'traces' | 'cross_contamination'
type AllergenKey =
  | 'cereals_gluten' | 'crustaceans' | 'eggs' | 'fish' | 'peanuts' | 'soybeans'
  | 'milk' | 'nuts' | 'celery' | 'mustard' | 'sesame' | 'sulphites' | 'lupin' | 'molluscs'
type SimpleWarnings = Record<AllergenKey, AllergenLevel>

const ALLERGEN_KEYS: AllergenKey[] = [
  'cereals_gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
  'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
]

const ALLERGEN_LABELS: Record<AllergenKey, string> = {
  cereals_gluten: 'Gluten',
  crustaceans: 'Crustaceans',
  eggs: 'Eggs',
  fish: 'Fish',
  peanuts: 'Peanuts',
  soybeans: 'Soy',
  milk: 'Milk',
  nuts: 'Nuts',
  celery: 'Celery',
  mustard: 'Mustard',
  sesame: 'Sesame',
  sulphites: 'Sulphites',
  lupin: 'Lupin',
  molluscs: 'Molluscs',
}

const LEVEL_COLOURS: Record<string, string> = {
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  contains: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  may_contain: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  traces: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  cross_contamination: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
}

function defaultWarnings(): SimpleWarnings {
  return Object.fromEntries(ALLERGEN_KEYS.map(k => [k, 'none' as AllergenLevel])) as SimpleWarnings
}

type FileKind = 'image' | 'document'

function fileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image'
  return 'document'
}

const ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  '.pdf,.doc,.docx,.txt,.csv',
].join(',')

interface BulkRow {
  id: string
  file: File
  kind: FileKind
  previewUrl: string // image only
  scanStatus: ScanStatus
  scanError?: string
  notes: string[]
  rowStatus: RowStatus
  expanded: boolean
  // Editable fields
  name: string
  description: string
  supplier: string
  allergen_warnings: SimpleWarnings
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const [rows, setRows] = useState<BulkRow[]>([])
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File handling ──────────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted = Array.from(files).filter(f => {
      const t = f.type
      const n = f.name.toLowerCase()
      return (
        t.startsWith('image/') ||
        t === 'application/pdf' ||
        t === 'application/msword' ||
        t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        t.startsWith('text/') ||
        n.endsWith('.pdf') || n.endsWith('.doc') || n.endsWith('.docx') ||
        n.endsWith('.txt') || n.endsWith('.csv')
      )
    })
    if (accepted.length === 0) return

    const newRows: BulkRow[] = accepted.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      kind: fileKind(file),
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      scanStatus: 'pending',
      notes: [],
      rowStatus: 'approved',
      expanded: false,
      name: '',
      description: '',
      supplier: '',
      allergen_warnings: defaultWarnings(),
    }))

    setRows(prev => [...prev, ...newRows])

    // Kick off scanning each new row after state settles
    newRows.forEach(row => scanRow(row))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scanRow = async (row: BulkRow) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, scanStatus: 'scanning' } : r))

    try {
      const base64 = await fileToBase64(row.file)
      const isImage = row.kind === 'image'
      const res = await fetch(isImage ? '/api/scan-label' : '/api/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isImage
            ? { image: base64 }
            : { file: base64, mimeType: row.file.type, fileName: row.file.name }
        ),
      })
      const data = await res.json()

      if (!res.ok) {
        setRows(prev => prev.map(r => r.id === row.id
          ? { ...r, scanStatus: 'error', scanError: data.error || 'Scan failed' }
          : r))
        return
      }

      setRows(prev => prev.map(r => r.id === row.id
        ? {
            ...r,
            scanStatus: 'done',
            name: data.name || r.name,
            description: data.description || r.description,
            allergen_warnings: data.allergen_warnings || defaultWarnings(),
            notes: data.notes || [],
          }
        : r))
    } catch {
      setRows(prev => prev.map(r => r.id === row.id
        ? { ...r, scanStatus: 'error', scanError: 'Network error — check connection' }
        : r))
    }
  }

  const retryScan = (row: BulkRow) => scanRow(row)

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id))

  const toggleExpanded = (id: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r))

  const toggleApproval = (id: string) =>
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, rowStatus: r.rowStatus === 'approved' ? 'rejected' : 'approved' }
      : r))

  const updateField = (id: string, field: keyof BulkRow, value: any) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

  const updateAllergen = (id: string, key: AllergenKey, value: string) =>
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, allergen_warnings: { ...r.allergen_warnings, [key]: value } }
      : r))

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dropRef.current?.classList.remove('border-teal-500', 'bg-teal-50', 'dark:bg-teal-900/10')
    addFiles(e.dataTransfer.files)
  }
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    dropRef.current?.classList.add('border-teal-500', 'bg-teal-50', 'dark:bg-teal-900/10')
  }
  const handleDragLeave = () => {
    dropRef.current?.classList.remove('border-teal-500', 'bg-teal-50', 'dark:bg-teal-900/10')
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const approvedRows = rows.filter(r => r.rowStatus === 'approved' && r.scanStatus === 'done')

  const handleCreateAll = async () => {
    if (approvedRows.length === 0) return
    setSaving(true)
    setSaveErrors([])
    let created = 0
    const errors: string[] = []

    for (const row of approvedRows) {
      try {
        const res = await fetch('/api/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row.name || row.file.name.replace(/\.[^.]+$/, ''),
            description: row.description,
            allergen_warnings: row.allergen_warnings,
            suppliers: row.supplier ? [row.supplier] : [],
            certifications: [],
          }),
        })
        if (res.ok) {
          created++
          setRows(prev => prev.filter(r => r.id !== row.id))
        } else {
          const d = await res.json()
          errors.push(`"${row.name}": ${d.error || 'Save failed'}`)
        }
      } catch {
        errors.push(`"${row.name}": Network error`)
      }
    }

    setSaving(false)
    setSavedCount(created)
    setSaveErrors(errors)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const statusIcon = (row: BulkRow) => {
    if (row.scanStatus === 'scanning') return <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
    if (row.scanStatus === 'done') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (row.scanStatus === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />
    return <Loader2 className="h-4 w-4 text-gray-300" />
  }

  const scanningCount = rows.filter(r => r.scanStatus === 'scanning').length

  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/ingredients"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ingredients
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk Import Ingredients</h1>
            <p className="text-gray-600 dark:text-gray-300">Upload label images — AI extracts allergen data automatically</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-6 border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/10">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-200 space-y-1">
            <p className="font-semibold">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-teal-700 dark:text-teal-300">
              <li>Drop or select label images <strong>or</strong> datasheets (PDF, DOCX, DOC, TXT)</li>
              <li>AI reads each file and fills in the allergen profile automatically</li>
              <li>Review and edit the extracted data — tick or untick rows to include/exclude</li>
              <li>Click <strong>Create Selected</strong> to save approved ingredients</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Drop zone */}
      <Card className="mb-6">
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10"
        >
          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-200">
            Drop files here, or <span className="text-teal-600 dark:text-teal-400 underline">browse</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">Images (JPG, PNG, WebP) &middot; Documents (PDF, DOCX, DOC, TXT) — upload as many as you like</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>
      </Card>

      {/* Success banner */}
      {savedCount !== null && (
        <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-300">
                {savedCount} ingredient{savedCount !== 1 ? 's' : ''} created successfully
              </p>
              {saveErrors.length > 0 && (
                <ul className="mt-1 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                  {saveErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
            <Link href="/admin/ingredients">
              <Button variant="ghost" size="sm">View Ingredients</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Rows */}
      {rows.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {rows.length} image{rows.length !== 1 ? 's' : ''}
                {scanningCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-teal-600 dark:text-teal-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Scanning {scanningCount}…
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {approvedRows.length} selected
              </span>
              <Button
                variant="primary"
                icon={Package}
                onClick={handleCreateAll}
                disabled={saving || approvedRows.length === 0}
              >
                {saving ? 'Creating…' : `Create ${approvedRows.length > 0 ? approvedRows.length : ''} Selected`}
              </Button>
            </div>
          </div>

          {/* Row cards */}
          <div className="space-y-3">
            {rows.map(row => (
              <Card key={row.id} className={`transition-opacity ${row.rowStatus === 'rejected' ? 'opacity-50' : ''}`}>
                {/* Row header */}
                <div className="flex items-center gap-3">
                  {/* Approve checkbox */}
                  <button
                    onClick={() => toggleApproval(row.id)}
                    title={row.rowStatus === 'approved' ? 'Exclude from import' : 'Include in import'}
                    className={`shrink-0 h-6 w-6 rounded border-2 flex items-center justify-center transition-colors ${
                      row.rowStatus === 'approved'
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {row.rowStatus === 'approved' && <Check className="h-3.5 w-3.5" />}
                  </button>

                  {/* Thumbnail / file icon */}
                  {row.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.previewUrl}
                      alt=""
                      className="h-12 w-12 object-cover rounded-lg shrink-0 border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      {row.file.name.toLowerCase().endsWith('.pdf')
                        ? <FileText className="h-6 w-6 text-red-400" />
                        : <File className="h-6 w-6 text-blue-400" />}
                    </div>
                  )}

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    {row.scanStatus === 'done' ? (
                      <input
                        type="text"
                        value={row.name}
                        onChange={e => updateField(row.id, 'name', e.target.value)}
                        placeholder="Ingredient name"
                        className="w-full font-semibold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-gray-300 dark:focus:border-gray-600 focus:outline-none pb-0.5"
                      />
                    ) : (
                      <p className="font-medium text-gray-500 dark:text-gray-400 truncate">
                        {row.file.name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {statusIcon(row)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {row.scanStatus === 'scanning' && 'AI scanning…'}
                        {row.scanStatus === 'pending' && 'Queued'}
                        {row.scanStatus === 'done' && 'Scan complete'}
                        {row.scanStatus === 'error' && (row.scanError || 'Scan failed')}
                      </span>
                      {row.scanStatus === 'error' && (
                        <button
                          onClick={() => retryScan(row)}
                          className="text-xs text-teal-600 dark:text-teal-400 underline"
                        >
                          Retry
                        </button>
                      )}
                      {row.notes.length > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {row.notes[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Allergen summary pills */}
                  {row.scanStatus === 'done' && (
                    <div className="hidden lg:flex flex-wrap gap-1 max-w-xs">
                      {ALLERGEN_KEYS.filter(k => row.allergen_warnings[k] !== 'none').slice(0, 4).map(k => (
                        <span
                          key={k}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LEVEL_COLOURS[row.allergen_warnings[k] as string] || ''}`}
                        >
                          {ALLERGEN_LABELS[k]}
                        </span>
                      ))}
                      {ALLERGEN_KEYS.filter(k => row.allergen_warnings[k] !== 'none').length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                          +{ALLERGEN_KEYS.filter(k => row.allergen_warnings[k] !== 'none').length - 4} more
                        </span>
                      )}
                      {ALLERGEN_KEYS.every(k => row.allergen_warnings[k] === 'none') && (
                        <span className="text-[10px] text-gray-400">No allergens detected</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {row.scanStatus === 'done' && (
                      <button
                        onClick={() => toggleExpanded(row.id)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                        title="Edit details"
                      >
                        {row.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded edit panel */}
                {row.expanded && row.scanStatus === 'done' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    {/* Description + supplier */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => updateField(row.id, 'description', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Supplier</label>
                        <input
                          type="text"
                          value={row.supplier}
                          onChange={e => updateField(row.id, 'supplier', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                          placeholder="Optional supplier"
                        />
                      </div>
                    </div>

                    {/* Allergen grid */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Allergen levels — review and adjust if needed
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                        {ALLERGEN_KEYS.map(key => (
                          <div key={key}>
                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">
                              {ALLERGEN_LABELS[key]}
                            </p>
                            <select
                              value={row.allergen_warnings[key] as string}
                              onChange={e => updateAllergen(row.id, key, e.target.value)}
                              className={`w-full text-xs rounded px-1.5 py-1 border border-transparent focus:ring-1 focus:ring-teal-400 focus:outline-none ${LEVEL_COLOURS[row.allergen_warnings[key] as string] || ''}`}
                            >
                              <option value="none">None</option>
                              <option value="contains">Contains</option>
                              <option value="may_contain">May contain</option>
                              <option value="traces">Traces</option>
                              <option value="cross_contamination">Cross-contamination</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI notes */}
                    {row.notes.length > 0 && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                        <p className="font-semibold mb-1">AI notes</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {row.notes.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Bottom toolbar */}
          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              icon={Package}
              onClick={handleCreateAll}
              disabled={saving || approvedRows.length === 0}
            >
              {saving ? 'Creating…' : `Create ${approvedRows.length > 0 ? approvedRows.length : ''} Selected`}
            </Button>
          </div>
        </>
      )}

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Upload className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No images added yet</p>
          <p className="text-sm mt-1">Drop label images above to get started</p>
        </div>
      )}
    </Container>
  )
}

// ── Util ──────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
