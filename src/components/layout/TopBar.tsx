import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getControllerGlyphs, useControllerActions, useControllerState } from '@/hooks/useController';
import { GlobalSearchBar } from './GlobalSearchBar';

export function TopBar() {
    const location = useLocation();
    const { navScope, setNavScope, controllers, activeControllerId } = useControllerState();

    const activeController = controllers.find(ctrl => ctrl.id === activeControllerId) ?? controllers[0];
    const glyphs = getControllerGlyphs(activeController?.family);

    let title = 'Library';
    const isLibraryView = location.pathname === '/';
    if (location.pathname.startsWith('/favorites')) title = 'Favorites';
    else if (location.pathname.startsWith('/collections')) title = 'Collections';
    else if (location.pathname.startsWith('/settings')) title = 'Settings';
    else if (location.pathname.startsWith('/game/')) title = 'Game Details';

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
        <header className={`h-[76px] min-h-[76px] border-b border-white/8 bg-[#08152b]/75 backdrop-blur-xl z-30 sticky top-0 no-drag ${navScope === 'topbar' ? 'ring-2 ring-accent/60' : ''}`}>
            <div className="w-full max-w-[1700px] mx-auto h-full px-8 md:px-10 lg:px-12 flex items-center justify-between">
                <div className={isLibraryView ? 'lg:pl-10 xl:pl-14' : ''}>
                    <h1 className="text-[30px] leading-none font-extrabold tracking-tight text-white">{title}</h1>
                    <p className="text-xs text-text-muted mt-1">Your game universe, organized</p>
                </div>
                <div className="flex items-center gap-4 mr-28 md:mr-32" style={{ marginTop: '36px' }}>
                    <GlobalSearchBar />
                    {navScope === 'topbar' && (
                        <span className="text-[10px] uppercase tracking-wider text-text-muted border border-white/10 rounded-md px-2 py-1">
                            {glyphs.confirm} search
                        </span>
                    )}
                </div>
            </div>
        </header>
    );
}
