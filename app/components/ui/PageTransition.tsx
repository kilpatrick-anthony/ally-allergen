// app/components/ui/PageTransition.tsx
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    setIsLoading(true)
    
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsLoading(false)
    }, 150)
    
    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div className="relative min-h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#42b8ac]/20 border-t-[#42b8ac] mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <span className="text-sm text-gray-600 mt-3">Loading...</span>
        </div>
      )}
      
      {/* Page content with fade transition */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isLoading ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
        }`}
      >
        {displayChildren}
      </div>
    </div>
  )
}