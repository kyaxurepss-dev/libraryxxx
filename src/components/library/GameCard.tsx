import { useState, useEffect, useRef } from 'react';
import { Heart, Play, Clock, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '@/types';
import { cn, formatPlaytime, toMediaSrc } from '@/lib/utils';
import { ScoreBadge } from '@/components/ui/primitives';

interface GameCardProps {
  game: Game;
  isRunning?: boolean;
}

export function GameCard({ game, isRunning = false }: GameCardProps) {
  const navigate = useNavigate();
  const coverSrc = toMediaSrc(game.cover_url);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const launchable = Boolean(game.exe_path || game.rom_path);

  return (
    <div ref={cardRef} className="group relative flex flex-col">
      {/* Poster — the only click target for navigation */}
      <button
        type="button"
        onClick={() => navigate(`/game/${game.id}`)}
        aria-label={`Open ${game.title}`}
        className={cn(
          'relative block aspect-2/3 w-full overflow-hidden rounded-plate border border-rule bg-plate',
          'shadow-plate transition-all duration-150',
          'hover:-translate-y-1 hover:border-rule-strong hover:shadow-lift',
          'focus-visible:-translate-y-1 focus-visible:border-accent focus-visible:shadow-lift',
        )}
      >
        {isVisible &&
          (coverSrc ? (
            <>
              {!imageLoaded && <span className="skeleton absolute inset-0" />}
              <img
                src={coverSrc}
                alt=""
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
                className={cn(
                  'h-full w-full object-cover transition-opacity duration-200',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                )}
              />
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-plate-raised">
              <span className="font-display text-5xl font-bold text-muted/40">
                {game.title.charAt(0).toUpperCase()}
              </span>
            </span>
          ))}

        {game.favorite === 1 && (
          <span
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-control bg-black/55 text-danger backdrop-blur-sm"
            aria-label="Favorite"
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
          </span>
        )}

        {game.metacritic_score != null && (
          <span className="absolute left-2 top-2">
            <ScoreBadge score={game.metacritic_score} className="bg-black/55 backdrop-blur-sm" />
          </span>
        )}

        {/* Running state — visible without hover, so gamepad users see it */}
        {isRunning && (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-control bg-success/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
            Running
          </span>
        )}
      </button>

      {/* Meta row — always visible, never hidden behind hover */}
      <div className="mt-2.5 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="line-clamp-2 font-display text-sm font-semibold leading-snug tracking-tight text-paper"
            title={game.title}
          >
            {game.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            {game.playtime_minutes > 0 ? (
              <>
                <Clock className="h-3 w-3" />
                <span className="tabular">{formatPlaytime(game.playtime_minutes)}</span>
              </>
            ) : game.release_year ? (
              <span className="tabular">{game.release_year}</span>
            ) : (
              <span>Not played</span>
            )}
          </p>
        </div>

        {/* Launch — 44px target, present in the layout (not hover-revealed) */}
        {launchable ? (
          <button
            type="button"
            disabled={isRunning}
            onClick={(e) => {
              e.stopPropagation();
              void window.electron.launchGame(game.id);
            }}
            aria-label={`Launch ${game.title}`}
            title={`Launch ${game.title}`}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors duration-150',
              isRunning
                ? 'cursor-default border border-success/30 bg-success/10 text-success'
                : 'bg-accent text-accent-ink hover:bg-accent-hover active:translate-y-px',
            )}
          >
            <Play className={cn('h-4 w-4', !isRunning && 'fill-current')} />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/game/${game.id}`);
            }}
            aria-label={`${game.title} has no executable — open details to set one`}
            title="No executable set — open details"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-rule bg-plate text-muted transition-colors hover:border-rule-strong hover:text-paper-dim"
          >
            <Ban className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}