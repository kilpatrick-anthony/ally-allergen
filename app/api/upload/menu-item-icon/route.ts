import { getJwtSecret } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get('auth-token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = getJwtSecret()
    const { payload } = await jwtVerify(authToken, secret)
    const userId = payload.userId as string

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: userBusiness } = await supabase
      .from('user_businesses')
      .select('business_id')
      .eq('user_id', userId)
      .single()

    if (!userBusiness?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('icon') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const safeExt = fileExt.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png'
    const fileName = `menu-item-${userBusiness.business_id}-${Date.now()}.${safeExt}`
    const filePath = `menu-item-icons/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === 'business-assets')

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('business-assets', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 5242880
      })

      if (createError) {
        console.error('Failed to create business-assets bucket:', createError)
        return NextResponse.json({
          error: 'Storage bucket not configured. Please contact administrator to set up file storage.'
        }, { status: 500 })
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Menu item icon upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('business-assets')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      iconUrl: urlData.publicUrl
    })
  } catch (error) {
    console.error('Menu item icon upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
