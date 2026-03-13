import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Library,
    Heart,
    FolderOpen,
    Settings,
    RefreshCw,
    Gamepad2,
    BarChart2,
    Monitor,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useControllerActions, useControllerState } from '@/hooks/useController';
import { UpdaterUI } from './UpdaterUI';

const navItems = [
    { to: '/', icon: Library, label: 'Library' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/collections', icon: FolderOpen, label: 'Collections' },
    { to: '/stats', icon: BarChart2, label: 'Statistics' },
];

const systemItems = [
    { to: '/settings', icon: Settings, label: 'Settings' },
];

type SidebarActionItem =
    | { kind: 'route'; to: string }
    | { kind: 'bigpicture' }
    | { kind: 'scan' };

export function Sidebar() {
    const [scanning, setScanning] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const { navScope, setNavScope } = useControllerState();

    const actionItems = useMemo<SidebarActionItem[]>(
        () => [
            ...navItems.map(item => ({ kind: 'route', to: item.to } as SidebarActionItem)),
            { kind: 'bigpicture' },
            ...systemItems.map(item => ({ kind: 'route', to: item.to } as SidebarActionItem)),
            { kind: 'scan' },
        ],
        []
    );

    useEffect(() => {
        if (navScope !== 'sidebar') return;
        const idx = actionItems.findIndex(item => item.kind === 'route' && (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)));
        if (idx >= 0) setFocusedIndex(idx);
    }, [location.pathname, navScope, actionItems]);

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
        if (navScope !== 'sidebar') return;

        if (action === 'ui_down') {
            setFocusedIndex(prev => Math.min(prev + 1, actionItems.length - 1));
            return;
        }

        if (action === 'ui_up') {
            setFocusedIndex(prev => Math.max(prev - 1, 0));
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
            return;
        }

        if (item.kind === 'bigpicture') {
            navigate('/bigpicture');
            setNavScope('content');
            return;
        }

        if (item.kind === 'scan') {
            handleScan();
        }
    }, true);

    return (
        <aside className={`w-[250px] min-w-[250px] bg-[#08162d]/75 backdrop-blur-2xl border-r border-white/8 flex flex-col pt-11 z-40 relative ${navScope === 'sidebar' ? 'ring-2 ring-accent/60' : ''}`}>
            <div className="px-6 no-drag" style={{ marginBottom: '40px' }}>
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.25)] border border-accent/25">
                    <Gamepad2 className="w-5 h-5 text-accent" />
                </div>
            </div>

            <nav className="flex-1 px-3.5 space-y-1.5">
                {navItems.map((item, idx) => {
                    const isActive =
                        item.to === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.to);

                    const isControllerFocused = navScope === 'sidebar' && focusedIndex === idx;

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onMouseEnter={() => setFocusedIndex(idx)}
                            className={`no-drag flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-300 relative group/nav
                ${isActive
                                    ? 'bg-accent/16 text-white border border-accent/35 shadow-[0_10px_25px_rgba(59,130,246,0.2)] scale-[1.02]'
                                    : 'text-text-secondary hover:text-white hover:bg-white/6 border border-transparent hover:translate-x-1'
                                }
                ${isControllerFocused ? 'ring-2 ring-cyan-300/80' : ''}`}
                        >
                            <item.icon className={`w-[18px] h-[18px] transition-transform duration-300 group-hover/nav:scale-110 ${isActive ? 'text-accent' : ''}`} />
                            {item.label}
                        </NavLink>
                    );
                })}

                {/* Big Picture button */}
                <button
                    onClick={() => navigate('/bigpicture')}
                    onMouseEnter={() => setFocusedIndex(navItems.length)}
                    className={`no-drag w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 text-text-secondary hover:text-white hover:bg-white/6 border border-transparent ${navScope === 'sidebar' && focusedIndex === navItems.length ? 'ring-2 ring-cyan-300/80' : ''}`}
                >
                    <Monitor className="w-[18px] h-[18px]" />
                    Big Picture
                </button>

                <div className="my-5 px-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/20 to-white/6" />
                        <span className="text-[10px] tracking-[0.22em] uppercase text-text-muted font-bold">System</span>
                        <div className="h-px flex-1 bg-linear-to-l from-transparent via-white/20 to-white/6" />
                    </div>
                </div>

                {systemItems.map((item, sysIdx) => {
                    const isActive = location.pathname.startsWith(item.to);
                    const index = navItems.length + 1 + sysIdx;
                    const isControllerFocused = navScope === 'sidebar' && focusedIndex === index;

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onMouseEnter={() => setFocusedIndex(index)}
                            className={`no-drag flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 relative
                ${isActive
                                    ? 'bg-accent/16 text-white border border-accent/35 shadow-[0_10px_25px_rgba(59,130,246,0.2)]'
                                    : 'text-text-secondary hover:text-white hover:bg-white/6 border border-transparent'
                                }
                ${isControllerFocused ? 'ring-2 ring-cyan-300/80' : ''}`}
                        >
                            <item.icon className="w-[18px] h-[18px]" />
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto mb-1 no-drag flex flex-col gap-2">
                <UpdaterUI />
                <button
                    onClick={handleScan}
                    onMouseEnter={() => setFocusedIndex(actionItems.length - 1)}
                    disabled={scanning}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/18 text-white hover:bg-accent/28 disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-200 text-sm font-bold border border-accent/30 ${navScope === 'sidebar' && focusedIndex === actionItems.length - 1 ? 'ring-2 ring-cyan-300/80' : ''}`}
                >
                    <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Scanning...' : 'Scan Library'}
                </button>
            </div>

            <div className="px-6 pb-6 no-drag">
                <div className="border-t border-white/8 pt-4">
                    <h1 className="text-sm font-bold tracking-[0.16em] uppercase text-white/35">libraryxxx</h1>
                    <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-semibold mt-1">Advanced</p>
                </div>
            </div>
        </aside>
    );
}
