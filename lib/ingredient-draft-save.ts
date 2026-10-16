import { createRegularEditSaver } from '@/lib/regular-edit-save'
import { RegularItemSaveError } from '@/lib/regular-item-save'

export class ActivatedIngredientDraft extends Error {
  constructor(public ingredientId: string) { super('Ingredient already activated') }
}
/** One identity and optimistic version per mounted editor, including retries. */
export function createIngredientDraftSaver(existingId?: string, initialVersion = 0) {
  let id = existingId
  let version = initialVersion
  const saver = createRegularEditSaver('ingredient_draft', data => {
    if (data?.draft?.ingredient_id) throw new ActivatedIngredientDraft(data.draft.ingredient_id)
    if (!Number.isInteger(data?.draft?.version)) throw new Error('Could not confirm draft save')
    version = data.draft.version
  })
  return {
    async save(payload: object, sheets: Parameters<typeof saver.save>[2], original: Parameters<typeof saver.save>[3], fallback: string) {
      id ||= crypto.randomUUID()
      await saver.save(id, { version, payload }, sheets, original, fallback)
      return id
    },
    async activate(fallback: string) {
      const response = await fetch(`/api/ingredient-drafts/${id}/activate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new RegularItemSaveError(data?.error || fallback, data?.errorCode)
      if (typeof data?.ingredient?.id !== 'string') throw new Error(fallback)
      return data.ingredient.id as string
    },
  }
}
