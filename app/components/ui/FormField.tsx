// app/components/ui/FormField.tsx
'use client'

import { ReactNode, useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface FormFieldProps {
  label?: string
  error?: string
  success?: string
  required?: boolean
  children: ReactNode
  className?: string
  showValidation?: boolean
}

export function FormField({
  label,
  error,
  success,
  required = false,
  children,
  className = '',
  showValidation = true
}: FormFieldProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')

  useEffect(() => {
    if (error) {
      setValidationState('invalid')
      setIsValidating(false)
    } else if (success) {
      setValidationState('valid')
      setIsValidating(false)
    } else if (isValidating) {
      setValidationState('validating')
    } else {
      setValidationState('idle')
    }
  }, [error, success, isValidating])

  const getBorderColor = () => {
    switch (validationState) {
      case 'valid': return 'border-green-300 focus:border-green-500 focus:ring-green-500'
      case 'invalid': return 'border-red-300 focus:border-red-500 focus:ring-red-500'
      case 'validating': return 'border-blue-300 focus:border-blue-500 focus:ring-blue-500'
      default: return 'border-gray-300 focus:border-[#42b8ac] focus:ring-[#42b8ac]'
    }
  }

  const getIcon = () => {
    switch (validationState) {
      case 'valid': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'invalid': return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'validating': return <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      default: return null
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {children}

        {/* Validation icon */}
        {showValidation && validationState !== 'idle' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getIcon()}
          </div>
        )}
      </div>

      {/* Error message with smooth animation */}
      {error && (
        <div className="text-sm text-red-600 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success message with smooth animation */}
      {success && (
        <div className="text-sm text-green-600 flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  )
}

// Password input with show/hide functionality
interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  success?: string
  required?: boolean
  className?: string
}

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  error,
  success,
  required = false,
  className = ''
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <FormField label="Password" error={error} success={success} required={required}>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg shadow-sm transition-all duration-200 bg-white focus:outline-none focus:ring-2 pr-12 ${className} ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' :
            success ? 'border-green-300 focus:border-green-500 focus:ring-green-500' :
            'border-gray-300 focus:border-[#42b8ac] focus:ring-[#42b8ac]'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </FormField>
  )
}