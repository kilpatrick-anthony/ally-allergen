import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthenticatedSuperAdmin } from '../../_auth'
import { assignTrainingEnrollmentsSchema } from '@/lib/training/contracts'

type CourseRecord = {
  id: string
  business_id: string | null
  is_global: boolean
  status: 'draft' | 'active' | 'archived'
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await request.json()
    const parsed = assignTrainingEnrollmentsSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { businessId, courseId, userIds, dueAt, dueInDays } = parsed.data
    const supabase = createServiceClient()

    const { data: course, error: courseError } = await supabase
      .from('training_courses')
      .select('id, business_id, is_global, status')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Training course not found' }, { status: 404 })
    }

    const courseRecord = course as CourseRecord

    if (courseRecord.status !== 'active') {
      return NextResponse.json({ error: 'Only active courses can be assigned' }, { status: 400 })
    }

    if (!courseRecord.is_global && courseRecord.business_id !== businessId) {
      return NextResponse.json({ error: 'Course does not belong to this business' }, { status: 400 })
    }

    const { data: linkedUsers, error: linkedUsersError } = await supabase
      .from('user_businesses')
      .select('user_id')
      .eq('business_id', businessId)
      .in('user_id', userIds)

    if (linkedUsersError) {
      console.error('Training enrollments linkedUsers error:', linkedUsersError)
      return NextResponse.json({ error: 'Failed validating users for business' }, { status: 500 })
    }

    const validUserIds = new Set((linkedUsers || []).map((row) => row.user_id))
    const missingUserIds = userIds.filter((id) => !validUserIds.has(id))

    if (missingUserIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Some users are not linked to this business',
          missingUserIds,
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const resolvedDueAt = dueAt
      ? new Date(dueAt).toISOString()
      : typeof dueInDays === 'number'
        ? new Date(now.getTime() + dueInDays * 24 * 60 * 60 * 1000).toISOString()
        : null

    const enrollmentRows = userIds.map((userId) => ({
      business_id: businessId,
      user_id: userId,
      course_id: courseId,
      assigned_by: admin.userId,
      assigned_at: now.toISOString(),
      due_at: resolvedDueAt,
      status: 'not_started' as const,
      completed_at: null,
      updated_at: now.toISOString(),
    }))

    const { data: upserted, error: enrollError } = await supabase
      .from('training_enrollments')
      .upsert(enrollmentRows, {
        onConflict: 'business_id,user_id,course_id',
      })
      .select('id, user_id, course_id, status, due_at, assigned_at')

    if (enrollError) {
      console.error('Training enrollments upsert error:', enrollError)
      return NextResponse.json({ error: 'Failed assigning enrollments' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      assignedCount: upserted?.length || 0,
      enrollments: upserted || [],
    })
  } catch (error) {
    console.error('Training enrollments assign unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
