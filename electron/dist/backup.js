export function exportLibrary(db) {
    const games = db.prepare('SELECT * FROM games').all();
    const tags = db.prepare('SELECT * FROM tags').all();
    const gameTags = db.prepare('SELECT game_id, tag_id FROM game_tags').all();
    const collections = db.prepare('SELECT * FROM collections').all();
    const collectionGames = db.prepare('SELECT collection_id, game_id FROM collection_games').all();
    const playSessions = db.prepare('SELECT * FROM play_sessions').all();
    const scanFolders = db.prepare('SELECT * FROM scan_folders').all();
    const settings = db.prepare('SELECT key, value FROM settings').all();
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        games,
        tags,
        gameTags,
        collections,
        collectionGames,
        playSessions,
        scanFolders,
        settings,
    };
}
export function importLibrary(db, backup) {
    if (!backup || backup.version !== 1) {
        throw new Error('Invalid or unsupported backup format');
    }
    let imported = 0;
    const runImport = db.transaction(() => {
        // Import tags
        const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
        const tagIdMap = new Map();
        for (const tag of backup.tags || []) {
            insertTag.run(tag.name);
            const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag.name);
            if (existing)
                tagIdMap.set(tag.id, existing.id);
        }
        // Import collections
        const collIdMap = new Map();
        for (const coll of backup.collections || []) {
            const existing = db.prepare('SELECT id FROM collections WHERE name = ?').get(coll.name);
            if (existing) {
                collIdMap.set(coll.id, existing.id);
            }
            else {
                const result = db.prepare('INSERT INTO collections (name) VALUES (?)').run(coll.name);
                collIdMap.set(coll.id, Number(result.lastInsertRowid));
            }
        }
        // Import games (skip if folder_path already exists)
        const gameIdMap = new Map();
        for (const game of backup.games || []) {
            const folderPath = game.folder_path;
            const title = game.title;
            let existingGame;
            if (folderPath) {
                existingGame = db.prepare('SELECT id FROM games WHERE folder_path = ?').get(folderPath);
            }
            if (!existingGame) {
                existingGame = db.prepare('SELECT id FROM games WHERE title = ?').get(title);
            }
            if (existingGame) {
                gameIdMap.set(game.id, existingGame.id);
                // Update playtime if backup has more
                const backupPlaytime = game.playtime_minutes || 0;
                if (backupPlaytime > 0) {
                    db.prepare(`
                        UPDATE games SET playtime_minutes = MAX(playtime_minutes, ?) WHERE id = ?
                    `).run(backupPlaytime, existingGame.id);
                }
            }
            else {
                const result = db.prepare(`
                    INSERT INTO games (title, folder_path, exe_path, cover_url, hero_url, logo_url, description,
                                       metacritic_score, playtime_minutes, favorite, added_at, last_played,
                                       igdb_id, release_year, launch_options, game_modes)
                    VALUES (@title, @folder_path, @exe_path, @cover_url, @hero_url, @logo_url, @description,
                            @metacritic_score, @playtime_minutes, @favorite, @added_at, @last_played,
                            @igdb_id, @release_year, @launch_options, @game_modes)
                `).run({
                    title,
                    folder_path: folderPath,
                    exe_path: game.exe_path ?? null,
                    cover_url: game.cover_url ?? null,
                    hero_url: game.hero_url ?? null,
                    logo_url: game.logo_url ?? null,
                    description: game.description ?? null,
                    metacritic_score: game.metacritic_score ?? null,
                    playtime_minutes: game.playtime_minutes ?? 0,
                    favorite: game.favorite ?? 0,
                    added_at: game.added_at ?? new Date().toISOString(),
                    last_played: game.last_played ?? null,
                    igdb_id: game.igdb_id ?? null,
                    release_year: game.release_year ?? null,
                    launch_options: game.launch_options ?? null,
                    game_modes: game.game_modes ?? null,
                });
                gameIdMap.set(game.id, Number(result.lastInsertRowid));
                imported++;
            }
        }
        // Import game_tags
        const insertGameTag = db.prepare('INSERT OR IGNORE INTO game_tags (game_id, tag_id) VALUES (?, ?)');
        for (const gt of backup.gameTags || []) {
            const newGameId = gameIdMap.get(gt.game_id);
            const newTagId = tagIdMap.get(gt.tag_id);
            if (newGameId && newTagId)
                insertGameTag.run(newGameId, newTagId);
        }
        // Import collection_games
        const insertCollGame = db.prepare('INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (?, ?)');
        for (const cg of backup.collectionGames || []) {
            const newCollId = collIdMap.get(cg.collection_id);
            const newGameId = gameIdMap.get(cg.game_id);
            if (newCollId && newGameId)
                insertCollGame.run(newCollId, newGameId);
        }
        // Import settings (don't overwrite existing)
        const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
        for (const s of backup.settings || []) {
            insertSetting.run(s.key, s.value);
        }
    });
    runImport();
    return { imported };
}
//# sourceMappingURL=backup.js.map