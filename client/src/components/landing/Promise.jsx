import { HandHeart, MapPinned, ScanSearch } from 'lucide-react';
import { Scene } from '../three/Scene';

const PILLARS = [
  {
    icon: MapPinned,
    title: 'One request',
    text: 'Say what you need, where, and when. It takes a minute and it never gets buried.',
  },
  {
    icon: ScanSearch,
    title: 'A match you can read',
    text: 'Volunteers are ranked on five factors, and you can see exactly why each one made the list.',
  },
  {
    icon: HandHeart,
    title: 'Neighbours who show up',
    text: 'People with the right skills, close enough to come round, at a time that suits you.',
  },
];

/** The promise: scattered points settle into a single pin — every request gets a place. */
export function Promise() {
  return (
    <section data-act="promise" className="py-10 sm:py-16 lg:py-20">
      <div className="container-page grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="eyebrow reveal">The promise</p>
          <h2 className="display reveal mt-3 sm:mt-4 text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
            Every request gets a <em>place</em>, a match, and a finish line.
          </h2>

          <ul className="mt-5 sm:mt-7 divide-y border-y">
            {PILLARS.map((pillar, index) => (
              <li key={pillar.title} className="reveal flex gap-3.5 sm:gap-4 py-3 sm:py-4" style={{ '--delay': `${index * 100}ms` }}>
                <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border bg-surface">
                  <pillar.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-medium tracking-tight">{pillar.title}</h3>
                  <p className="mt-1 text-[13px] sm:text-[15px] leading-relaxed text-muted">{pillar.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="reveal mt-4 sm:mt-5 text-[13px] sm:text-[15px] text-muted">
            No forwarded messages. No guessing who’s free. No one left waiting.
          </p>
        </div>

        <Scene name="converge" className="hidden lg:block h-[420px] lg:order-first lg:h-[520px]" />
      </div>
    </section>
  );
}
