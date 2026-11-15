export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} role="img" aria-label="Liveboard logo">
      <rect width="32" height="32" rx="8" fill="url(#lb-g)" />
      <rect x="8" y="9" width="4.5" height="14" rx="1.5" fill="white" fillOpacity="0.95" />
      <rect x="13.75" y="9" width="4.5" height="9.5" rx="1.5" fill="white" fillOpacity="0.75" />
      <rect x="19.5" y="9" width="4.5" height="5.5" rx="1.5" fill="white" fillOpacity="0.55" />
      <defs>
        <linearGradient id="lb-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818CF8" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function LogoWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Logo className="h-7 w-7" />
      <span className="text-[17px] font-semibold tracking-tight text-white">Liveboard</span>
    </span>
  )
}
