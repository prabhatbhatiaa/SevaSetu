import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const BridgeScene = lazy(() => import('../../components/three/BridgeScene'));

/** Split screen: the form on the left, the bridge on the right (desktop only). */
export function AuthLayout({ title, description, footer, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <Link to="/" className="w-fit" aria-label="SevaSetu home">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <h1 className="heading animate-fade-up text-4xl">{title}</h1>
          {description && (
            <p className="mt-3 animate-fade-up text-muted" style={{ animationDelay: '80ms' }}>
              {description}
            </p>
          )}
          <div className="mt-10 animate-fade-up" style={{ animationDelay: '160ms' }}>
            {children}
          </div>
          {footer && <div className="mt-10 text-sm text-muted">{footer}</div>}
        </div>
      </div>

      <aside className="relative hidden overflow-hidden border-l bg-raised/40 lg:block" aria-hidden="true">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <BridgeScene mode="ambient" />
          </Suspense>
        </ErrorBoundary>
        <div className="absolute inset-x-12 bottom-12">
          <p className="display text-4xl leading-[1.08]">
            Need help? Find the <em>right</em> person.
            <br />
            Willing to help? Find where you’re <em>needed</em>.
          </p>
          <p className="mt-6 text-sm text-muted">सेवा सेतु — service, bridge</p>
        </div>
      </aside>
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
      {children}
    </p>
  );
}
