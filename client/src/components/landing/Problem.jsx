// The kind of messages that get lost today. Illustrative, not real people.
const MESSAGES = [
  {
    text: 'Anyone free to help Amma fill her pension form this week?',
    meta: 'Forwarded many times',
    tilt: '-rotate-1',
  },
  { text: 'Need someone to pick up BP medicines from Civil Hospital 🙏', meta: 'Seen by 212', tilt: 'rotate-1 ml-10' },
  {
    text: 'Is there a maths tutor near Sector 14? Board exams in March',
    meta: 'No replies',
    tilt: '-rotate-[0.5deg] ml-4',
  },
];

/** Act two: the bridge scatters into fragments while this section is on screen. */
export function Problem() {
  return (
    <section data-act="problem" className="flex min-h-[110vh] items-center py-28">
      <div className="container-page">
        <div className="max-w-xl">
          <p className="eyebrow reveal">The problem</p>
          <h2 className="display reveal mt-6 text-[44px] sm:text-6xl lg:text-7xl">
            Help gets <em>lost</em> in the group chat.
          </h2>
          <p className="reveal mt-8 text-[17px] leading-relaxed text-muted">
            Small needs — a pension form, a medicine pickup, a phone that won’t connect to UPI — travel through forwards
            and word of mouth. Some get answered. Most quietly scroll away.
          </p>

          <ul className="mt-12 space-y-3" aria-label="Examples of requests that get lost">
            {MESSAGES.map((message, index) => (
              <li
                key={message.text}
                className={`reveal max-w-sm rounded-2xl rounded-bl-md border bg-surface/95 px-4 py-3 ${message.tilt}`}
                style={{ '--delay': `${150 + index * 120}ms` }}
              >
                <p className="text-sm leading-snug">{message.text}</p>
                <p className="mt-1.5 text-[11px] text-subtle">{message.meta}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
