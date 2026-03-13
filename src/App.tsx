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
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute -top-[18%] -left-[6%] w-[46%] h-[42%] rounded-full bg-blue-500/16 blur-[110px] animate-orb-float" />
              <div className="absolute top-[35%] -right-[8%] w-[38%] h-[56%] rounded-full bg-cyan-400/10 blur-[105px] animate-orb-float" style={{ animationDelay: '-5s' }} />
            </div>

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
                      <div className="w-full max-w-[1700px] mx-auto px-8 py-6 md:px-10 md:py-7 lg:px-12">
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

