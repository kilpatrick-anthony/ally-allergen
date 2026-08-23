// app/api/business/[id]/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_LANGUAGES = new Set(['en', 'ga', 'pt', 'fr', 'es', 'de'])

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await params
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
    }
    const supabase = createServiceClient()
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, name, description, slug, status, plan_type, trial_started_at, trial_ends_at, pdf_download_count, settings')
      .eq('id', businessId)
      .single()
    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    return NextResponse.json({
      ...business,
      sessionTimeout: business.settings?.sessionTimeout || '15 minutes'
    })
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Try to get businessId from params, fallback to URL parsing for edge compatibility
    const { id: businessId } = await params
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
    }
    const body = await request.json()
    const { name, contactEmail, sessionTimeout, businessAddress, businessCity, businessPostalCode, businessCountry, businessPhone, primaryColor, secondaryColor, kioskDisclaimer, defaultLanguage } = body
    const supabase = createServiceClient()
    
    // First, get current business settings
    const { data: currentBusiness, error: fetchError } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .single()
    if (fetchError) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    
    const currentSettings = currentBusiness?.settings || {}
    const updatedSettings = { 
      ...currentSettings, 
      sessionTimeout: sessionTimeout || '15 minutes',
      ...(primaryColor && { primaryColor }),
      ...(secondaryColor && { secondaryColor }),
      ...(kioskDisclaimer !== undefined && { kioskDisclaimer }),
      ...(SUPPORTED_LANGUAGES.has(defaultLanguage) && { defaultLanguage }),
      address: {
        street: businessAddress || '',
        city: businessCity || '',
        postalCode: businessPostalCode || '',
        country: businessCountry || '',
        phone: businessPhone || ''
      }
    }
    
    // Update business with merged settings
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ 
        name,
        settings: updatedSettings
      })
      .eq('id', businessId)
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
    }
    // Optionally update contact email in user_businesses or users table if needed
    // ...
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
