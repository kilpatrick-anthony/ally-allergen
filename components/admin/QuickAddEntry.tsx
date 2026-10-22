'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ChefHat, MapPin, Package, Plus, ShoppingBasket, Truck, X } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { QuickAddKind } from '@/lib/quick-add'

export default function QuickAddEntry({ siteId }: { siteId?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()
  const router = useRouter()
  useEffect(() => setMounted(true), [])
  const openCapture = (kind: QuickAddKind) => openPage(`${kind === 'ingredient' ? '/admin/ingredients/new' : '/admin/menu-builder/new'}?${new URLSearchParams({ ...(kind === 'packaged_product' ? { type: 'packaged_product' } : {}), ...(siteId ? { site: siteId } : {}) })}`)
  const openPage = (href: string) => { setMenuOpen(false); router.push(href) }
  return mounted ? createPortal(<>
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Dialog.Trigger asChild>
        <button ref={trigger} type="button" aria-label={t('quickAdd.addMenuTitle')} title={t('quickAdd.addMenuTitle')}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#003842] text-white shadow-xl ring-1 ring-white/20 transition-colors hover:bg-[#005a60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#42b8ac] focus-visible:ring-offset-2 active:bg-[#005a60] lg:bottom-[60px] lg:right-6">
          <Plus className="h-7 w-7" aria-hidden="true" />
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
  </>, document.body) : null
}

function LauncherAction({ icon: Icon, label, onClick }: { icon: typeof Package; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-center text-sm font-semibold transition-colors hover:border-teal-500 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-teal-400 dark:hover:bg-teal-950">
    <Icon className="h-7 w-7 text-[#006b68] dark:text-[#42b8ac]" aria-hidden="true" />{label}
  </button>
}
