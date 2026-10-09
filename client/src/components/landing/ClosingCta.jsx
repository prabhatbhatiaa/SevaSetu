import { Button } from '../ui';
import { Scene } from '../three/Scene';
import { useAuth } from '../../context/AuthContext';

const CTA_FIT = { fit: { x: 0.5, y: 0.5, fill: 0.9, pitch: 0.18, portrait: { fill: 0.98 } } };

/** The close: the bridge from the hero returns, smaller, above the invitation. */
export function ClosingCta() {
  const { user } = useAuth();

  return (
    <section data-act="cta" className="pb-20 pt-12 sm:pt-16">
      <div className="container-page reveal text-center">
        <Scene name="bridge" input={CTA_FIT} className="mx-auto h-[220px] max-w-4xl sm:h-[300px]" />
        <h2 className="display mx-auto mt-4 max-w-4xl text-[44px] sm:text-6xl lg:text-[76px]">
          Be the other end of the <em>bridge</em>.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-muted">
          Whether you need a hand or have one to give, someone nearby is ready to meet you halfway.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {user ? (
            <Button variant="primary" size="lg" to="/dashboard" arrow>
              Open your dashboard
            </Button>
          ) : (
            <>
              <Button variant="primary" size="lg" to="/register?role=volunteer" arrow>
                Volunteer with us
              </Button>
              <Button size="lg" to="/register?role=community_member">
                Ask for help
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
