'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddKind } from '@/lib/quick-add'
import QuickAddDialog from './QuickAddDialog'

export default function QuickAddEntry({ initialKind = 'ingredient', siteId, onSaved, floating = false }: { initialKind?: QuickAddKind; siteId?: string | null; onSaved?: () => void; floating?: boolean }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  if (floating) return <>
    <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-30 lg:hidden">
    <button
      ref={trigger}
      type="button"
      aria-label={t('quickAdd.title')}
      aria-haspopup="dialog"
      title={t('quickAdd.title')}
      onClick={() => setOpen(true)}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[#003842] text-white shadow-xl ring-1 ring-white/20 transition-colors hover:bg-[#005a60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42b8ac] focus-visible:ring-offset-2 active:bg-[#005a60]"
    >
      <Plus className="h-7 w-7" aria-hidden="true" />
    </button>
    </div>
    {open && <QuickAddDialog onClose={() => setOpen(false)} returnFocusRef={trigger} initialKind={initialKind} siteId={siteId} onSaved={() => {
      window.dispatchEvent(new Event('quick-add-saved'))
      onSaved?.()
    }} />}
  </>
  return <div className="flex flex-wrap items-center gap-3">
    <Button icon={Plus} onClick={() => setOpen(true)}>{t('quickAdd.title')}</Button>
    <Link className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[#003842] underline dark:text-[#42b8ac]" href="/admin/quick-add">{t('quickAdd.drafts')}</Link>
    {open && <QuickAddDialog onClose={() => setOpen(false)} initialKind={initialKind} siteId={siteId} onSaved={onSaved} />}
  </div>
}
