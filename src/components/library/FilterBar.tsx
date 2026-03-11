import { X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface FilterBarProps {
    onSearch: (query: string) => void;
    onSortChange: (sort: string) => void;
    count: number;
}

export function FilterBar({ onSearch, onSortChange, count }: FilterBarProps) {
    const [query, setQuery] = useState('');

    const debounce = useCallback((fn: (v: string) => void, ms: number) => {
        let timer: ReturnType<typeof setTimeout>;
        return (val: string) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(val), ms);
        };
    }, []);

    const debouncedSearch = useCallback(debounce(onSearch, 260), [onSearch]);

    useEffect(() => {
        debouncedSearch(query);
    }, [query, debouncedSearch]);

    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-3 mb-2">
            <div className="relative group w-full lg:w-[360px] xl:w-[420px] 2xl:w-[460px] shrink-0">
                <input
                    type="text"
                    placeholder="Search... or use genre:rpg, year>2018, metacritic>80"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 rounded-xl glass-panel border border-white/12 text-sm font-medium text-white placeholder:text-text-muted focus:outline-none focus:border-accent/45 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)] transition-all"
                />
                {query.length > 0 && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-white hover:bg-white/8 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <select
                        onChange={(e) => onSortChange(e.target.value)}
                        className="pl-3.5 pr-7 py-2.5 rounded-xl glass-panel border border-white/12 text-sm font-semibold text-white/90 cursor-pointer focus:outline-none focus:border-accent/45 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)] min-w-[136px]"
                    >
                        <option value="title" className="bg-bg-primary text-white">A-Z</option>
                        <option value="added" className="bg-bg-primary text-white">Recently Added</option>
                        <option value="played" className="bg-bg-primary text-white">Recently Played</option>
                        <option value="playtime" className="bg-bg-primary text-white">Most Played</option>
                        <option value="score" className="bg-bg-primary text-white">Highest Rated</option>
                        <option value="year" className="bg-bg-primary text-white">Newest First</option>
                    </select>
                </div>

                <span className="text-sm font-semibold text-text-secondary whitespace-nowrap px-1">
                    {count} {count === 1 ? 'game' : 'games'}
                </span>
            </div>

            {/* Advanced filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap lg:ml-auto">
                {(['genre:', 'tag:', 'metacritic>', 'year>', 'playtime>'] as const).map(chip => (
                    <button
                        key={chip}
                        onClick={() => setQuery(q => q.includes(chip) ? q : (q + (q ? ' ' : '') + chip))}
                        className="text-[10px] font-mono px-2 py-1 rounded-lg bg-white/5 text-text-muted hover:bg-accent/15 hover:text-accent border border-white/5 hover:border-accent/30 transition-all"
                    >
                        {chip}
                    </button>
                ))}
            </div>
        </div>
    );
}
