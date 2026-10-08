import { useState } from 'react';
import { cn } from '../ui';

// Tailwind can't see dynamic class names, so tones map to explicit classes.
const STROKES = {
  open: 'stroke-open',
  offered: 'stroke-offered',
  progress: 'stroke-progress',
  done: 'stroke-done',
  danger: 'stroke-danger',
  muted: 'stroke-subtle',
  ink: 'stroke-ink',
};
const FILLS = {
  open: 'bg-open',
  offered: 'bg-offered',
  progress: 'bg-progress',
  done: 'bg-done',
  danger: 'bg-danger',
  muted: 'bg-subtle',
  ink: 'bg-ink',
};

/**
 * Donut chart with a legend. Hovering a segment or legend row focuses it.
 * data: [{ label, value, tone }]
 */
export function DonutChart({ data, size = 160, thickness = 14, caption = 'total' }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 0 && data.filter((item) => item.value > 0).length > 1 ? 4 : 0;

  let offset = 0;
  const segments = data.map((item, index) => {
    const length = total ? (item.value / total) * circumference : 0;
    const segment = { ...item, index, length: Math.max(0, length - gap), offset };
    offset += length;
    return segment;
  });

  const focused = active != null ? data[active] : null;

  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-ink/[0.06]"
          />
          {segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={thickness}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                onMouseEnter={() => setActive(segment.index)}
                onMouseLeave={() => setActive(null)}
                className={cn(
                  STROKES[segment.tone],
                  'cursor-default transition-opacity duration-200',
                  active != null && active !== segment.index && 'opacity-25',
                )}
              />
            ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-medium tabular-nums tracking-tight">{focused ? focused.value : total}</span>
          <span className="mt-1 text-xs text-muted">{focused ? focused.label : caption}</span>
        </div>
      </div>

      <ul className="min-w-[160px] flex-1 divide-y">
        {data.map((item, index) => (
          <li
            key={item.label}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            className={cn(
              'flex items-center gap-3 py-2 text-sm transition-opacity',
              active != null && active !== index && 'opacity-40',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', FILLS[item.tone])} aria-hidden="true" />
            <span className="flex-1 text-muted">{item.label}</span>
            <span className="font-mono text-xs tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Horizontal bars. rows: [{ label, value, max?, detail?, tone? }]
 */
export function BarList({ rows, emptyText = 'No data yet.' }) {
  if (!rows.length) return <p className="text-sm text-muted">{emptyText}</p>;

  const max = Math.max(1, ...rows.map((row) => row.max ?? row.value));

  return (
    <ul className="space-y-5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted">{row.detail ?? row.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div
              className={cn('h-full rounded-full transition-[width] duration-700 ease-out', FILLS[row.tone ?? 'ink'])}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A single segmented bar showing how a total splits up. data: [{ label, value, tone }] */
export function StackedBar({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full" role="img" aria-label="Distribution">
      {data
        .filter((item) => item.value > 0)
        .map((item) => (
          <div
            key={item.label}
            title={`${item.label}: ${item.value}`}
            className={cn('h-full rounded-full', FILLS[item.tone])}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
    </div>
  );
}

/** Five-axis radar for the match factors. values: [{ label, value (0–100) }] */
export function RadarChart({ values, size = 220 }) {
  const centre = size / 2;
  const maxRadius = size / 2 - 32;

  const pointAt = (index, ratio) => {
    const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
    return [centre + Math.cos(angle) * maxRadius * ratio, centre + Math.sin(angle) * maxRadius * ratio];
  };
  const polygon = (ratioFor) => values.map((value, index) => pointAt(index, ratioFor(value)).join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon key={ring} points={polygon(() => ring)} fill="none" className="stroke-ink/10" />
      ))}
      {values.map((value, index) => {
        const [x, y] = pointAt(index, 1);
        return <line key={value.label} x1={centre} y1={centre} x2={x} y2={y} className="stroke-ink/10" />;
      })}

      <polygon
        points={polygon((value) => value.value / 100)}
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="fill-ink/10 stroke-ink transition-all duration-500"
      />

      {values.map((value, index) => {
        const [x, y] = pointAt(index, value.value / 100);
        const [labelX, labelY] = pointAt(index, 1.22);
        return (
          <g key={value.label}>
            <circle cx={x} cy={y} r="3" className="fill-ink transition-all duration-500" />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted text-[10px]"
            >
              {value.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
