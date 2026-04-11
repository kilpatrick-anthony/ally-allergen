// app/components/ui/Button.tsx
import React from 'react'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    min-h-[44px] min-w-[44px]
    ${fullWidth ? 'w-full' : ''}
  `

  const variants = {
    primary: 'bg-[#42b8ac] text-white hover:bg-[#36948a] focus:ring-[#42b8ac] active:bg-[#2a7068]',
    secondary: 'bg-[#003842] text-white hover:bg-[#001f26] focus:ring-[#003842] active:bg-[#001014]',
    outline: 'border border-[#42b8ac] text-[#42b8ac] hover:bg-[#f0f9f8] focus:ring-[#42b8ac] active:bg-[#d9f2f0]',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300 active:bg-gray-200',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-3',
  }

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className={`animate-spin ${iconSize[size]} mr-2`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            typeof Icon === 'function'
              ? React.createElement(Icon as React.ComponentType<{className: string}>, { className: iconSize[size] })
              : Icon
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            typeof Icon === 'function'
              ? React.createElement(Icon as React.ComponentType<{className: string}>, { className: iconSize[size] })
              : Icon
          )}
        </>
      )}
    </button>
  )
}