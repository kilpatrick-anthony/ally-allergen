import { NextResponse } from 'next/server'
import { z } from 'zod'
import { bowlConfiguration } from '@/lib/bowl-configuration'
import { validateBowlSource, type BowlSource } from '@/lib/server/bowl-guide'
import { locationAllergenFailure } from '@/lib/server/location-allergens'
import { QuickAddError, quickAddContext } from '@/lib/server/quick-add'

type Context = { params: Promise<{ id: string }> }
const input = z.object({ siteId: z.uuid(), configuration: bowlConfiguration.nullable() })
const noStore = { 'Cache-Control': 'private, no-store' }

async function scopedItem(id: string, siteId: string) {
  const context = await quickAddContext()
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(siteId).success) {
    throw new QuickAddError('Choose a location and menu item.', 400)
  }
  const { supabase, businessId } = context
  const [site, item] = await Promise.all([
    supabase.from('sites').select('id,is_active').eq('id', siteId).eq('business_id', businessId).maybeSingle(),
    supabase.from('menu_items').select('id,site_id,item_type,is_active').eq('id', id).eq('business_id', businessId).maybeSingle(),
  ])
  if (site.error) throw site.error
  if (item.error) throw item.error
  if (!site.data || !item.data || (item.data.site_id && item.data.site_id !== siteId)) {
    throw new QuickAddError('This menu item is unavailable at the selected location.', 404)
  }
  return { ...context, canConfigure: site.data.is_active && item.data.is_active && item.data.item_type === 'prepared' }
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const siteId = new URL(request.url).searchParams.get('siteId') || ''
    const { supabase, businessId, canConfigure } = await scopedItem(id, siteId)
    const [draft, ingredients, recipe] = await Promise.all([
      supabase.from('site_bowl_configurations').select('menu_item_id,configuration').eq('site_id', siteId).maybeSingle(),
      supabase.from('ingredients').select('id,name,status').eq('business_id', businessId).order('name'),
      supabase.from('menu_item_ingredients').select('ingredient_id').eq('menu_item_id', id),
    ])
    if (draft.error) throw draft.error
    if (ingredients.error) throw ingredients.error
    if (recipe.error) throw recipe.error
    let occupied = false
    if (draft.data && draft.data.menu_item_id !== id) {
      const configuredItem = await supabase.from('menu_items').select('site_id').eq('id', draft.data.menu_item_id)
        .eq('business_id', businessId).eq('item_type', 'prepared').eq('is_active', true).maybeSingle()
      if (configuredItem.error) throw configuredItem.error
      occupied = Boolean(configuredItem.data && (!configuredItem.data.site_id || configuredItem.data.site_id === siteId))
    }
    return NextResponse.json({
      configuration: draft.data?.menu_item_id === id ? draft.data.configuration : null,
      occupied, ingredients: ingredients.data, recipe: recipe.data.map(link => link.ingredient_id), canConfigure,
    }, { headers: noStore })
  } catch (error) {
    return locationAllergenFailure(error)
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const parsed = input.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new QuickAddError('Complete the bowl configuration.', 400)
    const { siteId, configuration } = parsed.data
    const { supabase, businessId, userId, canConfigure } = await scopedItem(id, siteId)
    const scope = { p_site: siteId, p_business: businessId, p_item: id, p_config: configuration }
    let source: BowlSource | null = null
    if (configuration) {
      if (!canConfigure) throw new QuickAddError('Choose an active prepared menu item at an active location.', 400)
      const { data, error } = await supabase.rpc('site_bowl_source', scope)
      if (error) throw error
      if (!data) throw new QuickAddError('This menu item is unavailable at the selected location.', 404)
      source = data as BowlSource
      const result = validateBowlSource(source)
      if ('error' in result) throw new QuickAddError(result.error, 400)
    }

    const { error } = await supabase.rpc('save_site_bowl_configuration', { ...scope, p_actor: userId, p_source: source })
    if (error?.code === '40001' || error?.code === '23505') throw new QuickAddError(error.message, 409)
    if (error?.code === '42501') throw new QuickAddError(error.message, 403)
    if (error) throw error
    return NextResponse.json({ configuration }, { headers: noStore })
  } catch (error) {
    return locationAllergenFailure(error)
  }
}
