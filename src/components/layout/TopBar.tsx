import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getControllerGlyphs, useControllerActions, useControllerState } from '@/hooks/useController';
import { GlobalSearchBar } from './GlobalSearchBar';

export function TopBar() {
    const location = useLocation();
    const { navScope, setNavScope, controllers, activeControllerId } = useControllerState();

    const activeController = controllers.find(ctrl => ctrl.id === activeControllerId) ?? controllers[0];
    const glyphs = getControllerGlyphs(activeController?.family);

    const isLibraryView = location.pathname === '/';
    let title = 'Library';
    let sectionLabel = 'LIBRARY';
    let subtitle = 'Your game universe, organized';

    if (location.pathname.startsWith('/favorites')) {
        title = 'Favorites';
        sectionLabel = 'FAVORITES';
        subtitle = 'Pinned games you love playing';
    } else if (location.pathname.startsWith('/collections')) {
        title = 'Collections';
        sectionLabel = 'COLLECTIONS';
        subtitle = 'Curated sets, playlists and smart rules';
    } else if (location.pathname.startsWith('/stats')) {
        title = 'Statistics';
        sectionLabel = 'STATISTICS';
        subtitle = 'Playtime, trends and library health';
    } else if (location.pathname.startsWith('/settings')) {
        title = 'Settings';
        sectionLabel = 'SETTINGS';
        subtitle = 'Libraries, themes, emulators and more';
    } else if (location.pathname.startsWith('/game/')) {
        title = 'Game Details';
        sectionLabel = 'DETAILS';
        subtitle = 'Overview, playtime and metadata';
    }

    useControllerActions(({ action }) => {
        if (navScope !== 'topbar') return;

        if (action === 'ui_right' || action === 'ui_cancel') {
            setNavScope('content');
            return;
        }

        if (action === 'ui_left') {
            setNavScope('sidebar');
            return;
        }

        if (action === 'ui_confirm') {
            window.dispatchEvent(new CustomEvent('controller-search-toggle'));
        }
    }, true);

    useEffect(() => {
        const onSearchOpened = () => {
            if (navScope === 'topbar') setNavScope('content');
        };

        window.addEventListener('controller-search-opened', onSearchOpened);
        return () => window.removeEventListener('controller-search-opened', onSearchOpened);
    }, [navScope, setNavScope]);

    return (
        <header
            className={`h-[72px] min-h-[72px] border-b border-white/10 bg-bg-surface/70 backdrop-blur-2xl shadow-[0_18px_45px_rgba(3,7,18,0.8)] sticky top-0 z-30 no-drag transition-all ${
                navScope === 'topbar' ? 'ring-2 ring-accent/60 ring-offset-0' : ''
            }`}
        >
            <div className="w-full max-w-[1700px] mx-auto h-full px-6 md:px-8 lg:px-10 flex items-center justify-between gap-6">
                <div className={`flex flex-col ${isLibraryView ? 'lg:pl-6 xl:pl-10' : ''}`}>
                    <span className="text-[10px] font-semibold tracking-[0.26em] text-text-muted/80 uppercase mb-1">
                        {sectionLabel}
                    </span>
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-[24px] md:text-[26px] leading-none font-extrabold tracking-tight text-white drop-shadow-[0_0_16px_rgba(15,23,42,0.9)]">
                            {title}
                        </h1>
                    </div>
                    <p className="text-[11px] md:text-xs text-text-muted mt-1 max-w-md">
                        {subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-3 md:gap-4 ml-auto">
                    <GlobalSearchBar />
                    {navScope === 'topbar' && (
                        <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted border border-white/10 rounded-md px-2 py-1 bg-black/20 backdrop-blur-sm">
                            <span className="text-xs">{glyphs.confirm}</span>
                            <span className="font-semibold">Search</span>
                        </span>
                    )}
                </div>
            </div>
        </header>
    );
}
