// components/ally/JenAvatar.tsx
// Placeholder avatar for Jen — the admin compliance coach.
// Replace the SVG body with your custom illustration (400×400px, SVG format).

interface JenAvatarProps {
  size?: number
  className?: string
  /** Show a notification dot (e.g. unread nudges) */
  badge?: number
}

export function JenAvatar({ size = 48, className = '', badge }: JenAvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {badge != null && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 z-10 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white"
          style={{ fontSize: Math.max(8, size * 0.2) }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Jen_2.svg"
        alt="Jen"
        width={size}
        height={size}
        style={{
          display: 'block',
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    </span>
  )
}
