import { forwardRef } from 'react';
import { cn } from './cn';

/** Label + control + hint/error, stacked. */
export function Field({ label, hint, error, className, children }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-subtle">{hint}</span>
      )}
    </label>
  );
}

export const Input = forwardRef(function Input({ icon: Icon, className, ...props }, ref) {
  if (!Icon) return <input ref={ref} className={cn('input', className)} {...props} />;

  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input ref={ref} className={cn('input pl-10', className)} {...props} />
    </div>
  );
});

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23929299' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn('input appearance-none bg-no-repeat pr-10', className)}
      style={{ backgroundImage: CHEVRON, backgroundPosition: 'right 14px center' }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn('input h-auto min-h-[110px] resize-y py-3 leading-relaxed', className)} {...props} />;
}
