// app/components/ui/Badge.tsx
import { LucideIcon } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  rounded?: 'full' | 'lg' | 'md'
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon: Icon,
  rounded = 'full'
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-[#f0f9f8] text-[#003842]',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm',
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
      {Icon && <Icon className="h-3 w-3 mr-1.5" />}
      {children}
    </span>
  )
}