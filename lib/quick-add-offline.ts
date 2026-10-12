import type { QuickAddFields } from '@/lib/quick-add'

const OUTBOX_VERSION = 1

export type OfflineQuickAddDraft = {
  id: string
  fields: QuickAddFields
  queued_at: string
  user_id: string
  business_id: string
}

type Scope = { userId: string; businessId: string }

function scope(): Scope | null {
  if (typeof window === 'undefined') return null
  const userId = sessionStorage.getItem('ally_user')
  const businessId = sessionStorage.getItem('ally_biz')
  return userId && businessId ? { userId, businessId } : null
}

function key(name: string, current: Scope) {
  return `ally_quick_add_${name}_v${OUTBOX_VERSION}:${current.userId}:${current.businessId}`
}

function read<T>(storageKey: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(storageKey) || '') as T } catch { return fallback }
}

export function saveQuickAddRecovery(id: string, fields: QuickAddFields) {
  const current = scope()
  if (!current) return false
  try {
    localStorage.setItem(key('recovery', current), JSON.stringify({ id, fields, saved_at: new Date().toISOString() }))
    return true
  } catch { return false }
}

export function loadQuickAddRecovery(): { id: string; fields: QuickAddFields } | null {
  const current = scope()
  if (!current) return null
  const value = read<{ id?: unknown; fields?: unknown } | null>(key('recovery', current), null)
  return value && typeof value.id === 'string' && value.fields && typeof value.fields === 'object'
    ? value as { id: string; fields: QuickAddFields }
    : null
}

export function clearQuickAddRecovery(id?: string) {
  const current = scope()
  if (!current) return
  const storageKey = key('recovery', current)
  const saved = read<{ id?: string } | null>(storageKey, null)
  if (!id || saved?.id === id) localStorage.removeItem(storageKey)
}

export function queueQuickAddDraft(id: string, fields: QuickAddFields) {
  const current = scope()
  if (!current) return false
  const storageKey = key('outbox', current)
  const queued = read<OfflineQuickAddDraft[]>(storageKey, []).filter(item => item?.id !== id)
  queued.push({ id, fields, queued_at: new Date().toISOString(), user_id: current.userId, business_id: current.businessId })
  try {
    localStorage.setItem(storageKey, JSON.stringify(queued))
    clearQuickAddRecovery(id)
    return true
  } catch { return false }
}

export function getQuickAddOutbox() {
  const current = scope()
  if (!current) return []
  return read<OfflineQuickAddDraft[]>(key('outbox', current), [])
    .filter(item => item?.user_id === current.userId && item?.business_id === current.businessId && typeof item.id === 'string')
}

export function removeQuickAddOutboxItem(id: string) {
  const current = scope()
  if (!current) return
  const storageKey = key('outbox', current)
  localStorage.setItem(storageKey, JSON.stringify(getQuickAddOutbox().filter(item => item.id !== id)))
}
