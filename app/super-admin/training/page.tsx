'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, CheckCircle2, Loader2, Users } from 'lucide-react'
import { Card } from '@/components/layout/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

type BusinessOption = {
  id: string
  name: string
}

type TrainingModule = {
  id: string
  module_type: 'lesson' | 'video' | 'quiz'
  estimated_minutes: number
  order_index: number
}

type TrainingCourse = {
  id: string
  businessId: string | null
  title: string
  description: string | null
  status: 'draft' | 'active' | 'archived'
  isGlobal: boolean
  version: number
  moduleCount: number
  estimatedTotalMinutes: number
  modules: TrainingModule[]
}

type Notice = {
  type: 'success' | 'error'
  message: string
}

const statusClass: Record<TrainingCourse['status'], string> = {
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-gray-100 text-gray-700 border border-gray-200',
}

export default function SuperAdminTrainingHubPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [businesses, setBusinesses] = useState<BusinessOption[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  const [userIdsInput, setUserIdsInput] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [dueInDays, setDueInDays] = useState('14')
  const [assigning, setAssigning] = useState(false)

  const [notice, setNotice] = useState<Notice | null>(null)

  const activeCourses = useMemo(
    () => courses.filter((course) => course.status === 'active'),
    [courses]
  )

  const validateSuperAdmin = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const session = response.ok ? await response.json() : null
      const isAdmin = Boolean(
        session?.authenticated &&
        (
          session?.user?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
          session?.user?.email === process.env.SUPER_ADMIN_EMAIL ||
          session?.user?.role === 'super_admin'
        )
      )

      if (!isAdmin) {
        router.replace('/admin')
        return
      }

      setAuthorized(true)
    } catch {
      router.replace('/auth/signin?redirect=/super-admin/training')
    } finally {
      setAuthLoading(false)
    }
  }

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/super-admin/business')
      const payload = response.ok ? await response.json() : { businesses: [] }
      const options: BusinessOption[] = (payload.businesses || []).map((business: any) => ({
        id: business.id,
        name: business.name,
      }))
      setBusinesses(options)

      if (!selectedBusinessId && options.length > 0) {
        setSelectedBusinessId(options[0].id)
      }
    } catch {
      setNotice({ type: 'error', message: 'Failed to load businesses for training assignment.' })
    }
  }

  const loadCourses = async (businessId?: string) => {
    setCoursesLoading(true)
    try {
      const params = new URLSearchParams()
      if (businessId) params.set('businessId', businessId)
      const response = await fetch(`/api/super-admin/training/courses?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to load courses')

      setCourses(payload.courses || [])
      if (!selectedCourseId && payload.courses?.length) {
        const firstActive = payload.courses.find((course: TrainingCourse) => course.status === 'active')
        if (firstActive) setSelectedCourseId(firstActive.id)
      }
    } catch (error: any) {
      setCourses([])
      setNotice({ type: 'error', message: error.message || 'Failed to load training courses.' })
    } finally {
      setCoursesLoading(false)
    }
  }

  useEffect(() => {
    validateSuperAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!authorized) return
    loadBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized])

  useEffect(() => {
    if (!authorized) return
    loadCourses(selectedBusinessId || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, selectedBusinessId])

  const handleAssign = async () => {
    if (!selectedBusinessId) {
      setNotice({ type: 'error', message: 'Select a business before assigning training.' })
      return
    }

    if (!selectedCourseId) {
      setNotice({ type: 'error', message: 'Select a course before assigning training.' })
      return
    }

    const userIds = userIdsInput
      .split(/[\s,\n]+/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (userIds.length === 0) {
      setNotice({ type: 'error', message: 'Enter at least one user ID.' })
      return
    }

    const parsedDueInDays = Number(dueInDays)
    if (!Number.isInteger(parsedDueInDays) || parsedDueInDays < 0) {
      setNotice({ type: 'error', message: 'Due days must be a whole number greater than or equal to 0.' })
      return
    }

    setAssigning(true)
    setNotice(null)

    try {
      const response = await fetch('/api/super-admin/training/enrollments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          courseId: selectedCourseId,
          userIds,
          dueInDays: parsedDueInDays,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed assigning training')

      setNotice({
        type: 'success',
        message: `Assigned course to ${payload.assignedCount || userIds.length} user(s).`,
      })
      setUserIdsInput('')
    } catch (error: any) {
      setNotice({ type: 'error', message: error.message || 'Failed assigning training.' })
    } finally {
      setAssigning(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#42b8ac]" />
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training Hub</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage course availability and assign training from the super-admin portal.
          </p>
        </div>
        <Button variant="outline" onClick={() => loadCourses(selectedBusinessId || undefined)}>
          Refresh Courses
        </Button>
      </div>

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          notice.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Catalog</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Global templates plus business-specific courses.
              </p>
            </div>
            <BookOpen className="h-5 w-5 text-[#42b8ac]" />
          </div>
          <div className="p-5">
            <div className="mb-4">
              <Select
                value={selectedBusinessId}
                onChange={setSelectedBusinessId}
                className="h-10 w-full"
                options={[
                  { value: '', label: 'All global courses' },
                  ...businesses.map((business) => ({ value: business.id, label: business.name })),
                ]}
              />
            </div>

            {coursesLoading ? (
              <div className="py-10 flex items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                No courses found for the selected scope.
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white">{course.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[course.status]}`}>
                        {course.status}
                      </span>
                      {course.isGlobal && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          global
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {course.moduleCount} modules • {course.estimatedTotalMinutes} minutes • v{course.version}
                    </p>
                    {course.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{course.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Training</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Paste one or more user IDs to enroll learners.
              </p>
            </div>
            <Users className="h-5 w-5 text-[#42b8ac]" />
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Business</label>
              <Select
                value={selectedBusinessId}
                onChange={setSelectedBusinessId}
                className="h-10 w-full"
                options={businesses.map((business) => ({ value: business.id, label: business.name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
              <Select
                value={selectedCourseId}
                onChange={setSelectedCourseId}
                className="h-10 w-full"
                options={activeCourses.map((course) => ({
                  value: course.id,
                  label: `${course.title}${course.isGlobal ? ' (Global)' : ''}`,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due In Days</label>
              <input
                type="number"
                min={0}
                value={dueInDays}
                onChange={(event) => setDueInDays(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">User IDs</label>
              <textarea
                rows={6}
                value={userIdsInput}
                onChange={(event) => setUserIdsInput(event.target.value)}
                placeholder="Paste UUIDs separated by comma, space, or newline"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#42b8ac] focus:border-transparent"
              />
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAssign}
              disabled={assigning}
              icon={assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            >
              {assigning ? 'Assigning...' : 'Assign Training'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
