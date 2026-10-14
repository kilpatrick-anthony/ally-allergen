'use client'

import { useEffect, useId, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Datasheet = { id: string; file_name: string; content_type: string; byte_size: number; state: string; created_at: string }
type Props = { draftId: string; disabled?: boolean; excludeIds?: string[]; onActivity?: (busy: boolean) => void }

export default function QuickAddDatasheets({ draftId, disabled, excludeIds, onActivity }: Props) {
  const { t } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const helpId = useId()
  const base = `/api/quick-add-drafts/${draftId}/datasheets`
  const [items, setItems] = useState<Datasheet[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

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
    if (disabled || working) return
    setWorking(true); onActivity?.(true); setError('')
    try {
      const id = crypto.randomUUID()
      const response = await fetch(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }, body: file, signal: AbortSignal.timeout(30000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setItems(current => [...current, result.datasheet])
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setError(['datasheetTooLarge','datasheetFormat','datasheetLimit','datasheetConflict','editConflict'].includes(code) ? code : 'datasheetUploadFailed')
    } finally { setWorking(false); onActivity?.(false) }
  }

  async function remove(item: Datasheet) {
    if (disabled || working || !window.confirm(`${text('removeDatasheetConfirm')}\n\n${item.file_name}`)) return
    setWorking(true); onActivity?.(true); setError('')
    try {
      const response = await fetch(`${base}/${item.id}`, { method: 'DELETE', signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error((await response.json()).error)
      setItems(current => current.filter(current => current.id !== item.id))
    } catch { setError('datasheetRemoveFailed') }
    finally { setWorking(false); onActivity?.(false) }
  }

  const blocked = disabled || working || loading
  return <section aria-label={text('datasheets')} className="mt-5 space-y-3 border-t pt-4 dark:border-gray-700">
    <h3 className="font-semibold">{text('datasheets')} <span className="font-normal text-gray-500 dark:text-gray-300">({text('optional')})</span></h3>
    <p id={helpId} className="text-sm text-gray-600 dark:text-gray-300">{text('datasheetHelp')}</p>
    {loading ? <p role="status">{text('loading')}</p> : <>
      <label className={`relative inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 focus-within:ring-2 focus-within:ring-teal-600 ${blocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <Upload className="h-4 w-4" aria-hidden="true" />{text('uploadDatasheet')}
        <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={blocked} aria-describedby={helpId} className="absolute inset-0 w-full opacity-0" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file) }} />
      </label>
      {working && <p role="status">{text('datasheetWorking')}</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{text(error)}</p>}
      {!!items.length && <ul className="space-y-2">{items.filter(item => !excludeIds?.includes(item.id)).map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <a href={`${base}/${item.id}`} className="flex min-w-0 items-center gap-2 font-medium text-teal-700 underline dark:text-teal-300"><FileText className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">{item.file_name}</span></a>
        <Button type="button" variant="ghost" size="sm" icon={Trash2} disabled={blocked} aria-label={`${text('removeDatasheet')}: ${item.file_name}`} onClick={() => void remove(item)}>{text('removeDatasheet')}</Button>
      </li>)}</ul>}
    </>}
  </section>
}
