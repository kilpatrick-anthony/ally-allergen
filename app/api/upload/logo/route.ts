// app/api/upload/logo/route.ts
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
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret')
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
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

    const businessId = userBusiness.business_id

    // Get form data
    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${businessId}-${Date.now()}.${fileExt}`
    const filePath = `business-logos/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Check if bucket exists, create if it doesn't
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === 'business-assets')
    
    if (!bucketExists) {
      console.log('Creating business-assets bucket...')
      const { error: createError } = await supabase.storage.createBucket('business-assets', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880 // 5MB
      })
      
      if (createError) {
        console.error('Failed to create bucket:', createError)
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please contact administrator to set up file storage.' 
        }, { status: 500 })
      }
    }

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('business-assets')
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Update business with logo URL
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        settings: {
          logoUrl: logoUrl
        }
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Update error:', updateError)
      // Don't fail the request if update fails, just log it
    }

    return NextResponse.json({
      success: true,
      logoUrl: logoUrl,
      message: 'Logo uploaded successfully'
    })

  } catch (error: any) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}