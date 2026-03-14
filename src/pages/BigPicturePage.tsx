import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Gamepad2 } from 'lucide-react';
import type { Game } from '@/types';
import { getControllerGlyphs, useControllerActions, useControllerState } from '@/hooks/useController';
import { toMediaSrc } from '@/lib/utils';

export function BigPicturePage() {
    const navigate = useNavigate();
    const [games, setGames] = useState<Game[]>([]);
    const [focusIdx, setFocusIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const gridRef = useRef<HTMLDivElement>(null);
    const COLS = 5;

    const { controllers, activeControllerId, navScope } = useControllerState();
    const activeController = controllers.find(ctrl => ctrl.id === activeControllerId) ?? controllers[0];
    const glyphs = getControllerGlyphs(activeController?.family);

    useEffect(() => {
        window.electron.getGames()
            .then((g: Game[]) => setGames(g))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') { navigate('/'); return; }
        setFocusIdx(prev => {
            if (e.key === 'ArrowRight') return Math.min(prev + 1, games.length - 1);
            if (e.key === 'ArrowLeft') return Math.max(prev - 1, 0);
            if (e.key === 'ArrowDown') return Math.min(prev + COLS, games.length - 1);
            if (e.key === 'ArrowUp') return Math.max(prev - COLS, 0);
            return prev;
        });
        if (e.key === 'Enter' && games[focusIdx]) {
            navigate(`/game/${games[focusIdx].id}`);
        }
    }, [games, focusIdx, navigate]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useControllerActions(({ action }) => {
        setFocusIdx(prev => {
            const count = games.length;
            if (count === 0) return -1;
            const idx = prev < 0 ? 0 : prev;

            if (action === 'ui_right') return Math.min(idx + 1, count - 1);
            if (action === 'ui_left') return Math.max(idx - 1, 0);
            if (action === 'ui_down') return Math.min(idx + COLS, count - 1);
            if (action === 'ui_up') return Math.max(idx - COLS, 0);
            if (action === 'ui_confirm' && games[idx]) {
                navigate(`/game/${games[idx].id}`);
                return prev;
            }
            if (action === 'ui_cancel') {
                navigate('/');
                return prev;
            }

            return prev;
        });
    }, navScope === 'content');

    // Scroll focused card into view
    useEffect(() => {
        const el = gridRef.current?.querySelector(`[data-idx="${focusIdx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [focusIdx]);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex flex-col bg-[radial-gradient(1200px_520px_at_0%_0%,rgba(59,130,246,0.28),transparent_65%),radial-gradient(1100px_520px_at_100%_0%,rgba(14,165,233,0.22),transparent_62%),linear-gradient(180deg,#020617,#020617)]">
            {/* Header bar */}
            <div className="flex items-center justify-between px-10 py-4 border-b border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_20px_60px_rgba(3,7,18,0.95)]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-accent/25 border border-accent/40 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.7)]">
                        <Gamepad2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold tracking-[0.26em] text-text-muted/80 uppercase">
                            BIG PICTURE
                        </span>
                        <span className="text-xl font-bold text-text-primary leading-tight">
                            Couch mode
                        </span>
                    </div>
                    <span className="text-xs text-text-muted ml-4">
                        Arrows / D-Pad to navigate · {glyphs.confirm} or Enter to open · {glyphs.cancel} or Esc to exit
                    </span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-xl border border-white/15 bg-black/40 text-text-muted hover:text-white hover:border-white/30 hover:bg-black/60 transition-all shadow-[0_10px_24px_rgba(15,23,42,0.8)]"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Game grid */}
            <div ref={gridRef} className="flex-1 overflow-y-auto px-10 py-8">
                {loading ? (
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="skeleton aspect-3/4 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                        {games.map((game, i) => {
                            const coverSrc = toMediaSrc(game.cover_url);
                            const isFocused = i === focusIdx;
                            return (
                                <button
                                    key={game.id}
                                    data-idx={i}
                                    onClick={() => navigate(`/game/${game.id}`)}
                                    onMouseEnter={() => setFocusIdx(i)}
                                    className={`relative aspect-3/4 rounded-2xl overflow-hidden group transition-all duration-250 outline-none ${
                                        isFocused
                                            ? 'ring-4 ring-accent shadow-[0_0_55px_rgba(59,130,246,0.8)] scale-[1.06] z-10'
                                            : 'opacity-80 hover:opacity-100'
                                    }`}
                                >
                                    {coverSrc ? (
                                        <img src={coverSrc} alt={game.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-bg-surface flex items-center justify-center">
                                            <Gamepad2 className="w-12 h-12 text-text-muted/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    <div
                                        className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-200 ${
                                            isFocused
                                                ? 'opacity-100 translate-y-0'
                                                : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-white leading-tight line-clamp-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                                            {game.title}
                                        </p>
                                        {isFocused && (
                                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent font-semibold bg-black/60 px-2.5 py-1 rounded-full border border-accent/40">
                                                <Play className="w-3 h-3 fill-current" /> Press {glyphs.confirm} or Enter
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
