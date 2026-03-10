import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { cleanGameName, detectBestExe, enrichGameFromIgdb } from './scanner.js';

type FSWatcher = ReturnType<typeof fs.watch>;

const watchers: FSWatcher[] = [];

function toFileUrl(filePath: string): string {
    return `file://${filePath.replace(/\\/g, '/')}`;
}

export function startWatcher(db: Database.Database, enrichWithIgdb: boolean): void {
    stopWatcher(); // clean up any previous watchers

    const folders = db.prepare('SELECT * FROM scan_folders').all() as { id: number; path: string }[];

    for (const folder of folders) {
        if (!fs.existsSync(folder.path)) continue;

        const watcher = fs.watch(folder.path, { persistent: false }, (eventType, filename) => {
            if (!filename || eventType !== 'rename') return;

            const gameFolderPath = path.join(folder.path, filename);

            // Short delay to let the OS finish writing
            setTimeout(async () => {
                try {
                    if (!fs.existsSync(gameFolderPath)) return;
                    const stat = fs.statSync(gameFolderPath);
                    if (!stat.isDirectory()) return;

                    const existing = db.prepare('SELECT id FROM games WHERE folder_path = ?').get(gameFolderPath);
                    if (existing) return;

                    const cleanTitle = cleanGameName(filename);
                    const exePath = detectBestExe(gameFolderPath, cleanTitle);

                    const result = db.prepare(`
            INSERT INTO games (title, folder_path, exe_path, added_at)
            VALUES (?, ?, ?, datetime('now'))
          `).run(cleanTitle, gameFolderPath, exePath);

                    const gameId = Number(result.lastInsertRowid);

                    if (enrichWithIgdb && !Number.isNaN(gameId)) {
                        await enrichGameFromIgdb(db, gameId, cleanTitle);
                    }

                    console.log(`[Watcher] Auto-added game: ${cleanTitle}`);
                } catch (e) {
                    console.error('[Watcher] Error processing new game folder:', e);
                }
            }, 1000);
        });

        watcher.on('error', err => console.error('[Watcher] fs.watch error:', err));
        watchers.push(watcher);
    }

    console.log(`[Watcher] Watching ${watchers.length} folder(s)`);
}

export function stopWatcher(): void {
    for (const w of watchers) {
        try { w.close(); } catch { /* ignore */ }
    }
    watchers.length = 0;
}
