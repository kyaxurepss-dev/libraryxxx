import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import type { Game } from '@/types';
import { GameGrid } from '@/components/library/GameGrid';
import { EmptyState, SectionHeading } from '@/components/ui/primitives';

export function FavoritesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        setLoading(true);
        try {
            const data = await window.electron.getFavorites();
            setGames(data);
            setError(null);
        } catch (e) {
            console.error('Failed to load favorites:', e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
            <div className="animate-fade-in flex flex-col gap-7">
                <SectionHeading
                    kicker="Curated"
                    title="Favorites"
                    meta={
                        <span className="tabular flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5 text-danger" />
                            {games.length} {games.length === 1 ? 'game' : 'games'}
                        </span>
                    }
                />

                <GameGrid
                    games={games}
                    loading={loading}
                    error={error}
                    onRetry={loadFavorites}
                    empty={
                        <EmptyState
                            icon={<Heart className="h-5 w-5" />}
                            title="No favorites yet"
                            description="Mark games with the heart icon to keep them here."
                        />
                    }
                />
            </div>
        );
}





