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
      {/* ── PLACEHOLDER ILLUSTRATION ─────────────────────────────────────
          Safe zone: face/features should stay within the inner 75% circle.
          Replace this entire <svg> with your final Jen character art.
          Recommended export: 400×400px SVG, viewBox="0 0 400 400"
      ─────────────────────────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        style={{ display: 'block' }}
      >
        {/* Background circle */}
        <circle cx="200" cy="200" r="200" fill="#003842" />
        <circle cx="200" cy="200" r="185" fill="#005060" />

        {/* Body / blazer */}
        <ellipse cx="200" cy="348" rx="115" ry="80" fill="#002030" />
        <path d="M145 310 L200 360 L255 310 L248 290 L200 310 L152 290 Z" fill="#003842" />
        <path d="M200 310 L200 380" stroke="#42b8ac" strokeWidth="4" />

        {/* Neck */}
        <rect x="182" y="272" width="36" height="30" rx="8" fill="#f0c4a0" />

        {/* Shirt / collar */}
        <path d="M180 290 L200 306 L220 290 L215 278 L200 292 L185 278 Z" fill="white" />

        {/* Head */}
        <ellipse cx="200" cy="228" rx="82" ry="88" fill="#f0c4a0" />

        {/* Hair — professional bun/style */}
        <ellipse cx="200" cy="152" rx="82" ry="48" fill="#2d1b10" />
        <ellipse cx="200" cy="140" rx="60" ry="28" fill="#3d2518" />
        <ellipse cx="116" cy="198" rx="20" ry="42" fill="#2d1b10" />
        <ellipse cx="284" cy="198" rx="20" ry="42" fill="#2d1b10" />
        {/* Bun */}
        <circle cx="200" cy="130" r="22" fill="#3d2518" />
        <circle cx="200" cy="130" r="16" fill="#4d3025" />

        {/* Eyes */}
        <ellipse cx="170" cy="225" rx="14" ry="15" fill="white" />
        <ellipse cx="230" cy="225" rx="14" ry="15" fill="white" />
        <circle cx="173" cy="226" r="8" fill="#1a1a2e" />
        <circle cx="233" cy="226" r="8" fill="#1a1a2e" />
        <circle cx="176" cy="222" r="3" fill="white" />
        <circle cx="236" cy="222" r="3" fill="white" />

        {/* Glasses — Jen's signature detail */}
        {/* Left lens */}
        <rect x="151" y="212" width="40" height="28" rx="8" stroke="#42b8ac" strokeWidth="5" fill="none" />
        {/* Right lens */}
        <rect x="209" y="212" width="40" height="28" rx="8" stroke="#42b8ac" strokeWidth="5" fill="none" />
        {/* Bridge */}
        <line x1="191" y1="226" x2="209" y2="226" stroke="#42b8ac" strokeWidth="5" />
        {/* Arms */}
        <line x1="151" y1="226" x2="134" y2="222" stroke="#42b8ac" strokeWidth="5" />
        <line x1="249" y1="226" x2="266" y2="222" stroke="#42b8ac" strokeWidth="5" />

        {/* Eyebrows */}
        <path d="M153 208 Q170 200 187 208" stroke="#2d1b10" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M213 208 Q230 200 247 208" stroke="#2d1b10" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Nose */}
        <path d="M196 242 Q200 254 204 242" stroke="#d4956a" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Mouth — composed, slight smile */}
        <path d="M183 268 Q200 280 217 268" stroke="#c47a50" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Small EU/regulation badge — Jen brand mark */}
        <circle cx="80" cy="80" r="30" fill="#42b8ac" />
        <text x="80" y="87" textAnchor="middle" fill="#003842" fontSize="22" fontWeight="bold" fontFamily="serif">EU</text>
      </svg>
    </span>
  )
}
