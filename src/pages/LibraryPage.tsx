import { useState, useEffect, useMemo, useRef } from 'react';
import type { Game } from '@/types';
import { GameGrid } from '@/components/library/GameGrid';
import { HeroBanner } from '@/components/library/HeroBanner';
import { FilterBar } from '@/components/library/FilterBar';
import { ContinuePlaying } from '@/components/library/ContinuePlaying';
import { EmptyState } from '@/components/ui/primitives';
import { FolderSearch } from 'lucide-react';

const FILTER_PREFIXES = /^(genre:|tag:|metacritic[><=]|year[><=]|playtime[><=])/i;

function isAdvancedQuery(query: string): boolean {
    return query.trim().split(/\s+/).some(t => FILTER_PREFIXES.test(t));
}

export function LibraryPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('title');
    const [advancedResults, setAdvancedResults] = useState<Game[] | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { loadGames(); }, []);

    const loadGames = async () => {
        setLoading(true);
        try {
            const data = await window.electron.getGames();
            setGames(data);
            setError(null);
        } catch (e) {
            console.error('Failed to load games:', e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    // Debounced advanced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!search || !isAdvancedQuery(search)) {
            setAdvancedResults(null);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const results = await window.electron.advancedSearch(search);
                setAdvancedResults(results as Game[]);
            } catch (e) {
                console.error('Advanced search failed:', e);
            }
        }, 400);
    }, [search]);

    const featuredGame = useMemo(() => {
        if (games.length === 0) return null;
        const played = games.filter(g => g.last_played).sort((a, b) =>
            new Date(b.last_played!).getTime() - new Date(a.last_played!).getTime()
        );
        return played.length > 0 ? played[0] : games[Math.floor(Math.random() * games.length)];
    }, [games]);

    const recentlyPlayed = useMemo(() =>
        games
            .filter(g => g.last_played)
            .sort((a, b) => new Date(b.last_played!).getTime() - new Date(a.last_played!).getTime())
            .slice(0, 8),
        [games]
    );

    const filteredGames = useMemo(() => {
        // If advanced search has results, use those
        if (advancedResults !== null) return advancedResults;

        let result = games;

        if (search && !isAdvancedQuery(search)) {
            const q = search.toLowerCase();
            result = result.filter(g => g.title.toLowerCase().includes(q));
        }

        switch (sort) {
            case 'title':
                result = [...result].sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'added':
                result = [...result].sort((a, b) =>
                    new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
                );
                break;
            case 'played':
                result = [...result].sort((a, b) => {
                    if (!a.last_played && !b.last_played) return 0;
                    if (!a.last_played) return 1;
                    if (!b.last_played) return -1;
                    return new Date(b.last_played).getTime() - new Date(a.last_played).getTime();
                });
                break;
            case 'playtime':
                result = [...result].sort((a, b) => b.playtime_minutes - a.playtime_minutes);
                break;
            case 'score':
                result = [...result].sort((a, b) => (b.metacritic_score || 0) - (a.metacritic_score || 0));
                break;
            case 'year':
                result = [...result].sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
                break;
        }

        return result;
    }, [games, search, sort, advancedResults]);

    // Gamepad/keyboard focus is owned by ControllerContentNavigator (spatial),
    // so this page exposes plain focusable cards and no index model.

    return (
        <div className="animate-fade-in flex flex-col gap-7">
            <div className="pt-1">
                <HeroBanner game={featuredGame} loading={loading} />
            </div>

            {/* Continue Playing */}
            {recentlyPlayed.length > 0 && !search && (
                <div className="pl-4 pr-7 md:pl-6 md:pr-10 lg:pl-8 lg:pr-12">
                    <ContinuePlaying games={recentlyPlayed} />
                </div>
            )}

            <div className="pl-4 pr-7 md:pl-6 md:pr-10 lg:pl-8 lg:pr-12">
                <div className="flex items-end justify-between gap-4 mb-3">
                    <div><p className="section-kicker">Your collection</p><h2 className="text-2xl font-bold text-white mt-1">All games</h2></div>
                    <span className="text-xs text-text-muted hidden sm:block">Browse, filter and launch</span>
                </div>
                <div className="glass-panel rounded-xl p-3 md:p-4 border-white/10">
                    <FilterBar
                        onSearch={setSearch}
                        onSortChange={setSort}
                        count={filteredGames.length}
                    />
                </div>
            </div>

            <div>
                <div className="glass-panel rounded-xl p-4 md:p-5 border border-white/10">
                    <GameGrid
                        games={filteredGames}
                        loading={loading}
                        error={error}
                        onRetry={loadGames}
                        empty={
                            <EmptyState
                                icon={<FolderSearch className="h-5 w-5" />}
                                title={search ? 'No games match that filter' : 'No games found'}
                                description={
                                    search
                                        ? 'Try a different query. Tip: use genre:rpg, metacritic>80, year>2018, tag:open-world'
                                        : 'Add a scan folder and run Scan Now to import your games.'
                                }
                            />
                        }
                    />
                </div>
            </div>
        </div>
    );
}


