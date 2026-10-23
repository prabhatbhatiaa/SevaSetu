import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Scene } from '../three/Scene';
import { useCountUp, useInView } from '../../lib/hooks';
import { formatNumber } from '../../lib/format';
import { LiveTicker } from './LiveTicker';

function Figure({ value, label, active, className }) {
  const animated = useCountUp(value ?? 0, { start: active && value != null });
  return (
    <div className={`px-4 py-3.5 sm:px-7 sm:py-6 ${className}`}>
      <p className="font-serif text-3xl leading-none tabular-nums sm:text-6xl">
        {value == null ? '—' : formatNumber(animated)}
      </p>
      <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-muted">{label}</p>
    </div>
  );
}

/** Live numbers from the platform, beside a skyline that rises as it comes into view. */
export function ImpactStrip({ summary, recent = [] }) {
  const [ref, visible] = useInView({ threshold: 0.35 });

  return (
    <section id="impact" data-act="impact" className="scroll-mt-16 py-10 sm:py-16 lg:py-20">
      <div className="container-page">
        <div className="reveal flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div>
            <p className="eyebrow">Live from the platform</p>
            <h2 className="display mt-3 sm:mt-4 text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
              Every crossing <em>counts</em>.
            </h2>
          </div>
          <Link
            to="/impact"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-opacity hover:opacity-70"
          >
            Full impact report <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <Scene name="skyline" className="hidden lg:block h-[360px]" />
          <div ref={ref} className="grid grid-cols-2 rounded-2xl sm:rounded-3xl border bg-surface">
            <Figure
              active={visible}
              value={summary?.totalRequests}
              label="Requests posted"
              className="border-b border-r"
            />
            <Figure
              active={visible}
              value={summary?.completedServices}
              label="Services completed"
              className="border-b"
            />
            <Figure active={visible} value={summary?.activeVolunteers} label="Active volunteers" className="border-r" />
            <Figure active={visible} value={summary?.totalReviews} label="Reviews given" />
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          <LiveTicker items={recent} />
        </div>
      </div>
    </section>
  );
}
