import { useEffect, useState } from 'react';
import { cn } from '../ui';
import { CategoryLabel } from '../requests/RequestCard';
import { timeAgo } from '../../lib/format';

/** A slim strip that cycles through recently completed requests from the live API. */
export function LiveTicker({ items }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % items.length), 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[index % items.length];

  return (
    <div
      className="flex flex-col gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border bg-surface/95 px-3.5 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:gap-6"
      aria-label="Recently completed requests"
    >
      <p className="eyebrow shrink-0 text-[10px] sm:text-xs">Just completed</p>
      <div
        key={item._id}
        className="flex min-w-0 flex-1 animate-fade-in flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
      >
        <p className="truncate text-[13px] sm:text-[15px] font-medium tracking-tight">{item.title}</p>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-subtle">
          <CategoryLabel category={item.category} />
          <span>{[item.location?.city, timeAgo(item.completedAt)].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1" aria-hidden="true">
        {items.map((entry, position) => (
          <span
            key={entry._id}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              position === index ? 'w-3.5 sm:w-4 bg-ink' : 'w-1 bg-ink/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}
