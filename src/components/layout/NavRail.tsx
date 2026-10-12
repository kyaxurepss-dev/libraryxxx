import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FolderOpen,
  Gamepad2,
  Heart,
  Library,
  Monitor,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react';
import { useControllerActions, useControllerState } from '@/hooks/useController';
import { UpdaterUI } from './UpdaterUI';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Library, label: 'Library' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/collections', icon: FolderOpen, label: 'Collections' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
];

type RailAction =
  | { kind: 'route'; to: string }
  | { kind: 'search' }
  | { kind: 'bigpicture' }
  | { kind: 'scan' };

/* Visual order — must match the rendered order below. */
const actionItems: RailAction[] = [
  ...navItems.map((item) => ({ kind: 'route', to: item.to }) as RailAction),
  { kind: 'search' },
  { kind: 'bigpicture' },
  { kind: 'scan' },
  { kind: 'route', to: '/settings' },
];

const SEARCH_IDX = navItems.length;
const BIGPICTURE_IDX = navItems.length + 1;
const SCAN_IDX = navItems.length + 2;
const SETTINGS_IDX = navItems.length + 3;

export function NavRail({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { navScope, setNavScope, controllers } = useControllerState();

  const routeActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  useEffect(() => {
    if (navScope !== 'rail') return;
    const idx = actionItems.findIndex(
      (item) => item.kind === 'route' && routeActive(item.to),
    );
    if (idx >= 0) setFocusedIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navScope]);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await window.electron.scan();
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setScanning(false);
      window.location.reload();
    }
  };

  useControllerActions(({ action }) => {
    if (navScope !== 'rail') return;

    if (action === 'ui_down') {
      setFocusedIndex((prev) => Math.min(prev + 1, actionItems.length - 1));
      return;
    }
    if (action === 'ui_up') {
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (action === 'ui_right' || action === 'ui_cancel') {
      setNavScope('content');
      return;
    }
    if (action !== 'ui_confirm') return;

    const item = actionItems[focusedIndex];
    if (!item) return;
    if (item.kind === 'route') {
      navigate(item.to);
      setNavScope('content');
    } else if (item.kind === 'search') {
      onOpenSearch();
    } else if (item.kind === 'bigpicture') {
      navigate('/bigpicture');
      setNavScope('content');
    } else if (item.kind === 'scan') {
      handleScan();
    }
  }, true);

  const railButtonClass = (idx: number, active: boolean) =>
    cn(
      'no-drag relative flex w-full flex-col items-center gap-1 rounded-plate py-2.5 transition-colors duration-150',
      active ? 'bg-plate text-paper' : 'text-muted hover:bg-plate/60 hover:text-paper-dim',
      navScope === 'rail' && focusedIndex === idx && 'ring-2 ring-accent/70',
    );

  const microLabel = (active: boolean) =>
    cn(
      'text-[9px] font-semibold uppercase tracking-[0.14em]',
      active ? 'text-paper-dim' : 'text-muted',
    );

  return (
    <aside
      className={cn(
        'no-drag z-40 flex w-[76px] min-w-[76px] flex-col items-center border-r bg-ink-raise pb-3 pt-11',
        navScope === 'rail' ? 'border-r-accent/40' : 'border-rule',
      )}
      aria-label="Primary navigation"
    >
      <button
        onClick={() => navigate('/')}
        aria-label="libraryxxx — home"
        title="libraryxxx"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-plate bg-accent text-accent-ink shadow-plate transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <Gamepad2 className="h-5 w-5" />
      </button>

      <nav className="flex w-full flex-1 flex-col items-stretch gap-1 px-2">
        {navItems.map((item, idx) => (
          <NavLink
            key={item.to}
            to={item.to}
            onMouseEnter={() => setFocusedIndex(idx)}
            className={() => railButtonClass(idx, routeActive(item.to))}
          >
            {routeActive(item.to) && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            <item.icon className="h-5 w-5" />
            <span className={microLabel(routeActive(item.to))}>{item.label}</span>
          </NavLink>
        ))}

        <button
          onClick={onOpenSearch}
          onMouseEnter={() => setFocusedIndex(SEARCH_IDX)}
          className={railButtonClass(SEARCH_IDX, false)}
          aria-label="Search library (Ctrl+K)"
          title="Search (Ctrl+K)"
        >
          <Search className="h-5 w-5" />
          <span className={microLabel(false)}>Search</span>
        </button>

        <button
          onClick={() => navigate('/bigpicture')}
          onMouseEnter={() => setFocusedIndex(BIGPICTURE_IDX)}
          className={railButtonClass(BIGPICTURE_IDX, false)}
          aria-label="Enter Big Picture mode"
          title="Big Picture"
        >
          <Monitor className="h-5 w-5" />
          <span className={microLabel(false)}>Couch</span>
        </button>
      </nav>

      <div className="flex w-full flex-col items-stretch gap-1 px-2">
        <button
          onClick={handleScan}
          onMouseEnter={() => setFocusedIndex(SCAN_IDX)}
          disabled={scanning}
          className={cn(railButtonClass(SCAN_IDX, false), 'disabled:opacity-60')}
          aria-label={scanning ? 'Scanning library…' : 'Scan library'}
          title={scanning ? 'Scanning…' : 'Scan library'}
        >
          <RefreshCw className={cn('h-5 w-5', scanning && 'animate-spin')} />
          <span className={microLabel(false)}>{scanning ? 'Scanning' : 'Scan'}</span>
        </button>

        <NavLink
          to="/settings"
          onMouseEnter={() => setFocusedIndex(SETTINGS_IDX)}
          className={() => railButtonClass(SETTINGS_IDX, routeActive('/settings'))}
        >
          {routeActive('/settings') && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
          )}
          <Settings className="h-5 w-5" />
          <span className={microLabel(routeActive('/settings'))}>Settings</span>
        </NavLink>

        <div className="mt-1 flex flex-col items-center gap-2">
          <UpdaterUI />
          <div
            className="flex items-center gap-1.5"
            title={controllers.length > 0 ? `Controller connected: ${controllers[0].name}` : 'No controller connected'}
            aria-label={controllers.length > 0 ? 'Controller connected' : 'No controller connected'}
            role="status"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                controllers.length > 0 ? 'bg-success' : 'bg-muted',
              )}
            />
            <Gamepad2 className="h-3.5 w-3.5 text-muted" />
          </div>
        </div>
      </div>
    </aside>
  );
}