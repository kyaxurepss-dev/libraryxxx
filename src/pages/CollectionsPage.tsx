import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FolderOpen, Plus, Sparkles, Trash2, Zap } from 'lucide-react';
import type { Collection, SmartCollection } from '@/types';
import {
    Button,
    ConfirmDialog,
    EmptyState,
    IconButton,
    SectionHeading,
} from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function CollectionsPage() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        setLoading(true);
        try {
            const [regularData, smartData] = await Promise.all([
                window.electron.getCollections(),
                window.electron.getSmartCollections(),
            ]);
            setCollections(regularData);
            setSmartCollections(smartData);
            setError(null);
        } catch (e) {
            console.error('Failed to load collections:', e);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        await window.electron.createCollection(name);
        setNewName('');
        setShowCreate(false);
        loadCollections();
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        await window.electron.deleteCollection(pendingDelete.id);
        setPendingDelete(null);
        loadCollections();
    };

    /* Single cancel contract: ControllerContentNavigator dispatches Escape for
       ui_cancel, so keyboard and gamepad share this one path. Rows are real
       buttons, so the spatial navigator reaches them without an index model. */
    const handleCancel = useCallback(() => {
        if (pendingDelete) return;
        if (showCreate) {
            setShowCreate(false);
            setNewName('');
            return;
        }
        navigate('/');
    }, [pendingDelete, showCreate, navigate]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCancel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [handleCancel]);

    const rowClass = cn(
        'group flex w-full items-center gap-3 rounded-plate border border-rule bg-plate px-5 py-4',
        'text-left transition-colors duration-150 hover:border-rule-strong hover:bg-plate-hover',
        'focus-visible:border-accent/60',
    );

    return (
        <div className="animate-fade-in flex flex-col gap-7">
            <SectionHeading
                kicker="Organize"
                title="Collections"
                meta={
                    <span className="tabular flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
                    </span>
                }
                action={
                    <Button
                        variant={showCreate ? 'secondary' : 'primary'}
                        onClick={() => setShowCreate((v) => !v)}
                    >
                        {showCreate ? <Trash2 className="h-4 w-4 rotate-45" /> : <Plus className="h-4 w-4" />}
                        {showCreate ? 'Cancel' : 'New collection'}
                    </Button>
                }
            />

            {showCreate && (
                <form
                    className="animate-fade-in flex items-center gap-2 rounded-sheet border border-accent/25 bg-accent/5 p-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleCreate();
                    }}
                >
                    <label className="sr-only" htmlFor="new-collection-name">
                        Collection name
                    </label>
                    <input
                        id="new-collection-name"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Collection name…"
                        autoFocus
                        className="h-10 flex-1 rounded-control border border-rule bg-plate px-3 text-sm text-paper placeholder:text-muted focus:border-accent/60"
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={!newName.trim()}>
                        Create
                    </Button>
                    <IconButton
                        label="Cancel creating a collection"
                        className="h-9 w-9"
                        onClick={() => {
                            setShowCreate(false);
                            setNewName('');
                        }}
                    >
                        <Plus className="h-4 w-4 rotate-45" />
                    </IconButton>
                </form>
            )}

            {loading ? (
                <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading collections">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton h-16 w-full" />
                    ))}
                </div>
            ) : error ? (
                <div className="rounded-sheet border border-danger/25 bg-danger/5 p-6">
                    <p className="font-display font-bold text-paper">Could not load collections</p>
                    <p className="mt-1 text-sm text-paper-dim">{error}</p>
                    <Button variant="secondary" size="sm" className="mt-4" onClick={loadCollections}>
                        Try again
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {smartCollections.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="kicker">Smart collections</h2>
                            <div className="flex flex-col gap-2">
                                {smartCollections.map((col) => (
                                    <button
                                        key={col.id}
                                        type="button"
                                        onClick={() => navigate(`/collections/${col.id}`)}
                                        className={rowClass}
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent/12 text-accent">
                                            {col.icon ? (
                                                <span className="text-base leading-none">{col.icon}</span>
                                            ) : (
                                                <Zap className="h-4 w-4" />
                                            )}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-display text-sm font-semibold text-paper">
                                                {col.name}
                                            </span>
                                            <span className="tabular block text-xs text-muted">
                                                {col.count} {col.count === 1 ? 'game' : 'games'}
                                            </span>
                                        </span>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="flex flex-col gap-3">
                        <h2 className="kicker">Your collections</h2>
                        {collections.length === 0 ? (
                            <EmptyState
                                icon={<FolderOpen className="h-5 w-5" />}
                                title="No collections yet"
                                description="Group games by series, mood, or whatever makes sense to you."
                                action={
                                    <Button variant="primary" onClick={() => setShowCreate(true)}>
                                        <Plus className="h-4 w-4" />
                                        New collection
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="flex flex-col gap-2">
                                {collections.map((col) => (
                                    <div key={col.id} className={rowClass}>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/collections/${col.id}`)}
                                            aria-label={`Open ${col.name}`}
                                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-plate-raised text-paper-dim">
                                                <FolderOpen className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-paper">
                                                {col.name}
                                            </span>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
                                        </button>
                                        <IconButton
                                            label={`Delete ${col.name}`}
                                            className="h-9 w-9 shrink-0"
                                            onClick={() => setPendingDelete(col)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </IconButton>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {smartCollections.length === 0 && collections.length === 0 && !showCreate && (
                        <p className="flex items-center gap-2 text-xs text-muted">
                            <Sparkles className="h-3.5 w-3.5" />
                            Smart collections appear once you have enough games to filter.
                        </p>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title={`Delete “${pendingDelete?.name ?? ''}”?`}
                description="The games stay in your library — only this collection goes away."
                confirmLabel="Delete collection"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}