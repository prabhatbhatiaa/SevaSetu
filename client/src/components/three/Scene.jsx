import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { cn } from '../ui/cn';

// three.js and the scenes live in their own chunk, fetched on demand.
const SceneRuntime = lazy(() => import('./SceneRuntime'));

/**
 * A 3D scene that belongs to one section of a page.
 * It is only created once the section comes near the viewport, pauses while
 * off-screen, and quietly disappears if WebGL isn't available.
 *
 *   <Scene name="orbit" input={{ selected }} className="h-[420px]" />
 */
export function Scene({ name, input = {}, className }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('pointer-events-none relative', className)} aria-hidden="true">
      {near && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <SceneRuntime name={name} input={input} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
