import { cn } from './cn';

export function Switch({ checked, onChange, label, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('inline-flex items-center gap-3 text-sm', className)}
    >
      <span
        className={cn(
          'relative block h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-done' : 'bg-ink/20',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
      {label}
    </button>
  );
}
