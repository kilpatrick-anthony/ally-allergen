// components/ui/MicroInteractionsDemo.tsx
'use client'

import { useState } from 'react'
import { RippleButton } from './RippleButton'
import { FormValidation, ValidatedInput } from './FormValidation'
import { ProgressBar, Stepper, LoadingSpinner, Skeleton } from './ProgressIndicator'
import { Card } from '@/components/layout/Card'
import { Badge } from './Badge'
import { Zap, CheckCircle, AlertCircle, Mail, Lock, User } from 'lucide-react'

export function MicroInteractionsDemo() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('email')

  const emailRules = [
    {
      test: (value: string) => value.includes('@'),
      message: 'Email must contain @ symbol',
      type: 'error' as const
    },
    {
      test: (value: string) => value.length > 5,
      message: 'Email must be at least 5 characters',
      type: 'warning' as const
    }
  ]

  const passwordRules = [
    {
      test: (value: string) => value.length >= 8,
      message: 'Password must be at least 8 characters',
      type: 'error' as const
    },
    {
      test: (value: string) => /[A-Z]/.test(value),
      message: 'Password should contain uppercase letter',
      type: 'warning' as const
    },
    {
      test: (value: string) => /[0-9]/.test(value),
      message: 'Password should contain a number',
      type: 'success' as const
    }
  ]

  const steps = [
    { id: 'email', title: 'Enter Email', description: 'Provide your email address' },
    { id: 'password', title: 'Create Password', description: 'Set a secure password' },
    { id: 'verify', title: 'Verify Account', description: 'Confirm your account' },
    { id: 'complete', title: 'Complete Setup', description: 'You\'re all set!' }
  ]

  const handleNext = () => {
    if (currentStep === 'email') setCurrentStep('password')
    else if (currentStep === 'password') setCurrentStep('verify')
    else if (currentStep === 'verify') setCurrentStep('complete')
  }

  const handleProgressDemo = () => {
    setProgress(prev => (prev + 25) % 125) // Cycle through 0, 25, 50, 75, 100
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Micro-Interactions Demo</h1>
        <p className="text-gray-600">Experience modern UI interactions and animations</p>
      </div>

      {/* Page Transitions */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Page Transitions
          </h2>
          <p className="text-gray-600 mb-4">
            Smooth transitions between admin pages with loading states and fade effects.
            Navigate between different admin sections to see the transitions in action.
          </p>
          <div className="bg-gradient-to-r from-[#42b8ac]/10 to-[#003842]/10 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              ✨ <strong>Active:</strong> PageTransition component wraps all admin content
            </p>
          </div>
        </div>
      </Card>

      {/* Ripple Buttons */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 animate-ping" />
            Ripple Effects
          </h2>
          <p className="text-gray-600 mb-4">
            Material Design-style ripple effects on button interactions.
          </p>
          <div className="flex flex-wrap gap-4">
            <RippleButton variant="primary" onClick={() => alert('Primary ripple!')}>
              Primary Button
            </RippleButton>
            <RippleButton variant="secondary" onClick={() => alert('Secondary ripple!')}>
              Secondary Button
            </RippleButton>
            <RippleButton variant="outline" icon={CheckCircle} onClick={() => alert('Outline ripple!')}>
              With Icon
            </RippleButton>
            <RippleButton variant="success" size="lg" onClick={() => alert('Success ripple!')}>
              Large Success
            </RippleButton>
          </div>
        </div>
      </Card>

      {/* Form Validation */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Real-time Form Validation
          </h2>
          <p className="text-gray-600 mb-6">
            Instant validation feedback with smooth error state transitions.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <ValidatedInput
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={setEmail}
                rules={emailRules}
              />
            </div>

            <div>
              <ValidatedInput
                label="Password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={setPassword}
                rules={passwordRules}
              />
            </div>
          </div>

          <div className="mt-6">
            <RippleButton
              variant="primary"
              onClick={() => alert('Form submitted!')}
              disabled={!email.includes('@') || password.length < 8}
            >
              Submit Form
            </RippleButton>
          </div>
        </div>
      </Card>

      {/* Progress Indicators */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#42b8ac] border-t-transparent rounded-full animate-spin" />
            Progress Indicators
          </h2>
          <p className="text-gray-600 mb-6">
            Modern progress bars, steppers, and loading states.
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Upload Progress</span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <ProgressBar progress={progress} showPercentage animated />
            <div className="mt-3">
              <RippleButton variant="outline" size="sm" onClick={handleProgressDemo}>
                Animate Progress
              </RippleButton>
            </div>
          </div>

          {/* Stepper */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Account Setup Steps</h3>
            <Stepper steps={steps} currentStep={currentStep} />
            <div className="mt-4 flex gap-2">
              <RippleButton
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentStep === 'complete'}
              >
                Next Step
              </RippleButton>
              <RippleButton
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('email')}
              >
                Reset
              </RippleButton>
            </div>
          </div>

          {/* Loading States */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <LoadingSpinner size="sm" />
              <p className="text-xs text-gray-500 mt-2">Small</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="text-xs text-gray-500 mt-2">Medium</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-xs text-gray-500 mt-2">Large</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="md" color="white" className="bg-[#42b8ac] rounded p-2" />
              <p className="text-xs text-gray-500 mt-2">On Color</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Skeleton Loading */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            Skeleton Loading
          </h2>
          <p className="text-gray-600 mb-6">
            Modern skeleton placeholders for better loading experience.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">How to Use These Components</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Page Transitions</h3>
              <code className="block bg-gray-100 p-2 rounded text-xs mb-2">
                import {'{'} PageTransition {'}'} from '@/components/ui/PageTransition'
              </code>
              <p className="text-gray-600">Wrap your page content for smooth transitions</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Ripple Buttons</h3>
              <code className="block bg-gray-100 p-2 rounded text-xs mb-2">
                import {'{'} RippleButton {'}'} from '@/components/ui/RippleButton'
              </code>
              <p className="text-gray-600">Use instead of regular Button for ripple effects</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Form Validation</h3>
              <code className="block bg-gray-100 p-2 rounded text-xs mb-2">
                import {'{'} ValidatedInput {'}'} from '@/components/ui/FormValidation'
              </code>
              <p className="text-gray-600">Real-time validation with smooth error states</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Progress Indicators</h3>
              <code className="block bg-gray-100 p-2 rounded text-xs mb-2">
                import {'{'} ProgressBar, Stepper {'}'} from '@/components/ui/ProgressIndicator'
              </code>
              <p className="text-gray-600">Modern progress bars and multi-step flows</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}