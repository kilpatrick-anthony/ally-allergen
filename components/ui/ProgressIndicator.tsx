// components/ui/ProgressIndicator.tsx
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'

interface Step {
  id: string
  title: string
  description?: string
  completed?: boolean
  current?: boolean
}

interface ProgressBarProps {
  progress: number // 0-100
  color?: 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  animated?: boolean
  className?: string
}

export function ProgressBar({
  progress,
  color = 'primary',
  size = 'md',
  showPercentage = false,
  animated = true,
  className = ''
}: ProgressBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setAnimatedProgress(progress)
    }
  }, [progress, animated])

  const colorClasses = {
    primary: 'bg-[#42b8ac]',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out rounded-full ${
            animated ? 'transition-all duration-1000 ease-out' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
        />
      </div>
      {showPercentage && (
        <div className="text-right mt-1">
          <span className="text-sm text-gray-600">{Math.round(animatedProgress)}%</span>
        </div>
      )}
    </div>
  )
}

interface StepperProps {
  steps: Step[]
  currentStep?: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  className = ''
}: StepperProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep)

  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = step.completed || index < currentIndex
          const isCurrent = step.id === currentStep
          const isUpcoming = index > currentIndex

          return (
            <div key={step.id} className="flex items-start gap-4">
              {/* Step Circle */}
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : isCurrent
                    ? 'border-[#42b8ac] text-[#42b8ac] bg-[#42b8ac]/10'
                    : 'border-gray-300 text-gray-400 bg-white'
                }
              `}>
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium transition-colors duration-300 ${
                  isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </h3>
                {step.description && (
                  <p className={`text-sm mt-1 transition-colors duration-300 ${
                    isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal stepper
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = step.completed || index < currentIndex
        const isCurrent = step.id === currentStep
        const isUpcoming = index > currentIndex
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
              ${isCompleted
                ? 'bg-green-500 border-green-500 text-white'
                : isCurrent
                  ? 'border-[#42b8ac] text-[#42b8ac] bg-[#42b8ac]/10'
                  : 'border-gray-300 text-gray-400 bg-white'
              }
            `}>
              {isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            {/* Step Content */}
            <div className="ml-4 mr-8 text-center">
              <h3 className={`font-medium transition-colors duration-300 ${
                isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.title}
              </h3>
              {step.description && (
                <p className={`text-sm mt-1 transition-colors duration-300 ${
                  isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step.description}
                </p>
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className={`
                flex-1 h-0.5 mx-4 transition-colors duration-300
                ${index < currentIndex ? 'bg-green-500' : 'bg-gray-300'}
              `} />
            )}
          </div>
        )
      })}
    </div>
  )
}

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
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const colorClasses = {
    primary: 'border-[#42b8ac] border-t-transparent',
    white: 'border-white border-t-transparent'
  }

  return (
    <div className={`animate-spin rounded-full border-4 ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  )
}

interface SkeletonProps {
  className?: string
  animated?: boolean
}

export function Skeleton({
  className = '',
  animated = true
}: SkeletonProps) {
  return (
    <div
      className={`
        bg-gray-200 rounded
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  )
}