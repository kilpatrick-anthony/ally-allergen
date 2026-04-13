'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { ButtonHTMLAttributes, useState } from 'react'

interface Ripple {
  id: number
  x: number
  y: number
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  icon?: any
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
  const [ripples, setRipples] = useState<Ripple[]>([])
  
  const addRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    const newRipple = {
      id: Date.now(),
      x,
      y,
    }
    
    setRipples(prev => [...prev, newRipple])
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600)
  }
  
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] shadow-sm hover:shadow-md active:scale-[0.98]'
  
  // Variants
  const variantClasses = {
    primary: 'bg-[#42b8ac] text-white hover:bg-[#36948a] hover:shadow-lg hover:shadow-[#42b8ac]/25 focus:ring-[#42b8ac]',
    secondary: 'bg-[#003842] text-white hover:bg-[#001f26] hover:shadow-lg hover:shadow-[#003842]/25 focus:ring-[#003842]',
    outline: 'border border-[#42b8ac] text-[#42b8ac] hover:bg-[#f0f9f8] hover:border-[#36948a] hover:shadow-md focus:ring-[#42b8ac]',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25 focus:ring-red-500',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 hover:shadow-md focus:ring-gray-300',
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
  
  // Icon handler
  const renderIcon = (icon: any, sizeClass: string) => {
    if (!icon) return null;
    
    // If it's a function/component, use React.createElement
    if (typeof icon === 'function') {
      return React.createElement(icon as React.ComponentType<{className: string}>, { className: sizeClass });
    }
    
    // If it's a JSX element (has $$typeof), render it but ensure className is set properly
    if (icon && typeof icon === 'object' && '$$typeof' in icon) {
      // For JSX elements, we need to clone and add/update className
      if (icon.props?.className) {
        return icon;
      }
      // If no className, clone the element with the size class
      return React.cloneElement(icon as any, { className: sizeClass });
    }
    
    // Otherwise render as-is (string, number, etc.)
    return icon;
  };
  
  return (
    <button
      className={`${combinedClasses} relative overflow-hidden`}
      disabled={disabled || loading}
      onClick={(e) => {
        addRipple(e)
        props.onClick?.(e)
      }}
      {...props}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '20px',
            height: '20px',
            transform: 'translate(-50%, -50%)',
            animation: 'ripple 0.6s linear',
          }}
        />
      ))}
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
          {Icon && iconPosition === 'left' && renderIcon(Icon, iconSizes[size])}
          {children}
          {Icon && iconPosition === 'right' && renderIcon(Icon, iconSizes[size])}
        </>
      )}
    </button>
  )
}
