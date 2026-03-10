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
import { useState } from 'react';

const navItems = [
    { to: '/', icon: Library, label: 'Library' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/collections', icon: FolderOpen, label: 'Collections' },
    { to: '/stats', icon: BarChart2, label: 'Statistics' },
];

const systemItems = [
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
    const [scanning, setScanning] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

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

    return (
        <aside className="w-[250px] min-w-[250px] bg-[#08162d]/75 backdrop-blur-2xl border-r border-white/8 flex flex-col pt-11 z-40 relative">
            <div className="px-6 pb-7 no-drag">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.25)] border border-accent/25">
                    <Gamepad2 className="w-5 h-5 text-accent" />
                </div>
            </div>

            <nav className="flex-1 px-3.5 space-y-1.5">
                {navItems.map((item) => {
                    const isActive =
                        item.to === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.to);

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`no-drag flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 relative
                ${isActive
                                    ? 'bg-accent/16 text-white border border-accent/35 shadow-[0_10px_25px_rgba(59,130,246,0.2)]'
                                    : 'text-text-secondary hover:text-white hover:bg-white/6 border border-transparent'
                                }`}
                        >
                            <item.icon className="w-[18px] h-[18px]" />
                            {item.label}
                        </NavLink>
                    );
                })}

                {/* Big Picture button */}
                <button
                    onClick={() => navigate('/bigpicture')}
                    className="no-drag w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 text-text-secondary hover:text-white hover:bg-white/6 border border-transparent"
                >
                    <Monitor className="w-[18px] h-[18px]" />
                    Big Picture
                </button>

                <div className="my-5 px-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/6" />
                        <span className="text-[10px] tracking-[0.22em] uppercase text-text-muted font-bold">System</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/6" />
                    </div>
                </div>

                {systemItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={`no-drag flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 relative
                ${isActive
                                    ? 'bg-accent/16 text-white border border-accent/35 shadow-[0_10px_25px_rgba(59,130,246,0.2)]'
                                    : 'text-text-secondary hover:text-white hover:bg-white/6 border border-transparent'
                                }`}
                        >
                            <item.icon className="w-[18px] h-[18px]" />
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto mb-1 no-drag">
                <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent/18 text-white hover:bg-accent/28 disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-200 text-sm font-bold border border-accent/30"
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
