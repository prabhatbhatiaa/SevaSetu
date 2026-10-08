import { HandHeart, MapPinned, ScanSearch } from 'lucide-react';

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

/** Act three: the fragments reassemble into the bridge. */
export function Promise() {
  return (
    <section data-act="promise" className="flex min-h-screen items-center py-28">
      <div className="container-page">
        <div className="max-w-xl">
          <p className="eyebrow reveal">The promise</p>
          <h2 className="display reveal mt-6 text-[44px] sm:text-6xl lg:text-[68px]">
            Every request gets a <em>place</em>, a match, and a finish line.
          </h2>

          <ul className="mt-12 divide-y border-y">
            {PILLARS.map((pillar, index) => (
              <li key={pillar.title} className="reveal flex gap-5 py-6" style={{ '--delay': `${index * 100}ms` }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-surface">
                  <pillar.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">{pillar.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{pillar.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="reveal mt-8 text-[15px]">No forwarded messages. No guessing who’s free. No one left waiting.</p>
        </div>
      </div>
    </section>
  );
}
