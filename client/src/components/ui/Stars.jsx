import { Star } from 'lucide-react';
import { cn } from './cn';

/**
 * Read-only by default. Pass `onChange` to make it an input.
 * Supports fractional values (e.g. 4.6) when read-only.
 */
export function Stars({ value = 0, size = 14, onChange, className }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((position) => {
        const fill = Math.max(0, Math.min(1, value - (position - 1)));
        const star = (
          <span className="relative block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-ink/20" style={{ width: size, height: size }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="fill-accent text-accent" style={{ width: size, height: size }} />
            </span>
          </span>
        );

        if (!onChange) return <span key={position}>{star}</span>;

        return (
          <button
            key={position}
            type="button"
            onClick={() => onChange(position)}
            aria-label={`${position} star${position > 1 ? 's' : ''}`}
            className="transition-transform hover:scale-110"
          >
            {star}
          </button>
        );
      })}
    </span>
  );
}
