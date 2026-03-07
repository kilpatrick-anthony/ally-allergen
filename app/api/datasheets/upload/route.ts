// app/api/datasheets/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string
    const supplierName = formData.get('supplierName') as string | null
    const version = formData.get('version') as string | null
    const nextReviewDate = formData.get('nextReviewDate') as string | null
    const notes = formData.get('notes') as string | null

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate unique file name
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${entityType}_${entityId}_${timestamp}.${fileExt}`
    const filePath = `datasheets/${entityType}s/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-documents')
      .getPublicUrl(filePath)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Create datasheet record in database
    const { data: datasheet, error: dbError } = await supabase
      .from('datasheets')
      .insert({
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        entity_type: entityType,
        entity_id: parseInt(entityId),
        supplier_name: supplierName,
        version: version,
        next_review_date: nextReviewDate,
        notes: notes,
        uploaded_by: user?.id,
        status: 'active'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Cleanup uploaded file
      await supabase.storage.from('product-documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create datasheet record' },
        { status: 500 }
      )
    }

    // Create reminder if next_review_date is set
    if (nextReviewDate) {
      const reminderDate = new Date(nextReviewDate)
      reminderDate.setDate(reminderDate.getDate() - 7) // 7 days before review

      await supabase
        .from('datasheet_review_reminders')
        .insert({
          datasheet_id: datasheet.id,
          reminder_date: reminderDate.toISOString().split('T')[0],
          recipient_emails: [], // Can be configured based on business logic
          status: 'pending'
        })
    }

    return NextResponse.json({
      success: true,
      datasheet: {
        ...datasheet,
        publicUrl
      }
    })

  } catch (error) {
    console.error('Error uploading datasheet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all datasheets for an entity
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    let query = supabase
      .from('datasheets')
      .select('*')
      .eq('status', 'active')
      .order('uploaded_at', { ascending: false })

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', parseInt(entityId))
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch datasheets' },
        { status: 500 }
      )
    }

    // Get public URLs for all datasheets
    const datasheetsWithUrls = data.map(datasheet => {
      const { data: { publicUrl } } = supabase.storage
        .from('product-documents')
        .getPublicUrl(datasheet.file_path)
      
      return {
        ...datasheet,
        publicUrl
      }
    })

    return NextResponse.json({ datasheets: datasheetsWithUrls })

  } catch (error) {
    console.error('Error fetching datasheets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
