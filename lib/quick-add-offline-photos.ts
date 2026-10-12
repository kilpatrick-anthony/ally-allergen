const DB_NAME = 'ally-quick-add-offline'
const STORE = 'photos'
const VERSION = 1

export type OfflineQuickAddPhoto = {
  id: string
  draft_id: string
  user_id: string
  business_id: string
  blob: Blob
  created_at: string
}

function currentScope() {
  const userId = sessionStorage.getItem('ally_user')
  const businessId = sessionStorage.getItem('ally_biz')
  return userId && businessId ? { userId, businessId } : null
}

function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('draft_id', 'draft_id')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void) {
  const db = await database()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    action(transaction.objectStore(STORE), resolve, reject)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => { db.close(); reject(transaction.error) }
    transaction.onabort = () => { db.close(); reject(transaction.error) }
  })
}

export async function saveOfflineQuickAddPhoto(draftId: string, id: string, blob: Blob) {
  const current = currentScope()
  if (!current) throw new Error('photoFailed')
  await transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.put({ id, draft_id: draftId, user_id: current.userId, business_id: current.businessId, blob, created_at: new Date().toISOString() })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function listOfflineQuickAddPhotos(draftId: string) {
  const current = currentScope()
  if (!current) return []
  return transact<OfflineQuickAddPhoto[]>('readonly', (store, resolve, reject) => {
    const request = store.index('draft_id').getAll(draftId)
    request.onsuccess = () => resolve((request.result as OfflineQuickAddPhoto[]).filter(photo => photo.user_id === current.userId && photo.business_id === current.businessId))
    request.onerror = () => reject(request.error)
  })
}

export async function removeOfflineQuickAddPhoto(id: string) {
  await transact<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function listOfflineQuickAddPhotoDraftIds() {
  const current = currentScope()
  if (!current) return []
  return transact<string[]>('readonly', (store, resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve([...new Set((request.result as OfflineQuickAddPhoto[])
      .filter(photo => photo.user_id === current.userId && photo.business_id === current.businessId)
      .map(photo => photo.draft_id))])
    request.onerror = () => reject(request.error)
  })
}

export async function uploadOfflineQuickAddPhotos(draftId: string) {
  for (const photo of await listOfflineQuickAddPhotos(draftId)) {
    const response = await fetch(`/api/quick-add-drafts/${draftId}/photos/${photo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: photo.blob, signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'photoFailed')
    await removeOfflineQuickAddPhoto(photo.id)
  }
}
