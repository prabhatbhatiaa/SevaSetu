import { Scene } from '../three/Scene';

// The kind of messages that get lost today. Illustrative, not real people.
const MESSAGES = [
  {
    text: 'Anyone free to help Amma fill her pension form this week?',
    meta: 'Forwarded many times',
    tilt: 'sm:-rotate-1',
  },
  { text: 'Need someone to pick up BP medicines from Civil Hospital 🙏', meta: 'Seen by 212', tilt: 'sm:rotate-1 sm:ml-10' },
  {
    text: 'Is there a maths tutor near Sector 14? Board exams in March',
    meta: 'No replies',
    tilt: 'sm:-rotate-[0.5deg] sm:ml-4',
  },
];

/** The problem: chat bubbles drift apart, and the messages between them never arrive. */
export function Problem() {
  return (
    <section data-act="problem" className="py-10 sm:py-16 lg:py-20">
      <div className="container-page grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="eyebrow reveal">The problem</p>
          <h2 className="display reveal mt-3 sm:mt-4 text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
            Help gets <em>lost</em> in the group chat.
          </h2>
          <p className="reveal mt-3 sm:mt-5 max-w-lg text-[14px] sm:text-[17px] leading-relaxed text-muted">
            Small needs — a pension form, a medicine pickup, a phone that won’t connect to UPI — travel through forwards
            and word of mouth. Some get answered. Most quietly scroll away.
          </p>

          <ul className="mt-5 sm:mt-7 space-y-2 sm:space-y-2.5" aria-label="Examples of requests that get lost">
            {MESSAGES.map((message, index) => (
              <li
                key={message.text}
                className={`reveal max-w-none sm:max-w-sm rounded-xl sm:rounded-2xl rounded-bl-sm sm:rounded-bl-md border bg-surface p-3 sm:px-4 sm:py-3 shadow-sm ${message.tilt}`}
                style={{ '--delay': `${150 + index * 120}ms` }}
              >
                <p className="text-[13px] sm:text-sm leading-snug">{message.text}</p>
                <p className="mt-1 text-[10px] sm:text-[11px] text-subtle">{message.meta}</p>
              </li>
            ))}
          </ul>
        </div>

        <Scene name="signals" className="hidden lg:block h-[420px] lg:h-[520px]" />
      </div>
    </section>
  );
}
