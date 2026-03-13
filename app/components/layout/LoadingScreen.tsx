export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="relative mx-auto mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#42b8ac]/20 border-t-[#42b8ac]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#003842] animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  )
}