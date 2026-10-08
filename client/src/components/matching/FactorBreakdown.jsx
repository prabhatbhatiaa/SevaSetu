import { MATCH_FACTORS } from '../../lib/constants';
import { cn } from '../ui';

/**
 * The five weighted factors behind a match score, as labelled bars.
 * `breakdown` is the scoreBreakdown object from the API.
 */
export function FactorBreakdown({ breakdown = {}, compact = false }) {
  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {MATCH_FACTORS.map((factor) => {
          const score = Math.round(breakdown[factor.key] ?? 0);
          return (
            <div key={factor.key} title={`${factor.label}: ${score}/100`}>
              <div className="h-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-ink" style={{ width: `${score}%` }} />
              </div>
              <span className="mt-1.5 block truncate text-[10px] text-subtle">{factor.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="space-y-3.5">
      {MATCH_FACTORS.map((factor) => {
        const score = Math.round(breakdown[factor.key] ?? 0);
        return (
          <li key={factor.key}>
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span>
                {factor.label} <span className="text-subtle">· {factor.weight}%</span>
              </span>
              <span className="font-mono text-muted">{score}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className={cn('h-full rounded-full bg-ink transition-[width] duration-700 ease-out')}
                style={{ width: `${score}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Radar-friendly shape: [{ label, value }] */
export function toRadarValues(breakdown = {}) {
  return MATCH_FACTORS.map((factor) => ({ label: factor.label, value: breakdown[factor.key] ?? 0 }));
}
