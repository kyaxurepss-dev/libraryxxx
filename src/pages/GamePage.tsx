import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Play, Heart, FolderOpen, Clock, Star, ArrowLeft,
    Tag, Plus, X, ChevronLeft, ChevronRight, Crosshair, Download, RefreshCw, Search, HardDrive, Trash2, Cpu, History, Film
} from 'lucide-react';
import type { Game, Screenshot, DLC, Tag as TagType, Extra, Emulator, PlaySession, Video } from '@/types';
import { formatPlaytime, getScoreBgColor, getScoreColor, toMediaSrc } from '@/lib/utils';

export function GamePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const gameId = Number(id);

    const [game, setGame] = useState<Game | null>(null);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [dlcs, setDlcs] = useState<DLC[]>([]);
    const [gameTags, setGameTags] = useState<TagType[]>([]);
    const [allTags, setAllTags] = useState<TagType[]>([]);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [screenshotIndex, setScreenshotIndex] = useState(0);
    const [showGallery, setShowGallery] = useState(false);
    const [launchOptions, setLaunchOptions] = useState('');

    // Emulators State
    const [emulators, setEmulators] = useState<Emulator[]>([]);

    // Sessions State
    const [sessions, setSessions] = useState<PlaySession[]>([]);

    // IGDB Search State
    const [showIgdbSearch, setShowIgdbSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Disk info state
    const [diskSize, setDiskSize] = useState<{ size: number; formatted: string; path: string | null } | null>(null);

    // Videos / Trailer
    const [videos, setVideos] = useState<Video[]>([]);
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    // Parallax scroll
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        loadGameData();
        const interval = setInterval(checkRunning, 2000);

        const main = document.querySelector('main');
        if (main) {
            const handleScroll = () => setScrollY(main.scrollTop);
            main.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                clearInterval(interval);
                main.removeEventListener('scroll', handleScroll);
            };
        }

        return () => clearInterval(interval);
    }, [gameId]);

    const loadGameData = async () => {
        try {
            const [g, ss, d, gt, at, ex, allEmulators, sessionHistory] = await Promise.all([
                window.electron.getGame(gameId),
                window.electron.getScreenshots(gameId),
                window.electron.getDlcs(gameId),
                window.electron.getGameTags(gameId),
                window.electron.getTags(),
                window.electron.getExtras(gameId),
                window.electron.getEmulators(),
                window.electron.getPlaySessions(gameId),
            ]);
            setGame(g);
            if (g) setLaunchOptions(g.launch_options || '');
            setScreenshots(ss);
            setDlcs(d);
            setGameTags(gt);
            setAllTags(at);
            setExtras(ex);
            setEmulators(allEmulators);
            setSessions(sessionHistory);
        } catch (e) {
            console.error('Failed to load game data:', e);
        } finally {
            setLoading(false);
        }

        // Load videos & disk size in background
        window.electron.getGameVideos(gameId)
            .then((vids: Video[]) => setVideos(vids))
            .catch(() => { });

        window.electron.getGameSize(gameId)
            .then((info: { size: number; formatted: string; path: string | null }) => setDiskSize(info))
            .catch(() => { });
    };

    const checkRunning = async () => {
        const running = await window.electron.isGameRunning(gameId);
        setIsRunning(running);
    };

    const handlePlay = async () => {
        if (!game) return;
        if (!game.exe_path) {
            const exePath = await window.electron.selectExe();
            if (exePath) {
                await window.electron.updateGame(gameId, { exe_path: exePath });
                setGame({ ...game, exe_path: exePath });
            }
            return;
        }
        await window.electron.launchGame(gameId);
        setIsRunning(true);
    };

    const handleToggleFavorite = async () => {
        if (!game) return;
        await window.electron.toggleFavorite(gameId);
        setGame({ ...game, favorite: game.favorite === 1 ? 0 : 1 });
    };

    const handleAddTag = async (tagId: number) => {
        await window.electron.addGameTag(gameId, tagId);
        const tag = allTags.find(t => t.id === tagId);
        if (tag) setGameTags([...gameTags, tag]);
        setShowTagPicker(false);
    };

    const handleRemoveTag = async (tagId: number) => {
        await window.electron.removeGameTag(gameId, tagId);
        setGameTags(gameTags.filter(t => t.id !== tagId));
    };

    const handleIgdbSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await window.electron.searchIGDB(searchQuery);
            setSearchResults(results);
        } catch (e) {
            console.error('IGDB search failed:', e);
            alert('Failed to search IGDB. Please check your credentials in Settings.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectIgdbGame = async (igdbId: number) => {
        setShowIgdbSearch(false);
        setLoading(true);
        try {
            const details = await window.electron.fetchIGDBDetails(igdbId);
            if (details) {
                // Update local game DB with details
                await window.electron.updateGame(gameId, {
                    igdb_id: details.igdbId,
                    title: details.title,
                    description: details.description,
                    cover_url: details.coverUrl,
                    metacritic_score: details.metacriticScore
                });

                // Save genres/themes as tags
                const allFetchedTags = [...details.genres, ...details.themes];
                for (const tagName of allFetchedTags) {
                    let tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
                    if (!tag) {
                        const newTagId = await window.electron.createTag(tagName);
                        tag = { id: newTagId as unknown as number, name: tagName };
                    }
                    await window.electron.addGameTag(gameId, tag.id);
                }

                // If everything succeeded, reload the UI
                loadGameData();
            }
        } catch (e) {
            console.error('Failed to fetch details:', e);
            const message = e instanceof Error ? e.message : String(e);
            alert(`Failed to fetch game details from IGDB: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRom = async () => {
        try {
            const result = await window.electron.selectExe(); // Can reuse this dialog or create a specific one
            if (result) {
                await window.electron.updateGame(gameId, { rom_path: result });
                if (game) setGame({ ...game, rom_path: result });
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="skeleton h-80 w-full mb-6 rounded-2xl" />
                <div className="skeleton h-8 w-48 mb-4" />
                <div className="skeleton h-4 w-full mb-2" />
                <div className="skeleton h-4 w-3/4" />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="p-6 text-center">
                <p className="text-text-secondary">Game not found</p>
            </div>
        );
    }

    const coverSrc = toMediaSrc(game.cover_url);
    const parallaxOffset = scrollY * 0.4;
    const blurAmount = Math.max(0, Math.min(8, scrollY * 0.02));
    const opacityFade = Math.max(0, 1 - scrollY / 400);

    return (<>
        <div className="animate-fade-in relative">
            {/* Dynamic Full Page Background Blur */}
            {coverSrc && (
                <div
                    className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
                    style={{
                        backgroundImage: `url('${coverSrc.replace(/'/g, "\\'")}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.07,
                        filter: 'blur(100px) saturate(2)'
                    }}
                />
            )}

            {/* Hero Section */}
            <div className="relative h-[400px] overflow-hidden -mx-8 -mt-6 md:-mx-10 md:-mt-7 lg:-mx-12 mb-8">
                {coverSrc ? (
                    <img
                        src={coverSrc}
                        alt={game.title}
                        className="absolute inset-0 w-full h-[120%] object-cover transition-transform duration-0 ease-out"
                        style={{
                            transform: `translateY(${parallaxOffset}px) scale(1.1)`,
                            filter: `blur(${4 + blurAmount}px) saturate(1.2)`
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-bg-surface" />
                )}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent"
                    style={{ opacity: 0.8 + (1 - opacityFade) * 0.2 }}
                />

                {/* Back button */}
                <button
                    onClick={() => navigate('/')}
                    style={{ WebkitAppRegion: 'no-drag' } as any}
                    className="absolute top-10 left-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-panel text-sm font-semibold text-white/80 hover:text-white hover:scale-105 transition-all cursor-pointer shadow-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                {/* Game info overlay */}
                <div
                    className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-8 md:px-10 lg:px-12 flex gap-6 items-end"
                    style={{ transform: `translateY(${Math.min(scrollY * 0.2, 50)}px)`, opacity: opacityFade }}
                >
                    {/* Cover thumbnail */}
                    {coverSrc && (
                        <div className="group relative perspective-1000 hidden sm:block">
                            <img
                                src={coverSrc}
                                alt={game.title}
                                className="w-40 md:w-48 aspect-[3/4] rounded-xl object-cover shadow-2xl border border-white/10 group-hover:border-accent/50 transition-all duration-500 will-change-transform"
                                style={{ transformStyle: 'preserve-3d' }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">{game.title}</h1>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 mb-4 flex-wrap">
                            {game.playtime_minutes > 0 && (
                                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                                    <Clock className="w-4 h-4" />
                                    {formatPlaytime(game.playtime_minutes)} played
                                </span>
                            )}
                            {game.metacritic_score && (
                                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getScoreBgColor(game.metacritic_score)} ${getScoreColor(game.metacritic_score)}`}>
                                    ★ {game.metacritic_score}
                                </span>
                            )}
                            {game.release_year && (
                                <span className="text-sm font-bold text-text-primary px-2.5 py-1 rounded-lg border border-border bg-bg-surface">
                                    {game.release_year}
                                </span>
                            )}
                            {game.last_played && (
                                <span className="text-xs text-text-muted">
                                    Last played: {new Date(game.last_played).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePlay}
                                disabled={isRunning}
                                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.3)]
                  ${isRunning
                                        ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default'
                                        : game.exe_path
                                            ? 'bg-gradient-to-r from-accent to-accent-hover text-white hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] border border-white/10'
                                            : 'glass-panel text-text-primary hover:border-accent/50'
                                    }`}
                            >
                                {isRunning ? (
                                    <><Crosshair className="w-4 h-4 animate-pulse" /> Running...</>
                                ) : game.exe_path ? (
                                    <><Play className="w-4 h-4 fill-current" /> Play</>
                                ) : (
                                    <><Download className="w-4 h-4" /> Select Executable</>
                                )}
                            </button>

                            <button
                                onClick={handleToggleFavorite}
                                className={`p-3.5 rounded-xl transition-all duration-300 border ${game.favorite === 1
                                    ? 'bg-red-500/15 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                    : 'glass-panel border-white/5 text-white/70 hover:text-red-400 hover:border-red-400/30'
                                    }`}
                            >
                                <Heart className={`w-5 h-5 ${game.favorite === 1 ? 'fill-current' : ''}`} />
                            </button>

                            {/* Trailer button */}
                            {videos.length > 0 && (
                                <button
                                    onClick={() => setActiveVideoId(videos[0].video_id)}
                                    className="flex items-center gap-2 px-5 py-3.5 rounded-xl glass-panel text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/10"
                                >
                                    <Film className="w-4 h-4 text-red-400" />
                                    Watch Trailer
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setSearchQuery(game.title);
                                    setShowIgdbSearch(true);
                                }}
                                className="p-3.5 rounded-xl glass-panel text-white/70 hover:text-accent hover:border-accent/30 transition-all duration-300"
                                title="Fetch metadata from IGDB"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => game.folder_path && window.electron.openFolder(game.folder_path)}
                                className="p-3.5 rounded-xl glass-panel text-white/70 hover:text-white hover:border-white/20 transition-all duration-300"
                                title="Open game folder"
                            >
                                <FolderOpen className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
                {/* Description */}
                {game.description && (
                    <section>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">About</h2>
                        <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
                            {game.description}
                        </p>
                    </section>
                )}

                {/* Tags */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-lg font-semibold text-text-primary">Tags</h2>
                        <button
                            onClick={() => setShowTagPicker(!showTagPicker)}
                            className="p-1 rounded-lg hover:bg-bg-surface-hover text-text-muted hover:text-accent transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {gameTags.map(tag => (
                            <span
                                key={tag.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel text-white/90 text-xs font-bold border-white/10"
                            >
                                <Tag className="w-3 h-3 text-accent" />
                                {tag.name}
                                <button
                                    onClick={() => handleRemoveTag(tag.id)}
                                    className="ml-0.5 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        {gameTags.length === 0 && !showTagPicker && (
                            <span className="text-xs text-text-muted">No tags yet</span>
                        )}
                    </div>

                    {/* Tag picker dropdown */}
                    {showTagPicker && (
                        <div className="mt-2 p-3 rounded-xl bg-bg-surface border border-border max-w-sm">
                            <div className="flex flex-wrap gap-2">
                                {allTags
                                    .filter(t => !gameTags.find(gt => gt.id === t.id))
                                    .map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleAddTag(tag.id)}
                                            className="px-3 py-1.5 rounded-lg bg-bg-surface-hover text-text-secondary text-xs hover:text-accent hover:bg-accent/10 transition-colors"
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                {allTags.filter(t => !gameTags.find(gt => gt.id === t.id)).length === 0 && (
                                    <span className="text-xs text-text-muted">No available tags. Create tags in Settings.</span>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Screenshots Gallery */}
                {screenshots.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">Screenshots</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {screenshots.map((ss, i) => (
                                <img
                                    key={ss.id}
                                    src={toMediaSrc(ss.image_url) ?? ''}
                                    alt={`Screenshot ${i + 1}`}
                                    className="rounded-xl w-full aspect-video object-cover cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all"
                                    onClick={() => {
                                        setScreenshotIndex(i);
                                        setShowGallery(true);
                                    }}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* DLCs */}
                {dlcs.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-text-primary mb-3">DLCs</h2>
                        <div className="space-y-2">
                            {dlcs.map(dlc => (
                                <div
                                    key={dlc.id}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg-surface border border-border"
                                >
                                    <Star className="w-4 h-4 text-accent" />
                                    <span className="text-sm text-text-primary">{dlc.dlc_name}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Extras */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <h2 className="text-lg font-semibold text-text-primary">Extras</h2>
                        <button
                            onClick={async () => {
                                const filePath = await window.electron.selectExe(); // reuse file picker
                                if (filePath) {
                                    const name = filePath.split('\\').pop() || 'Unknown';
                                    await window.electron.addExtra(gameId, name, filePath, 'other');
                                    loadGameData();
                                }
                            }}
                            className="p-1 rounded-lg hover:bg-bg-surface-hover text-text-muted hover:text-accent transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {extras.length > 0 ? (
                        <div className="space-y-2">
                            {extras.map(extra => (
                                <div
                                    key={extra.id}
                                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-surface border border-border group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-accent/15 text-accent">
                                            {extra.type}
                                        </span>
                                        <span className="text-sm text-text-primary">{extra.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => window.electron.openFile(extra.path)}
                                            className="text-xs text-text-muted hover:text-accent transition-colors"
                                        >
                                            Open
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await window.electron.deleteExtra(extra.id);
                                                loadGameData();
                                            }}
                                            className="text-xs text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-text-muted">No extras added yet</p>
                    )}
                </section>

                {/* Game Info */}
                <section className="border-t border-border pt-6">
                    <h2 className="text-lg font-semibold text-text-primary mb-3">Info</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm max-w-lg">
                        <div>
                            <span className="text-text-muted block text-xs mb-0.5">Folder</span>
                            <span className="text-text-secondary truncate block">{game.folder_path || 'Not set'}</span>
                        </div>
                        <div>
                            <span className="text-text-muted block text-xs mb-0.5">Executable</span>
                            <span className="text-text-secondary truncate block">{game.exe_path || 'Not set'}</span>
                        </div>
                        <div>
                            <span className="text-text-muted block text-xs mb-0.5">Added</span>
                            <span className="text-text-secondary">{new Date(game.added_at).toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="text-text-muted block text-xs mb-0.5">Total Playtime</span>
                            <span className="text-text-secondary">{formatPlaytime(game.playtime_minutes)}</span>
                        </div>
                        {game.game_modes && (
                            <div className="col-span-2">
                                <span className="text-text-muted block text-xs mb-0.5">Game Modes</span>
                                <span className="text-text-secondary">{game.game_modes}</span>
                            </div>
                        )}
                        <div className="col-span-2 mt-2">
                            <span className="text-text-muted block text-xs mb-1.5">Launch Options</span>
                            <input
                                type="text"
                                value={launchOptions}
                                onChange={e => setLaunchOptions(e.target.value)}
                                onBlur={async () => {
                                    if (game.launch_options !== launchOptions) {
                                        await window.electron.updateGame(gameId, { launch_options: launchOptions });
                                        setGame({ ...game, launch_options: launchOptions });
                                    }
                                }}
                                placeholder="-fullscreen -nostartupmovies"
                                className="w-full px-3 py-2 rounded-lg bg-bg-surface-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
                            />
                        </div>

                        {/* Emulator Settings */}
                        <div className="col-span-2 mt-4 p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                            <h3 className="font-semibold text-text-primary flex items-center gap-2 mb-2">
                                <Cpu className="w-4 h-4 text-accent" />
                                Emulator Configuration
                            </h3>
                            <div>
                                <label className="block text-xs text-text-muted mb-1 font-semibold">Assigned Emulator</label>
                                <select
                                    value={game.emulator_id || ''}
                                    onChange={async (e) => {
                                        const id = e.target.value ? Number(e.target.value) : null;
                                        await window.electron.updateGame(gameId, { emulator_id: id });
                                        setGame({ ...game, emulator_id: id });
                                    }}
                                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50 appearance-none"
                                >
                                    <option value="">None (Native PC Game)</option>
                                    {emulators.map(emu => (
                                        <option key={emu.id} value={emu.id}>
                                            {emu.name} {emu.platforms ? `(${emu.platforms})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {game.emulator_id && (
                                <div>
                                    <label className="block text-xs text-text-muted mb-1 font-semibold">ROM File Path</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={game.rom_path || ''}
                                            readOnly
                                            placeholder="Select ROM file..."
                                            className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white/70"
                                        />
                                        <button
                                            onClick={handleSelectRom}
                                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                                        >
                                            Browse
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                                        This file will be passed to the emulator using its configured arguments template.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Storage */}
                {game.folder_path && (
                    <section className="border-t border-border pt-6">
                        <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                            <HardDrive className="w-5 h-5 text-accent" />
                            Storage
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-sm max-w-lg">
                            <div>
                                <span className="text-text-muted block text-xs mb-0.5">Game Size</span>
                                <span className="text-text-primary font-bold text-lg">
                                    {diskSize ? diskSize.formatted : 'Calculating...'}
                                </span>
                            </div>
                            <div>
                                <span className="text-text-muted block text-xs mb-0.5">Install Folder</span>
                                <span className="text-text-secondary truncate block text-xs">{game.folder_path}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => game.folder_path && window.electron.openFolder(game.folder_path)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-text-secondary hover:text-white hover:border-white/20 transition-colors"
                            >
                                <FolderOpen className="w-4 h-4" />
                                Open Folder
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm(`Are you sure you want to delete "${game.title}" and all its files? This cannot be undone.`)) return;
                                    try {
                                        await window.electron.deleteGameFiles(gameId);
                                        navigate('/');
                                    } catch (e: any) {
                                        alert(`Delete failed: ${e.message || e}`);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Game Files
                            </button>
                        </div>
                    </section>
                )}

                {/* Session History */}
                {sessions.length > 0 && (
                    <section className="border-t border-white/10 pt-6">
                        <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                            <History className="w-5 h-5 text-accent" />
                            Session History
                        </h2>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {sessions.map(session => (
                                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-black/40 transition-colors">
                                    <div>
                                        <p className="text-sm text-text-primary font-medium">
                                            {new Date(session.started_at).toLocaleDateString(undefined, {
                                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            {new Date(session.started_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            {session.ended_at && ` - ${new Date(session.ended_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                                        </p>
                                    </div>
                                    <div className="mt-2 sm:mt-0 text-right">
                                        <span className="inline-block px-2.5 py-1 rounded bg-accent/10 border border-accent/20 text-accent font-bold text-xs uppercase tracking-wider">
                                            {formatPlaytime(session.duration_minutes)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Screenshot lightbox */}
            {showGallery && screenshots.length > 0 && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setShowGallery(false)}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setScreenshotIndex(i => (i - 1 + screenshots.length) % screenshots.length);
                        }}
                        className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <img
                        src={toMediaSrc(screenshots[screenshotIndex].image_url) ?? ''}
                        alt={`Screenshot ${screenshotIndex + 1}`}
                        className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setScreenshotIndex(i => (i + 1) % screenshots.length);
                        }}
                        className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    <button
                        onClick={() => setShowGallery(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 text-white text-sm">
                        {screenshotIndex + 1} / {screenshots.length}
                    </div>
                </div>
            )}

            {/* IGDB Search Modal */}
            {showIgdbSearch && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowIgdbSearch(false)}
                >
                    <div
                        className="bg-bg-primary border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border flex items-center justify-between bg-bg-surface">
                            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                <Search className="w-5 h-5 text-accent" />
                                Search IGDB
                            </h2>
                            <button
                                onClick={() => setShowIgdbSearch(false)}
                                className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 border-b border-border bg-black/20">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleIgdbSearch(); }}
                                className="flex gap-3"
                            >
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search for a game..."
                                    className="flex-1 px-5 py-3 rounded-xl bg-bg-surface border border-white/10 text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="px-6 py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Search'}
                                </button>
                            </form>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {searchResults.length === 0 && !isSearching && (
                                <p className="text-center text-text-muted py-8">Search for a game to link metadata.</p>
                            )}

                            {searchResults.map((result) => (
                                <div
                                    key={result.id}
                                    className="flex gap-4 p-4 rounded-xl bg-bg-surface hover:bg-bg-surface-hover border border-transparent hover:border-accent/30 cursor-pointer transition-all group"
                                    onClick={() => handleSelectIgdbGame(result.id)}
                                >
                                    {result.cover ? (
                                        <img
                                            src={`https://images.igdb.com/igdb/image/upload/t_cover_small/${result.cover.image_id}.jpg`}
                                            alt={result.name}
                                            className="w-16 h-24 object-cover rounded-lg shadow-md group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all"
                                        />
                                    ) : (
                                        <div className="w-16 h-24 bg-black/40 rounded-lg flex items-center justify-center border border-white/5">
                                            <Search className="w-6 h-6 text-text-muted/50" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h3 className="font-bold text-text-primary text-lg truncate">{result.name}</h3>
                                            {result.aggregated_rating && (
                                                <span className={`text-xs font-bold px-2 py-1 rounded border ${getScoreBgColor(result.aggregated_rating)} ${getScoreColor(result.aggregated_rating)} whitespace-nowrap`}>
                                                    ★ {Math.round(result.aggregated_rating)}
                                                </span>
                                            )}
                                        </div>
                                        {result.summary && (
                                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                                                {result.summary}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* YouTube Trailer Modal */}
        {
            activeVideoId && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
                    onClick={() => setActiveVideoId(null)}
                >
                    <div
                        className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 mx-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                            onClick={() => setActiveVideoId(null)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <iframe
                            src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                            title="Game Trailer"
                            className="w-full h-full"
                            allow="autoplay; fullscreen; encrypted-media"
                            allowFullScreen
                        />
                    </div>
                </div>
            )
        }
    </>);
}











