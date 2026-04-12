// app/components/ui/Progress.tsx
'use client'

import { ReactNode } from 'react'
import { CheckCircle, Circle } from 'lucide-react'

interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  className = ''
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  const colorClasses = {
    primary: 'bg-[#42b8ac]',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showLabel && <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out rounded-full relative overflow-hidden`}
          style={{ width: `${percentage}%` }}
        >
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

interface StepperProps {
  steps: {
    id: string
    title: string
    description?: string
    completed?: boolean
    current?: boolean
  }[]
  currentStep?: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Stepper({
  steps,
  currentStep = 0,
  orientation = 'horizontal',
  className = ''
}: StepperProps) {
  const isHorizontal = orientation === 'horizontal'

  return (
    <div className={`${isHorizontal ? 'flex items-center' : 'flex flex-col'} ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = step.completed || index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className={`flex ${isHorizontal ? 'flex-col items-center' : 'flex-row items-start'} flex-1`}>
            {/* Step Circle */}
            <div className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                ${isCompleted
                  ? 'bg-[#42b8ac] border-[#42b8ac] text-white'
                  : isCurrent
                    ? 'border-[#42b8ac] text-[#42b8ac] bg-white'
                    : 'border-gray-300 text-gray-400 bg-white'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className={`
                  ${isHorizontal ? 'w-full h-0.5 mt-5' : 'h-full w-0.5 ml-5'} transition-colors duration-300
                  ${isCompleted ? 'bg-[#42b8ac]' : 'bg-gray-300'}
                `} style={isHorizontal ? { minWidth: '2rem' } : { minHeight: '2rem' }} />
              )}
            </div>

            {/* Step Content */}
            <div className={`${isHorizontal ? 'mt-3 text-center' : 'ml-4 mt-1'} flex-1`}>
              <div className={`
                text-sm font-medium transition-colors duration-300
                ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}
              `}>
                {step.title}
              </div>
              {step.description && (
                <div className={`
                  text-xs mt-1 transition-colors duration-300
                  ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'}
                `}>
                  {step.description}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Loading spinner with progress
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white'
  className?: string
}

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const colorClasses = {
    primary: 'border-[#42b8ac] border-t-transparent',
    white: 'border-white border-t-transparent',
  }

  return (
    <div className={`animate-spin rounded-full border-2 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}></div>
  )
}