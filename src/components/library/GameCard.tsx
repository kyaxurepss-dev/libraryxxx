import { useState, useEffect, useRef } from 'react';
import { Heart, Clock, Play, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '@/types';
import { formatPlaytime, toMediaSrc } from '@/lib/utils';

interface GameCardProps {
    game: Game;
    gamepadFocused?: boolean;
}

export function GameCard({ game, gamepadFocused = false }: GameCardProps) {
    const navigate = useNavigate();
    const coverSrc = toMediaSrc(game.cover_url);
    const [isVisible, setIsVisible] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Disconnect observer once visible
                    if (cardRef.current) observer.unobserve(cardRef.current);
                }
            },
            { rootMargin: '300px' }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            className={`game-card aspect-2/3 group rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 ${
                gamepadFocused
                    ? 'ring-2 ring-cyan-400/90 ring-offset-0 scale-[1.04] shadow-[0_0_42px_rgba(34,211,238,0.6)] z-20'
                    : ''
            }`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/game/${game.id}`);
                }
            }}
            onClick={() => navigate(`/game/${game.id}`)}
        >
            {!isVisible ? (
                <div className="w-full h-full skeleton opacity-70 rounded-2xl" />
            ) : (
                <>
                    {coverSrc ? (
                        <>
                            {!imageLoaded && <div className="absolute inset-0 skeleton opacity-70 z-0 rounded-2xl" />}
                            <img
                                src={coverSrc}
                                alt={game.title}
                                onLoad={() => setImageLoaded(true)}
                                className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-[0.5deg] relative z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                loading="lazy"
                            />
                        </>
                    ) : (
                        <div className="w-full h-full bg-linear-to-br from-bg-surface-hover via-bg-surface to-bg-surface-active flex items-center justify-center">
                            <span className="text-5xl font-black text-white/10">{game.title.charAt(0).toUpperCase()}</span>
                        </div>
                    )}

                    {game.favorite === 1 && (
                        <div className="absolute top-2 right-2 z-20 rounded-full bg-black/40 backdrop-blur-sm p-1.5 border border-white/15">
                            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                        </div>
                    )}

                    {game.metacritic_score && (
                        <div className="absolute top-2 left-2 z-20 rounded-full bg-black/40 backdrop-blur-sm px-2 py-1 border border-white/15 flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                            <span className="text-[11px] font-bold text-white">{game.metacritic_score}</span>
                        </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/80 via-black/35 to-transparent transition-opacity duration-300 group-hover:opacity-0" style={{ paddingLeft: '40px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '20px' }}>
                        <h3 className="font-bold text-sm text-white line-clamp-2">{game.title}</h3>
                    </div>

                    <div className="card-overlay" />

                    <div className="card-content z-20">
                        <div className="rounded-2xl bg-black/55 backdrop-blur-xl border border-white/12 px-3.5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
                            <h3
                                className="font-semibold text-sm md:text-[15px] text-white line-clamp-2 mb-2 tracking-tight"
                                style={{ textShadow: '0 4px 12px rgba(0,0,0,0.9)' }}
                            >
                                {game.title}
                            </h3>

                            <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-white/90 mb-1.5">
                                {game.playtime_minutes > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/12">
                                        <Clock className="w-3.5 h-3.5 text-accent" />
                                        {formatPlaytime(game.playtime_minutes)}
                                    </span>
                                )}
                                {game.release_year && (
                                    <span className="ml-auto text-[10px] text-white/60 uppercase tracking-[0.16em]">
                                        {game.release_year}
                                    </span>
                                )}
                            </div>

                            {game.exe_path && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.electron.launchGame(game.id);
                                    }}
                                    className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent/80 hover:bg-accent-hover text-white text-[11px] font-bold border border-white/15 hover:border-accent transition-all duration-300 group/play shadow-[0_12px_32px_rgba(59,130,246,0.45)]"
                                >
                                    <Play className="w-3.5 h-3.5 fill-white transition-transform group-hover/play:scale-125" />
                                    Play
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
