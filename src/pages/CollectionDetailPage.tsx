import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import type { Game } from '@/types';
import { GameGrid } from '@/components/library/GameGrid';
import { useControllerActions, useControllerState } from '@/hooks/useController';

export function CollectionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const collectionId = Number(id);

    const [games, setGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [collectionName, setCollectionName] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddGame, setShowAddGame] = useState(false);
    const [focusedGameIndex, setFocusedGameIndex] = useState(-1);
    const [focusedAddIndex, setFocusedAddIndex] = useState(-1);
    const { navScope } = useControllerState();

    useEffect(() => {
        loadData();
    }, [collectionId]);

    const loadData = async () => {
        try {
            const [colGames, collections, all] = await Promise.all([
                window.electron.getCollectionGames(collectionId),
                window.electron.getCollections(),
                window.electron.getGames(),
            ]);
            setGames(colGames);
            setAllGames(all);
            const col = collections.find((c: { id: number }) => c.id === collectionId);
            if (col) setCollectionName(col.name);
        } catch (e) {
            console.error('Failed to load collection:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGame = async (gameId: number) => {
        await window.electron.addGameToCollection(collectionId, gameId);
        loadData();
        setShowAddGame(false);
        setFocusedAddIndex(-1);
    };

    const availableGames = useMemo(() => allGames.filter(g => !games.find(cg => cg.id === g.id)), [allGames, games]);

    const handleControllerAction = useCallback((action: string) => {
        if (loading) return;

        if (showAddGame) {
            if (action === 'ui_cancel') {
                setShowAddGame(false);
                setFocusedAddIndex(-1);
                return;
            }

            if (action === 'ui_up') {
                setFocusedAddIndex(prev => Math.max(0, prev - 1));
                return;
            }

            if (action === 'ui_down') {
                setFocusedAddIndex(prev => Math.min(availableGames.length - 1, Math.max(0, prev + 1)));
                return;
            }

            if (action === 'ui_confirm') {
                const idx = focusedAddIndex < 0 ? 0 : focusedAddIndex;
                const game = availableGames[idx];
                if (game) handleAddGame(game.id);
                return;
            }

            return;
        }

        const COLS = 6;
        if (action === 'ui_up') {
            setFocusedGameIndex(prev => Math.max(0, (prev < 0 ? 0 : prev) - COLS));
            return;
        }
        if (action === 'ui_down') {
            setFocusedGameIndex(prev => Math.min(games.length - 1, (prev < 0 ? 0 : prev) + COLS));
            return;
        }
        if (action === 'ui_left') {
            setFocusedGameIndex(prev => Math.max(0, (prev < 0 ? 0 : prev) - 1));
            return;
        }
        if (action === 'ui_right') {
            setFocusedGameIndex(prev => Math.min(games.length - 1, (prev < 0 ? 0 : prev) + 1));
            return;
        }
        if (action === 'ui_confirm') {
            if (focusedGameIndex >= 0 && games[focusedGameIndex]) {
                navigate(`/game/${games[focusedGameIndex].id}`);
                return;
            }
            setShowAddGame(true);
            return;
        }
        if (action === 'ui_cancel') {
            navigate('/collections');
        }
    }, [loading, showAddGame, availableGames, focusedAddIndex, games, focusedGameIndex, navigate]);

    useControllerActions(({ action }) => {
        handleControllerAction(action);
    }, navScope === 'content');

    return (
        <div className="animate-fade-in space-y-5">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/collections')}
                    className="p-3 rounded-2xl glass-panel text-text-secondary hover:text-text-primary hover:scale-105 transition-all"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">{collectionName}</h1>
                    <p className="text-sm text-text-secondary mt-1">{games.length} games</p>
                </div>
                <button
                    onClick={() => setShowAddGame(!showAddGame)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/15 border border-accent/20 text-white hover:bg-accent/25 text-sm font-semibold transition-all duration-300"
                >
                    <Plus className="w-4 h-4" />
                    Add Game
                </button>
            </div>

            {showAddGame && (
                <div className="p-4 rounded-xl bg-bg-surface border border-border animate-fade-in">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Add a game to this collection</h3>
                    {availableGames.length === 0 ? (
                        <p className="text-xs text-text-muted">All games are already in this collection</p>
                    ) : (
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                            {availableGames.map((game, idx) => (
                                <button
                                    key={game.id}
                                    onClick={() => handleAddGame(game.id)}
                                    className={`px-3 py-1.5 rounded-lg bg-bg-surface-hover text-text-secondary text-xs hover:text-accent hover:bg-accent/10 transition-colors ${focusedAddIndex === idx ? 'ring-2 ring-accent/70 text-accent' : ''}`}
                                >
                                    {game.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <GameGrid
                games={games}
                loading={loading}
                focusedIndex={focusedGameIndex}
                emptyTitle="This collection is empty"
                emptyDescription="Use Add Game to include titles in this collection."
            />
        </div>
    );
}




