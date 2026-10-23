'use client'

import { useId, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Props = { kind: 'ingredients' | 'menu-items'; category: string; subcategory?: string; onSaved: () => void | Promise<void> }

export function CategoryRenameButton({ kind, category, subcategory, onSaved }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const label = t(`categoryManagement.${subcategory === undefined ? 'rename' : 'renameSubcategory'}`)
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/${kind}/categories`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category, subcategory, name }) })
      const result = await response.json()
      if (!response.ok) throw new Error(['invalidName', 'nameExists', 'notFound'].includes(result.errorCode) ? result.errorCode : 'saveFailed')
      await onSaved()
      setOpen(false)
    } catch (error) {
      const code = error instanceof Error && ['invalidName', 'nameExists', 'notFound'].includes(error.message) ? error.message : 'saveFailed'
      setError(t(`categoryManagement.${code}`))
    }
    finally { setBusy(false) }
  }
  return <Dialog.Root open={open} onOpenChange={value => { if (!busy) { setOpen(value); setName(subcategory ?? category); setError('') } }}>
    <Dialog.Trigger asChild><button type="button" aria-label={`${label}: ${subcategory ?? category}`} title={label} className="inline-flex items-center justify-center rounded p-2 text-gray-500 hover:text-[#003842] hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#42b8ac]"><Pencil size={14} /></button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
      <Dialog.Content className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
        <Dialog.Title className="text-lg font-semibold">{label}</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-500 mt-2">{t(`categoryManagement.${subcategory === undefined ? 'impact' : 'subImpact'}`)}</Dialog.Description>
        <form onSubmit={save} className="mt-4 space-y-4">
          <label htmlFor={id} className="block text-sm font-medium">{t('categoryManagement.name')}</label>
          <input id={id} value={name} onChange={event => setName(event.target.value)} maxLength={100} required disabled={busy} className="w-full rounded-lg border p-2 dark:bg-gray-700" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3"><Dialog.Close disabled={busy} className="rounded-lg border px-4 py-2">{t('categoryManagement.cancel')}</Dialog.Close><button disabled={busy || !name.trim()} type="submit" className="rounded-lg bg-[#003842] text-white px-4 py-2 disabled:opacity-50">{t(`categoryManagement.${busy ? 'saving' : 'save'}`)}</button></div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
