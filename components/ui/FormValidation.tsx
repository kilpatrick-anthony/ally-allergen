// components/ui/FormValidation.tsx
'use client'

import { ReactNode, useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface ValidationRule {
  test: (value: string) => boolean
  message: string
  type: 'error' | 'warning' | 'success'
}

interface FormValidationProps {
  value: string
  rules: ValidationRule[]
  showValidation?: boolean
  className?: string
  children: ReactNode
}

export function FormValidation({
  value,
  rules,
  showValidation = true,
  className = '',
  children
}: FormValidationProps) {
  const [validationResults, setValidationResults] = useState<Array<{
    rule: ValidationRule
    isValid: boolean
    isVisible: boolean
  }>>([])

  useEffect(() => {
    if (!showValidation) return

    const results = rules.map(rule => ({
      rule,
      isValid: rule.test(value),
      isVisible: value.length > 0 || rule.type === 'error'
    }))

    setValidationResults(results)
  }, [value, rules, showValidation])

  const getValidationIcon = (type: 'error' | 'warning' | 'success') => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getValidationColor = (type: 'error' | 'warning' | 'success') => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  return (
    <div className={`relative ${className}`}>
      {children}

      {/* Validation Messages */}
      {showValidation && validationResults.some(result => result.isVisible && !result.isValid) && (
        <div className="mt-2 space-y-1">
          {validationResults
            .filter(result => result.isVisible && !result.isValid)
            .map((result, index) => (
              <div
                key={index}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                  transition-all duration-300 ease-in-out
                  ${getValidationColor(result.rule.type)}
                  animate-in slide-in-from-top-1 fade-in-0
                `}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
              >
                {getValidationIcon(result.rule.type)}
                <span>{result.rule.message}</span>
              </div>
            ))}
        </div>
      )}

      {/* Success Indicator */}
      {showValidation && validationResults.every(result => result.isValid) && value.length > 0 && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-green-600 bg-green-50 border-green-200 transition-all duration-300 ease-in-out animate-in slide-in-from-top-1 fade-in-0">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>All validations passed</span>
        </div>
      )}
    </div>
  )
}

// Enhanced Input with built-in validation
interface ValidatedInputProps {
  value: string
  onChange: (value: string) => void
  rules?: ValidationRule[]
  placeholder?: string
  type?: string
  className?: string
  label?: string
}

export function ValidatedInput({
  value,
  onChange,
  rules = [],
  placeholder,
  type = 'text',
  className = '',
  label
}: ValidatedInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const hasValidationError = rules.some(rule => !rule.test(value) && value.length > 0)
    setHasError(hasValidationError)
  }, [value, rules])

  return (
    <FormValidation value={value} rules={rules}>
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 border rounded-lg shadow-sm bg-white
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#42b8ac] focus:border-[#42b8ac]
            hover:shadow-md
            ${hasError
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-200 focus:border-[#42b8ac]'
            }
            ${isFocused ? 'shadow-lg transform -translate-y-0.5' : ''}
            ${className}
          `}
        />
      </div>
    </FormValidation>
  )
}