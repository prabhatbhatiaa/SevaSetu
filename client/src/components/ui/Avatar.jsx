import { initials } from '../../lib/format';
import { cn } from './cn';

export function Avatar({ name = '', src, size = 36, className }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };

  if (src) {
    return <img src={src} alt={name} style={style} className={cn('shrink-0 rounded-full object-cover', className)} />;
  }

  return (
    <span
      style={style}
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border bg-raised font-medium text-ink/80',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
