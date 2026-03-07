import { createSimpleClient } from '@/lib/supabase/simple-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createSimpleClient()
  
  try {
    // Test allergens table
    const { data: allergens, error: allergenError } = await supabase
      .from('allergens')
      .select('*')
      .order('name')
    
    // Test businesses table
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*')
    
    return NextResponse.json({
      success: !allergenError && !businessError,
      counts: {
        allergens: allergens?.length || 0,
        businesses: businesses?.length || 0,
      },
      error: allergenError?.message || businessError?.message,
      allergens: allergenError ? null : allergens,
      businesses: businessError ? null : businesses,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
      counts: { allergens: 0, businesses: 0 }
    }, { status: 500 })
  }
}
