import { useState, useEffect } from 'react';
import {
    FolderPlus, Trash2, Key, Tag, Plus, X, RefreshCw, Pencil, Check, Download, Upload, Gamepad2, Settings2, Palette, ArrowDownToLine, RefreshCcw, Blocks, Power
} from 'lucide-react';
import type { ScanFolder, Tag as TagType, Emulator, PluginData } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { themes } from '@/lib/themes';
import type { ThemeId } from '@/lib/themes';

const LIBRARY_COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1',
];
const LIBRARY_ICONS = ['📁', '🎮', '🕹️', '🎲', '⚔️', '🏆', '🌍', '🚀', '💎', '🔥', '🎯', '👾'];

export function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [scanFolders, setScanFolders] = useState<ScanFolder[]>([]);
    const [tags, setTags] = useState<TagType[]>([]);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [igdbStatus, setIgdbStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');
    const [newTagName, setNewTagName] = useState('');
    const [showNewTag, setShowNewTag] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
    const [showColorPicker, setShowColorPicker] = useState<number | null>(null);

    const [emulators, setEmulators] = useState<Emulator[]>([]);
    const [editingEmulatorId, setEditingEmulatorId] = useState<number | null>(null);
    const [editEmulatorForm, setEditEmulatorForm] = useState<Partial<Emulator>>({});
    const [showNewEmulator, setShowNewEmulator] = useState(false);

    // Updater State
    const [updateStatus, setUpdateStatus] = useState<string>('');
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    // Plugins State
    const [plugins, setPlugins] = useState<PluginData[]>([]);
    const [appVersion, setAppVersion] = useState<string>('');

    useEffect(() => {
        loadSettings();
        
        // Fetch app version
        if (window.electron.getAppVersion) {
             window.electron.getAppVersion().then(setAppVersion).catch(console.error);
        }

        // Listen to updater messages
        window.electron.onUpdateMessage((msg: { text: string; data?: any }) => {
            setUpdateStatus(msg.text);
            if (msg.text === 'Update available.') setIsUpdateAvailable(true);
            if (msg.text === 'Update downloaded.') {
                setIsUpdateDownloaded(true);
                setIsUpdateAvailable(false);
            }
        });

        return () => window.electron.removeUpdateMessageListener();
    }, []);

    const loadSettings = async () => {
        try {
            const [folders, allTags, settings, allEmulators, loadedPlugins] = await Promise.all([
                window.electron.getScanFolders(),
                window.electron.getTags(),
                window.electron.getSettings(),
                window.electron.getEmulators(),
                window.electron.getPlugins ? window.electron.getPlugins() : Promise.resolve([])
            ]);
            setScanFolders(folders);
            setTags(allTags);
            setEmulators(allEmulators);
            setPlugins(loadedPlugins);
            if (settings.igdb_client_id) setClientId(settings.igdb_client_id);
            if (settings.igdb_client_secret) setClientSecret(settings.igdb_client_secret);
            if (settings.igdb_client_id && settings.igdb_client_secret) {
                setIgdbStatus('connected');
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    };

    const handleAddFolder = async () => {
        try {
            const selectedPath = await window.electron.addScanFolder();
            if (selectedPath) {
                loadSettings();
            } else {
                alert('No folder selected or dialog cancelled.');
            }
        } catch (error) {
            console.error(error);
            alert(`Error adding folder: ${error}`);
        }
    };

    const handleRemoveFolder = async (id: number) => {
        await window.electron.removeScanFolder(id);
        loadSettings();
    };

    const handleUpdateFolder = async (id: number, data: { name?: string; icon?: string; color?: string }) => {
        await window.electron.updateScanFolder(id, data);
        setEditingFolderId(null);
        setShowIconPicker(null);
        setShowColorPicker(null);
        loadSettings();
    };

    const startEditing = (folder: ScanFolder) => {
        setEditingFolderId(folder.id);
        setEditName(folder.name || '');
    };

    const handleScan = async () => {
        if (isScanning || scanFolders.length === 0) return;
        setIsScanning(true);
        try {
            const result = await window.electron.scan();
            const enrichedText = result.enriched ? ` | Enriched with IGDB: ${result.enriched}` : '';
            alert(`Scan complete. Added ${result.added} new games. Total library games: ${result.total}${enrichedText}`);
        } catch (e: any) {
            console.error('Scan failed:', e);
            alert(`Scan failed: ${e.message || String(e)}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveIGDB = async () => {
        if (!clientId.trim() || !clientSecret.trim()) return;
        setIgdbStatus('loading');
        try {
            await window.electron.setSetting('igdb_client_id', clientId.trim());
            await window.electron.setSetting('igdb_client_secret', clientSecret.trim());
            const success = await window.electron.authenticateIGDB(clientId.trim(), clientSecret.trim());
            setIgdbStatus(success ? 'connected' : 'error');
        } catch {
            setIgdbStatus('error');
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        await window.electron.createTag(newTagName.trim());
        setNewTagName('');
        setShowNewTag(false);
        loadSettings();
    };

    const handleDeleteTag = async (id: number) => {
        await window.electron.deleteTag(id);
        loadSettings();
    };

    // Emulator Handlers
    const handleSaveEmulator = async (id: number | null) => {
        if (!editEmulatorForm.name || !editEmulatorForm.exe_path) {
            alert('Name and Executable Path are required.');
            return;
        }

        try {
            if (id === null) {
                // Create
                await window.electron.addEmulator({
                    name: editEmulatorForm.name,
                    exe_path: editEmulatorForm.exe_path,
                    args_template: editEmulatorForm.args_template || '"{rom_path}"',
                    platforms: editEmulatorForm.platforms || null
                });
                setShowNewEmulator(false);
            } else {
                // Update
                await window.electron.updateEmulator(id, editEmulatorForm);
                setEditingEmulatorId(null);
            }
            setEditEmulatorForm({});
            loadSettings();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to save emulator: ${e.message || e}`);
        }
    };

    const handleDeleteEmulator = async (id: number) => {
        if (!confirm('Are you sure you want to delete this emulator? Games using it will lose their emulator association.')) return;
        await window.electron.deleteEmulator(id);
        loadSettings();
    };

    const handleSelectEmulatorExe = async () => {
        try {
            const exePath = await window.electron.selectExe();
            if (exePath) {
                setEditEmulatorForm(prev => ({ ...prev, exe_path: exePath }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-10 pt-2 animate-fade-in space-y-5">
            {/* ── Game Libraries ── */}
            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-extrabold text-text-primary">Game Libraries</h2>
                        <p className="text-sm text-text-secondary mt-1">Manage your game library folders</p>
                    </div>
                    <div className="flex gap-2.5">
                        <button
                            onClick={handleScan}
                            disabled={isScanning || scanFolders.length === 0}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${isScanning || scanFolders.length === 0
                                ? 'bg-bg-surface-active text-text-muted cursor-not-allowed border-white/10'
                                : 'bg-green-500/12 text-green-300 hover:bg-green-500/22 border-green-500/35'
                                }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                            {isScanning ? 'Scanning...' : 'Scan Now'}
                        </button>
                        <button
                            onClick={handleAddFolder}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/15 border border-accent/35 text-accent text-sm font-bold hover:bg-accent/25 transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Add Library
                        </button>
                    </div>
                </div>

                {scanFolders.length === 0 ? (
                    <div className="p-9 rounded-xl bg-black/20 border border-white/10 border-dashed text-center">
                        <FolderPlus className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-50" />
                        <p className="text-base font-semibold text-text-secondary">No game libraries configured</p>
                        <p className="text-sm text-text-muted mt-1">Add a folder to start scanning for games</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scanFolders.map(folder => (
                            <div
                                key={folder.id}
                                className="relative rounded-xl bg-black/20 border border-white/10 group hover:border-white/20 transition-all"
                            >
                                <div className="flex items-center gap-3 px-4 py-3">
                                    {/* Icon */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowIconPicker(showIconPicker === folder.id ? null : folder.id)}
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-white/5 transition-colors"
                                            style={{ backgroundColor: `${folder.color}15`, border: `1px solid ${folder.color}35` }}
                                            title="Change icon"
                                        >
                                            {folder.icon || '📁'}
                                        </button>
                                        {showIconPicker === folder.id && (
                                            <div className="absolute top-12 left-0 z-50 p-2 rounded-xl bg-bg-surface border border-white/15 shadow-2xl grid grid-cols-6 gap-1 min-w-[180px] animate-fade-in">
                                                {LIBRARY_ICONS.map(icon => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => handleUpdateFolder(folder.id, { icon })}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-white/10 transition-colors ${folder.icon === icon ? 'bg-accent/20 ring-1 ring-accent/50' : ''}`}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Path */}
                                    <div className="flex-1 min-w-0">
                                        {editingFolderId === folder.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleUpdateFolder(folder.id, { name: editName })}
                                                    autoFocus
                                                    className="flex-1 px-2.5 py-1 rounded-lg bg-black/30 border border-white/15 text-sm font-semibold text-text-primary focus:outline-none focus:border-accent/50"
                                                    placeholder="Library name..."
                                                />
                                                <button
                                                    onClick={() => handleUpdateFolder(folder.id, { name: editName })}
                                                    className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingFolderId(null)}
                                                    className="p-1.5 rounded-lg text-text-muted hover:bg-white/5"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-text-primary truncate">
                                                        {folder.name || 'Unnamed Library'}
                                                    </span>
                                                    <button
                                                        onClick={() => startEditing(folder)}
                                                        className="p-1 rounded text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Rename"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-text-muted truncate mt-0.5">{folder.path}</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Color Picker */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowColorPicker(showColorPicker === folder.id ? null : folder.id)}
                                            className="w-6 h-6 rounded-full border-2 border-white/20 hover:border-white/40 transition-colors cursor-pointer"
                                            style={{ backgroundColor: folder.color || '#3b82f6' }}
                                            title="Change color"
                                        />
                                        {showColorPicker === folder.id && (
                                            <div className="absolute top-8 right-0 z-50 p-2 rounded-xl bg-bg-surface border border-white/15 shadow-2xl flex gap-1.5 animate-fade-in">
                                                {LIBRARY_COLORS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => handleUpdateFolder(folder.id, { color })}
                                                        className={`w-6 h-6 rounded-full border-2 transition-all ${folder.color === color ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleRemoveFolder(folder.id)}
                                        className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Color accent bar */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                                    style={{ backgroundColor: folder.color || '#3b82f6' }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="mb-5 pb-5 border-b border-white/10">
                    <h2 className="text-2xl font-extrabold text-text-primary">IGDB API Credentials</h2>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed max-w-2xl">
                        Required for automatic game metadata. Get credentials from{' '}
                        <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover font-semibold underline underline-offset-4 decoration-accent/35">
                            Twitch Developer Console
                        </a>
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-text-muted block mb-1.5 uppercase tracking-[0.2em]">Client ID</label>
                        <div className="relative group/input">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/input:text-accent" />
                            <input
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Your Twitch Client ID"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-text-muted block mb-1.5 uppercase tracking-[0.2em]">Client Secret</label>
                        <div className="relative group/input">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within/input:text-accent" />
                            <input
                                type="password"
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Your Twitch Client Secret"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 gap-3">
                        <button
                            onClick={handleSaveIGDB}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors"
                        >
                            {igdbStatus === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                            Save & Connect
                        </button>

                        <span className={`text-sm font-bold ${igdbStatus === 'connected' ? 'text-green-400' :
                            igdbStatus === 'error' ? 'text-red-400' :
                                igdbStatus === 'loading' ? 'text-yellow-400' :
                                    'text-text-muted'
                            }`}>
                            {igdbStatus === 'connected' && 'Connected Successfully'}
                            {igdbStatus === 'error' && 'Authentication Failed'}
                            {igdbStatus === 'loading' && 'Connecting...'}
                            {igdbStatus === 'idle' && 'Not Configured'}
                        </span>
                    </div>
                </div>
            </section>

            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-5 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-extrabold text-text-primary">Tags</h2>
                        <p className="text-sm text-text-secondary mt-1">Manage custom labels for your library</p>
                    </div>
                    <button
                        onClick={() => setShowNewTag(!showNewTag)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/12 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/20"
                    >
                        {showNewTag ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showNewTag ? 'Cancel' : 'New Tag'}
                    </button>
                </div>

                {showNewTag && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 animate-fade-in p-3 bg-black/20 border border-white/10 rounded-xl">
                        <input
                            type="text"
                            placeholder="Type new tag name..."
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                            autoFocus
                            className="flex-1 px-4 py-2.5 rounded-lg bg-black/30 border border-white/10 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
                        />
                        <button onClick={handleCreateTag} className="px-4 py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors">
                            Create Tag
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2.5">
                    {tags.map(tag => (
                        <span
                            key={tag.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-sm font-semibold text-text-primary group hover:border-accent/35 transition-colors"
                        >
                            <Tag className="w-3.5 h-3.5 text-accent" />
                            {tag.name}
                            <button
                                onClick={() => handleDeleteTag(tag.id)}
                                className="ml-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                    {tags.length === 0 && !showNewTag && (
                        <div className="w-full p-6 rounded-xl bg-black/20 border border-white/10 border-dashed text-center">
                            <Tag className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                            <p className="text-base font-medium text-text-muted">No tags created yet</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Emulators ── */}
            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-extrabold text-text-primary">Emulators</h2>
                        <p className="text-sm text-text-secondary mt-1">Configure external emulators for your ROMs</p>
                    </div>
                    <button
                        onClick={() => {
                            if (showNewEmulator) {
                                setShowNewEmulator(false);
                                setEditEmulatorForm({});
                            } else {
                                setShowNewEmulator(true);
                                setEditingEmulatorId(null);
                                setEditEmulatorForm({ args_template: '"{rom_path}"' });
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/12 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/20"
                    >
                        {showNewEmulator ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showNewEmulator ? 'Cancel' : 'Add Emulator'}
                    </button>
                </div>

                <div className="grid gap-4">
                    {/* New Emulator Form */}
                    {showNewEmulator && (
                        <div className="p-5 rounded-xl border border-accent/50 bg-accent/5 animate-fade-in relative shadow-lg shadow-accent/5">
                            <h3 className="font-bold text-accent mb-4 text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" /> New Emulator Configuration
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs text-text-muted mb-1 font-semibold">Emulator Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PCSX2"
                                        value={editEmulatorForm.name || ''}
                                        onChange={e => setEditEmulatorForm({ ...editEmulatorForm, name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
                                        autoFocus
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-xs text-text-muted mb-1 font-semibold">Platforms (Comma separated)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PS2, PS1"
                                        value={editEmulatorForm.platforms || ''}
                                        onChange={e => setEditEmulatorForm({ ...editEmulatorForm, platforms: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs text-text-muted mb-1 font-semibold flex items-center justify-between">
                                        <span>Executable Path *</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="C:\Path\To\Emulator.exe"
                                            value={editEmulatorForm.exe_path || ''}
                                            onChange={e => setEditEmulatorForm({ ...editEmulatorForm, exe_path: e.target.value })}
                                            className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50 font-mono"
                                        />
                                        <button
                                            onClick={handleSelectEmulatorExe}
                                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                                        >
                                            Browse
                                        </button>
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs text-text-muted mb-1 font-semibold">
                                        Launch Arguments Template (use <code className="text-accent bg-accent/10 px-1 rounded">{'{rom_path}'}</code> as placeholder)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder='-fullscreen "{rom_path}"'
                                        value={editEmulatorForm.args_template ?? '"{rom_path}"'}
                                        onChange={e => setEditEmulatorForm({ ...editEmulatorForm, args_template: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-accent/50"
                                    />
                                    <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                                        This template defines how the emulator is called. The `{'{rom_path}'}` token will be replaced by the game's actual ROM file path when launching. Be sure to wrap it in quotes if paths contain spaces.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end mt-5 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => handleSaveEmulator(null)}
                                    className="px-5 py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent-hover transition-colors flex items-center gap-2 shadow-lg shadow-accent/20"
                                >
                                    <Check className="w-4 h-4" /> Save Emulator
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Emulators List */}
                    {emulators.length === 0 && !showNewEmulator ? (
                        <div className="py-8 text-center bg-black/20 rounded-xl border border-white/5 border-dashed">
                            <Gamepad2 className="w-10 h-10 mx-auto text-text-muted opacity-50 mb-3" />
                            <h3 className="text-white font-semibold mb-1">No emulators configured</h3>
                            <p className="text-sm text-text-muted">Add an emulator to launch ROMs directly from your library</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {emulators.map(emulator => {
                                const isEditing = editingEmulatorId === emulator.id;

                                if (isEditing) {
                                    // Edit mode for existing emulator
                                    return (
                                        <div key={emulator.id} className="p-5 rounded-xl border border-white/20 bg-white/5 relative">
                                            <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                                                <Settings2 className="w-4 h-4 text-text-muted" /> Edit {emulator.name}
                                            </h3>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-xs text-text-muted mb-1 font-semibold">Name</label>
                                                    <input
                                                        type="text"
                                                        value={editEmulatorForm.name || ''}
                                                        onChange={e => setEditEmulatorForm({ ...editEmulatorForm, name: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30"
                                                    />
                                                </div>
                                                <div className="sm:col-span-1">
                                                    <label className="block text-xs text-text-muted mb-1 font-semibold">Platforms</label>
                                                    <input
                                                        type="text"
                                                        value={editEmulatorForm.platforms || ''}
                                                        onChange={e => setEditEmulatorForm({ ...editEmulatorForm, platforms: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs text-text-muted mb-1 font-semibold">Executable Path</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={editEmulatorForm.exe_path || ''}
                                                            onChange={e => setEditEmulatorForm({ ...editEmulatorForm, exe_path: e.target.value })}
                                                            className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                                                        />
                                                        <button
                                                            onClick={handleSelectEmulatorExe}
                                                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                                                        >
                                                            Browse
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs text-text-muted mb-1 font-semibold">Launch Arguments</label>
                                                    <input
                                                        type="text"
                                                        value={editEmulatorForm.args_template || ''}
                                                        onChange={e => setEditEmulatorForm({ ...editEmulatorForm, args_template: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white focus:outline-none focus:border-white/30"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-white/5">
                                                <button
                                                    onClick={() => setEditingEmulatorId(null)}
                                                    className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleSaveEmulator(emulator.id)}
                                                    className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors flex items-center gap-2"
                                                >
                                                    <Check className="w-4 h-4" /> Save
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                // View mode
                                return (
                                    <div key={emulator.id} className="group relative flex flex-col p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                    <Gamepad2 className="w-5 h-5 text-accent" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="font-bold text-white text-base">{emulator.name}</h3>
                                                        {emulator.platforms && (
                                                            <div className="flex gap-1.5">
                                                                {emulator.platforms.split(',').map(p => p.trim()).filter(Boolean).map(plat => (
                                                                    <span key={plat} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-text-secondary tracking-wider">
                                                                        {plat}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-muted font-mono truncate max-w-xl">{emulator.exe_path}</p>
                                                    <p className="text-xs text-text-muted/60 font-mono mt-0.5"><span className="text-text-muted/40">args:</span> {emulator.args_template}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingEmulatorId(emulator.id);
                                                        setEditEmulatorForm(emulator);
                                                        setShowNewEmulator(false);
                                                    }}
                                                    className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                                                    title="Edit Emulator"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEmulator(emulator.id)}
                                                    className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Delete Emulator"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Visual Themes ── */}
            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="mb-5 pb-5 border-b border-white/10">
                    <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-3">
                        <Palette className="w-6 h-6 text-accent" />
                        Visual Themes
                    </h2>
                    <p className="text-sm text-text-secondary mt-1 max-w-2xl">
                        Customize the look and feel of your library. Themes change colors, accents, and overall aesthetic.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(Object.entries(themes) as [ThemeId, typeof themes[ThemeId]][]).map(([id, config]) => (
                        <button
                            key={id}
                            onClick={() => setTheme(id)}
                            className={`relative text-left p-5 rounded-xl border-2 transition-all ${theme === id ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-accent/50' : 'border-white/5 bg-black/20 hover:border-white/20 hover:bg-black/30'}`}
                        >
                            {theme === id && (
                                <div className="absolute top-3 right-3 text-accent animate-in zoom-in duration-200">
                                    <Check className="w-5 h-5 drop-shadow-md" />
                                </div>
                            )}
                            <div className="flex gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: config.colors.primary }} />
                                <div className="w-6 h-6 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: config.colors.accent }} />
                            </div>
                            <h3 className="text-base font-bold text-white mb-1">{config.name}</h3>
                            <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{config.description}</p>
                        </button>
                    ))}
                </div>
            </section>

            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="mb-5 pb-5 border-b border-white/10">
                    <h2 className="text-2xl font-extrabold text-text-primary">Backup & Restore</h2>
                    <p className="text-sm text-text-secondary mt-1">Export or import your entire library data</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={async () => {
                            try {
                                const path = await window.electron.exportBackup();
                                if (path) alert(`Backup saved to:\n${path}`);
                            } catch (e: any) {
                                alert(`Export failed: ${e.message || e}`);
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent/12 border border-accent/30 text-accent font-bold text-sm hover:bg-accent/20 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Library
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const result = await window.electron.importBackup();
                                if (result) {
                                    alert(`Import complete. ${result.imported} new games added.`);
                                    loadSettings();
                                }
                            } catch (e: any) {
                                alert(`Import failed: ${e.message || e}`);
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/12 border border-green-500/30 text-green-400 font-bold text-sm hover:bg-green-500/20 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Import Backup
                    </button>
                </div>
                <p className="text-xs text-text-muted mt-3">
                    Backups include: games, playtime, tags, favorites, collections, and settings.
                </p>
            </section>

            {/* ── Updates ── */}
            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
                            Updates
                            {appVersion && (
                                <span className="text-sm font-semibold text-accent/80 bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20">
                                    v{appVersion}
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">Automatic background updates are enabled</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isUpdateDownloaded && (
                            <button
                                onClick={() => window.electron.installUpdate()}
                                className="text-xs font-semibold text-white bg-accent px-3 py-1.5 rounded-lg border border-accent/20 hover:brightness-110 active:scale-95 transition-all"
                            >
                                Restart & Install
                            </button>
                        )}
                        <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                            {updateStatus || 'Up-to-date'}
                        </span>
                    </div>
                </div>
            </section>

            {/* ── Plugins ── */}
            <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
                <div className="mb-5 pb-5 border-b border-white/10">
                    <h2 className="text-2xl font-extrabold text-text-primary flex items-center gap-3">
                        <Blocks className="w-6 h-6 text-accent" />
                        Plugins
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">Enhance your library with community plugins</p>
                </div>
                {plugins.length === 0 ? (
                    <div className="py-8 text-center bg-black/20 rounded-xl border border-white/5 border-dashed">
                        <Blocks className="w-10 h-10 mx-auto text-text-muted opacity-50 mb-3" />
                        <h3 className="text-white font-semibold mb-1">No plugins installed</h3>
                        <p className="text-sm text-text-muted">Place plugin folders in your userData/plugins directory.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plugins.map(plugin => (
                            <div key={plugin.id} className="p-5 rounded-xl border border-white/10 bg-black/20 flex flex-col justify-between group hover:bg-black/30 transition-colors">
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-base font-bold text-white tracking-tight">{plugin.name}</h3>
                                        <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-text-muted">v{plugin.version}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary leading-relaxed mb-3 line-clamp-2">
                                        {plugin.description}
                                    </p>
                                    {plugin.author && (
                                        <p className="text-[10px] text-text-muted mb-4 uppercase tracking-wider">By {plugin.author}</p>
                                    )}
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                    <span className={`text-xs font-bold ${plugin.enabled ? 'text-green-400' : 'text-text-muted'}`}>
                                        {plugin.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <button
                                        onClick={async () => {
                                            const newPlugins = await window.electron.togglePlugin(plugin.id);
                                            setPlugins(newPlugins);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${plugin.enabled
                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                            }`}
                                    >
                                        <Power className="w-3.5 h-3.5" />
                                        {plugin.enabled ? 'Disable' : 'Enable'}
                                    </button>
                                </div>
                                {plugin.error && (
                                    <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
                                        {plugin.error}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="pt-2 text-center">
                <h2 className="text-lg font-bold text-text-primary">libraryxxx</h2>
                <p className="text-xs text-text-muted mt-1">Version 1.0.0</p>
            </section>
        </div >
    );
}

