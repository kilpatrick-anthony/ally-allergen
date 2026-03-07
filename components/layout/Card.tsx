// app/components/layout/Card.tsx
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
      bg-white rounded-xl border border-gray-200 shadow-soft
      ${paddingClasses[padding]}
      ${hover ? 'transition-all duration-200 hover:shadow-hover hover:border-primary-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}