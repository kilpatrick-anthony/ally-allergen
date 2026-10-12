import { NextRequest, NextResponse } from 'next/server'
import { BarcodeLookupError, lookupBarcode } from '@/lib/server/product-barcode'
import { quickAddContext, quickAddFailure, QuickAddError } from '@/lib/server/quick-add'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    await quickAddContext()
    const barcode = request.nextUrl.searchParams.get('barcode')?.trim() || ''
    if (!/^\d{8,14}$/.test(barcode)) throw new QuickAddError('barcodeInvalid', 400)
    const suggestions = await lookupBarcode(barcode)
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof BarcodeLookupError) return NextResponse.json({ error: error.code }, { status: error.status })
    return quickAddFailure(error)
  }
}
