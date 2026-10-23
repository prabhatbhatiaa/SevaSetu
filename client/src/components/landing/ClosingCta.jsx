import { Button } from '../ui';
import { Scene } from '../three/Scene';
import { useAuth } from '../../context/AuthContext';

const CTA_FIT = { fit: { x: 0.5, y: 0.5, fill: 0.9, pitch: 0.18, portrait: { fill: 0.98 } } };

/** The close: the bridge from the hero returns on larger screens, above the invitation. */
export function ClosingCta() {
  const { user } = useAuth();

  return (
    <section data-act="cta" className="pb-12 pt-8 sm:pb-20 sm:pt-16">
      <div className="container-page reveal text-center">
        <Scene name="bridge" input={CTA_FIT} className="hidden sm:block mx-auto h-[300px] max-w-4xl" />
        <h2 className="display mx-auto mt-2 sm:mt-4 max-w-4xl text-[30px] sm:text-6xl lg:text-[76px] leading-[1.1] sm:leading-tight">
          Be the other end of the <em>bridge</em>.
        </h2>
        <p className="mx-auto mt-3 sm:mt-5 max-w-md text-[14px] sm:text-[17px] leading-relaxed text-muted px-2">
          Whether you need a hand or have one to give, someone nearby is ready to meet you halfway.
        </p>
        <div className="mt-5 sm:mt-7 flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {user ? (
            <Button variant="primary" size="lg" to="/dashboard" arrow className="text-sm sm:text-base">
              Open your dashboard
            </Button>
          ) : (
            <>
              <Button variant="primary" size="lg" to="/register?role=volunteer" arrow className="text-sm sm:text-base">
                Volunteer with us
              </Button>
              <Button size="lg" to="/register?role=community_member" className="text-sm sm:text-base">
                Ask for help
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
