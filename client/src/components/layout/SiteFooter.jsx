import { Link } from 'react-router-dom';
import { Logo } from '../ui';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Explore requests', to: '/requests/explore' },
      { label: 'Community impact', to: '/impact' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
  {
    title: 'Get involved',
    links: [
      { label: 'Become a volunteer', to: '/register?role=volunteer' },
      { label: 'Ask for help', to: '/register?role=community_member' },
      { label: 'Sign in', to: '/login' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'How it works', to: { pathname: '/', hash: '#how-it-works' } },
      { label: 'The matching engine', to: { pathname: '/', hash: '#matching' } },
      { label: 'Who it’s for', to: { pathname: '/', hash: '#roles' } },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container-page grid gap-8 sm:gap-12 py-10 sm:py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 sm:mt-5 max-w-xs text-xs sm:text-sm leading-relaxed text-muted">
            A digital bridge connecting community needs with people willing to help — matched by skill, distance and
            time.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="eyebrow mb-3 sm:mb-5 text-[10px] sm:text-xs">{column.title}</h2>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-muted transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t">
        <div className="container-page flex flex-wrap items-center justify-between gap-2.5 py-4 sm:py-6 text-[11px] sm:text-xs text-subtle">
          <span>© {new Date().getFullYear()} SevaSetu. Built for communities.</span>
          <span>सेवा सेतु · Supporting SDG 11 and SDG 17</span>
        </div>
      </div>
    </footer>
  );
}
