import type React from "react"
export function Logo(props: React.SVGProps<SVGSVGElement>) {
  // A simple futuristic mark using primary→accent stroke
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="tb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(var(--color-primary) / 1)" />
          <stop offset="100%" stopColor="oklch(var(--color-accent) / 1)" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="22" height="22" rx="6" fill="none" stroke="url(#tb-g)" strokeWidth="2.5" />
      <path d="M11 17h10M16 12v10" stroke="url(#tb-g)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
