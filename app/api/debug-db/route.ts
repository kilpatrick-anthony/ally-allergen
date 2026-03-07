import { createSimpleClient } from '@/lib/supabase/simple-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createSimpleClient()
  
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
    
    const slugs = businesses?.map(b => b.slug) || []
    
    return NextResponse.json({
      success: !error,
      count: businesses?.length || 0,
      businesses: businesses || [],
      slugs: slugs,
      oakberryExists: slugs.includes('oakberry-dublin'),
      error: error?.message
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err)
    }, { status: 500 })
  }
}
