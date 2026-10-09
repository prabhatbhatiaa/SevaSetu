import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge, cn } from '../ui';
import { CategoryLabel } from '../requests/RequestCard';
import { RequestProgress } from '../requests/RequestProgress';
import { Scene } from '../three/Scene';

const STEPS = [
  {
    title: 'You post a need.',
    text: 'Category, location, urgency and a preferred time. It takes under a minute.',
    status: 'PENDING',
    note: 'Posted from Sector 14 · High urgency',
  },
  {
    title: 'We rank who can help.',
    text: 'Every active volunteer nearby is scored on skills, distance, availability, category and reputation.',
    status: 'PENDING',
    note: '5 volunteers in range · best match 92%',
  },
  {
    title: 'A volunteer says yes.',
    text: 'Offer the task to your top match, or let a volunteer pick it up themselves.',
    status: 'ASSIGNED',
    note: 'Offered to Meera K. · 1.2 km away',
  },
  {
    title: 'Help arrives.',
    text: 'The request moves to in progress, and both of you can see exactly where it stands.',
    status: 'IN_PROGRESS',
    note: 'Meera is on her way',
  },
  {
    title: 'You close the loop.',
    text: 'Mark it done and leave a rating. It quietly improves every match that follows.',
    status: 'COMPLETED',
    note: 'Rated 5 stars · “Patient, and quick.”',
  },
];

/**
 * How it works. As you scroll the steps, a saffron light walks a dotted route
 * from the requester's home to the volunteer's, and the status card follows.
 */
export function RequestJourney() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);

  // The active step is the last one whose top has passed the middle of the screen.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight * 0.55;
      let current = 0;
      stepRefs.current.forEach((element, index) => {
        if (element && element.getBoundingClientRect().top < middle) current = index;
      });
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const step = STEPS[active];
  const routeInput = useMemo(() => ({ progress: active / (STEPS.length - 1) }), [active]);

  return (
    <section id="how-it-works" data-act="journey" className="scroll-mt-16 py-16 sm:py-20">
      <div className="container-page">
        <p className="eyebrow reveal">How it works</p>
        <h2 className="display reveal mt-4 text-[44px] sm:text-6xl">
          How a request <em>travels</em>.
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <ol className="order-2 lg:order-1">
            {STEPS.map((item, index) => (
              <li
                key={item.title}
                ref={(element) => (stepRefs.current[index] = element)}
                className={cn(
                  'flex gap-5 border-t py-7 transition-opacity duration-500 lg:py-9',
                  index === active ? 'opacity-100' : 'lg:opacity-35',
                )}
              >
                <span className="font-serif text-3xl italic text-accent">{index + 1}</span>
                <div>
                  <h3 className="text-[26px] font-medium leading-tight tracking-tight sm:text-3xl">{item.title}</h3>
                  <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <Scene name="route" input={routeInput} className="h-[320px] sm:h-[340px] lg:h-[380px]" />
              <div className="mx-auto hidden max-w-sm rounded-2xl border bg-surface p-5 lg:block">
                <div className="flex items-center justify-between gap-3">
                  <CategoryLabel category="Document Assistance" />
                  <StatusBadge status={step.status} />
                </div>
                <p className="mt-3 font-medium tracking-tight">Help filling pension forms</p>
                <p key={active} className="mt-1 animate-fade-in text-xs text-muted">
                  {step.note}
                </p>
                <div className="mt-4">
                  <RequestProgress status={step.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
