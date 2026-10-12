import { useNavigate } from 'react-router-dom';
import { Clock, Play } from 'lucide-react';
import type { Game } from '@/types';
import { formatPlaytime, toMediaSrc } from '@/lib/utils';

interface ContinuePlayingProps {
  games: Game[];
}

export function ContinuePlaying({ games }: ContinuePlayingProps) {
  const navigate = useNavigate();

  if (games.length === 0) return null;

  return (
    <section aria-label="Continue playing" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="kicker">Continue playing</h2>
        <span className="text-xs text-muted">Jump back in</span>
      </div>

      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2">
        {games.map((game) => {
          const artSrc = toMediaSrc(game.hero_url) ?? toMediaSrc(game.cover_url);
          const launchable = Boolean(game.exe_path || game.rom_path);
          return (
            <div
              key={game.id}
              className="group relative w-[240px] shrink-0 overflow-hidden rounded-plate border border-rule bg-plate transition-colors hover:border-rule-strong"
            >
              <button
                type="button"
                onClick={() => navigate(`/game/${game.id}`)}
                aria-label={`Open ${game.title}`}
                className="block aspect-16/9 w-full"
              >
                {artSrc ? (
                  <img
                    src={artSrc}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-plate-raised font-display text-3xl font-bold text-muted/40">
                    {game.title.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              </button>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-paper">
                    {game.title}
                  </p>
                  <p className="tabular mt-0.5 flex items-center gap-1 text-xs text-paper-dim">
                    <Clock className="h-3 w-3" />
                    {formatPlaytime(game.playtime_minutes)}
                  </p>
                </div>
                {launchable && (
                  <button
                    type="button"
                    onClick={() => void window.electron.launchGame(game.id)}
                    aria-label={`Launch ${game.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent text-accent-ink transition-colors hover:bg-accent-hover"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}