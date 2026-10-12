import { NextRequest, NextResponse } from 'next/server'
import { sanitiseWarnings } from '@/lib/allergen-ai'
import { AiGatewayError, analyseWithAiGateway, hasAiGatewayCredentials } from '@/lib/server/ai-gateway'
import { getDraft, quickAddContext, quickAddFailure, QuickAddError, requireDraftId } from '@/lib/server/quick-add'
import { PHOTO_BUCKET, photoPath, photoQuery, type DraftPhoto } from '@/lib/server/quick-add-photos'

export const runtime = 'nodejs'
type Route = { params: Promise<{ id: string; photoId: string }> }

const DIETARY_TAGS = new Set(['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Kosher', 'Organic', 'Fair Trade', 'Lactose-Free', 'Coeliac-Friendly'])
const PROMPT = `Analyse this food label for a human reviewer. Return JSON only:
{"name":"","description":"","allergen_warnings":{},"dietary_tags":[],"notes":[]}

Use EU Regulation 1169/2011 allergen keys: cereals_gluten, crustaceans, eggs, fish, peanuts, soybeans, milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs.
Allowed allergen values: contains, may_contain, traces, cross_contamination.
For cereals_gluten, also return cereals_gluten_levels using only explicitly named wheat, rye, barley or oats. For nuts, return nuts_levels using only explicitly named almonds, hazelnuts, walnuts, cashews, pecans, brazil_nuts, pistachios or macadamia. Give each named subtype its visible risk level; omit every unmentioned subtype so it remains not reviewed.
Only include an allergen when the visible label explicitly supports it; omit uncertain and unmentioned allergens. Only suggest dietary tags explicitly claimed by the label. Never infer absence or suitability. The name must be the consumer-facing product name and should include the visible brand when useful (for example, "Brand Chocolate Biscuits"). Do not treat a brand or manufacturer as a supplier; supplier selection is left to the user. Put uncertainty or unreadable/cropped information in notes.`

export async function POST(request: NextRequest, route: Route) {
  try {
    const context = await quickAddContext()
    const { id, photoId } = await route.params
    requireDraftId(id); requireDraftId(photoId)
    const draft = await getDraft(context, id)
    if (draft.status !== 'draft') throw new QuickAddError('editConflict', 409)
    if (draft.kind === 'prepared_item') throw new QuickAddError('invalid', 400)
    const { data: photo, error } = await photoQuery(context, id).eq('id', photoId).eq('state', 'ready').maybeSingle()
    if (error) throw error
    if (!photo) throw new QuickAddError('notFound', 404)

    if (!hasAiGatewayCredentials(request)) throw new QuickAddError('extractionUnavailable', 503)
    const downloaded = await context.supabase.storage.from(PHOTO_BUCKET).download(photoPath(photo as DraftPhoto))
    if (downloaded.error) throw downloaded.error
    const image = Buffer.from(await downloaded.data.arrayBuffer()).toString('base64')
    let content: string
    try {
      content = await analyseWithAiGateway({ prompt: PROMPT, image: { mimeType: 'image/jpeg', base64: image }, request })
    } catch (error) {
      if (error instanceof AiGatewayError && error.status === 503) throw new QuickAddError('extractionUnavailable', 503)
      throw new QuickAddError('extractionFailed', error instanceof AiGatewayError && error.status === 429 ? 429 : 502)
    }
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(content) } catch { throw new QuickAddError('extractionFailed', 502) }
    const warnings = sanitiseWarnings((parsed.allergen_warnings || {}) as Record<string, string>)
    const allergen_warnings = Object.fromEntries(Object.entries(warnings).filter(([, level]) => level !== 'none'))
    const clean = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
    return NextResponse.json({ suggestions: {
      name: clean(parsed.name, 200), supplier_name: '', description: clean(parsed.description, 500),
      allergen_warnings, dietary_tags: Array.isArray(parsed.dietary_tags) ? [...new Set(parsed.dietary_tags.map(String).filter(tag => DIETARY_TAGS.has(tag)))] : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(note => clean(note, 300)).filter(Boolean).slice(0, 5) : [],
    } }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return quickAddFailure(error) }
}
