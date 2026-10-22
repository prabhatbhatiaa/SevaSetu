import { Button } from '../ui';
import { Scene } from '../three/Scene';
import { useAuth } from '../../context/AuthContext';

// The bridge sits in the band between the headline and the call to action.
const HERO_FIT = {
  fit: { x: 0.5, y: 0.6, fill: 0.84, pitch: 0.2, portrait: { x: 0.5, y: 0.53, fill: 0.96, pitch: 0.2 } },
};

export function Hero({ impact }) {
  const { user } = useAuth();
  const openNow = impact?.summary?.activeRequests;

  return (
    <section
      data-act="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-between overflow-hidden px-5 pb-10 pt-28 text-center sm:pt-36 lg:pt-40"
    >
      <Scene name="bridge" input={HERO_FIT} className="absolute inset-0 pointer-events-none" />

      {/* Top block */}
      <div className="relative flex flex-col items-center">
        <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border bg-canvas/80 px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-done" aria-hidden="true" />
          {openNow ? `${openNow} requests open in the community right now` : 'Community help, matched properly'}
        </p>

        <h1
          className="display mt-4 animate-fade-up text-[42px] leading-[1.08] sm:mt-6 sm:text-6xl sm:leading-tight lg:text-[76px]"
          style={{ animationDelay: '100ms' }}
        >
          Need help?
          <br />
          Find the <em>right</em> person.
        </h1>
      </div>

      {/* The bridge is drawn here by the scene behind. */}
      <div className="min-h-[18vh] flex-1 sm:min-h-[26vh]" aria-hidden="true" />

      {/* Bottom block */}
      <div className="relative flex flex-col items-center">
        <p
          className="max-w-md animate-fade-up text-[15px] leading-relaxed text-muted px-2 sm:px-0 sm:text-[17px]"
          style={{ animationDelay: '200ms' }}
        >
          SevaSetu connects you with volunteers nearby — matched on skills, distance and time, and followed from request
          to review.
        </p>

        <div
          className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-3"
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
      </div>
    </section>
  );
}
