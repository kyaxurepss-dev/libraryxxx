import { useNavigate } from 'react-router-dom';
import { Play, Clock, Gamepad2 } from 'lucide-react';
import type { Game } from '@/types';
import { formatPlaytime, toMediaSrc } from '@/lib/utils';

interface ContinuePlayingProps {
    games: Game[];
}

export function ContinuePlaying({ games }: ContinuePlayingProps) {
    const navigate = useNavigate();

    if (games.length === 0) return null;

    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Continue Playing
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {games.map(game => {
                    const coverSrc = toMediaSrc(game.cover_url);
                    return (
                        <button
                            key={game.id}
                            onClick={() => navigate(`/game/${game.id}`)}
                            className="group relative flex-shrink-0 w-[140px] rounded-xl overflow-hidden border border-white/5 hover:border-accent/40 transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_25px_rgba(59,130,246,0.25)]"
                        >
                            {coverSrc ? (
                                <img src={coverSrc} alt={game.title} className="w-full aspect-[3/4] object-cover" />
                            ) : (
                                <div className="w-full aspect-[3/4] bg-bg-surface flex items-center justify-center">
                                    <Gamepad2 className="w-10 h-10 text-text-muted/30" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                            {/* Play button on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="w-10 h-10 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
                                    <Play className="w-4 h-4 fill-white text-white" />
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-2.5">
                                <p className="text-xs font-bold text-white leading-tight line-clamp-2">{game.title}</p>
                                <p className="text-[10px] text-white/60 mt-0.5">{formatPlaytime(game.playtime_minutes)}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
