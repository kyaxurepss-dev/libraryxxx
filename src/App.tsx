import { HashRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
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

function App() {
  return (
    <ThemeProvider>
      <ControllerProvider>
        <HashRouter>
          <div className="flex h-screen bg-bg-primary relative overflow-hidden text-text-primary font-sans">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(to bottom, black, transparent 72%)' }} />

            <div className="drag-region fixed top-0 left-0 right-0 h-9 z-50" />
            <ControllerHUD />
            <ControllerContentNavigator />

            {/* Big Picture is a full-screen overlay, rendered outside the normal layout */}
            <Routes>
              <Route path="/bigpicture" element={<BigPicturePage />} />
              <Route path="/*" element={
                <div className="flex w-full h-full relative z-10">
                  <Sidebar />
                  <div className="flex-1 flex flex-col min-w-0 bg-transparent">
                    <TopBar />
                    <main className="flex-1 overflow-y-auto relative">
                      <div className="w-full max-w-[1800px] mx-auto px-5 py-6 md:px-8 md:py-8 lg:px-10">
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
                </div>
              } />
            </Routes>
          </div>
        </HashRouter>
      </ControllerProvider>
    </ThemeProvider>
  );
}

export default App;

