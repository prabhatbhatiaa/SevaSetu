import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { cn } from '../ui/cn';

const BridgeScene = lazy(() => import('./BridgeScene'));

/**
 * A panel with the living bridge on its right-hand side and content on the
 * left. On small screens the scene sits faintly behind the content instead.
 */
export function SceneBanner({ className, children }) {
  return (
    <section className={cn('relative overflow-hidden rounded-3xl border bg-surface', className)}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full opacity-35 md:w-[54%] md:opacity-100">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <BridgeScene mode="ambient" />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className="relative px-6 py-8 sm:px-10 sm:py-10">{children}</div>
    </section>
  );
}
