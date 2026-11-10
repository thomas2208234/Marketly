export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="8" y="17" width="4" height="7" rx="1" className="fill-primary-foreground" />
      <rect x="14" y="12" width="4" height="12" rx="1" className="fill-primary-foreground" />
      <rect x="20" y="7" width="4" height="17" rx="1" className="fill-accent" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="size-7" />
      <span className="text-lg font-bold tracking-tight text-foreground">
        Market<span className="text-primary">ly</span>
      </span>
    </span>
  )
}
