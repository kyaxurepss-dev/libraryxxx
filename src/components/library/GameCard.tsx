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
            className={`game-card aspect-[2/3] group rounded-xl transition-all duration-200 ${gamepadFocused ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-bg-primary scale-105 z-10' : ''
                }`}
            onClick={() => navigate(`/game/${game.id}`)}
        >
            {!isVisible ? (
                // Skeleton skeleton replacement while out of viewport
                <div className="w-full h-full skeleton opacity-50" />
            ) : (
                <>
                    {coverSrc ? (
                        <>
                            {!imageLoaded && <div className="absolute inset-0 skeleton opacity-50 z-0" />}
                            <img
                                src={coverSrc}
                                alt={game.title}
                                onLoad={() => setImageLoaded(true)}
                                className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-[0.5deg] relative z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                loading="lazy"
                            />
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-bg-surface-hover via-bg-surface to-bg-surface-active flex items-center justify-center">
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

                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/35 to-transparent pl-5 pr-3 py-3.5 transition-opacity duration-300 group-hover:opacity-0">
                        <h3 className="font-bold text-sm text-white line-clamp-2">{game.title}</h3>
                    </div>

                    <div className="card-overlay" />

                    <div className="card-content z-20">
                        <h3 className="font-bold text-lg text-white line-clamp-2 mb-2" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.9)' }}>
                            {game.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs font-semibold text-white/90 mb-3">
                            {game.playtime_minutes > 0 && (
                                <span className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10">
                                    <Clock className="w-3.5 h-3.5 text-accent" />
                                    {formatPlaytime(game.playtime_minutes)}
                                </span>
                            )}
                        </div>

                        {game.exe_path && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.electron.launchGame(game.id);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-accent text-white text-xs font-bold backdrop-blur-md border border-white/20 hover:border-accent transition-all duration-300 group/play"
                            >
                                <Play className="w-3.5 h-3.5 fill-white transition-transform group-hover/play:scale-125" />
                                Play
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

