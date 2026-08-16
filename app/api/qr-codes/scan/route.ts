import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const publicCode = typeof body.code === 'string' ? body.code : ''
    if (!UUID_PATTERN.test(publicCode)) {
      return NextResponse.json({ tracked: false }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: deployment } = await supabase
      .from('qr_code_deployments')
      .select('id')
      .eq('public_code', publicCode)
      .eq('status', 'active')
      .single()
    if (!deployment) return NextResponse.json({ tracked: false }, { status: 404 })

    const { error } = await supabase.from('qr_code_deployment_scans').insert({
      deployment_id: deployment.id,
      user_agent: request.headers.get('user-agent')?.slice(0, 1000) || null,
      referrer: request.headers.get('referer')?.slice(0, 1000) || null,
    })
    if (error) throw error
    return NextResponse.json({ tracked: true })
  } catch (error) {
    console.error('Error tracking QR scan:', error)
    return NextResponse.json({ tracked: false }, { status: 500 })
  }
}
