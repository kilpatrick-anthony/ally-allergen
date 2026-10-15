'use client'

import { focusFormField, type FormIssue } from '@/lib/hooks/useRegularFormValidation'
import { useTranslation } from '@/lib/hooks/useTranslation'

export function FormValidationSummary({ issues }: { issues: FormIssue[] }) {
  const { t } = useTranslation()
  if (!issues.length) return null
  return <div id="regular-validation" tabIndex={-1} role="alert" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 focus:outline focus:outline-2 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
    <p className="font-semibold">{t('regularForms.checkFields')}</p>
    <ul className="mt-2 list-inside list-disc space-y-1">{issues.map(issue => <li key={issue.field}><a className="underline" href={`#${issue.field}`} onClick={event => { event.preventDefault(); focusFormField(issue.field) }}>{issue.message}</a></li>)}</ul>
  </div>
}

export function FormFieldError({ field, issues }: { field: string; issues: FormIssue[] }) {
  const issue = issues.find(issue => issue.field === field)
  return issue ? <p id={`${field}-error`} className="mt-2 text-sm text-red-700 dark:text-red-200">{issue.message}</p> : null
}
