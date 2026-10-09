'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddKind } from '@/lib/quick-add'
import QuickAddDialog from './QuickAddDialog'

export default function QuickAddEntry({ initialKind = 'ingredient', siteId, onSaved }: { initialKind?: QuickAddKind; siteId?: string | null; onSaved?: () => void }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  return <div className="flex flex-wrap items-center gap-3">
    <Button icon={Plus} onClick={() => setOpen(true)}>{t('quickAdd.title')}</Button>
    <Link className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[#003842] underline dark:text-[#42b8ac]" href="/admin/quick-add">{t('quickAdd.drafts')}</Link>
    {open && <QuickAddDialog onClose={() => setOpen(false)} initialKind={initialKind} siteId={siteId} onSaved={onSaved} />}
  </div>
}
