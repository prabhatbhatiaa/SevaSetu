import { useCountUp, useInView } from '../../lib/hooks';
import { formatNumber } from '../../lib/format';

/** A single headline number with a label and optional context line. */
export function StatCard({ label, value, suffix, decimals = 0, hint }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const animated = useCountUp(value ?? 0, { start: inView && value != null, decimals });
  const display = value == null ? '—' : decimals ? animated : formatNumber(animated);

  return (
    <div ref={ref} className="rounded-2xl border bg-surface p-4 sm:p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-3 text-[28px] font-medium leading-none tracking-heading tabular-nums sm:text-[34px]">
        {display}
        {suffix && value != null && <span className="ml-1 text-base text-muted">{suffix}</span>}
      </p>
      {hint && <p className="mt-3 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>;
}
