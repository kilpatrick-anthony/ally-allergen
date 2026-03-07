// app/components/layout/Card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'outline' | 'ghost'
}

export function Card({ 
  children, 
  className = '', 
  hover = false, 
  padding = 'md',
  variant = 'default'
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  }

  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 shadow-lg shadow-gray-100/50 backdrop-blur-sm',
    outline: 'bg-white/50 dark:bg-gray-800/50 border border-gray-300/60 dark:border-gray-700/60 backdrop-blur-sm',
    ghost: 'bg-transparent',
  }

  const hoverClass = hover ? 'transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-gray-900/60 hover:border-gray-300/80 hover:-translate-y-0.5' : ''

  return (
    <div className={`
      rounded-xl
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      ${hoverClass}
      ${className}
    `}>
      {children}
    </div>
  )
}