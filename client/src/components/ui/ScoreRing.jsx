import { cn } from './cn';

/** Circular 0–100 score. Monochrome on purpose — the number does the talking. */
export function ScoreRing({ value = 0, size = 56, stroke = 4, label, className }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-ink/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="stroke-ink transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-medium tabular-nums tracking-tight" style={{ fontSize: size * 0.3 }}>
          {Math.round(clamped)}
        </span>
        {label && <span className="mt-1 text-[9px] uppercase tracking-wider text-muted">{label}</span>}
      </div>
    </div>
  );
}
