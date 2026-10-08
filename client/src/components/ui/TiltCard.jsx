import { useRef } from 'react';
import { cn } from './cn';

const MAX_TILT = 7; // degrees

/**
 * A card that leans toward the pointer in 3D. Uses CSS transforms only,
 * written straight to the element (no React re-renders), and stays flat for
 * people who prefer reduced motion or are on touch screens.
 */
export function TiltCard({ as: Tag = 'div', className, children, ...props }) {
  const ref = useRef(null);
  const frame = useRef(0);

  const handleMove = (event) => {
    if (event.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty('--tilt-x', `${(-y * MAX_TILT).toFixed(2)}deg`);
      ref.current?.style.setProperty('--tilt-y', `${(x * MAX_TILT).toFixed(2)}deg`);
    });
  };

  const handleLeave = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty('--tilt-x', '0deg');
    ref.current?.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <Tag
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn(
        'transition-transform duration-300 ease-out [transform:perspective(900px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] [transform-style:preserve-3d]',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
