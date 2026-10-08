import { Button } from '../ui';
import { useAuth } from '../../context/AuthContext';

/** The final act: the bridge comes back into full view behind the invitation. */
export function ClosingCta() {
  const { user } = useAuth();

  return (
    <section data-act="cta" className="flex min-h-screen flex-col justify-end pb-24 pt-40">
      <div className="container-page reveal text-center">
        <h2 className="display mx-auto max-w-4xl text-[48px] sm:text-7xl lg:text-[88px]">
          Be the other end of the <em>bridge</em>.
        </h2>
        <p className="mx-auto mt-8 max-w-md text-[17px] leading-relaxed text-muted">
          Whether you need a hand or have one to give, someone nearby is ready to meet you halfway.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {user ? (
            <Button variant="primary" size="lg" to="/dashboard" arrow>
              Open your dashboard
            </Button>
          ) : (
            <>
              <Button variant="primary" size="lg" to="/register?role=volunteer" arrow>
                Volunteer with us
              </Button>
              <Button size="lg" to="/register?role=community_member" className="bg-canvas/90">
                Ask for help
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
