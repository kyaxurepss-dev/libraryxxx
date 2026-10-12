import { useNavigate } from 'react-router-dom';
import { Clock, Play, Search, Sparkles } from 'lucide-react';
import type { Game } from '@/types';
import { cn, formatPlaytime, toMediaSrc } from '@/lib/utils';
import { Button, ScoreBadge } from '@/components/ui/primitives';

interface HeroBannerProps {
  game: Game | null;
  loading?: boolean;
  isRunning?: boolean;
}

export function HeroBanner({ game, loading, isRunning = false }: HeroBannerProps) {
  const navigate = useNavigate();

  if (loading) {
    return <div className="skeleton h-[320px] w-full" />;
  }

  if (!game) {
    return (
      <section className="overflow-hidden rounded-sheet border border-rule bg-plate">
        <div className="flex flex-col items-start gap-4 px-8 py-14 md:px-12 md:py-20">
          <p className="kicker">Your archive</p>
          <h2 className="max-w-xl font-display text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-tight tracking-tight text-paper">
            Nothing here yet. Point me at your game folders.
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-paper-dim">
            Add a library folder in Settings, run a scan, and enrich titles with IGDB metadata.
            Covers and details appear as soon as they are found.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/settings')}>
            <Search className="h-4 w-4" />
            Set up your first library
          </Button>
        </div>
      </section>
    );
  }

  const artSrc = toMediaSrc(game.hero_url) ?? toMediaSrc(game.cover_url);
  const logoSrc = toMediaSrc(game.logo_url);
  const launchable = Boolean(game.exe_path || game.rom_path);

  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-sheet border border-rule bg-plate',
        'transition-colors duration-150 hover:border-rule-strong',
      )}
    >
      {artSrc && (
        <img
          src={artSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-[1.03]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />

      <div className="relative flex min-h-[300px] flex-col justify-end gap-5 px-8 py-10 md:min-h-[340px] md:px-12 md:py-12">
        <div className="flex items-center gap-3">
          <p className="kicker flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Featured
          </p>
          {game.metacritic_score != null && <ScoreBadge score={game.metacritic_score} />}
          {isRunning && (
            <span className="flex items-center gap-1.5 rounded-control border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Running
            </span>
          )}
        </div>

        {logoSrc ? (
          <img src={logoSrc} alt={game.title} className="h-16 w-auto max-w-md object-contain" />
        ) : (
          <h2 className="max-w-2xl font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-none tracking-tight text-paper">
            {game.title}
          </h2>
        )}

        {game.description && (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-paper-dim">
            {game.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            data-primary-action
            disabled={isRunning || !launchable}
            title={launchable ? undefined : 'No executable assigned yet'}
            onClick={() => {
              if (launchable && !isRunning) void window.electron.launchGame(game.id);
              else navigate(`/game/${game.id}`);
            }}
          >
            <Play className="h-4 w-4 fill-current" />
            {isRunning ? 'Running' : launchable ? 'Play' : 'Set up launch'}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate(`/game/${game.id}`)}>
            Details
          </Button>
          {game.playtime_minutes > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-paper-dim">
              <Clock className="h-4 w-4" />
              <span className="tabular">{formatPlaytime(game.playtime_minutes)}</span>
              played
            </span>
          )}
        </div>
      </div>
    </section>
  );
}