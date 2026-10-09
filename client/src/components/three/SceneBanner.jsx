import { Scene } from './Scene';
import { cn } from '../ui/cn';

const BANNER_FIT = { fit: { x: 0.5, y: 0.52, fill: 0.9, pitch: 0.2 } };

/**
 * A panel with the bridge on its right-hand side and content on the left.
 * On phones the scene is hidden so the header stays clean.
 */
export function SceneBanner({ className, children }) {
  return (
    <section className={cn('relative overflow-hidden rounded-3xl border bg-surface', className)}>
      <Scene name="bridge" input={BANNER_FIT} className="absolute inset-y-0 right-0 hidden w-[54%] md:block" />
      <div className="relative px-6 py-8 sm:px-10 sm:py-10">{children}</div>
    </section>
  );
}
