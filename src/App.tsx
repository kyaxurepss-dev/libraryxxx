import { useCallback, useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { NavRail } from './components/layout/NavRail';
import { CommandPalette } from './components/layout/CommandPalette';
import { ControllerHUD } from './components/layout/ControllerHUD';
import { ControllerContentNavigator } from './components/layout/ControllerContentNavigator';
import { LibraryPage } from './pages/LibraryPage';
import { GamePage } from './pages/GamePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { BigPicturePage } from './pages/BigPicturePage';
import { ControllerProvider } from './hooks/useController';
import { ThemeProvider } from './hooks/useTheme';

function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-ink font-sans text-paper">
      {/* Window drag strip */}
      <div className="drag-region fixed inset-x-0 top-0 z-50 h-9" />

      <ControllerHUD />
      <ControllerContentNavigator />
      <CommandPalette open={paletteOpen} onClose={closePalette} />

      {/* Big Picture is a full-screen overlay, rendered outside the normal layout */}
      <Routes>
        <Route path="/bigpicture" element={<BigPicturePage />} />
        <Route
          path="/*"
          element={
            <div className="flex w-full min-w-0">
              <NavRail onOpenSearch={openPalette} />
              <main className="min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-[1760px] px-6 py-8 md:px-10 md:py-10">
                  <Routes>
                    <Route path="/" element={<LibraryPage />} />
                    <Route path="/game/:id" element={<GamePage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/collections" element={<CollectionsPage />} />
                    <Route path="/collections/:id" element={<CollectionDetailPage />} />
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </div>
              </main>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ControllerProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </ControllerProvider>
    </ThemeProvider>
  );
}

export default App;