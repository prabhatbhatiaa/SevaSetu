import { useEffect, useState } from 'react';
import { cn } from '../ui';

const LABELS = {
  hero: 'Start',
  problem: 'The problem',
  promise: 'The promise',
  journey: 'How it works',
  categories: 'Categories',
  matching: 'Matching',
  roles: 'Who it’s for',
  impact: 'Impact',
  cta: 'Join',
};

/** A quiet progress rail on the right edge: where you are in the story. */
export function ActRail() {
  const [acts, setActs] = useState([]);
  const [active, setActive] = useState('hero');

  useEffect(() => {
    const elements = [...document.querySelectorAll('[data-act]')];
    setActs(elements.map((element) => element.dataset.act));

    let frame = 0;
    const update = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      const current = elements.findLast((element) => element.getBoundingClientRect().top <= middle) ?? elements[0];
      if (current) setActive(current.dataset.act);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
    };
  }, []);

  const goTo = (act) => {
    document.querySelector(`[data-act="${act}"]`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      aria-label="Sections"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex"
    >
      {acts.map((act) => {
        const current = act === active;
        return (
          <button
            key={act}
            type="button"
            onClick={() => goTo(act)}
            aria-current={current ? 'true' : undefined}
            className="group flex items-center gap-3"
          >
            <span
              className={cn(
                'text-[11px] transition-opacity duration-300',
                current ? 'text-ink opacity-100' : 'text-muted opacity-0 group-hover:opacity-100',
              )}
            >
              {LABELS[act]}
            </span>
            <span
              className={cn(
                'block rounded-full transition-all duration-300',
                current ? 'h-1.5 w-6 bg-accent' : 'h-1.5 w-1.5 bg-ink/30 group-hover:bg-ink/60',
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
