import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FolderOpen, Gamepad2, Search, Sparkles } from 'lucide-react';
import type { Collection, Game, SmartCollection } from '@/types';
import { cn, toMediaSrc } from '@/lib/utils';
import { useControllerActions } from '@/hooks/useController';

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

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const debounce = setTimeout(async () => {
      try {
        const [games, collections, smartCollections] = await Promise.all([
          window.electron.getGames() as Promise<Game[]>,
          window.electron.getCollections() as Promise<Collection[]>,
          window.electron.getSmartCollections() as Promise<SmartCollection[]>,
        ]);
        if (cancelled) return;

        const q = query.trim();
        const scored: (SearchResult & { score: number })[] = [];

        for (const g of games) {
          const s = fuzzyScore(g.title, q);
          if (s > 0) {
            scored.push({
              type: 'game',
              id: g.id,
              title: g.title,
              subtitle:
                g.playtime_minutes > 0
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
        if (!cancelled) setIsSearching(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [query, open]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'game') {
      navigate(`/game/${result.id}`);
    } else {
      navigate(`/collections/${result.id}`);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  useControllerActions(({ action }) => {
    if (!open) return;
    if (action === 'ui_down') {
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (action === 'ui_up') {
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (action === 'ui_confirm' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (action === 'ui_cancel') {
      onClose();
    }
  }, open);

  if (!open) return null;

  const gameResults = results.filter((r) => r.type === 'game');
  const collectionResults = results.filter((r) => r.type !== 'game');

  const rowClass = (idx: number) =>
    cn(
      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
      selectedIndex === idx ? 'bg-accent/10' : 'hover:bg-plate-hover',
    );

  return (
    <div
      data-modal="true"
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/60 px-4 pt-[10vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search library"
        className="animate-sheet w-full max-w-2xl overflow-hidden rounded-sheet border border-rule bg-plate-raised shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-rule px-5">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search games and collections…"
            aria-label="Search games and collections"
            className="h-14 flex-1 bg-transparent text-base text-paper placeholder:text-muted"
          />
          <kbd className="hidden items-center gap-1 rounded-control border border-rule bg-plate px-2 py-1 text-[10px] font-semibold text-muted md:inline-flex">
            Esc
          </kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-2">
          {isSearching ? (
            <p className="px-5 py-8 text-center text-sm text-muted">Searching…</p>
          ) : !query.trim() ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              Type to search. Advanced: genre:rpg · metacritic&gt;80 · year&gt;2018 · tag:open-world
            </p>
          ) : results.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              No matches for “{query.trim()}”.
            </p>
          ) : (
            <>
              {gameResults.length > 0 && (
                <p className="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                  Games
                </p>
              )}
              {gameResults.map((result) => {
                const globalIdx = results.indexOf(result);
                return (
                  <button
                    key={`game-${result.id}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={rowClass(globalIdx)}
                  >
                    {result.coverUrl ? (
                      <img
                        src={toMediaSrc(result.coverUrl) ?? undefined}
                        alt=""
                        className="h-11 w-8 shrink-0 rounded-control object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-8 shrink-0 items-center justify-center rounded-control bg-plate">
                        <Gamepad2 className="h-4 w-4 text-muted" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-paper">
                        {result.title}
                      </span>
                      {result.subtitle && (
                        <span className="block truncate text-xs text-muted">{result.subtitle}</span>
                      )}
                    </span>
                    {selectedIndex === globalIdx && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />
                    )}
                  </button>
                );
              })}

              {collectionResults.length > 0 && (
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                  Collections
                </p>
              )}
              {collectionResults.map((result) => {
                const globalIdx = results.indexOf(result);
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={rowClass(globalIdx)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-plate text-accent">
                      {result.type === 'smart'
                        ? result.icon || <Sparkles className="h-4 w-4" />
                        : <FolderOpen className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-paper">
                        {result.title}
                      </span>
                      {result.subtitle && (
                        <span className="block truncate text-xs text-muted">{result.subtitle}</span>
                      )}
                    </span>
                    {selectedIndex === globalIdx && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}