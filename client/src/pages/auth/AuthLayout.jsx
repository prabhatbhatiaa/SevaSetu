import { SiteHeader } from '../../components/layout/SiteHeader';
import { Scene } from '../../components/three/Scene';

const AUTH_FIT = { fit: { x: 0.5, y: 0.42, fill: 0.92, pitch: 0.22 } };

/** Split screen under the site header: the form on the left, the bridge on the right (desktop). */
export function AuthLayout({ title, description, footer, children }) {
  return (
    <div className="min-h-screen pt-16">
      <SiteHeader />
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
        <div className="flex flex-col px-6 sm:px-12">
          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
            <h1 className="heading animate-fade-up text-4xl">{title}</h1>
            {description && (
              <p className="mt-3 animate-fade-up text-muted" style={{ animationDelay: '80ms' }}>
                {description}
              </p>
            )}
            <div className="mt-8 animate-fade-up" style={{ animationDelay: '160ms' }}>
              {children}
            </div>
            {footer && <div className="mt-8 text-sm text-muted">{footer}</div>}
          </div>
        </div>

        <aside className="relative hidden overflow-hidden border-l bg-raised/40 lg:block" aria-hidden="true">
          <Scene name="bridge" input={AUTH_FIT} className="absolute inset-0" />
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
