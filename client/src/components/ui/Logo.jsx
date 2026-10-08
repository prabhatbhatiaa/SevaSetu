import { cn } from './cn';

/** The bridge mark: an arch over a deck, with a saffron spark at the crown. */
export function LogoMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M5 21.5C9 12.5 23 12.5 27 21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 23.5H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M11 17.6V23.5M16 15.8V23.5M21 17.6V23.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".5"
      />
      <circle cx="16" cy="10" r="1.9" className="fill-accent" />
    </svg>
  );
}

/** Wordmark: "Seva" (service) in the sans, "setu" (bridge) in the serif italic. */
export function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight">
        Seva<span className="font-serif text-[21px] font-normal italic tracking-normal">setu</span>
      </span>
    </span>
  );
}
