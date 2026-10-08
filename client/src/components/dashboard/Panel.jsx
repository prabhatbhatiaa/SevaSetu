import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../ui';

/** Titled container used across the dashboard. */
export function Panel({ title, description, action, className, children }) {
  return (
    <section className={cn('min-w-0 rounded-2xl border bg-surface p-6', className)}>
      {(title || action) && (
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-medium tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PanelLink({ to, children = 'View all' }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
