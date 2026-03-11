import { useNavigate } from 'react-router-dom';
import { Play, Clock } from 'lucide-react';
import type { Game } from '@/types';
import { formatPlaytime, toMediaSrc } from '@/lib/utils';

interface HeroBannerProps {
    game: Game | null;
}

export function HeroBanner({ game }: HeroBannerProps) {
    const navigate = useNavigate();

    if (!game) {
        return (
            <div className="hero-banner mb-2 glass-panel relative overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-br from-accent/20 via-black/40 to-black/80" />
                <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm px-6">
                    <div className="text-center transform transition-transform duration-500 group-hover:scale-[1.02]">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-accent/18 border border-accent/30 flex items-center justify-center">
                            <Play className="w-7 h-7 text-white fill-white/80" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Welcome to libraryxxx</h2>
                        <p className="text-sm md:text-base text-white/80">Scan your game folders to build your collection</p>
                    </div>
                </div>
            </div>
        );
    }

    const bgImage = toMediaSrc(game.cover_url);

    return (
        <div className="hero-banner mb-2 cursor-pointer group" onClick={() => navigate(`/game/${game.id}`)}>
            {bgImage ? (
                <img
                    src={bgImage}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
            ) : (
                <div className="absolute inset-0 bg-linear-to-br from-accent/30 via-bg-surface to-bg-surface/80" />
            )}

            <div className="absolute inset-0 z-10 flex items-end p-6 md:p-10 lg:pl-16 xl:pl-20 transition-all duration-700 bg-linear-to-t from-[#040812] via-transparent to-transparent">
                <div className="max-w-3xl transition-all duration-500 group-hover:translate-x-3">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-accent font-bold mb-3 drop-shadow-lg">Featured Title</p>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-2xl">{game.title}</h2>
                    {game.description && (
                        <p className="text-sm md:text-base text-white/80 line-clamp-2 mb-6 max-w-2xl leading-relaxed drop-shadow-lg">
                            {game.description}
                        </p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                        {game.exe_path && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.electron.launchGame(game.id);
                                }}
                                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-accent text-white font-bold text-sm border border-white/20 shadow-[0_15px_35px_rgba(59,130,246,0.4)] hover:shadow-[0_20px_45px_rgba(59,130,246,0.6)] hover:scale-[1.05] hover:bg-accent-hover transition-all active:scale-95 group/btn"
                            >
                                <div className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-lg animate-pulse">
                                    <Play className="w-3.5 h-3.5 fill-white" />
                                </div>
                                Play Now
                            </button>
                        )}
                        {game.playtime_minutes > 0 && (
                            <span className="flex items-center gap-1.5 text-sm text-white/80 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
                                <Clock className="w-4 h-4" />
                                {formatPlaytime(game.playtime_minutes)} played
                            </span>
                        )}
                        {game.metacritic_score && (
                            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${game.metacritic_score >= 75
                                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                                : game.metacritic_score >= 50
                                    ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                                    : 'bg-red-500/20 border-red-500/30 text-red-400'
                                }`}>
                                {game.metacritic_score}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

