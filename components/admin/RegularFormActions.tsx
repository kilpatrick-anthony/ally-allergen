'use client'

import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/hooks/useTranslation'

type Props = {
  onSave: () => void
  onCancel: () => void
  saveLabel: string
  disabled: boolean
  busy: boolean
  feedback?: { text: string; error: boolean }
  secondary?: { label: string; onClick: () => void }
}

/** One action area, with enough document space to keep the last field reachable. */
export function RegularFormActions({ onSave, onCancel, saveLabel, disabled, busy, secondary, feedback }: Props) {
  const { t } = useTranslation()
  const bar = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(180)
  useEffect(() => {
    if (!bar.current) return
    const observer = new ResizeObserver(entries => setHeight(entries[0].target.getBoundingClientRect().height))
    observer.observe(bar.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollPaddingBottom
    root.style.scrollPaddingBottom = `${height + 16}px`
    return () => { root.style.scrollPaddingBottom = previous }
  }, [height])
  return <>
    <div aria-hidden="true" style={{ height }} />
    <div ref={bar} role="region" aria-label={t('regularForms.actions')} aria-busy={busy}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg dark:border-gray-700 dark:bg-gray-900 lg:left-[224px]">
      {feedback?.text && <p role={feedback.error ? 'alert' : 'status'} className={`mx-auto mb-3 max-w-7xl text-sm ${feedback.error ? 'text-red-700 dark:text-red-200' : 'text-gray-700 dark:text-gray-200'}`}>{feedback.text}</p>}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={busy} className="min-h-11">{t('admin.cancel')}</Button>
        <Button onClick={onSave} disabled={busy || disabled} icon={Save} className="min-h-11">{saveLabel}</Button>
        {secondary && <Button variant="outline" onClick={secondary.onClick} disabled={busy || disabled} className="min-h-11">{secondary.label}</Button>}
      </div>
    </div>
  </>
}
