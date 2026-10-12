import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, X } from 'lucide-react';
import type { Game } from '@/types';
import { GameGrid } from '@/components/library/GameGrid';
import {
    Button,
    EmptyState,
    IconButton,
    SectionHeading,
} from '@/components/ui/primitives';

export function CollectionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const collectionId = Number(id);

    const [games, setGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [collectionName, setCollectionName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddGame, setShowAddGame] = useState(false);

    useEffect(() => {
        loadData();
        // loadData is an intentionally mount-and-id-change operation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionId]);

    const loadData = async () => {
        setLoading(true);
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
            setError(null);
        } catch (e) {
            console.error('Failed to load collection:', e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleAddGame = async (gameId: number) => {
        await window.electron.addGameToCollection(collectionId, gameId);
        loadData();
    };

    const availableGames = useMemo(
        () => allGames.filter(g => !games.find(cg => cg.id === g.id)),
        [allGames, games],
    );

    /* Single cancel contract: ControllerContentNavigator dispatches Escape for
       ui_cancel, so keyboard and gamepad share this one path. Focus movement
       inside the grid and the picker is owned by the spatial navigator. */
    const handleCancel = useCallback(() => {
        if (showAddGame) {
            setShowAddGame(false);
            return;
        }
        navigate('/collections');
    }, [showAddGame, navigate]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCancel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [handleCancel]);

    return (
        <div className="animate-fade-in flex flex-col gap-7">
            <SectionHeading
                kicker="Collection"
                title={collectionName || 'Untitled collection'}
                meta={
                    <span className="tabular flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {games.length} {games.length === 1 ? 'game' : 'games'}
                    </span>
                }
                action={
                    <div className="flex items-center gap-2">
                        <IconButton
                            label="Back to collections"
                            onClick={() => navigate('/collections')}
                        >
                            <X className="h-4 w-4" />
                        </IconButton>
                        <Button
                            variant={showAddGame ? 'secondary' : 'primary'}
                            onClick={() => setShowAddGame(v => !v)}
                        >
                            {showAddGame ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {showAddGame ? 'Cancel' : 'Add game'}
                        </Button>
                    </div>
                }
            />

            {showAddGame && (
                <section
                    aria-label="Add a game to this collection"
                    className="animate-fade-in rounded-sheet border border-accent/25 bg-accent/5 p-4"
                >
                    <h2 className="kicker mb-3">Add a game</h2>
                    {availableGames.length === 0 ? (
                        <p className="text-sm text-paper-dim">
                            Every game in your library is already in this collection.
                        </p>
                    ) : (
                        <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                            {availableGames.map(game => (
                                <button
                                    key={game.id}
                                    type="button"
                                    onClick={() => handleAddGame(game.id)}
                                    className="rounded-control border border-rule bg-plate px-3 py-2 text-xs font-semibold text-paper-dim transition-colors hover:border-accent/40 hover:text-accent"
                                >
                                    {game.title}
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <GameGrid
                games={games}
                loading={loading}
                error={error}
                onRetry={loadData}
                empty={
                    <EmptyState
                        icon={<FolderOpen className="h-5 w-5" />}
                        title="This collection is empty"
                        description="Use Add game to include titles in this collection."
                        action={
                            <Button variant="primary" onClick={() => setShowAddGame(true)}>
                                <Plus className="h-4 w-4" />
                                Add game
                            </Button>
                        }
                    />
                }
            />
        </div>
    );
}