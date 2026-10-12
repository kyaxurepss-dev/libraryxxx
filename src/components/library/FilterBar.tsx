import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  onSearch: (query: string) => void;
  onSortChange: (sort: string) => void;
  count: number;
}

const SORTS = [
  { value: 'title', label: 'A–Z' },
  { value: 'added', label: 'Recently added' },
  { value: 'played', label: 'Recently played' },
  { value: 'playtime', label: 'Most played' },
  { value: 'score', label: 'Highest rated' },
  { value: 'year', label: 'Newest first' },
];

const CHIPS = ['genre:', 'tag:', 'metacritic>', 'year>', 'playtime>'] as const;

export function FilterBar({ onSearch, onSortChange, count }: FilterBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative w-full lg:max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter this view…  (genre:rpg · metacritic>80)"
          aria-label="Filter games in this view"
          className="h-11 w-full rounded-control border border-rule bg-plate pl-10 pr-10 text-sm text-paper placeholder:text-muted focus:border-accent/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear filter"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-control text-muted hover:bg-plate-hover hover:text-paper"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setQuery((q) => (q.includes(chip) ? q : q + (q ? ' ' : '') + chip))}
            className={cn(
              'rounded-control border border-rule bg-plate px-2.5 py-1.5 font-mono text-[11px] text-muted',
              'transition-colors hover:border-accent/40 hover:text-accent',
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 lg:ml-auto">
        <span className="tabular text-xs font-semibold text-muted">
          {count} {count === 1 ? 'game' : 'games'}
        </span>
        <label className="sr-only" htmlFor="library-sort">
          Sort games
        </label>
        <select
          id="library-sort"
          onChange={(e) => onSortChange(e.target.value)}
          className="h-11 cursor-pointer rounded-control border border-rule bg-plate px-3 pr-8 text-sm font-semibold text-paper focus:border-accent/60"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value} className="bg-plate text-paper">
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}