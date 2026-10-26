import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createServiceClient } from '@/lib/supabase/server'
import { getJwtSecret, hasSuperAdminAccess } from '@/lib/auth'
import { platformRange } from '@/lib/analytics/platform-range'
import { loadPlatformInsights } from '@/lib/analytics/load-platform-insights'

export const maxDuration = 60
export async function GET(request: NextRequest) {
  try {
    const token = (await cookies()).get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const verified = await jwtVerify(token, getJwtSecret()).catch(() => null)
    const userId = verified?.payload.userId || verified?.payload.sub
    if (typeof userId !== 'string' || !userId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = createServiceClient()
    if (
      !(await hasSuperAdminAccess({
        userId,
        userEmail: typeof verified?.payload.email === 'string' ? verified.payload.email : null,
        supabase: db,
      }))
    ) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }
    const now = new Date()
    const params = request.nextUrl.searchParams
    const demoParam = params.get('include_demo') || 'false'
    let range
    try {
      if (!['true', 'false'].includes(demoParam)) throw new Error('Choose a valid demo setting.')
      range = platformRange(params, now)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid reporting period.' },
        { status: 400 },
      )
    }
    const report = await loadPlatformInsights(db, range, demoParam === 'true', now.toISOString())
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Platform insights report failed', error)
    return NextResponse.json(
      { error: 'Could not load platform insights. Please try again.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
