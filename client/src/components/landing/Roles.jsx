import { Link } from 'react-router-dom';
import { ArrowUpRight, HandHeart, ShieldCheck, Users } from 'lucide-react';
import { TiltCard } from '../ui';

const ROLES = [
  {
    icon: Users,
    name: 'Community members',
    text: 'Ask for help without chasing anyone.',
    features: ['Post a request in a minute', 'See ranked, explained matches', 'Rate the help you received'],
    action: 'Ask for help',
    to: '/register?role=community_member',
  },
  {
    icon: HandHeart,
    name: 'Volunteers',
    text: 'Find where you’re needed, nearby.',
    features: ['Matched to your skills and week', 'Accept a task in one tap', 'Build a reputation people trust'],
    action: 'Start volunteering',
    to: '/register?role=volunteer',
  },
  {
    icon: ShieldCheck,
    name: 'Administrators',
    text: 'See the whole community at a glance.',
    features: ['Request pipeline and trends', 'Time-to-resolve insights', 'Top volunteers by impact'],
    action: 'Sign in',
    to: '/login',
  },
];

/** Act seven: the three ways in, as cards that lean toward the pointer. */
export function Roles() {
  return (
    <section id="roles" data-act="roles" className="scroll-mt-16 py-10 sm:py-16 lg:py-20">
      <div className="container-page">
        <p className="eyebrow reveal">Who it’s for</p>
        <h2 className="display reveal mt-3 sm:mt-4 max-w-3xl text-[30px] sm:text-5xl lg:text-6xl leading-[1.12]">
          Built for <em>every</em> side of the bridge.
        </h2>

        <ul className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 md:grid-cols-3">
          {ROLES.map((role, index) => (
            <li key={role.name} className="reveal" style={{ '--delay': `${index * 100}ms` }}>
              <TiltCard className="flex h-full flex-col rounded-2xl sm:rounded-3xl border bg-surface p-4 sm:p-6">
                <span className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-ink text-canvas">
                  <role.icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-2xl font-medium tracking-tight">{role.name}</h3>
                <p className="mt-1 sm:mt-2 text-[13px] sm:text-[15px] text-muted">{role.text}</p>
                <ul className="mb-4 sm:mb-6 mt-3 sm:mt-5 space-y-2 sm:space-y-2.5 border-t pt-3 sm:pt-5 text-xs sm:text-sm">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 sm:gap-3">
                      <span className="mt-1.5 sm:mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={role.to}
                  className="mt-auto inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-opacity hover:opacity-70"
                >
                  {role.action} <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </TiltCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
