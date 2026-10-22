export function reminderDueAt(item: { updated_at?: string | null; created_at?: string | null; preferred_review_months?: number | null }): Date | null {
  const start = new Date(item.updated_at || item.created_at || '')
  if (Number.isNaN(start.getTime())) return null
  const months = [3, 6, 9, 12].includes(item.preferred_review_months || 0) ? item.preferred_review_months! : 12
  const due = new Date(start)
  due.setUTCDate(1)
  due.setUTCMonth(due.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate()
  due.setUTCDate(Math.min(start.getUTCDate(), lastDay))
  return due
}
