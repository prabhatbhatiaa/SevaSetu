import { X } from 'lucide-react';
import { cn } from './cn';

const BASE = 'inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors';

/** Toggleable pill for multi-select options (categories, time slots…). */
export function Chip({ selected = false, onClick, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        BASE,
        selected ? 'border-ink bg-ink text-canvas' : 'text-muted hover:border-strong hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A removable tag (e.g. a skill someone added). */
export function Tag({ onRemove, className, children }) {
  return (
    <span className={cn(BASE, 'pr-2 text-ink', className)}>
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${children}`}
          className="rounded-full p-0.5 text-muted transition-colors hover:bg-ink/10 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}
