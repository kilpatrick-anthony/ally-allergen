import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthenticatedSuperAdmin } from '../_auth'
import { upsertTrainingProgressSchema } from '@/lib/training/contracts'

type EnrollmentRecord = {
  id: string
  course_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'expired'
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAuthenticatedSuperAdmin()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await request.json()
    const parsed = upsertTrainingProgressSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { enrollmentId, moduleId, progressPercent, bestScore, markCompleted } = parsed.data
    const supabase = createServiceClient()

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('training_enrollments')
      .select('id, course_id, status')
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const enrollmentRecord = enrollment as EnrollmentRecord

    const { data: module, error: moduleError } = await supabase
      .from('training_modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Training module not found' }, { status: 404 })
    }

    if (module.course_id !== enrollmentRecord.course_id) {
      return NextResponse.json({ error: 'Module is not part of this enrollment course' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()

    const { error: progressError } = await supabase
      .from('training_module_progress')
      .upsert(
        {
          enrollment_id: enrollmentId,
          module_id: moduleId,
          progress_percent: progressPercent,
          started_at: progressPercent > 0 ? nowIso : null,
          completed_at: markCompleted || progressPercent === 100 ? nowIso : null,
          best_score: bestScore ?? null,
        },
        {
          onConflict: 'enrollment_id,module_id',
        }
      )

    if (progressError) {
      console.error('Training progress upsert error:', progressError)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    const [moduleCountResult, completedModuleCountResult] = await Promise.all([
      supabase
        .from('training_modules')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', enrollmentRecord.course_id),
      supabase
        .from('training_module_progress')
        .select('id', { count: 'exact', head: true })
        .eq('enrollment_id', enrollmentId)
        .eq('progress_percent', 100),
    ])

    const totalModules = moduleCountResult.count || 0
    const completedModules = completedModuleCountResult.count || 0
    const shouldMarkCompleted = totalModules > 0 && completedModules >= totalModules

    const nextEnrollmentStatus = shouldMarkCompleted
      ? 'completed'
      : progressPercent > 0 || enrollmentRecord.status === 'in_progress' || enrollmentRecord.status === 'completed'
        ? 'in_progress'
        : 'not_started'

    const { error: enrollmentUpdateError } = await supabase
      .from('training_enrollments')
      .update({
        status: nextEnrollmentStatus,
        completed_at: shouldMarkCompleted ? nowIso : null,
      })
      .eq('id', enrollmentId)

    if (enrollmentUpdateError) {
      console.error('Training enrollment status update error:', enrollmentUpdateError)
      return NextResponse.json({ error: 'Updated module progress but failed to update enrollment status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      enrollmentId,
      moduleId,
      progressPercent,
      enrollmentStatus: nextEnrollmentStatus,
      completedModules,
      totalModules,
      updatedBy: admin.userId,
    })
  } catch (error) {
    console.error('Training progress PATCH unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
