import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Avatar, Button, Logo, cn } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_LINKS = [
  { label: 'How it works', to: { pathname: '/', hash: '#how-it-works' } },
  { label: 'Matching', to: { pathname: '/', hash: '#matching' } },
  { label: 'Explore requests', to: '/requests/explore' },
  { label: 'Impact', to: '/impact' },
];

/**
 * The one top navigation bar, used on every page: landing, public pages,
 * sign-in and the dashboard. Same height, background and content everywhere.
 *
 * `onOpenMenu` — on the dashboard, the phone menu button opens the dashboard
 * drawer instead of the site menu.
 */
export function SiteHeader({ onOpenMenu }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const toggleMenu = () => (onOpenMenu ? onOpenMenu() : setMenuOpen((open) => !open));

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-canvas/90 backdrop-blur-md">
      <div className="container-wide flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="SevaSetu home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'text-sm transition-colors hover:text-ink',
                  isActive && typeof link.to === 'string' ? 'text-ink' : 'text-muted',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle colour theme">
            <ThemeIcon className="h-4 w-4" />
          </Button>
          {user ? (
            <>
              <Button variant="primary" size="sm" to="/dashboard" className="h-9 pl-5" arrow>
                Dashboard
              </Button>
              <Link to="/dashboard/settings" aria-label="Your settings" className="ml-1 rounded-full">
                <Avatar name={user.name} src={user.avatar} size={34} />
              </Link>
            </>
          ) : (
            <>
              <Button size="sm" to="/login" className="h-9 px-5">
                Sign in
              </Button>
              <Button variant="primary" size="sm" to="/register" className="h-9 pl-5" arrow>
                Get started
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle colour theme">
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className="-mr-2 rounded-full p-2"
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={onOpenMenu ? undefined : menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="container-wide animate-fade-in border-t pb-6 lg:hidden">
          <nav className="flex flex-col py-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className="border-b py-4 text-lg tracking-tight">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {user ? (
              <Button variant="primary" to="/dashboard" className="col-span-2">
                Open dashboard
              </Button>
            ) : (
              <>
                <Button to="/login">Sign in</Button>
                <Button variant="primary" to="/register">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
