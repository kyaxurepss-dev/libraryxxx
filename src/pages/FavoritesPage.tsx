import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import type { Game } from '@/types';
import { GameGrid } from '@/components/library/GameGrid';

export function FavoritesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

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
                emptyTitle="No favorites yet"
                emptyDescription="Mark games with the heart icon to keep them here."
            />
        </div>
    );
}
