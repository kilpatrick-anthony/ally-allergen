// app/api/upload/datasheet/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Get user from auth token
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

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ingredientId = formData.get('ingredient_id') as string
    const supplierName = formData.get('supplier_name') as string
    const version = formData.get('version') as string
    const nextReviewDate = formData.get('next_review_date') as string
    const notes = formData.get('notes') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userBusiness.business_id}/${ingredientId || 'general'}/${timestamp}_${sanitizedFileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('datasheets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('datasheets')
      .getPublicUrl(filePath)

    // Save metadata to database
    const { data: datasheet, error: dbError } = await supabase
      .from('datasheets')
      .insert({
        business_id: userBusiness.business_id,
        ingredient_id: ingredientId || null,
        file_name: file.name,
        file_path: publicUrl,
        file_size: file.size,
        file_type: file.type,
        supplier_name: supplierName || null,
        version: version || null,
        next_review_date: nextReviewDate || null,
        notes: notes || null,
        status: 'active',
        created_by: userId
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to delete the uploaded file if database insert fails
      await supabase.storage.from('datasheets').remove([filePath])
      return NextResponse.json({ error: 'Failed to save datasheet metadata' }, { status: 500 })
    }

    // Map created_at to uploaded_at for compatibility
    const mappedDatasheet = {
      ...datasheet,
      uploaded_at: datasheet.created_at
    }

    return NextResponse.json({ 
      success: true,
      datasheet: mappedDatasheet 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
