'use client'

import { useId } from 'react'
import { Calendar } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface ReviewFrequencySelectorProps {
  value: number // in months
  onChange: (months: number) => void
  label?: string
}

export function ReviewFrequencySelector({ value, onChange, label }: ReviewFrequencySelectorProps) {
  const { t } = useTranslation()
  const id = useId()
  const options = [
    { months: 3, label: t('admin.threeMonths') },
    { months: 6, label: t('admin.sixMonths') },
    { months: 9, label: t('admin.nineMonths') },
    { months: 12, label: t('admin.twelveMonths') }
  ]

  return (
    <fieldset data-no-translate aria-describedby={`${id}-help`} className="min-w-0 space-y-3">
      <legend className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        <span className="flex items-center gap-2"><Calendar size={16} aria-hidden="true" />{t('reminders.frequency')}</span>
      </legend>
      <p id={`${id}-help`} className="text-xs text-gray-600 dark:text-gray-300">{t('reminders.help')}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map(option => (
          <label key={option.months} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border-2 p-3 transition-all focus-within:ring-2 focus-within:ring-teal-700 dark:focus-within:ring-teal-300 ${value === option.months ? 'border-teal-600 bg-teal-50 shadow-sm dark:border-teal-400 dark:bg-teal-950' : 'border-gray-300 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800'}`}>
            <input type="radio" name={id} value={option.months} checked={value === option.months} onChange={() => onChange(option.months)}
              aria-label={option.label} className="mt-1 h-4 w-4 shrink-0 accent-teal-700 dark:accent-teal-400" />
            <span className="min-w-0 break-words">
              <span className="block font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
