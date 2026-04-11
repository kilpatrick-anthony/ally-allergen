// components/ui/RippleButton.tsx
'use client'

import React from 'react'
import { ReactNode, useState, MouseEvent } from 'react'
import { LucideIcon } from 'lucide-react'

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

interface RippleButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
  disabled?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

export function RippleButton({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const newRipple: Ripple = {
      id: Date.now(),
      x,
      y,
      size
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600)

    onClick?.(event)
  }

  // Base classes
  const baseClasses = 'relative overflow-hidden inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] shadow-sm hover:shadow-md active:scale-[0.98]'

  // Variants
  const variantClasses = {
    primary: 'bg-[#42b8ac] text-white hover:bg-[#36948a] hover:shadow-lg hover:shadow-[#42b8ac]/25 focus:ring-[#42b8ac]',
    secondary: 'bg-[#003842] text-white hover:bg-[#001f26] hover:shadow-lg hover:shadow-[#003842]/25 focus:ring-[#003842]',
    outline: 'border border-[#42b8ac] text-[#42b8ac] hover:bg-[#f0f9f8] hover:border-[#36948a] hover:shadow-md focus:ring-[#42b8ac]',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md focus:ring-gray-300',
    success: 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/25 focus:ring-green-500',
  }

  // Sizes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-3',
  }

  // Full width
  const widthClass = fullWidth ? 'w-full' : ''

  // Combine all classes
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim()

  // Icon sizes
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <button
      className={combinedClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <svg className={`animate-spin ${iconSizes[size]} mr-2`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            typeof Icon === 'function'
              ? React.createElement(Icon as React.ComponentType<{className: string}>, { className: iconSizes[size] })
              : Icon
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            typeof Icon === 'function'
              ? React.createElement(Icon as React.ComponentType<{className: string}>, { className: iconSizes[size] })
              : Icon
          )}
        </>
      )}

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '600ms'
          }}
        />
      ))}
    </button>
  )
}