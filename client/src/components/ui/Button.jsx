import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from './cn';

const VARIANTS = {
  // Solid ink pill: white on dark, black on light.
  primary: 'bg-ink text-canvas hover:bg-ink/85',
  secondary: 'border border-strong text-ink hover:border-ink/40 hover:bg-ink/[0.04]',
  ghost: 'text-muted hover:bg-ink/[0.05] hover:text-ink',
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3.5 text-[13px]',
  md: 'h-10 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2 px-7 text-[15px]',
  icon: 'h-9 w-9',
};

/** The little arrow chip on call-to-action buttons. */
function ArrowChip({ variant }) {
  return (
    <span
      className={cn(
        '-mr-2 ml-1 flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45',
        variant === 'primary' ? 'bg-canvas text-ink' : 'bg-ink text-canvas',
      )}
      aria-hidden="true"
    >
      <ArrowUpRight className="h-3.5 w-3.5" />
    </span>
  );
}

/**
 * Renders a <Link> when `to` is given, otherwise a <button>.
 * `arrow` adds the arrow chip used on calls to action.
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', to, loading = false, arrow = false, disabled, className, children, ...props },
  ref,
) {
  const classes = cn(
    'group inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-semibold',
    'transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
        {arrow && <ArrowChip variant={variant} />}
      </Link>
    );
  }

  return (
    <button ref={ref} type="button" className={classes} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
      {arrow && !loading && <ArrowChip variant={variant} />}
    </button>
  );
});
