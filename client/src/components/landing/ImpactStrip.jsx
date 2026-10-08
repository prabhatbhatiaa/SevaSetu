import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useCountUp, useInView } from '../../lib/hooks';
import { formatNumber } from '../../lib/format';

function Figure({ value, label, active }) {
  const animated = useCountUp(value ?? 0, { start: active && value != null });
  return (
    <div className="px-2 py-10 sm:px-8">
      <p className="font-serif text-6xl leading-none tabular-nums sm:text-7xl">
        {value == null ? '—' : formatNumber(animated)}
      </p>
      <p className="mt-4 text-sm text-muted">{label}</p>
    </div>
  );
}

/** Act eight: live numbers from the platform. */
export function ImpactStrip({ summary }) {
  const [ref, visible] = useInView({ threshold: 0.35 });

  return (
    <section id="impact" data-act="impact" className="scroll-mt-16 py-28 sm:py-36">
      <div className="container-page">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Live from the platform</p>
            <h2 className="display mt-6 text-[44px] sm:text-6xl">
              Every crossing <em>counts</em>.
            </h2>
          </div>
          <Link
            to="/impact"
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
          >
            Full impact report <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div
          ref={ref}
          className="mt-14 grid grid-cols-2 divide-x divide-y rounded-3xl border bg-surface/95 lg:grid-cols-4 lg:divide-y-0"
        >
          <Figure active={visible} value={summary?.totalRequests} label="Requests posted" />
          <Figure active={visible} value={summary?.completedServices} label="Services completed" />
          <Figure active={visible} value={summary?.activeVolunteers} label="Active volunteers" />
          <Figure active={visible} value={summary?.totalReviews} label="Reviews given" />
        </div>
      </div>
    </section>
  );
}
