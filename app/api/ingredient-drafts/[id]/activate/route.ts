import { NextRequest, NextResponse } from 'next/server'
import { ingredientDraftAccess, ingredientDraftError, validDraftId } from '@/lib/server/ingredient-drafts'
import { ingredientDraftPayload } from '@/lib/ingredient-draft-schema'
import { buildCompleteSupplierProfiles, deriveEffectiveIngredientSafety, normalizeSupplierNames } from '@/lib/ingredient-supplier-profiles'
import { isIngredientAssessmentComplete } from '@/lib/allergen-assessment'

type Context = { params: Promise<{ id: string }> }
export async function POST(request: NextRequest, { params }: Context) {
  const access = await ingredientDraftAccess()
  if (access.error) return access.error
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!validDraftId(id) || !Number.isSafeInteger(body?.version) || body.version < 1) return NextResponse.json({ error: 'Invalid draft version' }, { status: 400 })
  const { data: draft, error: readError } = await access.db.from('ingredient_drafts').select('*').eq('id', id).eq('business_id', access.businessId).maybeSingle()
  if (readError) return ingredientDraftError(readError)
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (draft.ingredient_id) return NextResponse.json({ ingredient: { id: draft.ingredient_id } })
  const parsed = ingredientDraftPayload.safeParse(draft.payload)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid ingredient draft' }, { status: 400 })
  const payload = parsed.data
  const profiles = buildCompleteSupplierProfiles(normalizeSupplierNames(payload.suppliers), payload.supplier_profiles, payload.allergen_warnings, payload.certifications)
  const selectedSuppliers = normalizeSupplierNames(payload.suppliers).map(name => name.toLocaleLowerCase())
  const profileSuppliers = normalizeSupplierNames(Object.values(profiles).map(profile => profile.supplier_name || '')).map(name => name.toLocaleLowerCase())
  if (selectedSuppliers.length !== profileSuppliers.length || selectedSuppliers.some(name => !profileSuppliers.includes(name))) return ingredientDraftError({ message: 'completeIngredient' })
  const effective = deriveEffectiveIngredientSafety(profiles)
  if (!isIngredientAssessmentComplete(effective?.allergen_warnings || payload.allergen_warnings, profiles)) return ingredientDraftError({ message: 'completeIngredient' })
  const normalized = { ...payload, ...(effective || {}), suppliers: normalizeSupplierNames(Object.values(profiles).map(p => p.supplier_name || '')), supplier_profiles: profiles }
  const { data, error } = await access.db.rpc('activate_regular_ingredient_draft', {
    p_id: id, p_business: access.businessId, p_actor: access.userId, p_version: body.version, p_payload: normalized,
  })
  if (error) return ingredientDraftError(error)
  return NextResponse.json({ ingredient: { id: data } })
}
