import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Compass,
  Globe,
  HandHeart,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { Avatar, Button, Logo, cn } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../lib/constants';
import { REQUESTS_CHANGED_EVENT } from '../../lib/hooks';

// The request form pulls in Leaflet, so only load it when someone opens it.
const CreateRequestModal = lazy(() => import('../requests/CreateRequestModal'));

const NAVIGATION = {
  community_member: [
    { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/dashboard/requests', label: 'My requests', icon: ClipboardList },
    { to: '/dashboard/assignments', label: 'Assignments', icon: ListChecks },
    { to: '/dashboard/volunteers', label: 'Volunteers', icon: HandHeart },
  ],
  volunteer: [
    { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/dashboard/requests', label: 'Opportunities', icon: Compass },
    { to: '/dashboard/assignments', label: 'My tasks', icon: ListChecks },
  ],
  admin: [
    { to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/dashboard/requests', label: 'All requests', icon: ClipboardList },
    { to: '/dashboard/assignments', label: 'Assignments', icon: ListChecks },
    { to: '/dashboard/volunteers', label: 'Volunteers', icon: HandHeart },
  ],
};

const SHARED_NAVIGATION = [
  { to: '/dashboard/impact', label: 'Impact', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-ink/[0.07] text-ink' : 'text-muted hover:bg-ink/[0.04] hover:text-ink',
        )
      }
    >
      <item.icon className="h-4 w-4" strokeWidth={1.75} />
      {item.label}
    </NavLink>
  );
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/" onClick={onNavigate} aria-label="SevaSetu home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Dashboard">
        <div className="space-y-0.5">
          {NAVIGATION[user.role].map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="eyebrow px-3 pb-2 text-[10px]">General</p>
          {SHARED_NAVIGATION.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
          <Link
            to="/requests/explore"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Globe className="h-4 w-4" strokeWidth={1.75} />
            Public explorer
          </Link>
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
          <Button size="sm" className="flex-1" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const canCreateRequests = user.role === 'community_member';

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // `/dashboard/requests?new=1` opens the request form directly.
  useEffect(() => {
    if (searchParams.get('new') === '1' && canCreateRequests) setCreating(true);
  }, [searchParams, canCreateRequests]);

  const closeCreate = () => {
    setCreating(false);
    if (searchParams.has('new')) setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-canvas lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-canvas/90 px-5 backdrop-blur-xl lg:hidden">
        <Link to="/dashboard" aria-label="Dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {canCreateRequests && (
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/70" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-scale-in border-r bg-canvas">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-full p-1.5 text-muted"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <Outlet context={{ openCreateRequest: () => setCreating(true) }} />
        </main>
      </div>

      {canCreateRequests && creating && (
        <Suspense fallback={null}>
          <CreateRequestModal
            open
            onClose={closeCreate}
            onCreated={() => window.dispatchEvent(new Event(REQUESTS_CHANGED_EVENT))}
          />
        </Suspense>
      )}
    </div>
  );
}
