import { Button } from '../ui';
import { Scene } from '../three/Scene';
import { useAuth } from '../../context/AuthContext';

// The bridge sits in the band between the headline and the call to action.
const HERO_FIT = {
  fit: { x: 0.5, y: 0.6, fill: 0.84, pitch: 0.2, portrait: { y: 0.52, fill: 0.98 } },
};

export function Hero({ impact }) {
  const { user } = useAuth();
  const openNow = impact?.summary?.activeRequests;

  return (
    <section
      data-act="hero"
      className="relative flex min-h-[100svh] flex-col items-center overflow-hidden px-5 pb-10 pt-32 text-center sm:pt-36 lg:pt-40"
    >
      <Scene name="bridge" input={HERO_FIT} className="absolute inset-0" />

      <p className="relative inline-flex animate-fade-up items-center gap-2 rounded-full border bg-canvas/80 px-4 py-1.5 text-xs text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-done" aria-hidden="true" />
        {openNow ? `${openNow} requests open in the community right now` : 'Community help, matched properly'}
      </p>

      <h1
        className="display relative mt-6 animate-fade-up text-[44px] sm:text-6xl lg:text-[76px]"
        style={{ animationDelay: '100ms' }}
      >
        Need help?
        <br />
        Find the <em>right</em> person.
      </h1>

      {/* The bridge is drawn here by the scene behind. */}
      <div className="min-h-[22vh] sm:min-h-[26vh] flex-1" aria-hidden="true" />

      <p
        className="relative max-w-md animate-fade-up text-[15px] leading-relaxed text-muted sm:text-[17px]"
        style={{ animationDelay: '200ms' }}
      >
        SevaSetu connects you with volunteers nearby — matched on skills, distance and time, and followed from request
        to review.
      </p>
      <div
        className="relative mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-3"
        style={{ animationDelay: '300ms' }}
      >
        {user ? (
          <Button variant="primary" size="lg" to="/dashboard" arrow>
            Open your dashboard
          </Button>
        ) : (
          <>
            <Button variant="primary" size="lg" to="/register?role=community_member" arrow>
              Ask for help
            </Button>
            <Button size="lg" to="/register?role=volunteer" className="bg-canvas/90">
              Volunteer with us
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
