import { STATUS, URGENCY_TONE } from '../../lib/constants';
import { cn } from './cn';

const DOT_COLORS = {
  open: 'bg-open',
  offered: 'bg-offered',
  progress: 'bg-progress',
  done: 'bg-done',
  danger: 'bg-danger',
  muted: 'bg-subtle',
};

/** A hairline pill with an optional coloured status dot. */
export function Badge({ tone, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium text-ink/80',
        className,
      )}
    >
      {tone && <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const { label, tone } = STATUS[status] ?? { label: status, tone: 'muted' };
  return <Badge tone={tone}>{label}</Badge>;
}

export function UrgencyBadge({ urgency }) {
  return (
    <Badge tone={URGENCY_TONE[urgency] ?? 'muted'} className="capitalize">
      {urgency} urgency
    </Badge>
  );
}
