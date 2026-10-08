import { cn } from './cn';

/**
 * Underlined tabs. `options` is a list of { value, label, count? }.
 */
export function Tabs({ options, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('scrollbar-thin flex gap-6 overflow-x-auto border-b', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-sm transition-colors',
              active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {option.label}
            {option.count != null && <span className="font-mono text-[11px] text-subtle">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Compact two-or-three way toggle (e.g. List / Map). */
export function SegmentedControl({ options, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('inline-flex rounded-full border p-1', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
              active ? 'bg-ink text-canvas' : 'text-muted hover:text-ink',
            )}
          >
            {option.icon && <option.icon className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
