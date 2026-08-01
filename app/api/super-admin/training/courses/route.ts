import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthenticatedSuperAdmin } from '../_auth'
import { listTrainingCoursesQuerySchema } from '@/lib/training/contracts'

function parseBoolean(value: string | null): boolean | undefined {
  if (value == null) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

type CourseModule = {
  id: string
  module_type: 'lesson' | 'video' | 'quiz'
  estimated_minutes: number
  order_index: number
}

type CourseRow = {
  id: string
  business_id: string | null
  title: string
  description: string | null
  status: 'draft' | 'active' | 'archived'
  is_global: boolean
  version: number
  created_at: string
  updated_at: string
  training_modules: CourseModule[] | null
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = listTrainingCoursesQuerySchema.safeParse({
      businessId: request.nextUrl.searchParams.get('businessId') || undefined,
      includeArchived: parseBoolean(request.nextUrl.searchParams.get('includeArchived')),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 })
    }

    const { businessId, includeArchived } = parsed.data
    const supabase = createServiceClient()

    let query = supabase
      .from('training_courses')
      .select(`
        id,
        business_id,
        title,
        description,
        status,
        is_global,
        version,
        created_at,
        updated_at,
        training_modules (
          id,
          module_type,
          estimated_minutes,
          order_index
        )
      `)
      .order('is_global', { ascending: false })
      .order('title', { ascending: true })

    if (!includeArchived) {
      query = query.neq('status', 'archived')
    }

    if (businessId) {
      query = query.or(`is_global.eq.true,business_id.eq.${businessId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Training courses GET query error:', error)
      return NextResponse.json({ error: 'Failed to fetch training courses' }, { status: 500 })
    }

    const courses = ((data || []) as CourseRow[]).map((course) => {
      const modules = (course.training_modules || []).slice().sort((a, b) => a.order_index - b.order_index)
      const estimatedTotalMinutes = modules.reduce((sum, module) => sum + (module.estimated_minutes || 0), 0)
      return {
        id: course.id,
        businessId: course.business_id,
        title: course.title,
        description: course.description,
        status: course.status,
        isGlobal: course.is_global,
        version: course.version,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
        moduleCount: modules.length,
        estimatedTotalMinutes,
        modules,
      }
    })

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Training courses GET unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
