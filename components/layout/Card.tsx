// app/components/layout/Card.tsx
// components/layout/Card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div className={`
      bg-white/80 dark:bg-gray-900/70
      backdrop-blur-sm
      rounded-xl
      border border-white/80 dark:border-gray-700/60
      shadow-[0_4px_24px_-4px_rgba(0,56,66,0.10)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.30)]
      ${paddingClasses[padding]}
      ${hover ? 'transition-all duration-200 hover:shadow-[0_8px_32px_-4px_rgba(0,56,66,0.18)] hover:border-[#42b8ac]/40 hover:-translate-y-0.5' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}