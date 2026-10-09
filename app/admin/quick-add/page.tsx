'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import QuickAddEntry from '@/components/admin/QuickAddEntry'
import QuickAddDialog from '@/components/admin/QuickAddDialog'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddDraft } from '@/lib/quick-add'

function Drafts() {
  const { t, language } = useTranslation()
  const text = (key: string) => t(`quickAdd.${key}`)
  const router = useRouter()
  const params = useSearchParams()
  const draftId = params.get('draft') || undefined
  const [drafts, setDrafts] = useState<QuickAddDraft[]>([])
  const [offset, setOffset] = useState(0)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void fetch(`/api/quick-add-drafts?offset=${offset}`, { signal: controller.signal, cache: 'no-store' })
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
  }, [offset, revision])

  return <Container>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">{text('drafts')}</h1><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{text('listNote')}</p></div>
      <QuickAddEntry onSaved={() => { setOffset(0); setRevision(value => value + 1) }} />
    </div>
    <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">{text('safetyNote')}</p>
    {error && <div role="alert" className="mb-5"><p>{text(error)}</p><Button className="mt-2" onClick={() => setRevision(value => value + 1)}>{text('retry')}</Button></div>}
    {!loading && !error && !drafts.length && <Card>{text('empty')}</Card>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {drafts.map(draft => <Card key={draft.id}>
        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">{text(draft.kind)} · {text('draft')}</p>
        <h2 className="mt-2 break-words text-lg font-semibold">{draft.name}</h2>
        {draft.supplier_name && <p className="mt-1 break-words text-sm">{draft.supplier_name}</p>}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">{text('updated')}: {new Date(draft.updated_at).toLocaleDateString(language)}</p>
        <Link href={`/admin/quick-add?draft=${draft.id}`} className="mt-3 inline-flex min-h-11 items-center font-medium text-teal-700 underline dark:text-teal-300">{text('details')}<span className="sr-only">: {draft.name}</span></Link>
      </Card>)}
    </div>
    {loading && <p role="status" className="my-5">{text('loading')}</p>}
    {!loading && !error && nextOffset !== null && <Button className="my-5" onClick={() => setOffset(nextOffset)}>{text('more')}</Button>}
    {draftId && <QuickAddDialog key={draftId} draftId={draftId} onClose={() => router.replace('/admin/quick-add')} onSaved={() => { setOffset(0); setRevision(value => value + 1) }} />}
  </Container>
}

export default function QuickAddPage() {
  return <Suspense><Drafts /></Suspense>
}
