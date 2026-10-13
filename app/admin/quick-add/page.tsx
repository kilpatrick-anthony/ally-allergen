'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import QuickAddDialog from '@/components/admin/QuickAddDialog'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { missingReviewDetails } from '@/lib/quick-add-review'
import type { QuickAddDraft } from '@/lib/quick-add'

function Drafts() {
  const { t, language } = useTranslation()
  const text = (key: string, replacements?: Record<string, string | number>) => t(`quickAdd.${key}`, replacements)
  const router = useRouter()
  const params = useSearchParams()
  const draftId = params.get('draft') || undefined
  const heading = useRef<HTMLHeadingElement>(null)
  const draftTrigger = useRef<HTMLElement | null>(null)
  const [drafts, setDrafts] = useState<QuickAddDraft[]>([])
  const [status, setStatus] = useState(() => ['draft', 'ready_for_review', 'approved'].includes(params.get('status') || '') ? params.get('status')! : '')
  const [offset, setOffset] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [deleteError, setDeleteError] = useState('')
  const allShownSelected = drafts.length > 0 && drafts.every(draft => selectedIds.has(draft.id))

  useEffect(() => {
    if (!draftTrigger.current?.isConnected) draftTrigger.current = heading.current
  }, [draftId])

  function closeDraft() {
    const query = new URLSearchParams(params.toString())
    query.delete('draft')
    router.replace(`/admin/quick-add${query.size ? `?${query}` : ''}`, { scroll: false })
  }

  async function deleteDraft(draft: QuickAddDraft) {
    if (!window.confirm(`${text('deleteConfirm')}\n\n${draft.name}`)) return
    setDeleting(draft.id)
    setDeleteError('')
    try {
      const response = await fetch(`/api/quick-add-drafts/${draft.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('deleteFailed')
      setDrafts(current => current.filter(item => item.id !== draft.id))
      setSelectedIds(current => {
        const next = new Set(current)
        next.delete(draft.id)
        return next
      })
      setOffset(0)
      setRevision(value => value + 1)
      window.dispatchEvent(new Event('quick-add-saved'))
    } catch {
      setDeleteError(text('deleteFailed'))
    } finally { setDeleting(null) }
  }

  function toggleDraft(id: string) {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllShown() {
    setSelectedIds(current => {
      const next = new Set(current)
      drafts.forEach(draft => allShownSelected ? next.delete(draft.id) : next.add(draft.id))
      return next
    })
  }

  async function deleteSelected() {
    const ids = drafts.filter(draft => selectedIds.has(draft.id)).map(draft => draft.id)
    if (!ids.length || !window.confirm(text('deleteSelectedConfirm', { count: ids.length }))) return
    setBulkDeleting(true)
    setDeleteError('')
    const deleted = new Set<string>()
    const failed = new Set<string>()
    try {
      for (let index = 0; index < ids.length; index += 8) {
        const batch = ids.slice(index, index + 8)
        const results = await Promise.all(batch.map(async id => {
          try {
            const response = await fetch(`/api/quick-add-drafts/${id}`, { method: 'DELETE' })
            return { id, ok: response.ok }
          } catch {
            return { id, ok: false }
          }
        }))
        results.forEach(result => (result.ok ? deleted : failed).add(result.id))
      }
      setDrafts(current => current.filter(draft => !deleted.has(draft.id)))
      setSelectedIds(failed)
      if (failed.size) setDeleteError(text('deleteSomeFailed', { count: failed.size }))
      setOffset(0)
      if (deleted.size) window.dispatchEvent(new Event('quick-add-saved'))
    } catch {
      setSelectedIds(new Set(ids.filter(id => !deleted.has(id))))
      setDrafts(current => current.filter(draft => !deleted.has(draft.id)))
      setDeleteError(text('deleteFailed'))
      if (deleted.size) window.dispatchEvent(new Event('quick-add-saved'))
    } finally { setBulkDeleting(false) }
  }

  useEffect(() => {
    const refresh = () => { setOffset(0); setRevision(value => value + 1) }
    window.addEventListener('quick-add-saved', refresh)
    return () => window.removeEventListener('quick-add-saved', refresh)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void fetch(`/api/quick-add-drafts?offset=${offset}&status=${status}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        if (controller.signal.aborted) return
        setDrafts(previous => offset === 0 ? result.drafts : [...previous, ...result.drafts.filter((row: QuickAddDraft) => !previous.some(item => item.id === row.id))])
        setNextOffset(result.nextOffset)
      }).catch((reason: Error) => {
        if (!controller.signal.aborted) setError(['forbidden', 'unauthorized'].includes(reason.message) ? reason.message : 'unavailable')
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [offset, revision, status])

  return <Container>
    <div className="mb-6">
      <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold text-gray-900 dark:text-white">{text('drafts')}</h1><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{text('listNote')}</p>
    </div>
    <label className="mb-5 block text-sm font-medium">{text('filterStatus')}
      <select value={status} onChange={event => { setStatus(event.target.value); setOffset(0); setSelectedIds(new Set()) }} className="ml-3 rounded-lg border bg-white p-3 text-gray-900 dark:bg-gray-800 dark:text-white">
        <option value="">{text('allCaptures')}</option><option value="draft">{text('draft')}</option><option value="ready_for_review">{text('ready_for_review')}</option><option value="approved">{text('approved')}</option>
      </select></label>
    {error && <div role="alert" className="mb-5"><p>{text(error)}</p><Button variant="teal" className="mt-2" onClick={() => setRevision(value => value + 1)}>{text('retry')}</Button></div>}
    {deleteError && <p role="alert" className="mb-5 text-sm text-red-700 dark:text-red-300">{deleteError}</p>}
    {!loading && !error && !drafts.length && <Card>{text('empty')}</Card>}
    {!!drafts.length && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-sm font-medium text-gray-800 dark:text-gray-100">
        <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} disabled={bulkDeleting || !!deleting} className="h-5 w-5 rounded border-gray-300 text-teal-700 focus:ring-teal-600" />
        {text('selectAllShown')}
      </label>
      <span className="text-sm text-gray-600 dark:text-gray-300">{text('selectedCount', { count: selectedIds.size })}</span>
      <Button variant="danger" size="sm" icon={Trash2} disabled={!selectedIds.size || !!deleting} loading={bulkDeleting} onClick={() => void deleteSelected()}>{bulkDeleting ? text('deletingSelected') : text('deleteSelected')}</Button>
    </div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {drafts.map(draft => <Card key={draft.id} className="flex h-full flex-col text-gray-900 dark:text-gray-100">
        <div className="flex items-start justify-between gap-2"><div className="flex items-start gap-3">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <input type="checkbox" checked={selectedIds.has(draft.id)} onChange={() => toggleDraft(draft.id)} disabled={bulkDeleting || !!deleting} aria-label={text('selectDraft', { name: draft.name })} className="h-5 w-5 rounded border-gray-300 text-teal-700 focus:ring-teal-600" />
          </label>
          <p className="pt-3 text-xs font-semibold text-teal-700 dark:text-teal-300">{text(draft.kind)} · {text(draft.status)}</p>
        </div>
          <button type="button" disabled={bulkDeleting || !!deleting} onClick={() => void deleteDraft(draft)} aria-label={`${text('deleteDraft')}: ${draft.name}`} title={text('deleteDraft')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950"><Trash2 className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <h2 className="mt-2 break-words text-lg font-semibold text-gray-900 dark:text-white">{draft.name}</h2>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{text('author')}: {draft.author_name || text('teamMember')} · {draft.site_name || text('noLocation')}</p>
        {draft.status !== 'approved' && <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{missingReviewDetails(draft.review || {}, draft.kind).map(key => text(key)).join(' · ')}</p>}
        {draft.supplier_name && <p className="mt-1 break-words text-sm text-gray-700 dark:text-gray-200">{draft.supplier_name}</p>}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">{text('updated')}: {new Date(draft.updated_at).toLocaleDateString(language)}</p>
        <Link href={`/admin/quick-add?${new URLSearchParams({ ...(status ? { status } : {}), draft: draft.id })}`} onClick={event => { draftTrigger.current = event.currentTarget }} className="mt-auto inline-flex min-h-11 items-center pt-3 font-medium text-teal-700 underline dark:text-teal-300">{text('details')}<span className="sr-only">: {draft.name}</span></Link>
      </Card>)}
    </div>
    {loading && <p role="status" className="my-5">{text('loading')}</p>}
    {!loading && !error && nextOffset !== null && <Button variant="teal" className="my-5" onClick={() => setOffset(nextOffset)}>{text('more')}</Button>}
    {draftId && <QuickAddDialog key={draftId} draftId={draftId} returnFocusRef={draftTrigger} onClose={closeDraft} onSaved={() => { setOffset(0); setRevision(value => value + 1) }} />}
  </Container>
}

export default function QuickAddPage() {
  return <Suspense><Drafts /></Suspense>
}
