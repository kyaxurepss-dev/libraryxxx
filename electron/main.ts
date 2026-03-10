import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb } from './database.js';
import { scanFolders } from './scanner.js';
import { startWatcher, stopWatcher } from './watcher.js';
import { launchGame, getRunningGame } from './launcher.js';
import { searchIGDB, fetchGameDetails, authenticateIGDB } from './igdb.js';
import { exportLibrary, importLibrary } from './backup.js';
import { getFolderSize, formatBytes, deleteGameFolder } from './diskinfo.js';
import { getEmulators, addEmulator, updateEmulator, deleteEmulator } from './emulators.js';
import { initUpdater } from './updater.js';
import { initPlugins } from './plugins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        frame: false,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0a0a0f',
            symbolColor: '#f1f5f9',
            height: 36,
        },
        backgroundColor: '#0a0a0f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: true,
        },
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    mainWindow.on('closed', () => { mainWindow = null; });
}

async function authenticateIGDBFromSettings(): Promise<boolean> {
    const rows = getDb().prepare(
        "SELECT key, value FROM settings WHERE key IN ('igdb_client_id', 'igdb_client_secret')"
    ).all() as { key: string; value: string }[];

    const map = new Map(rows.map(r => [r.key, r.value]));
    const storedClientId = map.get('igdb_client_id')?.trim();
    const storedClientSecret = map.get('igdb_client_secret')?.trim();

    if (!storedClientId || !storedClientSecret) return false;
    return authenticateIGDB(storedClientId, storedClientSecret);
}

// ─── Smart collections definitions ──────────────────────────────────────────

interface SmartCollection {
    id: string;
    name: string;
    icon: string;
    filter: (db: ReturnType<typeof getDb>) => unknown[];
}

const SMART_COLLECTIONS: SmartCollection[] = [
    {
        id: 'sc_rpg',
        name: 'RPG',
        icon: '⚔️',
        filter: db => db.prepare(`
      SELECT DISTINCT g.* FROM games g
      JOIN game_tags gt ON gt.game_id = g.id
      JOIN tags t ON t.id = gt.tag_id
      WHERE LOWER(t.name) LIKE '%rpg%' OR LOWER(t.name) LIKE '%role-playing%'
      ORDER BY g.title ASC
    `).all(),
    },
    {
        id: 'sc_top_rated',
        name: 'Metacritic > 85',
        icon: '⭐',
        filter: db => db.prepare(`
      SELECT * FROM games WHERE metacritic_score >= 85 ORDER BY metacritic_score DESC
    `).all(),
    },
    {
        id: 'sc_played_this_year',
        name: 'Played This Year',
        icon: '📅',
        filter: db => db.prepare(`
      SELECT * FROM games
      WHERE last_played IS NOT NULL
        AND strftime('%Y', last_played) = strftime('%Y', 'now')
      ORDER BY last_played DESC
    `).all(),
    },
    {
        id: 'sc_unplayed',
        name: 'Not Played',
        icon: '🎮',
        filter: db => db.prepare(`
      SELECT * FROM games
      WHERE last_played IS NULL OR playtime_minutes = 0
      ORDER BY title ASC
    `).all(),
    },
    {
        id: 'sc_favorites',
        name: 'Favorites',
        icon: '❤️',
        filter: db => db.prepare(`
      SELECT * FROM games WHERE favorite = 1 ORDER BY title ASC
    `).all(),
    },
    {
        id: 'sc_recent',
        name: 'Recently Added',
        icon: '🆕',
        filter: db => db.prepare(`
      SELECT * FROM games ORDER BY added_at DESC LIMIT 20
    `).all(),
    },
    {
        id: 'sc_open_world',
        name: 'Open World',
        icon: '🌍',
        filter: db => db.prepare(`
      SELECT DISTINCT g.* FROM games g
      JOIN game_tags gt ON gt.game_id = g.id
      JOIN tags t ON t.id = gt.tag_id
      WHERE LOWER(t.name) LIKE '%open world%' OR LOWER(t.name) LIKE '%open-world%'
      ORDER BY g.title ASC
    `).all(),
    },
    {
        id: 'sc_most_played',
        name: 'Most Played',
        icon: '🏆',
        filter: db => db.prepare(`
      SELECT * FROM games WHERE playtime_minutes > 0 ORDER BY playtime_minutes DESC LIMIT 20
    `).all(),
    },
];

// ─── Advanced search parser ──────────────────────────────────────────────────

function advancedSearch(query: string): unknown[] {
    const db = getDb();
    const tokens = query.trim().split(/\s+/);
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let freeText = '';

    for (const token of tokens) {
        if (/^genre:(.+)$/i.test(token)) {
            const val = token.replace(/^genre:/i, '');
            conditions.push(`g.id IN (SELECT gt.game_id FROM game_tags gt JOIN tags t ON t.id=gt.tag_id WHERE LOWER(t.name) LIKE ?)`);
            params.push(`%${val.toLowerCase()}%`);
        } else if (/^tag:(.+)$/i.test(token)) {
            const val = token.replace(/^tag:/i, '');
            conditions.push(`g.id IN (SELECT gt.game_id FROM game_tags gt JOIN tags t ON t.id=gt.tag_id WHERE LOWER(t.name) LIKE ?)`);
            params.push(`%${val.toLowerCase()}%`);
        } else if (/^metacritic([><=])(\d+)$/i.test(token)) {
            const m = token.match(/^metacritic([><=])(\d+)$/i)!;
            conditions.push(`g.metacritic_score ${m[1]} ?`);
            params.push(Number(m[2]));
        } else if (/^year([><=])(\d{4})$/i.test(token)) {
            const m = token.match(/^year([><=])(\d{4})$/i)!;
            conditions.push(`g.release_year ${m[1]} ?`);
            params.push(Number(m[2]));
        } else if (/^playtime([><=])(\d+)$/i.test(token)) {
            const m = token.match(/^playtime([><=])(\d+)$/i)!;
            const minutes = Number(m[2]) * 60; // user provides hours
            conditions.push(`g.playtime_minutes ${m[1]} ?`);
            params.push(minutes);
        } else if (token) {
            freeText += (freeText ? ' ' : '') + token;
        }
    }

    if (freeText) {
        conditions.push(`(LOWER(g.title) LIKE ?)`);
        params.push(`%${freeText.toLowerCase()}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT DISTINCT g.* FROM games g ${where} ORDER BY g.title ASC`;

    return db.prepare(sql).all(...params) as any;
}

// ─── app lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
    const db = initDatabase();

    initPlugins(db);

    createWindow();

    if (mainWindow) {
        initUpdater(mainWindow);
    }

    registerIpcHandlers();

    try {
        const igdbReady = await authenticateIGDBFromSettings();
        await scanFolders(db, { enrichWithIgdb: igdbReady });
        startWatcher(db, igdbReady);
    } catch (e) {
        console.error('Auto-scan/watcher failed on startup:', e);
    }
});

app.on('window-all-closed', () => {
    stopWatcher();
    app.quit();
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers() {
    // ── Games ──
    ipcMain.handle('db:getGames', () =>
        getDb().prepare('SELECT * FROM games ORDER BY title ASC').all()
    );

    ipcMain.handle('db:getGame', (_e, id: number) =>
        getDb().prepare('SELECT * FROM games WHERE id = ?').get(id)
    );

    ipcMain.handle('db:updateGame', (_e, id: number, data: Record<string, unknown>) => {
        const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
        return getDb().prepare(`UPDATE games SET ${fields} WHERE id = @id`).run({ ...data, id });
    });

    ipcMain.handle('db:deleteGame', (_e, id: number) =>
        getDb().prepare('DELETE FROM games WHERE id = ?').run(id)
    );

    ipcMain.handle('db:toggleFavorite', (_e, id: number) =>
        getDb().prepare('UPDATE games SET favorite = NOT favorite WHERE id = ?').run(id)
    );

    ipcMain.handle('db:getFavorites', () =>
        getDb().prepare('SELECT * FROM games WHERE favorite = 1 ORDER BY title ASC').all()
    );

    // ── Screenshots ──
    ipcMain.handle('db:getScreenshots', (_e, gameId: number) =>
        getDb().prepare('SELECT * FROM screenshots WHERE game_id = ?').all(gameId)
    );

    // ── Videos ──
    ipcMain.handle('db:getGameVideos', (_e, gameId: number) =>
        getDb().prepare('SELECT * FROM game_videos WHERE game_id = ?').all(gameId)
    );

    ipcMain.handle('db:addGameVideo', (_e, gameId: number, videoId: string, name: string) => {
        return getDb().prepare(
            'INSERT INTO game_videos (game_id, video_id, name) VALUES (?, ?, ?)'
        ).run(gameId, videoId, name).lastInsertRowid;
    });

    // ── DLCs ──
    ipcMain.handle('db:getDlcs', (_e, gameId: number) =>
        getDb().prepare('SELECT * FROM dlcs WHERE game_id = ?').all(gameId)
    );

    // ── Tags ──
    ipcMain.handle('db:getTags', () =>
        getDb().prepare('SELECT * FROM tags ORDER BY name ASC').all()
    );

    ipcMain.handle('db:createTag', (_e, name: string) => {
        const normalized = name.trim();
        if (!normalized) throw new Error('Tag name is required');
        const result = getDb().prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(normalized);
        if (result.lastInsertRowid) return Number(result.lastInsertRowid);
        const existing = getDb().prepare('SELECT id FROM tags WHERE name = ?').get(normalized) as { id: number } | undefined;
        if (!existing) throw new Error('Failed to resolve tag id');
        return existing.id;
    });

    ipcMain.handle('db:deleteTag', (_e, id: number) => {
        getDb().prepare('DELETE FROM game_tags WHERE tag_id = ?').run(id);
        return getDb().prepare('DELETE FROM tags WHERE id = ?').run(id);
    });

    ipcMain.handle('db:getGameTags', (_e, gameId: number) =>
        getDb().prepare(`
          SELECT t.* FROM tags t
          JOIN game_tags gt ON gt.tag_id = t.id
          WHERE gt.game_id = ?
            ORDER BY t.name ASC
            `).all(gameId)
    );

    ipcMain.handle('db:addGameTag', (_e, gameId: number, tagId: number) =>
        getDb().prepare('INSERT OR IGNORE INTO game_tags (game_id, tag_id) VALUES (?, ?)').run(gameId, tagId)
    );

    ipcMain.handle('db:removeGameTag', (_e, gameId: number, tagId: number) =>
        getDb().prepare('DELETE FROM game_tags WHERE game_id = ? AND tag_id = ?').run(gameId, tagId)
    );

    // ── Collections ──
    ipcMain.handle('db:getCollections', () =>
        getDb().prepare('SELECT * FROM collections ORDER BY name ASC').all()
    );

    ipcMain.handle('db:createCollection', (_e, name: string) =>
        getDb().prepare('INSERT INTO collections (name) VALUES (?)').run(name)
    );

    ipcMain.handle('db:deleteCollection', (_e, id: number) => {
        getDb().prepare('DELETE FROM collection_games WHERE collection_id = ?').run(id);
        return getDb().prepare('DELETE FROM collections WHERE id = ?').run(id);
    });

    ipcMain.handle('db:getCollectionGames', (_e, collectionId: number) =>
        getDb().prepare(`
          SELECT g.* FROM games g
          JOIN collection_games cg ON cg.game_id = g.id
          WHERE cg.collection_id = ?
            ORDER BY g.title ASC
                `).all(collectionId)
    );

    ipcMain.handle('db:addGameToCollection', (_e, collectionId: number, gameId: number) =>
        getDb().prepare('INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (?, ?)').run(collectionId, gameId)
    );

    ipcMain.handle('db:removeGameFromCollection', (_e, collectionId: number, gameId: number) =>
        getDb().prepare('DELETE FROM collection_games WHERE collection_id = ? AND game_id = ?').run(collectionId, gameId)
    );

    // ── Smart Collections ──
    ipcMain.handle('db:getSmartCollections', () =>
        SMART_COLLECTIONS.map(sc => ({
            id: sc.id,
            name: sc.name,
            icon: sc.icon,
            count: (sc.filter(getDb()) as unknown[]).length,
        }))
    );

    ipcMain.handle('db:getSmartCollectionGames', (_e, id: string) => {
        const sc = SMART_COLLECTIONS.find(s => s.id === id);
        return sc ? sc.filter(getDb()) : [];
    });

    // ── Extras ──
    ipcMain.handle('db:getExtras', (_e, gameId: number) =>
        getDb().prepare('SELECT * FROM extras WHERE game_id = ?').all(gameId)
    );

    ipcMain.handle('db:addExtra', (_e, gameId: number, name: string, filePath: string, type: string) =>
        getDb().prepare('INSERT INTO extras (game_id, name, path, type) VALUES (?, ?, ?, ?)').run(gameId, name, filePath, type)
    );

    ipcMain.handle('db:deleteExtra', (_e, id: number) =>
        getDb().prepare('DELETE FROM extras WHERE id = ?').run(id)
    );

    // ── Search ──
    ipcMain.handle('db:searchGames', (_e, query: string) => {
        const like = `% ${query} % `;
        return getDb().prepare(`
          SELECT DISTINCT g.* FROM games g
          LEFT JOIN game_tags gt ON gt.game_id = g.id
          LEFT JOIN tags t ON t.id = gt.tag_id
          WHERE g.title LIKE ? OR t.name LIKE ?
            ORDER BY g.title ASC
            `).all(like, like);
    });

    ipcMain.handle('db:advancedSearch', (_e, query: string) => {
        return advancedSearch(query);
    });

    // ── Statistics ──
    ipcMain.handle('db:getStats', () => {
        const db = getDb();

        const totalGames = (db.prepare('SELECT COUNT(*) as c FROM games').get() as { c: number }).c;
        const totalPlaytime = (db.prepare('SELECT SUM(playtime_minutes) as s FROM games').get() as { s: number | null }).s ?? 0;
        const playedCount = (db.prepare('SELECT COUNT(*) as c FROM games WHERE last_played IS NOT NULL').get() as { c: number }).c;

        const mostPlayed = db.prepare(
            'SELECT * FROM games WHERE playtime_minutes > 0 ORDER BY playtime_minutes DESC LIMIT 1'
        ).get() ?? null;

        const recentGames = db.prepare(
            'SELECT * FROM games WHERE last_played IS NOT NULL ORDER BY last_played DESC LIMIT 10'
        ).all();

        const topByPlaytime = db.prepare(
            'SELECT id, title, playtime_minutes FROM games WHERE playtime_minutes > 0 ORDER BY playtime_minutes DESC LIMIT 10'
        ).all();

        const recentSessions = db.prepare(`
            SELECT ps.*, g.title as game_title, g.cover_url
            FROM play_sessions ps
            JOIN games g ON g.id = ps.game_id
            ORDER BY ps.started_at DESC
            LIMIT 10
            `).all();

        return { totalGames, totalPlaytime, playedCount, mostPlayed, recentGames, topByPlaytime, recentSessions };
    });

    // ── Play Sessions ──
    ipcMain.handle('db:getPlaySessions', (_e, gameId?: number) => {
        if (gameId) {
            return getDb().prepare(
                'SELECT * FROM play_sessions WHERE game_id = ? ORDER BY started_at DESC LIMIT 50'
            ).all(gameId);
        }
        return getDb().prepare(
            'SELECT ps.*, g.title as game_title FROM play_sessions ps JOIN games g ON g.id = ps.game_id ORDER BY ps.started_at DESC LIMIT 50'
        ).all();
    });

    // ── Weekly Playtime (last 12 weeks) ──
    ipcMain.handle('db:getWeeklyPlaytime', () => {
        const db = getDb();
        const weeks = [];
        for (let i = 11; i >= 0; i--) {
            const row = db.prepare(`
                SELECT COALESCE(SUM(duration_minutes), 0) as minutes
                FROM play_sessions
                WHERE started_at >= date('now', '-' || ? || ' days', 'weekday 1')
                  AND started_at < date('now', '-' || ? || ' days', 'weekday 1')
            `).get(i * 7 + 7, i * 7) as { minutes: number };
            weeks.push({
                weekOffset: i,
                label: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i}w ago`,
                minutes: row.minutes,
            });
        }
        return weeks;
    });

    // ── Monthly Stats ──
    ipcMain.handle('db:getMonthlyStats', () => {
        const db = getDb();
        const gamesThisMonth = (db.prepare(`
            SELECT COUNT(DISTINCT game_id) as c FROM play_sessions
            WHERE strftime('%Y-%m', started_at) = strftime('%Y-%m', 'now')
        `).get() as { c: number }).c;

        const hoursThisMonth = (db.prepare(`
            SELECT COALESCE(SUM(duration_minutes), 0) as m FROM play_sessions
            WHERE strftime('%Y-%m', started_at) = strftime('%Y-%m', 'now')
        `).get() as { m: number }).m;

        const sessionsThisMonth = (db.prepare(`
            SELECT COUNT(*) as c FROM play_sessions
            WHERE strftime('%Y-%m', started_at) = strftime('%Y-%m', 'now')
        `).get() as { c: number }).c;

        return { gamesThisMonth, hoursThisMonth, sessionsThisMonth };
    });

    // ── Launch Options ──
    ipcMain.handle('db:getLaunchOptions', (_e, gameId: number) => {
        const row = getDb().prepare('SELECT launch_options FROM games WHERE id = ?').get(gameId) as { launch_options: string | null } | undefined;
        return row?.launch_options ?? '';
    });

    ipcMain.handle('db:setLaunchOptions', (_e, gameId: number, opts: string) => {
        return getDb().prepare('UPDATE games SET launch_options = ? WHERE id = ?').run(opts, gameId);
    });

    // ── Scanner ──
    ipcMain.handle('scanner:scan', async () => {
        const igdbReady = await authenticateIGDBFromSettings();
        const result = await scanFolders(getDb(), { enrichWithIgdb: igdbReady });
        stopWatcher();
        startWatcher(getDb(), igdbReady);
        return result;
    });

    ipcMain.handle('scanner:getScanFolders', () =>
        getDb().prepare('SELECT * FROM scan_folders ORDER BY path ASC').all()
    );

    ipcMain.handle('scanner:addScanFolder', async () => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openDirectory', 'dontAddToRecent'],
                title: 'Select game folder to scan',
            });
            if (result.canceled || result.filePaths.length === 0) return null;
            const folderPath = result.filePaths[0];
            const folderName = path.basename(folderPath);
            getDb().prepare('INSERT OR IGNORE INTO scan_folders (path, name) VALUES (?, ?)').run(folderPath, folderName);
            return folderPath;
        } catch (error) {
            console.error('Error opening dialog:', error);
            return null;
        }
    });

    ipcMain.handle('scanner:updateScanFolder', (_e, id: number, data: { name?: string; icon?: string; color?: string }) => {
        const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
        return getDb().prepare(`UPDATE scan_folders SET ${fields} WHERE id = @id`).run({ ...data, id });
    });

    ipcMain.handle('scanner:removeScanFolder', (_e, id: number) =>
        getDb().prepare('DELETE FROM scan_folders WHERE id = ?').run(id)
    );

    // ── Watcher ──
    ipcMain.handle('watcher:start', async () => {
        const igdbReady = await authenticateIGDBFromSettings();
        startWatcher(getDb(), igdbReady);
    });

    ipcMain.handle('watcher:stop', () => stopWatcher());

    // ── IGDB ──
    ipcMain.handle('igdb:authenticate', (_e, clientId: string, clientSecret: string) =>
        authenticateIGDB(clientId, clientSecret)
    );

    ipcMain.handle('igdb:search', async (_e, query: string) => {
        const igdbReady = await authenticateIGDBFromSettings();
        if (!igdbReady) throw new Error('IGDB is not configured or authentication failed');
        return searchIGDB(query);
    });

    ipcMain.handle('igdb:fetchDetails', async (_e, igdbId: number) => {
        const igdbReady = await authenticateIGDBFromSettings();
        if (!igdbReady) throw new Error('IGDB is not configured or authentication failed');
        return fetchGameDetails(igdbId);
    });

    // ── Emulators ──
    ipcMain.handle('emulators:get', () => getEmulators(getDb()));
    ipcMain.handle('emulators:add', (_e, data: any) => addEmulator(getDb(), data));
    ipcMain.handle('emulators:update', (_e, id: number, data: any) => updateEmulator(getDb(), id, data));
    ipcMain.handle('emulators:delete', (_e, id: number) => deleteEmulator(getDb(), id));

    // ── Launcher ──
    ipcMain.handle('launcher:launch', (_e, gameId: number) => {
        const game = getDb().prepare('SELECT exe_path, launch_options FROM games WHERE id = ?').get(gameId) as
            { exe_path: string; launch_options: string | null } | undefined;
        if (!game || !game.exe_path) throw new Error('No executable set for this game');
        return launchGame(gameId, game.exe_path, getDb(), game.launch_options ?? '');
    });

    ipcMain.handle('launcher:isRunning', (_e, gameId: number) =>
        getRunningGame(gameId) !== null
    );

    // ── Files ──
    ipcMain.handle('files:selectExe', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'dontAddToRecent'],
            filters: [{ name: 'Executables', extensions: ['exe'] }],
            title: 'Select game executable',
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('files:openFolder', (_e, folderPath: string) => shell.openPath(folderPath));
    ipcMain.handle('files:openFile', (_e, filePath: string) => shell.openPath(filePath));

    // ── Settings ──
    ipcMain.handle('settings:get', () => {
        const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
        const settings: Record<string, string> = {};
        for (const row of rows) settings[row.key] = row.value;
        return settings;
    });

    ipcMain.handle('settings:set', (_e, key: string, value: string) =>
        getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    );

    // ── Disk Management ──
    ipcMain.handle('disk:getGameSize', (_e, gameId: number) => {
        const game = getDb().prepare('SELECT folder_path FROM games WHERE id = ?').get(gameId) as { folder_path: string | null } | undefined;
        if (!game?.folder_path) return { size: 0, formatted: '0 B', path: null };
        const size = getFolderSize(game.folder_path);
        return { size, formatted: formatBytes(size), path: game.folder_path };
    });

    ipcMain.handle('disk:deleteGame', (_e, gameId: number) => {
        const game = getDb().prepare('SELECT folder_path, title FROM games WHERE id = ?').get(gameId) as { folder_path: string | null; title: string } | undefined;
        if (!game?.folder_path) return false;
        deleteGameFolder(game.folder_path);
        getDb().prepare('DELETE FROM games WHERE id = ?').run(gameId);
        return true;
    });

    // ── Backup ──
    ipcMain.handle('backup:export', async () => {
        const backup = exportLibrary(getDb());
        const result = await dialog.showSaveDialog({
            title: 'Export Library Backup',
            defaultPath: `libraryxxx_backup_${new Date().toISOString().slice(0, 10)}.json`,
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (result.canceled || !result.filePath) return null;
        const fs = await import('fs');
        fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2), 'utf-8');
        return result.filePath;
    });

    ipcMain.handle('backup:import', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Import Library Backup',
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        const fs = await import('fs');
        const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
        const backup = JSON.parse(raw);
        return importLibrary(getDb(), backup);
    });

    // ── Window ──
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:maximize', () => {
        if (mainWindow?.isMaximized()) mainWindow.unmaximize();
        else mainWindow?.maximize();
    });
    ipcMain.handle('window:close', () => mainWindow?.close());
}
