'use client'

import { Calendar } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'

interface ReviewFrequencySelectorProps {
  value: number // in months
  onChange: (months: number) => void
  label?: string
}

export function ReviewFrequencySelector({ value, onChange, label }: ReviewFrequencySelectorProps) {
  const { t } = useTranslation()
  const options = [
    { months: 3, label: t('admin.threeMonths'), description: t('admin.quarterlyReview') },
    { months: 6, label: t('admin.sixMonths'), description: t('admin.semiAnnualReview') },
    { months: 9, label: t('admin.nineMonths'), description: t('admin.nineMonthReview') },
    { months: 12, label: t('admin.twelveMonths'), description: t('admin.annualReview') }
  ]

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Calendar size={16} />
        {label || t('admin.reviewFrequency')}
      </label>
      <p className="text-xs text-slate-600">
        {t('admin.reviewFrequencyHelp')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.months}
            type="button"
            onClick={() => onChange(option.months)}
            className={`
              p-3 rounded-lg border-2 transition-all text-left
              ${value === option.months
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className="font-medium text-slate-900">{option.label}</div>
            <div className="text-xs text-slate-600">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
