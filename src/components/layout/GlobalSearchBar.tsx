import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Gamepad2, X, FolderOpen, Sparkles } from 'lucide-react';
import type { Game, Collection, SmartCollection } from '@/types';
import { toMediaSrc } from '@/lib/utils';

interface SearchResult {
    type: 'game' | 'collection' | 'smart';
    id: number | string;
    title: string;
    subtitle?: string;
    icon?: string;
    coverUrl?: string | null;
}

function fuzzyMatch(text: string, query: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (lowerText.includes(lowerQuery)) return true;
    let qi = 0;
    for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
        if (lowerText[ti] === lowerQuery[qi]) qi++;
    }
    return qi === lowerQuery.length;
}

function fuzzyScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (lowerText === lowerQuery) return 100;
    if (lowerText.startsWith(lowerQuery)) return 90;
    if (lowerText.includes(lowerQuery)) return 70;
    let qi = 0;
    let consecutive = 0;
    let maxConsecutive = 0;
    for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
        if (lowerText[ti] === lowerQuery[qi]) {
            qi++;
            consecutive++;
            maxConsecutive = Math.max(maxConsecutive, consecutive);
        } else {
            consecutive = 0;
        }
    }
    return qi === lowerQuery.length ? 30 + maxConsecutive * 5 : 0;
}

export function GlobalSearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const close = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
        inputRef.current?.blur();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault();
                close();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (isOpen) {
                    close();
                } else {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeydown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [isOpen, close]);

    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const [games, collections, smartCollections] = await Promise.all([
                    window.electron.getGames() as Promise<Game[]>,
                    window.electron.getCollections() as Promise<Collection[]>,
                    window.electron.getSmartCollections() as Promise<SmartCollection[]>,
                ]);

                const q = query.trim();
                const scored: (SearchResult & { score: number })[] = [];

                for (const g of games) {
                    const s = fuzzyScore(g.title, q);
                    if (s > 0) {
                        scored.push({
                            type: 'game',
                            id: g.id,
                            title: g.title,
                            subtitle: g.playtime_minutes > 0
                                ? `${Math.floor(g.playtime_minutes / 60)}h ${g.playtime_minutes % 60}m played`
                                : 'Never played',
                            coverUrl: g.cover_url,
                            score: s,
                        });
                    }
                }

                for (const c of collections) {
                    if (fuzzyMatch(c.name, q)) {
                        scored.push({
                            type: 'collection',
                            id: c.id,
                            title: c.name,
                            icon: '📂',
                            score: fuzzyScore(c.name, q),
                        });
                    }
                }

                for (const sc of smartCollections) {
                    if (fuzzyMatch(sc.name, q)) {
                        scored.push({
                            type: 'smart',
                            id: sc.id,
                            title: sc.name,
                            subtitle: `${sc.count} games`,
                            icon: sc.icon,
                            score: fuzzyScore(sc.name, q),
                        });
                    }
                }

                scored.sort((a, b) => b.score - a.score);
                setResults(scored.slice(0, 15));
                setSelectedIndex(0);
            } catch (e) {
                console.error('Search failed', e);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(search, 150);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        if (result.type === 'game') {
            navigate(`/game/${result.id}`);
        } else if (result.type === 'collection') {
            navigate(`/collections/${result.id}`);
        } else if (result.type === 'smart') {
            navigate(`/collections/${result.id}`);
        }
        close();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        }
    };

    const groupedResults = {
        games: results.filter(r => r.type === 'game'),
        collections: results.filter(r => r.type === 'collection' || r.type === 'smart'),
    };

    return (
        <div ref={searchRef} className="relative z-50 no-drag w-72 lg:w-96 transition-all duration-300">
            <div className={`relative ${isOpen ? 'shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-accent/30' : 'hover:ring-1 hover:ring-white/10'} bg-bg-surface/80 backdrop-blur-md rounded-2xl transition-all`}>
                <div className="flex items-center px-4 py-2.5">
                    <Search className={`w-4 h-4 mr-3 transition-colors ${isOpen ? 'text-accent' : 'text-text-muted'}`} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search library... (Ctrl+K)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                    {query && (
                        <button
                            onClick={close}
                            className="p-1 rounded-md hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {!query && (
                        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-text-muted font-mono">
                            Ctrl+K
                        </kbd>
                    )}
                </div>

                {/* Dropdown */}
                {isOpen && query.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[60vh] overflow-y-auto animate-fade-in">
                        {isSearching ? (
                            <div className="p-4 text-center text-sm text-text-muted">Searching...</div>
                        ) : results.length > 0 ? (
                            <div className="py-2">
                                {/* Games */}
                                {groupedResults.games.length > 0 && (
                                    <>
                                        <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                            Games ({groupedResults.games.length})
                                        </div>
                                        {groupedResults.games.map((result, _i) => {
                                            const globalIdx = results.indexOf(result);
                                            return (
                                                <button
                                                    key={`${result.type}-${result.id}`}
                                                    onClick={() => handleSelect(result)}
                                                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 group ${selectedIndex === globalIdx ? 'bg-accent/10' : 'hover:bg-white/5'}`}
                                                >
                                                    {result.coverUrl ? (
                                                        <img
                                                            src={toMediaSrc(result.coverUrl) ?? undefined}
                                                            alt=""
                                                            className="w-8 h-11 object-cover rounded shadow-md border border-white/5"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-11 bg-black/40 rounded flex items-center justify-center border border-white/5">
                                                            <Gamepad2 className="w-4 h-4 text-text-muted/50" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-text-primary truncate">
                                                            {result.title}
                                                        </div>
                                                        <div className="text-xs text-text-muted mt-0.5">{result.subtitle}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </>
                                )}

                                {/* Collections */}
                                {groupedResults.collections.length > 0 && (
                                    <>
                                        {groupedResults.games.length > 0 && (
                                            <div className="mx-3 my-1 border-t border-white/5" />
                                        )}
                                        <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                            Collections ({groupedResults.collections.length})
                                        </div>
                                        {groupedResults.collections.map((result, _i) => {
                                            const globalIdx = results.indexOf(result);
                                            return (
                                                <button
                                                    key={`${result.type}-${result.id}`}
                                                    onClick={() => handleSelect(result)}
                                                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 ${selectedIndex === globalIdx ? 'bg-accent/10' : 'hover:bg-white/5'}`}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base">
                                                        {result.type === 'smart' ? (result.icon || <Sparkles className="w-4 h-4 text-accent" />) : <FolderOpen className="w-4 h-4 text-accent" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-text-primary truncate">{result.title}</div>
                                                        {result.subtitle && <div className="text-xs text-text-muted mt-0.5">{result.subtitle}</div>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-sm text-text-muted wrap-break-word">
                                No results found for "{query}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
