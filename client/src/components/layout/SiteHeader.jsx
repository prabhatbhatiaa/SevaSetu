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
 * Site navigation bar:
 * - On landing, impact, and explore requests pages: full-width bar at top; smoothly transitions to a minimal floating dock on scroll.
 * - On all other pages: permanent full-width end-to-end bar.
 */
export function SiteHeader({ onOpenMenu }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Enable scroll-to-dock on landing, impact, and explore requests pages
  const isDockPage = pathname === '/' || pathname === '/impact' || pathname.startsWith('/requests');

  useEffect(() => setMenuOpen(false), [pathname]);

  // Buttery smooth scroll detection with hysteresis (80px enter / 40px exit)
  useEffect(() => {
    if (!isDockPage) {
      setIsScrolled(false);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setIsScrolled((prev) => (prev ? scrollY > 40 : scrollY > 80));
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDockPage, pathname]);

  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const toggleMenu = () => (onOpenMenu ? onOpenMenu() : setMenuOpen((open) => !open));

  const isDock = isDockPage && isScrolled;

  return (
    <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
      {/* 1. Full-width top header */}
      <div
        className={cn(
          'pointer-events-auto w-full border-b border-line/10 bg-canvas/70 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out will-change-[transform,opacity]',
          isDock ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
        )}
      >
        <div className="container-wide flex h-16 items-center justify-between gap-4 sm:gap-6">
          <Link to="/" aria-label="SevaSetu home" className="shrink-0 transition-transform active:scale-95 flex items-center">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 xl:gap-9 lg:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'relative text-sm font-medium transition-colors hover:text-ink py-1 whitespace-nowrap',
                    isActive && typeof link.to === 'string' ? 'text-ink font-semibold' : 'text-muted'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{link.label}</span>
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
                <Button size="sm" to="/login" className="h-9 px-5 bg-surface/80 hover:bg-surface border border-line/10 whitespace-nowrap">
                  Sign in
                </Button>
                <Button variant="primary" size="sm" to="/register" className="h-9 pl-5 whitespace-nowrap" arrow>
                  Get started
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 lg:hidden">
            {user && (
              <Link to="/dashboard" aria-label="Go to dashboard" className="mr-0.5 rounded-full transition-transform active:scale-95">
                <Avatar name={user.name} src={user.avatar} size={30} />
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle colour theme" className="h-9 w-9 rounded-full">
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

        {/* Mobile Dropdown for full header */}
        {menuOpen && !isDock && (
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
                        isActive ? 'bg-ink/[0.08] text-ink font-semibold' : 'text-muted hover:bg-ink/[0.04] hover:text-ink'
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
      </div>

      {/* 2. Floating Dock (appears smoothly when scrolled on landing page) */}
      <div
        className={cn(
          'absolute inset-x-0 top-3 sm:top-4 px-3 sm:px-6 transition-all duration-300 ease-out',
          isDock ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
        )}
      >
        <div
          className="mx-auto w-[92vw] max-w-[880px] rounded-full border border-line/15 bg-surface/95 dark:bg-surface/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-surface/90 dark:supports-[backdrop-filter]:bg-surface/90 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55)] px-4 sm:px-6 py-1.5 ring-1 ring-ink/[0.04]"
          style={{ WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)' }}
        >
          <div className="flex h-11 items-center justify-between gap-3 sm:gap-6">
            <Link to="/" aria-label="SevaSetu home" className="shrink-0 transition-transform active:scale-95 flex items-center">
              <Logo collapsed className="gap-1.5" />
            </Link>

            <nav className="hidden items-center gap-5 xl:gap-7 lg:flex" aria-label="Dock Navigation">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'relative text-sm font-medium transition-colors hover:text-ink py-1 whitespace-nowrap',
                      isActive && typeof link.to === 'string' ? 'text-ink font-semibold' : 'text-muted'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{link.label}</span>
                      {isActive && typeof link.to === 'string' && (
                        <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-accent" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle colour theme"
                className="h-8 w-8 rounded-full hover:bg-ink/[0.06] transition-colors"
              >
                <ThemeIcon className="h-3.5 w-3.5" />
              </Button>
              {user ? (
                <>
                  <Button variant="primary" size="sm" to="/dashboard" className="h-8 px-4 text-xs font-semibold whitespace-nowrap">
                    Dashboard
                  </Button>
                  <Link to="/dashboard/settings" aria-label="Your settings" className="ml-0.5 rounded-full ring-2 ring-transparent transition-all hover:ring-accent/40 active:scale-95">
                    <Avatar name={user.name} src={user.avatar} size={30} />
                  </Link>
                </>
              ) : (
                <>
                  <Button size="sm" to="/login" className="h-8 px-3.5 text-xs bg-ink/[0.04] hover:bg-ink/[0.08] dark:bg-ink/[0.06] dark:hover:bg-ink/[0.12] border border-line/10 whitespace-nowrap">
                    Sign in
                  </Button>
                  <Button variant="primary" size="sm" to="/register" className="h-8 px-4 text-xs font-semibold whitespace-nowrap">
                    Get started
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 lg:hidden">
              {user && (
                <Link to="/dashboard" aria-label="Go to dashboard" className="mr-0.5 rounded-full transition-transform active:scale-95">
                  <Avatar name={user.name} src={user.avatar} size={28} />
                </Link>
              )}
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle colour theme" className="h-8 w-8 rounded-full transition-colors">
                <ThemeIcon className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/10 bg-surface/60 text-ink backdrop-blur-md transition-colors hover:bg-surface active:scale-95"
                onClick={toggleMenu}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={onOpenMenu ? undefined : menuOpen}
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown for dock */}
          {menuOpen && isDock && (
            <div
              className="mt-2.5 pt-2 pb-3 px-2 border-t border-line/10 rounded-2xl bg-surface/95 dark:bg-surface/95 backdrop-blur-2xl transition-all duration-200 lg:hidden max-h-[calc(100svh-5rem)] overflow-y-auto"
              style={{ WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)' }}
            >
              <nav className="flex flex-col space-y-1" aria-label="Mobile">
                {NAV_LINKS.map((link) => {
                  const isActive = typeof link.to === 'string' && pathname === link.to;
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between rounded-xl px-4 py-2.5 text-sm sm:text-base font-medium tracking-tight transition-all active:scale-[0.99]',
                        isActive ? 'bg-ink/[0.08] text-ink font-semibold' : 'text-muted hover:bg-ink/[0.04] hover:text-ink'
                      )}
                    >
                      <span>{link.label}</span>
                      <span className="text-xs text-subtle font-mono">→</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 pt-3 border-t border-line/10">
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-xl border border-line/10 bg-surface/60 p-2.5">
                      <Avatar name={user.name} src={user.avatar} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-medium text-ink">{user.name}</p>
                        <p className="truncate text-[11px] text-muted">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="primary" size="sm" to="/dashboard" onClick={() => setMenuOpen(false)} className="w-full text-xs">
                        Dashboard
                      </Button>
                      <Button size="sm" to="/dashboard/settings" onClick={() => setMenuOpen(false)} className="w-full bg-surface/70 text-xs">
                        Settings
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" to="/login" onClick={() => setMenuOpen(false)} className="w-full bg-surface/70 text-xs">
                      Sign in
                    </Button>
                    <Button variant="primary" size="sm" to="/register" onClick={() => setMenuOpen(false)} className="w-full text-xs">
                      Get started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
