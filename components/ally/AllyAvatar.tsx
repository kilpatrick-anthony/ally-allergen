// components/ally/AllyAvatar.tsx
// Placeholder avatar for Ally — the customer-facing kiosk assistant.
// Replace the SVG body with your custom illustration (400×400px, SVG format).
// The component accepts a `size` prop for easy scaling.

interface AllyAvatarProps {
  size?: number
  className?: string
  /** Show a small animated "thinking" pulse ring */
  thinking?: boolean
}

export function AllyAvatar({ size = 48, className = '', thinking = false }: AllyAvatarProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {thinking && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ background: '#42b8ac' }}
        />
      )}
      {/* ── PLACEHOLDER ILLUSTRATION ─────────────────────────────────────
          Safe zone: face/features should stay within the inner 75% circle.
          Replace this entire <svg> with your final Ally character art.
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
        <circle cx="200" cy="200" r="200" fill="#42b8ac" />
        <circle cx="200" cy="200" r="185" fill="#5cc8bc" />

        {/* Body / shoulders */}
        <ellipse cx="200" cy="340" rx="110" ry="80" fill="#003842" />

        {/* Neck */}
        <rect x="180" y="275" width="40" height="35" rx="10" fill="#fcd5b0" />

        {/* Head */}
        <ellipse cx="200" cy="230" rx="85" ry="92" fill="#fcd5b0" />

        {/* Hair */}
        <ellipse cx="200" cy="155" rx="85" ry="50" fill="#1a1a2e" />
        <ellipse cx="118" cy="200" rx="22" ry="45" fill="#1a1a2e" />
        <ellipse cx="282" cy="200" rx="22" ry="45" fill="#1a1a2e" />

        {/* Eyes */}
        <ellipse cx="170" cy="225" rx="14" ry="16" fill="white" />
        <ellipse cx="230" cy="225" rx="14" ry="16" fill="white" />
        <circle cx="173" cy="227" r="8" fill="#1a1a2e" />
        <circle cx="233" cy="227" r="8" fill="#1a1a2e" />
        <circle cx="176" cy="223" r="3" fill="white" />
        <circle cx="236" cy="223" r="3" fill="white" />

        {/* Eyebrows */}
        <path d="M155 207 Q170 199 185 207" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M215 207 Q230 199 245 207" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Nose */}
        <path d="M196 240 Q200 252 204 240" stroke="#e8a87c" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Smile */}
        <path d="M175 268 Q200 288 225 268" stroke="#c97c5a" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Cheek blush */}
        <ellipse cx="148" cy="258" rx="18" ry="10" fill="#f4a4a4" opacity="0.5" />
        <ellipse cx="252" cy="258" rx="18" ry="10" fill="#f4a4a4" opacity="0.5" />

        {/* Small shield/heart badge on top — Ally brand mark */}
        <circle cx="320" cy="80" r="30" fill="#003842" />
        <path d="M320 62 C320 62 303 70 303 82 C303 94 320 100 320 100 C320 100 337 94 337 82 C337 70 320 62 320 62Z" fill="#42b8ac" />
        <path d="M313 82 L318 87 L328 77" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  )
}
