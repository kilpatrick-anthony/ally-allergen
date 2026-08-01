import { z } from 'zod'

const uuid = z.string().uuid()

export const listTrainingCoursesQuerySchema = z.object({
  businessId: uuid.optional(),
  includeArchived: z.boolean().optional().default(false),
})

export const assignTrainingEnrollmentsSchema = z.object({
  businessId: uuid,
  courseId: uuid,
  userIds: z.array(uuid).min(1),
  dueAt: z.string().datetime().optional(),
  dueInDays: z.number().int().min(0).optional(),
})

export const upsertTrainingProgressSchema = z.object({
  enrollmentId: uuid,
  moduleId: uuid,
  progressPercent: z.number().int().min(0).max(100),
  bestScore: z.number().int().min(0).max(100).optional(),
  markCompleted: z.boolean().optional().default(false),
})

export type ListTrainingCoursesQuery = z.infer<typeof listTrainingCoursesQuerySchema>
export type AssignTrainingEnrollmentsInput = z.infer<typeof assignTrainingEnrollmentsSchema>
export type UpsertTrainingProgressInput = z.infer<typeof upsertTrainingProgressSchema>
