// app/api/super-admin/demo-account/route.ts
// Creates a fully-seeded demo account (business + location + device + sample menu items)
// in one single API call for use during customer demos.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

async function getAuthenticatedSuperAdmin() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')?.value
  if (!authToken) return null

  try {
    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userEmail = payload.email as string
    if (userEmail !== process.env.SUPER_ADMIN_EMAIL) return null
    return { userId: payload.userId as string, userEmail }
  } catch {
    return null
  }
}

const SAMPLE_MENU_ITEMS = [
  {
    name: 'Classic Beef Burger',
    description: 'Prime beef patty, lettuce, tomato, house sauce on a brioche bun',
    category: 'Mains',
    price: 14.5,
    allergens: { gluten: true, milk: true, egg: true, sesame: true },
  },
  {
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon, seasonal vegetables, lemon butter',
    category: 'Mains',
    price: 18.0,
    allergens: { fish: true, milk: true },
  },
  {
    name: 'Garden Salad (V)',
    description: 'Mixed leaves, cherry tomatoes, cucumber, house vinaigrette',
    category: 'Starters',
    price: 8.0,
    allergens: {},
  },
  {
    name: 'Caesar Salad',
    description: 'Romaine lettuce, parmesan, croutons, Caesar dressing',
    category: 'Starters',
    price: 9.5,
    allergens: { gluten: true, milk: true, egg: true, fish: true },
  },
  {
    name: 'Chocolate Brownie',
    description: 'Warm chocolate brownie, vanilla ice cream, chocolate sauce',
    category: 'Desserts',
    price: 7.5,
    allergens: { gluten: true, milk: true, egg: true, soya: true },
  },
  {
    name: 'Seasonal Soup',
    description: 'Ask your server for today\'s soup. Served with brown bread',
    category: 'Starters',
    price: 7.0,
    allergens: { gluten: true, milk: true, celery: true },
  },
  {
    name: 'Mushroom Risotto (V)',
    description: 'Wild mushrooms, arborio rice, parmesan, truffle oil',
    category: 'Mains',
    price: 15.0,
    allergens: { milk: true },
  },
  {
    name: 'Kids Fish Goujons',
    description: 'Crispy fish goujons, chips, peas',
    category: 'Kids',
    price: 9.0,
    allergens: { gluten: true, fish: true, milk: true, egg: true },
  },
]

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      ownerName = 'Demo User',
      ownerEmail,
      businessName = 'Demo Restaurant',
      locationName = 'Main Location',
    } = body

    if (!ownerEmail) {
      return NextResponse.json({ error: 'ownerEmail is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Create owner account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: Math.random().toString(36).slice(-10) + 'Aa1!',
      email_confirm: true,
      user_metadata: { full_name: ownerName, business_name: businessName },
    })

    if (userError) {
      return NextResponse.json({ error: userError.message || 'Failed to create user' }, { status: 500 })
    }

    const userId = userData.user.id

    // 2. Create business
    const baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        slug,
        status: 'active',
        plan_type: 'starter',
        subscription_started_at: new Date().toISOString(),
        pdf_download_count: 0,
        settings: {
          theme: { primaryColor: '#42b8ac', secondaryColor: '#003842' },
          subscription: { plan: 'starter', status: 'active' },
        },
      })
      .select()
      .single()

    if (bizError) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
    }

    // 3. Link owner
    await supabase.from('user_businesses').insert({
      user_id: userId,
      business_id: business.id,
      role: 'owner',
    })

    // 4. Create sample location (site)
    const siteSlug = locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        business_id: business.id,
        name: locationName,
        slug: `${siteSlug}-${Date.now().toString().slice(-4)}`,
        is_active: true,
      })
      .select()
      .single()

    if (siteError) {
      console.warn('Site creation failed (non-fatal):', siteError.message)
    }

    // 5. Create a demo device for the site
    let device = null
    if (site) {
      const { data: deviceData } = await supabase
        .from('devices')
        .insert({
          business_id: business.id,
          site_id: site.id,
          device_name: 'Demo Kiosk',
          device_type: 'kiosk',
          status: 'offline',
        })
        .select()
        .single()

      device = deviceData
    }

    // 6. Seed sample menu items
    const menuRows = SAMPLE_MENU_ITEMS.map((item) => ({
      business_id: business.id,
      site_id: site?.id || null,
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      is_active: true,
      allergen_celery: item.allergens.celery ?? false,
      allergen_cereals: item.allergens.gluten ?? false,
      allergen_crustaceans: false,
      allergen_eggs: item.allergens.egg ?? false,
      allergen_fish: item.allergens.fish ?? false,
      allergen_lupin: false,
      allergen_milk: item.allergens.milk ?? false,
      allergen_molluscs: false,
      allergen_mustard: false,
      allergen_nuts: false,
      allergen_peanuts: false,
      allergen_sesame: item.allergens.sesame ?? false,
      allergen_soya: item.allergens.soya ?? false,
      allergen_sulphites: false,
    }))

    const { error: menuError } = await supabase.from('menu_items').insert(menuRows)
    if (menuError) {
      console.warn('Menu seed failed (non-fatal):', menuError.message)
    }

    // 7. Send password setup email
    await supabase.auth.resetPasswordForEmail(ownerEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://allyjen.ie'}/auth/update-password`,
    })

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessName,
      ownerEmail,
      siteId: site?.id || null,
      deviceId: device?.id || null,
      menuItemsSeeded: menuRows.length,
      message: `Demo account "${businessName}" created with ${menuRows.length} sample menu items.`,
    })
  } catch (err) {
    console.error('Demo account creation error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
