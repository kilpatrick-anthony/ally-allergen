import { isJurisdiction } from '@/lib/location-jurisdiction'
import { getGuidePublication } from '@/lib/server/location-allergens'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const target = (searchParams.get('target') || '').trim()
    const siteId = (searchParams.get('site_id') || '').trim()

    if (!target || (siteId && !UUID_PATTERN.test(siteId))) {
      return NextResponse.json({ error: 'A valid kiosk target and location are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const isBusinessId = UUID_PATTERN.test(target)

    const businessQuery = supabase
      .from('businesses')
      .select('id, name, slug, logo_url, primary_color, secondary_color, kiosk_display_name, address, phone, website, settings')

    const { data: business, error: businessError } = isBusinessId
      ? await businessQuery.eq('id', target).single()
      : await businessQuery.eq('slug', target).single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Kiosk business not found' }, { status: 404 })
    }

    const { settings, ...publicBusiness } = business
    const businessData = {
      ...publicBusiness,
      logo_url: settings?.logoUrl ?? business.logo_url ?? null,
      primary_color: settings?.primaryColor ?? business.primary_color ?? null,
      kiosk_disclaimer: settings?.kioskDisclaimer ?? null,
      default_language: settings?.defaultLanguage ?? 'en',
    }
    let mixedLocations = false
    let legacySiteIds: string[] = []
    if (siteId) {
      const { data: site, error } = await supabase.from('sites')
        .select('id,name,jurisdiction,opening_hours').eq('id', siteId).eq('business_id', business.id).eq('is_active', true).maybeSingle()
      if (error) throw error
      if (!site || !isJurisdiction(site.jurisdiction)) {
        return NextResponse.json({ error: 'Kiosk location not found' }, { status: 404 })
      }

      const publication = await getGuidePublication(supabase, site.id, site.jurisdiction)
      const siteMetadata = {
        id: site.id, name: site.name, jurisdiction: site.jurisdiction,
        publicationId: publication?.id ?? null, publishedAt: publication?.published_at ?? null,
      }
      Object.assign(businessData, { location: siteMetadata, opening_hours: site.opening_hours ?? null })
      if (publication || site.jurisdiction !== 'IE') {
        return NextResponse.json({ business: businessData, menuItems: publication?.items ?? [], ingredients: [] })
      }
    } else {
      const { data: sites, error } = await supabase.from('sites')
        .select('id,jurisdiction').eq('business_id', business.id)
      if (error) throw error
      const irishLocations = (sites || []).filter(site => site.jurisdiction === 'IE')
      mixedLocations = (sites || []).some(site => site.jurisdiction !== 'IE')
      if (mixedLocations && !irishLocations.length) {
        return NextResponse.json({ error: 'Open the allergen guide for your specific location.' }, { status: 404 })
      }
      if (mixedLocations) legacySiteIds = irishLocations.map(site => site.id)
    }

    let menuQuery = supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('display_order')

    if (siteId) {
      menuQuery = menuQuery.or(`site_id.is.null,site_id.eq.${siteId}`)
    } else if (mixedLocations) {
      menuQuery = menuQuery.or(`site_id.is.null,site_id.in.(${legacySiteIds.join(',')})`)
    }

    const { data: menuItems, error: menuError } = await menuQuery

    if (menuError) {
      console.error('Error fetching kiosk menu data:', menuError)
      return NextResponse.json({ error: 'Failed to load menu data' }, { status: 500 })
    }

    const menuItemIds = (menuItems || []).map((item: any) => item.id).filter(Boolean)
    const ingredientNamesByMenuItem = new Map<string, string[]>()

    if (menuItemIds.length > 0) {
      const { data: menuItemIngredients, error: menuItemIngredientsError } = await supabase
        .from('menu_item_ingredients')
        .select('menu_item_id, ingredient_id')
        .in('menu_item_id', menuItemIds)

      if (menuItemIngredientsError) {
        console.error('Error fetching menu item ingredient links:', menuItemIngredientsError)
      } else {
        const ingredientIds = Array.from(
          new Set((menuItemIngredients || []).map((row: any) => row.ingredient_id).filter(Boolean))
        )

        const ingredientNameById = new Map<string, string>()
        if (ingredientIds.length > 0) {
          const { data: ingredients, error: ingredientsError } = await supabase
            .from('ingredients')
            .select('id, name')
            .in('id', ingredientIds)

          if (ingredientsError) {
            console.error('Error fetching ingredient names:', ingredientsError)
          } else {
            for (const ingredient of ingredients || []) {
              ingredientNameById.set(String((ingredient as any).id), String((ingredient as any).name || ''))
            }
          }
        }

        for (const link of menuItemIngredients || []) {
          const menuItemId = String((link as any).menu_item_id)
          const ingredientId = String((link as any).ingredient_id)
          const ingredientName = ingredientNameById.get(ingredientId)
          if (!ingredientName) continue

          const existing = ingredientNamesByMenuItem.get(menuItemId) || []
          if (!existing.includes(ingredientName)) {
            ingredientNamesByMenuItem.set(menuItemId, [...existing, ingredientName])
          }
        }
      }
    }

    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers').select('id, name').eq('business_id', business.id)
    if (suppliersError) throw suppliersError
    const supplierNames = new Map((suppliers || []).map(supplier => [supplier.id, supplier.name]))

    const menuItemsWithIngredients = (menuItems || []).map((item: any) => ({
      ...item,
      supplier_name: supplierNames.get(item.supplier_id) || null,
      ingredient_names: ingredientNamesByMenuItem.get(String(item.id)) || [],
    }))

    const { data: ingredients, error: ingredientsListError } = await supabase
      .from('ingredients')
      .select('id, business_id, name, description, category, subcategory, allergen_warnings, suppliers, supplier_profiles, status')
      .eq('business_id', business.id)
      .neq('status', 'archived')
      .order('name', { ascending: true })

    if (ingredientsListError) {
      console.error('Error fetching ingredient list:', ingredientsListError)
    }


    return NextResponse.json({
      business: businessData,
      menuItems: menuItemsWithIngredients,
      ingredients: mixedLocations ? [] : ingredients || [],
    })
  } catch (error: any) {
    console.error('Unexpected kiosk data error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
