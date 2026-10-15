import { AttachmentUploadError, RegularItemSaveError } from '@/lib/regular-item-save'

interface Sheet {
  id?: string
  file?: File
  supplier_name?: string | null
  version?: string | null
  next_review_date?: string | null
  notes?: string | null
}
const metadata = (sheet: Sheet) => ({
  supplier_name: sheet.supplier_name || null, version: sheet.version || null,
  next_review_date: sheet.next_review_date || null, notes: sheet.notes || null,
})
const signature = (sheet: Sheet) => JSON.stringify(metadata(sheet))

export class EditDocumentSaveError extends AttachmentUploadError {
  constructor(public needsReload = false) { super('Record saved; document operations are incomplete') }
}

/** Recovery is scoped to one open editor; never repeat confirmed document writes. */
export function createRegularEditSaver(entity: 'ingredient' | 'menu_item') {
  let pending: Promise<void> | null = null
  const records = new Map<string, string>()
  const uploaded = new Map<File, { id?: string; signature: string }>()
  const deleted = new Set<string>()
  const collection = entity === 'ingredient' ? '/api/ingredients' : '/api/menu-items'

  async function run(id: string, payload: object, sheets: Sheet[], original: Sheet[], fallback: string) {
    // Capture this attempt. Edits made while it runs belong to the next attempt.
    const current = sheets.map(sheet => ({ ...sheet }))
    const response = await fetch(`${collection}/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new RegularItemSaveError(data?.error || fallback, data?.errorCode)
    for (const sheet of original) if (sheet.id && !records.has(sheet.id) && !deleted.has(sheet.id)) records.set(sheet.id, signature(sheet))

    const desired = new Set<string>()
    const files = new Set(current.flatMap(sheet => sheet.file ? [sheet.file] : []))
    let needsReload = false
    for (const [file, result] of uploaded) {
      if (!result.id && (!files.has(file) || current.some(sheet => sheet.file === file && signature(sheet) !== result.signature))) needsReload = true
    }
    const jobs: (() => Promise<void>)[] = []
    const seen = new Set<File>()
    for (const sheet of current) {
      const completed = sheet.file ? uploaded.get(sheet.file) : undefined
      const documentId = sheet.file ? completed?.id : sheet.id
      if (documentId) {
        desired.add(documentId)
        if (deleted.has(documentId)) { needsReload = true; continue }
        if (records.get(documentId) !== signature(sheet)) jobs.push(async () => {
          const update = await fetch(`/api/datasheets/${encodeURIComponent(documentId)}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata(sheet)),
          })
          if (!update.ok) throw new Error(fallback)
          records.set(documentId, signature(sheet))
        })
      } else if (sheet.file && !completed && !seen.has(sheet.file)) {
        const file = sheet.file
        seen.add(file)
        jobs.push(async () => {
          const body = new FormData()
          body.append('file', file); body.append(`${entity}_id`, id)
          for (const [key, value] of Object.entries(metadata(sheet))) if (value) body.append(key, value)
          const upload = await fetch('/api/upload/datasheet', { method: 'POST', body })
          if (!upload.ok) throw new Error(fallback)
          // An acknowledged upload is never repeated, even if its JSON is lost.
          const result = await upload.json().catch(() => null)
          const newId = typeof result?.datasheet?.id === 'string' ? result.datasheet.id : undefined
          uploaded.set(file, { id: newId, signature: signature(sheet) })
          if (newId) records.set(newId, signature(sheet))
        })
      }
    }
    if (needsReload) throw new EditDocumentSaveError(true)
    for (const documentId of records.keys()) if (!desired.has(documentId) && !deleted.has(documentId)) jobs.push(async () => {
      const removal = await fetch(`/api/datasheets/${encodeURIComponent(documentId)}`, { method: 'DELETE' })
      if (!removal.ok) throw new Error(fallback)
      deleted.add(documentId)
    })
    const results = await Promise.allSettled(jobs.map(job => job()))
    if (results.some(result => result.status === 'rejected')) throw new EditDocumentSaveError()
  }
  return {
    save(id: string, payload: object, sheets: Sheet[], original: Sheet[], fallback: string) {
      if (pending) return pending
      pending = run(id, payload, sheets, original, fallback).finally(() => { pending = null })
      return pending
    },
  }
}
