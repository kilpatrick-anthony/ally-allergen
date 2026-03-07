import { createSimpleClient } from '@/lib/supabase/simple-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createSimpleClient()
    
    // Simple test - just ping Supabase
    const { data, error } = await supabase.from('allergens').select('count')
    
    return NextResponse.json({
      status: 'healthy',
      supabase: error ? 'disconnected' : 'connected',
      error: error?.message,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      error: String(err),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
