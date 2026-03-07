export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-200"></div>
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-2 border-t-[#42b8ac] border-transparent"></div>
        </div>
        <p className="mt-6 text-gray-600">Loading your dashboard...</p>
        <div className="mt-2 text-xs text-gray-400">Optimizing your experience</div>
      </div>
    </div>
  )
}