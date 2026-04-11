'use client'

import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  icon?: any
  rounded?: 'full' | 'lg' | 'md'
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon,
  rounded = 'full'
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200/50 dark:border-gray-600/50',
    primary: 'bg-gradient-to-r from-[#42b8ac]/10 to-[#003842]/10 dark:from-[#42b8ac]/20 dark:to-[#42b8ac]/10 text-[#003842] dark:text-[#42b8ac] shadow-sm border border-[#42b8ac]/20 dark:border-[#42b8ac]/40',
    success: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 text-green-800 dark:text-green-300 shadow-sm border border-green-200/50 dark:border-green-700/50',
    warning: 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 text-yellow-800 dark:text-yellow-300 shadow-sm border border-yellow-200/50 dark:border-yellow-700/50',
    error: 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 text-red-800 dark:text-red-300 shadow-sm border border-red-200/50 dark:border-red-700/50',
    info: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-800 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-700/50',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-2',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }

  const roundedClass = {
    full: 'rounded-full',
    lg: 'rounded-lg',
    md: 'rounded-md',
  }

  return (
    <span className={`
      inline-flex items-center font-medium
      ${variants[variant]}
      ${sizes[size]}
      ${roundedClass[rounded]}
    `}>
      {icon && (
        <span className="flex-shrink-0">
          {typeof icon === 'function' 
            ? React.createElement(icon as React.ComponentType<{className: string}>, { className: 'h-3 w-3' })
            : icon
          }
        </span>
      )}
      {children}
    </span>
  )
}
