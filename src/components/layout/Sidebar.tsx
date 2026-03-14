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
        <aside
            className={`w-[250px] min-w-[250px] bg-gradient-to-b from-[#050816]/95 via-[#050816]/92 to-[#020617]/98 backdrop-blur-2xl border-r border-white/10 shadow-[0_0_55px_rgba(3,7,18,0.95)] flex flex-col pt-11 z-40 relative transition-all ${
                navScope === 'sidebar' ? 'ring-2 ring-accent/60 ring-offset-0' : ''
            }`}
        >
            <div className="px-6 no-drag mb-10">
                <div className="w-11 h-11 rounded-2xl bg-accent/20 flex items-center justify-center shadow-[0_0_26px_rgba(59,130,246,0.35)] border border-accent/30">
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
                            className={`no-drag flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-300 relative group/nav overflow-hidden
                ${
                    isActive
                        ? 'text-white'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                }
                ${isControllerFocused ? 'ring-2 ring-cyan-300/80 ring-offset-0' : ''}`}
                        >
                            {isActive && (
                                <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.45),transparent_60%),linear-gradient(90deg,rgba(15,23,42,0.9),rgba(15,23,42,0.6))] border border-accent/40 shadow-[0_18px_40px_rgba(59,130,246,0.4)]" />
                            )}
                            <item.icon
                                className={`w-[18px] h-[18px] transition-transform duration-300 group-hover/nav:scale-110 ${
                                    isActive ? 'text-accent' : ''
                                }`}
                            />
                            <span className="truncate">{item.label}</span>
                        </NavLink>
                    );
                })}

                {/* Big Picture button */}
                <button
                    onClick={() => navigate('/bigpicture')}
                    onMouseEnter={() => setFocusedIndex(navItems.length)}
                    className={`no-drag w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 text-text-secondary hover:text-white hover:bg-white/5 ${
                        navScope === 'sidebar' && focusedIndex === navItems.length
                            ? 'ring-2 ring-cyan-300/80 ring-offset-0'
                            : ''
                    }`}
                >
                    <Monitor className="w-[18px] h-[18px]" />
                    <span className="truncate">Big Picture</span>
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
                            className={`no-drag flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 relative overflow-hidden
                ${
                    isActive
                        ? 'text-white'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                }
                ${isControllerFocused ? 'ring-2 ring-cyan-300/80 ring-offset-0' : ''}`}
                        >
                            {isActive && (
                                <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.35),transparent_60%),linear-gradient(90deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))] border border-accent/35 shadow-[0_16px_38px_rgba(59,130,246,0.35)]" />
                            )}
                            <item.icon className="w-[18px] h-[18px]" />
                            <span className="truncate">{item.label}</span>
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
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/18 text-white hover:bg-accent/28 disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-200 text-sm font-bold border border-accent/30 ${
                        navScope === 'sidebar' && focusedIndex === actionItems.length - 1
                            ? 'ring-2 ring-cyan-300/80 ring-offset-0'
                            : ''
                    }`}
                >
                    <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                    {scanning ? 'Scanning...' : 'Scan Library'}
                </button>
            </div>

            <div className="px-6 pb-6 no-drag">
                <div className="border-t border-white/10 pt-4">
                    <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-white/40">
                        libraryxxx
                    </h1>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.24em] font-semibold mt-1">
                        Game Library
                    </p>
                </div>
            </div>
        </aside>
    );
}
