'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ChefHat, MapPin, Package, Plus, ShoppingBasket, Truck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddKind } from '@/lib/quick-add'
import QuickAddDialog from './QuickAddDialog'

export default function QuickAddEntry({ initialKind = 'ingredient', siteId, onSaved, floating = false, showDrafts = true }: { initialKind?: QuickAddKind; siteId?: string | null; onSaved?: () => void; floating?: boolean; showDrafts?: boolean }) {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedKind, setSelectedKind] = useState<QuickAddKind>(initialKind)
  const trigger = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  const router = useRouter()
  const openCapture = (kind: QuickAddKind) => { setSelectedKind(kind); setMenuOpen(false); setOpen(true) }
  const openPage = (href: string) => { setMenuOpen(false); router.push(href) }
  if (floating) return <>
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Dialog.Trigger asChild>
        <button ref={trigger} type="button" aria-label={t('quickAdd.addMenuTitle')} title={t('quickAdd.addMenuTitle')}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex h-16 -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[#003842] px-6 text-base font-semibold text-white shadow-2xl ring-4 ring-white/80 transition-transform hover:scale-105 hover:bg-[#005a60] focus-visible:outline-none focus-visible:ring-[#42b8ac] active:scale-95 dark:ring-gray-900 lg:bottom-[60px] lg:left-auto lg:right-24 lg:translate-x-0">
          <Plus className="h-8 w-8" aria-hidden="true" />{t('quickAdd.add')}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[94] bg-black/40" />
        <Dialog.Content className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[95] mx-auto max-w-md rounded-2xl bg-white p-4 text-gray-900 shadow-2xl dark:bg-gray-900 dark:text-white lg:inset-x-auto lg:bottom-[132px] lg:right-6 lg:w-96">
          <div className="flex items-start justify-between gap-3">
            <div><Dialog.Title className="text-lg font-semibold">{t('quickAdd.addMenuTitle')}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t('quickAdd.addMenuHelp')}</Dialog.Description></div>
            <Dialog.Close className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t('quickAdd.close')}><X aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <LauncherAction icon={Package} label={t('quickAdd.addIngredient')} onClick={() => openCapture('ingredient')} />
            <LauncherAction icon={ShoppingBasket} label={t('quickAdd.addProduct')} onClick={() => openCapture('packaged_product')} />
            <LauncherAction icon={ChefHat} label={t('quickAdd.addPreparedItem')} onClick={() => openCapture('prepared_item')} />
            <LauncherAction icon={Truck} label={t('quickAdd.addSupplier')} onClick={() => openPage('/admin/suppliers/new')} />
            <LauncherAction icon={MapPin} label={t('quickAdd.addLocation')} onClick={() => openPage('/admin/sites/new')} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {open && <QuickAddDialog onClose={() => setOpen(false)} returnFocusRef={trigger} initialKind={selectedKind} siteId={siteId} onSaved={() => {
      window.dispatchEvent(new Event('quick-add-saved'))
      onSaved?.()
    }} />}
  </>
  return <div className="flex flex-wrap items-center gap-3">
    <Button variant="teal" icon={Plus} aria-haspopup="dialog" onClick={event => { trigger.current = event.currentTarget; setOpen(true) }}>{t('quickAdd.title')}</Button>
    {showDrafts && <Link className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[#003842] underline dark:text-[#42b8ac]" href="/admin/quick-add">{t('quickAdd.drafts')}</Link>}
    {open && <QuickAddDialog onClose={() => setOpen(false)} returnFocusRef={trigger} initialKind={initialKind} siteId={siteId} onSaved={onSaved} />}
  </div>
}

function LauncherAction({ icon: Icon, label, onClick }: { icon: typeof Package; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center text-sm font-semibold transition-colors hover:border-teal-500 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-400 dark:hover:bg-teal-950">
    <Icon className="h-7 w-7 text-[#006b68] dark:text-[#42b8ac]" aria-hidden="true" />{label}
  </button>
}
