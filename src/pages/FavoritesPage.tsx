import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Game } from '@/types';
import { GameGrid } from '@/components/library/GameGrid';
import { useControllerActions, useControllerState } from '@/hooks/useController';

export function FavoritesPage() {
    const navigate = useNavigate();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const { navScope } = useControllerState();

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const data = await window.electron.getFavorites();
            setGames(data);
        } catch (e) {
            console.error('Failed to load favorites:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleControllerAction = useCallback((action: string) => {
        const COLS = 6;
        setFocusedIndex(prev => {
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

            return prev;
        });
    }, [games, navigate]);

    useControllerActions(({ action }) => {
        handleControllerAction(action);
    }, navScope === 'content');

    return (
        <div className="animate-fade-in space-y-5">
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.14)]">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500/20" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Favorites</h1>
                    <p className="text-sm text-text-secondary mt-1">{games.length} {games.length === 1 ? 'game' : 'games'}</p>
                </div>
            </div>

            <GameGrid
                games={games}
                loading={loading}
                focusedIndex={focusedIndex}
                emptyTitle="No favorites yet"
                emptyDescription="Mark games with the heart icon to keep them here."
            />
        </div>
    );
}





