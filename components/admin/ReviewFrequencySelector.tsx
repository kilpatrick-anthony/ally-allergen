'use client'

import { Calendar } from 'lucide-react'

interface ReviewFrequencySelectorProps {
  value: number // in months
  onChange: (months: number) => void
  label?: string
}

export function ReviewFrequencySelector({ value, onChange, label }: ReviewFrequencySelectorProps) {
  const options = [
    { months: 3, label: '3 months', description: 'Quarterly review' },
    { months: 6, label: '6 months', description: 'Semi-annual review' },
    { months: 9, label: '9 months', description: 'Review every 9 months' },
    { months: 12, label: '12 months', description: 'Annual review' }
  ]

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Calendar size={16} />
        {label || 'Review Frequency'}
      </label>
      <p className="text-xs text-slate-600">
        Set a routine review interval. Review sooner whenever the product, supplier, recipe, process, or allergen information changes.
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
