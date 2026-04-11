// app/api/compliance/status/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { checkIngredientCompliance, checkMenuItemCompliance } from '@/lib/compliance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const itemType = searchParams.get('itemType') // 'ingredient' or 'menu_item'

    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get user's business
    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get business settings
    const { data: business } = await supabase
      .from('businesses')
      .select('compliance_review_days')
      .eq('id', userBusiness.business_id)
      .single()

    const businessSettings = {
      compliance_review_days: business?.compliance_review_days || 90
    }

    if (itemId && itemType) {
      // Get compliance for specific item
      if (itemType === 'ingredient') {
        const { data: ingredient } = await supabase
          .from('ingredients')
          .select(`
            *,
            datasheets:datasheets(count)
          `)
          .eq('id', itemId)
          .eq('business_id', userBusiness.business_id)
          .single()

        if (!ingredient) {
          return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
        }

        const complianceResult = checkIngredientCompliance(
          {
            ...ingredient,
            has_datasheets: (ingredient.datasheets as any)?.[0]?.count > 0
          },
          businessSettings
        )

        return NextResponse.json({ compliance: complianceResult })
      } else if (itemType === 'menu_item') {
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select(`
            id,
            name,
            is_active,
            last_reviewed_at,
            preferred_review_months
          `)
          .eq('id', itemId)
          .eq('business_id', userBusiness.business_id)
          .single()

        if (!menuItem) {
          return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
        }

        // Get menu item ingredients
        const { data: menuIngredients } = await supabase
          .from('menu_item_ingredients')
          .select('ingredient_id')
          .eq('menu_item_id', itemId)

        const ingredients = (menuIngredients || []).map((row) => String(row.ingredient_id))

        // Get all ingredients' compliance status
        const { data: allIngredients } = await supabase
          .from('ingredients')
          .select(`
            id,
            status,
            last_reviewed_at,
            preferred_review_months,
            suppliers,
            datasheets:datasheets(count)
          `)
          .eq('business_id', userBusiness.business_id)

        const ingredientComplianceMap = new Map()
        allIngredients?.forEach((ing: any) => {
          // Safely extract datasheet count - handle various response formats
          let datasheetCount = 0
          if (ing.datasheets && Array.isArray(ing.datasheets) && ing.datasheets.length > 0) {
            datasheetCount = ing.datasheets[0]?.count || 0
          }
          
          const complianceResult = checkIngredientCompliance(
            {
              id: ing.id,
              name: ing.name || '',
              status: ing.status,
              last_reviewed_at: ing.last_reviewed_at,
              preferred_review_months: ing.preferred_review_months || 3,
              suppliers: ing.suppliers,
              has_datasheets: datasheetCount > 0
            },
            businessSettings
          )
          ingredientComplianceMap.set(ing.id, complianceResult.status)
        })

        const complianceResult = checkMenuItemCompliance(
          {
            id: menuItem.id,
            name: menuItem.name,
            status: menuItem.is_active ? 'active' : 'draft',
            last_reviewed_at: menuItem.last_reviewed_at,
            preferred_review_months: menuItem.preferred_review_months || 3,
            ingredients: ingredients
          },
          ingredientComplianceMap,
          businessSettings
        )

        return NextResponse.json({ compliance: complianceResult })
      }
    } else {
      // Get list of all items with compliance status
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select(`
          id,
          name,
          status,
          last_reviewed_at,
          preferred_review_months,
          suppliers,
          datasheets:datasheets(count)
        `)
        .eq('business_id', userBusiness.business_id)
        .neq('status', 'archived')

      const { data: menuItems } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          is_active,
          last_reviewed_at,
          preferred_review_months
        `)
        .eq('business_id', userBusiness.business_id)

      // Get all menu item ingredients
      const menuItemIds = (menuItems || []).map((item) => item.id)
      let ingredientsByMenuItem = new Map<string, string[]>()

      if (menuItemIds.length > 0) {
        const { data: menuIngredients } = await supabase
          .from('menu_item_ingredients')
          .select('menu_item_id, ingredient_id')
          .in('menu_item_id', menuItemIds)

        if (menuIngredients) {
          ingredientsByMenuItem = menuIngredients.reduce((acc, row) => {
            const list = acc.get(row.menu_item_id) || []
            list.push(String(row.ingredient_id))
            acc.set(row.menu_item_id, list)
            return acc
          }, new Map<string, string[]>())
        }
      }

      const ingredientComplianceList: any[] = []
      const ingredientComplianceMap = new Map()

      ingredients?.forEach((ing: any) => {
        // Safely extract datasheet count - handle various response formats
        let datasheetCount = 0
        if (ing.datasheets && Array.isArray(ing.datasheets) && ing.datasheets.length > 0) {
          datasheetCount = ing.datasheets[0]?.count || 0
        }
        
        const complianceResult = checkIngredientCompliance(
          {
            id: ing.id,
            name: ing.name,
            status: ing.status,
            last_reviewed_at: ing.last_reviewed_at,
            preferred_review_months: ing.preferred_review_months || 3,
            suppliers: ing.suppliers,
            has_datasheets: datasheetCount > 0
          },
          businessSettings
        )
        ingredientComplianceMap.set(ing.id, complianceResult.status)

        ingredientComplianceList.push({
          id: ing.id,
          name: ing.name,
          type: 'ingredient',
          status: complianceResult.status,
          reasons: complianceResult.reasons,
          lastReviewedAt: ing.last_reviewed_at,
          daysOverdue: complianceResult.daysOverdue,
          daysUntilDue: complianceResult.daysUntilDue
        })
      })

      const menuItemComplianceList: any[] = []

      menuItems?.forEach((item: any) => {
        const complianceResult = checkMenuItemCompliance(
          {
            id: item.id,
            name: item.name,
            status: item.status || (item.is_active ? 'active' : 'draft'),
            last_reviewed_at: item.last_reviewed_at,
            preferred_review_months: item.preferred_review_months || 3,
            ingredients: ingredientsByMenuItem.get(item.id) || []
          },
          ingredientComplianceMap,
          businessSettings
        )

        menuItemComplianceList.push({
          id: item.id,
          name: item.name,
          type: 'menu_item',
          status: complianceResult.status,
          reasons: complianceResult.reasons,
          lastReviewedAt: item.last_reviewed_at,
          daysOverdue: complianceResult.daysOverdue,
          daysUntilDue: complianceResult.daysUntilDue
        })
      })

      const totalErrors = [
        ...ingredientComplianceList.filter(i => i.status === 'error'),
        ...menuItemComplianceList.filter(i => i.status === 'error')
      ].length

      const totalWarnings = [
        ...ingredientComplianceList.filter(i => i.status === 'warning'),
        ...menuItemComplianceList.filter(i => i.status === 'warning')
      ].length

      return NextResponse.json({
        compliance: {
          ingredients: ingredientComplianceList,
          menuItems: menuItemComplianceList,
          totalNonCompliant: totalErrors + totalWarnings,
          totalErrors,
          totalWarnings
        }
      })
    }

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
