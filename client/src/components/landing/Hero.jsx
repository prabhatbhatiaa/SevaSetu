import { useEffect, useState } from 'react';
import { Button, cn } from '../ui';
import { CategoryLabel } from '../requests/RequestCard';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../lib/format';

/** Cycles through recently completed requests from the live API. */
function LiveTicker({ items, openNow }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % items.length), 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[index % items.length];

  return (
    <aside
      className="hidden w-80 rounded-2xl border bg-surface/95 p-5 lg:block"
      aria-label="Recently completed requests"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">Just completed</p>
        <div className="flex gap-1" aria-hidden="true">
          {items.map((entry, position) => (
            <span
              key={entry._id}
              className={cn(
                'h-1 rounded-full transition-all duration-500',
                position === index ? 'w-4 bg-ink' : 'w-1 bg-ink/20',
              )}
            />
          ))}
        </div>
      </div>
      <div key={item._id} className="mt-4 min-h-[76px] animate-fade-in">
        <p className="line-clamp-2 text-[15px] font-medium leading-snug tracking-tight">{item.title}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <CategoryLabel category={item.category} />
          <span className="shrink-0 text-xs text-subtle">
            {[item.location?.city, timeAgo(item.completedAt)].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      {openNow > 0 && (
        <p className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-done" />
          {openNow} requests open in the community right now
        </p>
      )}
    </aside>
  );
}

export function Hero({ impact }) {
  const { user } = useAuth();
  const openNow = impact?.summary?.activeRequests;

  return (
    <section data-act="hero" className="relative flex h-[100svh] min-h-[700px] flex-col justify-end">
      <div className="container-page grid grid-cols-1 items-end gap-10 pb-14 sm:pb-20 lg:grid-cols-[1fr_auto]">
        <div>
          <h1
            className="display animate-fade-up text-[52px] sm:text-7xl lg:text-[96px]"
            style={{ animationDelay: '100ms' }}
          >
            Need help?
            <br />
            Find the <em>right</em> person.
          </h1>
          <p
            className="mt-6 max-w-md animate-fade-up text-base leading-relaxed text-muted sm:text-[17px]"
            style={{ animationDelay: '200ms' }}
          >
            SevaSetu connects you with volunteers nearby — matched on skills, distance and time, and followed from
            request to review.
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-3" style={{ animationDelay: '300ms' }}>
            {user ? (
              <Button variant="primary" size="lg" to="/dashboard" arrow>
                Open your dashboard
              </Button>
            ) : (
              <>
                <Button variant="primary" size="lg" to="/register?role=community_member" arrow>
                  Ask for help
                </Button>
                <Button size="lg" to="/register?role=volunteer" className="bg-canvas/90">
                  Volunteer with us
                </Button>
              </>
            )}
          </div>
        </div>

        <LiveTicker items={impact?.recentImpactFeed ?? []} openNow={openNow} />
      </div>
    </section>
  );
}
