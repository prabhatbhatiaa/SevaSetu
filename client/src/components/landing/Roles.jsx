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
    <section id="roles" data-act="roles" className="scroll-mt-16 py-28 sm:py-36">
      <div className="container-page">
        <p className="eyebrow reveal">Who it’s for</p>
        <h2 className="display reveal mt-6 max-w-3xl text-[44px] sm:text-6xl">
          Built for <em>every</em> side of the bridge.
        </h2>

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {ROLES.map((role, index) => (
            <li key={role.name} className="reveal" style={{ '--delay': `${index * 100}ms` }}>
              <TiltCard className="flex h-full flex-col rounded-3xl border bg-surface p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-canvas">
                  <role.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-10 text-2xl font-medium tracking-tight">{role.name}</h3>
                <p className="mt-2 text-[15px] text-muted">{role.text}</p>
                <ul className="mb-8 mt-6 space-y-2.5 border-t pt-6 text-sm">
                  {role.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={role.to}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                >
                  {role.action} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </TiltCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
