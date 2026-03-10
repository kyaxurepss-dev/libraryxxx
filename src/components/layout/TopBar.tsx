import { useLocation } from 'react-router-dom';
import { GlobalSearchBar } from './GlobalSearchBar';

export function TopBar() {
    const location = useLocation();

    let title = 'Library';
    const isLibraryView = location.pathname === '/';
    if (location.pathname.startsWith('/favorites')) title = 'Favorites';
    else if (location.pathname.startsWith('/collections')) title = 'Collections';
    else if (location.pathname.startsWith('/settings')) title = 'Settings';
    else if (location.pathname.startsWith('/game/')) title = 'Game Details';

    return (
        <header className="h-[76px] min-h-[76px] border-b border-white/8 bg-[#08152b]/75 backdrop-blur-xl z-30 sticky top-0 no-drag">
            <div className="w-full max-w-[1700px] mx-auto h-full px-8 md:px-10 lg:px-12 flex items-center justify-between">
                <div className={isLibraryView ? 'lg:pl-10 xl:pl-14' : ''}>
                    <h1 className="text-[30px] leading-none font-extrabold tracking-tight text-white">{title}</h1>
                    <p className="text-xs text-text-muted mt-1">Your game universe, organized</p>
                </div>
                <div className="flex items-center gap-4">
                    <GlobalSearchBar />
                </div>
            </div>
        </header>
    );
}
