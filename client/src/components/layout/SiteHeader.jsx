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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/10 bg-canvas/70 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] transition-all">
      <div className="container-wide flex h-16 items-center justify-between gap-4 sm:gap-6">
        <Link to="/" aria-label="SevaSetu home" className="shrink-0 transition-transform active:scale-95">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 xl:gap-9 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'relative text-sm font-medium transition-colors hover:text-ink py-1',
                  isActive && typeof link.to === 'string' ? 'text-ink' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && typeof link.to === 'string' && (
                    <span className="absolute inset-x-0 -bottom-1.5 h-0.5 rounded-full bg-accent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle colour theme"
            className="rounded-full hover:bg-ink/[0.06] transition-colors"
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
          {user ? (
            <>
              <Button variant="primary" size="sm" to="/dashboard" className="h-9 pl-5" arrow>
                Dashboard
              </Button>
              <Link
                to="/dashboard/settings"
                aria-label="Your settings"
                className="ml-1 rounded-full ring-2 ring-transparent transition-all hover:ring-accent/40 active:scale-95"
              >
                <Avatar name={user.name} src={user.avatar} size={34} />
              </Link>
            </>
          ) : (
            <>
              <Button size="sm" to="/login" className="h-9 px-5 bg-surface/80 hover:bg-surface border border-line/10">
                Sign in
              </Button>
              <Button variant="primary" size="sm" to="/register" className="h-9 pl-5" arrow>
                Get started
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          {user && (
            <Link
              to="/dashboard"
              aria-label="Go to dashboard"
              className="mr-1 rounded-full transition-transform active:scale-95"
            >
              <Avatar name={user.name} src={user.avatar} size={30} />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle colour theme"
            className="h-9 w-9 rounded-full"
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/10 bg-surface/60 text-ink backdrop-blur-md transition-colors hover:bg-surface active:scale-95"
            onClick={toggleMenu}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={onOpenMenu ? undefined : menuOpen}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line/10 bg-canvas/95 backdrop-blur-2xl shadow-xl transition-all duration-200 lg:hidden max-h-[calc(100svh-4rem)] overflow-y-auto">
          <div className="container-wide py-4">
            <nav className="flex flex-col space-y-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => {
                const isActive = typeof link.to === 'string' && pathname === link.to;
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium tracking-tight transition-all active:scale-[0.99]',
                      isActive
                        ? 'bg-ink/[0.08] text-ink font-semibold'
                        : 'text-muted hover:bg-ink/[0.04] hover:text-ink',
                    )}
                  >
                    <span>{link.label}</span>
                    <span className="text-xs text-subtle font-mono">→</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-5 pt-4 border-t border-line/10">
              {user ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl border border-line/10 bg-surface/60 p-3">
                    <Avatar name={user.name} src={user.avatar} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button variant="primary" to="/dashboard" onClick={() => setMenuOpen(false)} className="w-full">
                      Dashboard
                    </Button>
                    <Button to="/dashboard/settings" onClick={() => setMenuOpen(false)} className="w-full bg-surface/70">
                      Settings
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Button to="/login" onClick={() => setMenuOpen(false)} className="w-full bg-surface/70">
                    Sign in
                  </Button>
                  <Button variant="primary" to="/register" onClick={() => setMenuOpen(false)} className="w-full">
                    Get started
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
