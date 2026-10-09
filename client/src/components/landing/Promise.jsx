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
    <section data-act="promise" className="py-16 sm:py-20">
      <div className="container-page grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="eyebrow reveal">The promise</p>
          <h2 className="display reveal mt-4 text-[44px] sm:text-6xl">
            Every request gets a <em>place</em>, a match, and a finish line.
          </h2>

          <ul className="mt-7 divide-y border-y">
            {PILLARS.map((pillar, index) => (
              <li key={pillar.title} className="reveal flex gap-4 py-4" style={{ '--delay': `${index * 100}ms` }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-surface">
                  <pillar.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{pillar.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{pillar.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="reveal mt-5 text-[15px]">No forwarded messages. No guessing who’s free. No one left waiting.</p>
        </div>

        <Scene name="converge" className="h-[320px] sm:h-[420px] lg:order-first lg:h-[520px]" />
      </div>
    </section>
  );
}
