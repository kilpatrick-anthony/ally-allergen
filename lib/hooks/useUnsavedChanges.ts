'use client'

import { useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

/** Compare editable data, not loading/review UI state. File identities count as edits. */
export function useUnsavedChanges(value: unknown, ready = true) {
  const { t } = useTranslation()
  const baseline = useRef<string | undefined>(undefined)
  const files = useRef(new WeakMap<File, number>())
  const nextFile = useRef(0)
  const snapshot = JSON.stringify(value, (_, item) => {
    if (typeof File !== 'undefined' && item instanceof File) {
      if (!files.current.has(item)) files.current.set(item, ++nextFile.current)
      return { file: files.current.get(item), name: item.name }
    }
    return item
  })
  const dirty = ready && baseline.current !== undefined && baseline.current !== snapshot
  const state = useRef({ dirty, bypass: false, message: t('regularForms.unsaved') })
  state.current.dirty = dirty
  state.current.message = t('regularForms.unsaved')

  const hasChanges = () => state.current.dirty || Array.from(document.querySelectorAll<HTMLInputElement>('[data-unsaved-draft]')).some(input => Boolean(input.value.trim()))

  useEffect(() => {
    if (ready && baseline.current === undefined) baseline.current = snapshot
  }, [ready, snapshot])

  useEffect(() => {
    if (!ready) return
    // A same-URL guard entry lets us cancel Back before Next unmounts the form.
    const marker = '__allyRegularForm'
    const existing = window.history.state?.[marker]
    const id = existing?.id || crypto.randomUUID()
    if (existing?.kind !== 'guard') {
      window.history.replaceState({ ...window.history.state, [marker]: { id, kind: 'base' } }, '')
      window.history.pushState({ ...window.history.state, [marker]: { id, kind: 'guard' } }, '')
    }
    const confirmLeave = () => state.current.bypass || !hasChanges() || window.confirm(state.current.message)
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      const destination = new URL(link.href, window.location.href)
      if (!['http:', 'https:'].includes(destination.protocol)) return
      if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return
      if (!confirmLeave()) { event.preventDefault(); event.stopImmediatePropagation() }
      else state.current.bypass = true
    }
    const unload = (event: BeforeUnloadEvent) => {
      if (hasChanges() && !state.current.bypass) { event.preventDefault(); event.returnValue = '' }
    }
    const pop = (event: PopStateEvent) => {
      if (event.state?.[marker]?.id !== id || event.state?.[marker]?.kind !== 'base') return
      event.stopImmediatePropagation()
      if (confirmLeave()) { state.current.bypass = true; window.history.back() }
      else window.history.pushState({ ...window.history.state, [marker]: { id, kind: 'guard' } }, '')
    }
    document.addEventListener('click', click, true)
    window.addEventListener('beforeunload', unload)
    window.addEventListener('popstate', pop, true)
    return () => {
      document.removeEventListener('click', click, true)
      window.removeEventListener('beforeunload', unload)
      window.removeEventListener('popstate', pop, true)
    }
  }, [ready])

  return {
    confirmLeave: () => {
      const accepted = state.current.bypass || !hasChanges() || window.confirm(state.current.message)
      if (accepted) state.current.bypass = true
      return accepted
    },
    markSaved: () => { baseline.current = snapshot; state.current.bypass = true },
  }
}
