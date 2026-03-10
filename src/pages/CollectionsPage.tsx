import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Trash2, ChevronRight, Zap } from 'lucide-react';
import type { Collection, SmartCollection } from '@/types';

export function CollectionsPage() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        try {
            const [regularData, smartData] = await Promise.all([
                window.electron.getCollections(),
                window.electron.getSmartCollections()
            ]);
            setCollections(regularData);
            setSmartCollections(smartData);
        } catch (e) {
            console.error('Failed to load collections:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await window.electron.createCollection(newName.trim());
        setNewName('');
        setShowCreate(false);
        loadCollections();
    };

    const handleDelete = async (id: number) => {
        await window.electron.deleteCollection(id);
        loadCollections();
    };

    return (
        <div className="p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                        <FolderOpen className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Collections</h1>
                        <p className="text-sm text-text-secondary mt-1">{collections.length} collections</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/15 border border-accent/20 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:bg-accent/25 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] text-sm font-semibold transition-all duration-300"
                >
                    <Plus className="w-4 h-4" />
                    New Collection
                </button>
            </div>

            {/* Create input */}
            {showCreate && (
                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-bg-surface border border-border animate-fade-in">
                    <input
                        type="text"
                        placeholder="Collection name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        autoFocus
                        className="flex-1 px-4 py-2.5 rounded-xl bg-bg-surface-hover border border-border
              text-sm text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-accent/50"
                    />
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
                    >
                        Create
                    </button>
                    <button
                        onClick={() => { setShowCreate(false); setNewName(''); }}
                        className="px-4 py-2.5 rounded-xl bg-bg-surface-hover text-text-secondary text-sm hover:text-text-primary transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Collection list */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    {/* Smart Collections */}
                    {smartCollections.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 px-2">Smart Collections</h2>
                            <div className="space-y-2">
                                {smartCollections.map(col => (
                                    <div
                                        key={col.id}
                                        onClick={() => navigate(`/collections/${col.id}`)}
                                        className="flex items-center justify-between px-6 py-5 rounded-2xl glass-panel
                                        hover:border-accent/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] cursor-pointer transition-all duration-300 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-lg">
                                                {col.icon || <Zap className="w-4 h-4" />}
                                            </div>
                                            <span className="text-sm font-medium text-text-primary">{col.name}</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Standard Collections */}
                    <div>
                        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 px-2">My Collections</h2>
                        {collections.length === 0 ? (
                            <div className="text-center py-12 glass-panel rounded-2xl border-dashed">
                                <FolderOpen className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-50" />
                                <p className="text-sm text-text-secondary">No custom collections yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {collections.map(col => (
                                    <div
                                        key={col.id}
                                        onClick={() => navigate(`/collections/${col.id}`)}
                                        className="flex items-center justify-between px-6 py-5 rounded-2xl glass-panel
                                        hover:border-accent/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] cursor-pointer transition-all duration-300 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FolderOpen className="w-5 h-5 text-accent" />
                                            <span className="text-sm font-medium text-text-primary">{col.name}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(col.id);
                                                }}
                                                className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
