import { cn } from '../ui';
import { formatDateTime } from '../../lib/format';

const STAGES = [
  { status: 'PENDING', label: 'Posted' },
  { status: 'ASSIGNED', label: 'Offered' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Done' },
];

/** Four-step horizontal progress bar for a request's lifecycle. */
export function RequestProgress({ status }) {
  const reached = STAGES.findIndex((stage) => stage.status === status);

  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label={`Status: ${status}`}>
      {STAGES.map((stage, index) => (
        <li key={stage.status} className="space-y-2">
          <span className={cn('block h-1 rounded-full', index <= reached ? 'bg-ink' : 'bg-ink/10')} />
          <span className={cn('block text-[11px]', index <= reached ? 'text-muted' : 'text-subtle')}>
            {stage.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Vertical timeline with timestamps, for the request details page. */
export function RequestTimeline({ request }) {
  const cancelled = request.status === 'CANCELLED';
  const steps = [
    { label: 'Request posted', at: request.createdAt },
    { label: 'Volunteer assigned', at: request.assignedAt },
    cancelled
      ? { label: 'Cancelled', at: request.cancelledAt, cancelled: true }
      : { label: 'Completed', at: request.completedAt },
  ];

  return (
    <ol>
      {steps.map((step, index) => {
        const done = Boolean(step.at);
        return (
          <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
            {index < steps.length - 1 && (
              <span className={cn('absolute left-[5px] top-4 h-full w-px', done ? 'bg-ink/40' : 'bg-ink/10')} />
            )}
            <span
              className={cn(
                'relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border',
                done && (step.cancelled ? 'border-danger bg-danger' : 'border-ink bg-ink'),
              )}
            />
            <div>
              <p className={cn('text-sm', done ? 'text-ink' : 'text-subtle')}>{step.label}</p>
              {step.at && <p className="mt-0.5 text-xs text-muted">{formatDateTime(step.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
