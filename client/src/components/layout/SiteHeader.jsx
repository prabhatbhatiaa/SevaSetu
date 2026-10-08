import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Button, Logo, cn } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_LINKS = [
  { label: 'How it works', to: { pathname: '/', hash: '#how-it-works' } },
  { label: 'Matching', to: { pathname: '/', hash: '#matching' } },
  { label: 'Explore requests', to: '/requests/explore' },
  { label: 'Impact', to: '/impact' },
];

/**
 * Public site navigation. On the landing page it starts transparent over the
 * hero and gains a background once the page scrolls.
 */
export function SiteHeader({ overHero = false }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const solid = scrolled || menuOpen || !overHero;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        solid && overHero && 'border-line bg-canvas/95',
        solid && !overHero && 'border-line bg-canvas/85 backdrop-blur-xl',
        !solid && 'border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="SevaSetu home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
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

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle colour theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <Button variant="primary" size="sm" to="/dashboard" className="h-9 pl-5" arrow>
              Dashboard
            </Button>
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

        <button
          type="button"
          className="-mr-2 rounded-full p-2 lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="container-page animate-fade-in border-t pb-6 lg:hidden">
          <nav className="flex flex-col py-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="border-b py-4 text-lg tracking-tight"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between border-b py-4 text-lg tracking-tight"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
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
