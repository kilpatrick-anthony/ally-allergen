'use client'

import { useEffect, useState } from 'react'

export type FormIssue = { field: string; message: string }

export function focusFormField(field: string) {
  let target = document.getElementById(field)
  if (field === 'regular-assessment') {
    target = Array.from(document.querySelectorAll<HTMLSelectElement>('select[data-allergen-input]')).find(input => !input.value)
      || target
  }
  if (!target || !target.getBoundingClientRect().height) target = document.getElementById('regular-validation')
  target?.focus()
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

export function useRegularFormValidation(value: unknown) {
  const [issues, setIssues] = useState<FormIssue[]>([])
  const snapshot = JSON.stringify(value)
  useEffect(() => { setIssues([]) }, [snapshot])
  return {
    issues,
    reportIssues: (next: FormIssue[]) => {
      setIssues(next)
      if (next.length) requestAnimationFrame(() => focusFormField(next[0].field))
      return next.length > 0
    },
    fieldProps: (field: string) => ({ id: field, 'aria-invalid': issues.some(issue => issue.field === field) || undefined, 'aria-describedby': issues.some(issue => issue.field === field) ? `${field}-error` : undefined }),
  }
}
