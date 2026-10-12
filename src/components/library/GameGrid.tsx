import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Game } from '@/types';
import { GameCard } from './GameCard';
import { ErrorState, Spinner } from '@/components/ui/primitives';

const CHUNK = 60;

interface GameGridProps {
  games: Game[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: ReactNode;
  runningIds?: Set<number>;
}

/* Focus management is owned by ControllerContentNavigator (spatial DOM focus),
   so this grid exposes plain focusable cards and no index-based gamepad model. */
export function GameGrid({
  games,
  loading,
  error,
  onRetry,
  empty,
  runningIds,
}: GameGridProps) {
  const [visibleCount, setVisibleCount] = useState(CHUNK);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset the window when filtering/sorting replaces the dataset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(CHUNK);
  }, [games]);

  useEffect(() => {
    if (loading || error || games.length <= visibleCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + CHUNK, games.length));
        }
      },
      { rootMargin: '800px' },
    );
    const node = sentinelRef.current;
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [games.length, loading, error, visibleCount]);

  if (loading) {
    return (
      <div className="game-grid" aria-busy="true" aria-label="Loading games">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="skeleton aspect-2/3 w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load your library"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  if (games.length === 0) {
    return <>{empty}</>;
  }

  const visibleGames = games.slice(0, visibleCount);

  return (
    <>
      <div className="game-grid">
        {visibleGames.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isRunning={runningIds?.has(game.id) ?? false}
          />
        ))}
      </div>
      {visibleCount < games.length && (
        <div ref={sentinelRef} className="flex h-14 items-center justify-center">
          <Spinner className="h-5 w-5 opacity-60" />
        </div>
      )}
    </>
  );
}