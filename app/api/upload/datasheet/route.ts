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
    const ingredientId = formData.get('ingredient_id') as string | null
    const menuItemId = formData.get('menu_item_id') as string | null
    const supplierName = formData.get('supplier_name') as string
    const version = formData.get('version') as string
    const nextReviewDate = formData.get('next_review_date') as string
    const notes = formData.get('notes') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ingredientId && !menuItemId) {
      return NextResponse.json({ error: 'Either ingredient_id or menu_item_id is required' }, { status: 400 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileScope = ingredientId || menuItemId || 'general'
    const filePath = `${userBusiness.business_id}/${fileScope}/${timestamp}_${sanitizedFileName}`

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

    // Save metadata to database - build insert object conditionally
    const insertObject: any = {
      business_id: userBusiness.business_id,
      file_name: file.name,
      file_path: publicUrl,
      file_size: file.size,
      file_type: file.type,
      status: 'active',
      created_by: userId
    }

    if (ingredientId) {
      insertObject.ingredient_id = ingredientId
    }
    if (menuItemId) {
      insertObject.menu_item_id = menuItemId
    }
    if (supplierName) {
      insertObject.supplier_name = supplierName
    }
    if (version) {
      insertObject.version = version
    }
    if (nextReviewDate) {
      insertObject.next_review_date = nextReviewDate
    }
    if (notes) {
      insertObject.notes = notes
    }

    let { data: datasheet, error: dbError } = await supabase
      .from('datasheets')
      .insert(insertObject)
      .select()
      .single()

    // If error is about menu_item_id column not existing, retry without it and store menu_item_id in notes
    if (dbError && dbError.message && (dbError.message.includes('menu_item_id') || dbError.code === '42703')) {
      console.warn('menu_item_id column not found, retrying without it and storing reference in notes...')
      const { menu_item_id, ...retryObject } = insertObject
      
      // Store the menu_item_id reference in notes for tracking
      if (menu_item_id) {
        retryObject.notes = `[MENU_ITEM_REF:${menu_item_id}]${retryObject.notes ? ' - ' + retryObject.notes : ''}`
      }
      
      const retry = await supabase
        .from('datasheets')
        .insert(retryObject)
        .select()
        .single()
      datasheet = retry.data
      dbError = retry.error
      
      // If successful with fallback, include warning in response
      if (!dbError && datasheet) {
        return NextResponse.json({ 
          success: true,
          datasheet: {
            ...datasheet,
            uploaded_at: datasheet.created_at
          },
          warning: 'database_migration_needed',
          warningMessage: 'menu_item_id column not found in database. To enable full datasheet association, run the migration: ALTER TABLE datasheets ADD COLUMN menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE;'
        })
      }
    }

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to delete the uploaded file if database insert fails
      await supabase.storage.from('datasheets').remove([filePath])
      return NextResponse.json({ 
        error: 'Failed to save datasheet metadata',
        details: dbError.message,
        code: dbError.code
      }, { status: 500 })
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
    console.error('Unexpected error uploading datasheet:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during upload' },
      { status: 500 }
    )
  }
}
