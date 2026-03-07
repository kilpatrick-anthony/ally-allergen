// app/api/signup/route.ts - DISABLED: Public signup is not allowed
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Public signup is disabled. Please contact your administrator to create an account.' },
    { status: 403 }
  )
}
