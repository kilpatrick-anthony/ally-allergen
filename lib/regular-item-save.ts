interface DatasheetUpload {
  file?: File
  supplier_name?: string
  version?: string
  next_review_date?: string
  notes?: string
}

export class AttachmentUploadError extends Error {}
export class RegularItemSaveError extends Error {
  constructor(message: string, public code?: string) { super(message) }
}

// One instance per mounted form. Keep successful uploads across retries, and
// wait for every upload to settle before allowing another save attempt.
export function createRegularItemSaver(entity: 'ingredient' | 'menu_item') {
  let savedId: string | null = null
  let pending: Promise<string> | null = null
  const uploaded = new WeakSet<File>()
  const collection = entity === 'ingredient' ? '/api/ingredients' : '/api/menu-items'
  const responseKey = entity === 'ingredient' ? 'ingredient' : 'menuItem'

  async function readResponse(response: Response, fallback: string) {
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new RegularItemSaveError(data?.error || fallback, data?.errorCode)
    return data
  }

  async function run(payload: object, sheets: DatasheetUpload[], errorMessage: string) {
    const response = await fetch(savedId ? `${collection}/${savedId}` : collection, {
      method: savedId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await readResponse(response, errorMessage)
    if (!savedId) {
      const id = data?.[responseKey]?.id
      if (typeof id !== 'string' || !id) throw new Error(errorMessage)
      savedId = id
    }
    const id = savedId
    const outcomes = await Promise.allSettled(sheets.map(async sheet => {
      if (!sheet.file || uploaded.has(sheet.file)) return
      const formData = new FormData()
      formData.append('file', sheet.file)
      formData.append(`${entity}_id`, id)
      for (const key of ['supplier_name', 'version', 'next_review_date', 'notes'] as const) {
        if (sheet[key]) formData.append(key, sheet[key])
      }
      const upload = await fetch('/api/upload/datasheet', { method: 'POST', body: formData })
      // A successful upload must not be repeated just because its response body
      // is empty or cannot be decoded. The endpoint's HTTP status is sufficient.
      if (!upload.ok) throw new Error(errorMessage)
      uploaded.add(sheet.file)
    }))
    if (outcomes.some(result => result.status === 'rejected')) {
      throw new AttachmentUploadError(errorMessage)
    }
    return id
  }

  return {
    save(payload: object, sheets: DatasheetUpload[], errorMessage: string) {
      if (pending) return pending
      pending = run(payload, sheets, errorMessage).finally(() => { pending = null })
      return pending
    },
  }
}
