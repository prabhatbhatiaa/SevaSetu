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
    <section id="how-it-works" data-act="journey" className="scroll-mt-16 py-10 sm:py-16 lg:py-20">
      <div className="container-page">
        <p className="eyebrow reveal">How it works</p>
        <h2 className="display reveal mt-3 sm:mt-4 text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
          How a request <em>travels</em>.
        </h2>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <ol className="order-1 w-full">
            {STEPS.map((item, index) => (
              <li
                key={item.title}
                ref={(element) => (stepRefs.current[index] = element)}
                className={cn(
                  'flex gap-3.5 sm:gap-5 border-t py-4 sm:py-7 transition-opacity duration-500 lg:py-9',
                  index === active ? 'opacity-100' : 'opacity-65 lg:opacity-35',
                )}
              >
                <span className="font-serif text-2xl sm:text-3xl italic text-accent">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium leading-snug tracking-tight sm:text-[26px] lg:text-3xl">{item.title}</h3>
                  <p className="mt-1 sm:mt-2 max-w-sm text-[13px] sm:text-[15px] leading-relaxed text-muted">{item.text}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line/15 bg-surface/80 px-2.5 py-0.5 text-[11px] text-subtle lg:hidden">
                    <span className="h-1 w-1 rounded-full bg-accent" />
                    <span>{item.note}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="hidden lg:block order-2">
            <div className="lg:sticky lg:top-24">
              <Scene name="route" input={routeInput} className="h-[340px] lg:h-[380px]" />
              <div className="mx-auto max-w-sm rounded-2xl border bg-surface p-5">
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
