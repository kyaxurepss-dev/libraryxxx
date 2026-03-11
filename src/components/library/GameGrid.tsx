import { useState, useEffect, useRef } from 'react';
import { Gamepad2 } from 'lucide-react';
import type { Game } from '@/types';
import { GameCard } from './GameCard';

interface GameGridProps {
    games: Game[];
    loading?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    focusedIndex?: number;
}

export function GameGrid({ games, loading, emptyTitle = 'No games found', emptyDescription = 'Try scanning your library or adjusting your filters.', focusedIndex = -1 }: GameGridProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="skeleton aspect-2/3 rounded-xl" />
                ))}
            </div>
        );
    }

    if (games.length === 0) {
        return (
            <div className="w-full flex-1 min-h-[40vh] rounded-2xl p-12 flex flex-col items-center justify-center text-center mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-bg-surface-hover border border-white/10 flex items-center justify-center mb-4">
                    <Gamepad2 className="w-7 h-7 text-text-muted" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">{emptyTitle}</h3>
                <p className="text-sm text-text-secondary">{emptyDescription}</p>
            </div>
        );
    }

    const [visibleCount, setVisibleCount] = useState(40);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Reset when games array changes (e.g. new search or sort)
        setVisibleCount(40);
    }, [games]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => Math.min(prev + 40, games.length));
                }
            },
            { rootMargin: '600px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [games.length]);

    const visibleGames = games.slice(0, visibleCount);

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
                {visibleGames.map((game, i) => (
                    <div
                        key={game.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${Math.min((i % 40) * 15, 150)}ms` }}
                    >
                        <GameCard game={game} gamepadFocused={focusedIndex === i} />
                    </div>
                ))}
            </div>
            {visibleCount < games.length && (
                <div ref={observerTarget} className="h-10 w-full mt-4 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin opacity-50" />
                </div>
            )}
        </>
    );
}
