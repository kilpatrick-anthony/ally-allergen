// app/hooks/useFormValidation.ts
'use client'

import { useState, useCallback } from 'react'

interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: string) => string | null
  message?: string
}

interface FieldConfig {
  [key: string]: ValidationRule
}

interface ValidationErrors {
  [key: string]: string
}

interface ValidationState {
  errors: ValidationErrors
  isValid: boolean
  isValidating: boolean
}

export function useFormValidation(config: FieldConfig) {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: {},
    isValid: true,
    isValidating: false,
  })

  const validateField = useCallback((fieldName: string, value: string): string | null => {
    const rules = config[fieldName]
    if (!rules) return null

    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      return rules.message || `${fieldName} is required`
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) return null

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `${fieldName} must be at least ${rules.minLength} characters`
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `${fieldName} must be no more than ${rules.maxLength} characters`
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `${fieldName} format is invalid`
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value)
    }

    return null
  }, [config])

  const validateForm = useCallback((data: Record<string, string>): boolean => {
    setValidationState(prev => ({ ...prev, isValidating: true }))

    const errors: ValidationErrors = {}
    let isValid = true

    Object.keys(config).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName] || '')
      if (error) {
        errors[fieldName] = error
        isValid = false
      }
    })

    setValidationState({
      errors,
      isValid,
      isValidating: false,
    })

    return isValid
  }, [config, validateField])

  const validateSingleField = useCallback((fieldName: string, value: string) => {
    const error = validateField(fieldName, value)

    setValidationState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: error || '',
      },
      isValid: !error && Object.values(prev.errors).every(e => !e),
    }))

    return !error
  }, [validateField])

  const clearErrors = useCallback(() => {
    setValidationState({
      errors: {},
      isValid: true,
      isValidating: false,
    })
  }, [])

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setValidationState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: error,
      },
      isValid: false,
    }))
  }, [])

  return {
    ...validationState,
    validateForm,
    validateField: validateSingleField,
    clearErrors,
    setFieldError,
  }
}

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
}

// Predefined validation configs
export const validationConfigs = {
  login: {
    email: {
      required: true,
      pattern: validationPatterns.email,
      message: 'Please enter a valid email address',
    },
    password: {
      required: true,
      minLength: 6,
      message: 'Password must be at least 6 characters',
    },
  },
  registration: {
    email: {
      required: true,
      pattern: validationPatterns.email,
      message: 'Please enter a valid email address',
    },
    password: {
      required: true,
      pattern: validationPatterns.password,
      message: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
    },
    confirmPassword: {
      required: true,
      custom: (value: string, formData?: any) => {
        if (value !== formData?.password) {
          return 'Passwords do not match'
        }
        return null
      },
      message: 'Passwords do not match',
    },
  },
  contact: {
    name: {
      required: true,
      minLength: 2,
      message: 'Name must be at least 2 characters',
    },
    email: {
      required: true,
      pattern: validationPatterns.email,
      message: 'Please enter a valid email address',
    },
    message: {
      required: true,
      minLength: 10,
      message: 'Message must be at least 10 characters',
    },
  },
}