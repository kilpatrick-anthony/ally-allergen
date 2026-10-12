'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QuickAddDialog from '@/components/admin/QuickAddDialog'
import type { QuickAddKind } from '@/lib/quick-add'

function NewQuickAddPage() {
  const router = useRouter()
  const params = useSearchParams()
  const requestedKind = params.get('kind')
  const kind: QuickAddKind = requestedKind === 'packaged_product' || requestedKind === 'prepared_item' ? requestedKind : 'ingredient'
  const siteId = params.get('site')
  return <QuickAddDialog page initialKind={kind} siteId={siteId} onClose={() => router.push('/admin/quick-add')} />
}

export default function Page() {
  return <Suspense><NewQuickAddPage /></Suspense>
}
