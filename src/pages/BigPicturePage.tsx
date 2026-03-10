import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Gamepad2 } from 'lucide-react';
import type { Game } from '@/types';
import { toMediaSrc } from '@/lib/utils';

export function BigPicturePage() {
    const navigate = useNavigate();
    const [games, setGames] = useState<Game[]>([]);
    const [focusIdx, setFocusIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const gridRef = useRef<HTMLDivElement>(null);
    const COLS = 5;

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

    // Scroll focused card into view
    useEffect(() => {
        const el = gridRef.current?.querySelector(`[data-idx="${focusIdx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [focusIdx]);

    return (
        <div className="fixed inset-0 z-50 bg-bg-primary overflow-hidden flex flex-col">
            {/* Header bar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Gamepad2 className="w-6 h-6 text-accent" />
                    <span className="text-xl font-bold text-text-primary">Big Picture</span>
                    <span className="text-xs text-text-muted ml-2">Use arrow keys to navigate · Enter to open · Esc to exit</span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-xl glass-panel text-text-muted hover:text-white hover:border-white/20 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Game grid */}
            <div ref={gridRef} className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="grid grid-cols-5 gap-5">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                        {games.map((game, i) => {
                            const coverSrc = toMediaSrc(game.cover_url);
                            const isFocused = i === focusIdx;
                            return (
                                <button
                                    key={game.id}
                                    data-idx={i}
                                    onClick={() => navigate(`/game/${game.id}`)}
                                    onMouseEnter={() => setFocusIdx(i)}
                                    className={`relative aspect-[3/4] rounded-2xl overflow-hidden group transition-all duration-300 outline-none
                                        ${isFocused
                                            ? 'ring-4 ring-accent shadow-[0_0_40px_rgba(59,130,246,0.5)] scale-105 z-10'
                                            : 'opacity-75 hover:opacity-100'
                                        }
                                    `}
                                >
                                    {coverSrc ? (
                                        <img src={coverSrc} alt={game.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-bg-surface flex items-center justify-center">
                                            <Gamepad2 className="w-12 h-12 text-text-muted/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    <div className={`absolute bottom-0 left-0 right-0 p-3 transition-all duration-200
                                        ${isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                                        <p className="text-sm font-bold text-white leading-tight line-clamp-2">{game.title}</p>
                                        {isFocused && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-accent font-semibold">
                                                <Play className="w-3 h-3 fill-current" /> Press Enter to open
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
