import { cn } from './cn';

export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-ink/[0.05]', className)} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-ink/[0.04]" />
    </div>
  );
}

export function SkeletonList({ count = 4, className = 'h-20' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  );
}
