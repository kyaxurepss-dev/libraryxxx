import fs from 'fs';
import path from 'path';
import { fetchGameDetails, findBestIGDBMatch } from './igdb.js';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);
const COVER_NAMES = ['cover', 'boxart', 'box art', 'poster', 'folder', 'front', 'game'];
const HERO_NAMES = ['hero', 'background', 'banner', 'wallpaper'];
const LOGO_NAMES = ['logo', 'clearlogo', 'title'];
// Executables that should not be selected as the main game exe
const IGNORED_EXE_PATTERNS = [
    /^setup/i, /^install/i, /^uninstall/i, /^crack/i,
    /^launcher/i, /^redist/i, /^vcredist/i, /^dxsetup/i,
    /^UnityCrashHandler/i, /^crash/i, /^helper/i, /^engine/i,
    /^ue4prereq/i, /^directx/i, /^oalinst/i, /^steam_api/i,
];
// Known release-group tags and patterns to strip from folder names
const RELEASE_GROUP_SUFFIXES = [
    'FitGirl', 'DODI', 'RUNE', 'CODEX', 'PLAZA', 'SKIDROW', 'EMPRESS',
    'CPY', 'HOODLUM', 'RAZOR', 'RELOADED', 'GOG', 'DARKSiDERS',
    'P2P', 'TENOKE', 'KaOs', 'Repack', 'Rip',
];
// ─── Name Normalizer ─────────────────────────────────────────────────────────
export function cleanGameName(folderName) {
    let name = folderName;
    // Remove text inside square brackets: [DODI], [GOG], etc.
    name = name.replace(/\[.*?\]/g, '');
    // Remove text inside parentheses that look like edition/version info
    name = name.replace(/\((?:v[\d.]+|[\d]+|Deluxe|Gold|GOTY|Ultimate|Complete|Enhanced|Definitive|Anniversary|Remaster)\)/gi, '');
    // Remove release group suffix after last dash: -FitGirl, -RUNE, etc.
    const groupPattern = RELEASE_GROUP_SUFFIXES.join('|');
    name = name.replace(new RegExp(`[\\s._-]+(${groupPattern})\\s*$`, 'gi'), '');
    // Remove version strings: v1.0, v2.1.3, Build 12345
    name = name.replace(/\s*v\d+[\d.]*\s*/gi, ' ');
    name = name.replace(/\s*Build\s+\d+\s*/gi, ' ');
    // Replace dots and underscores with spaces (common in release names)
    name = name.replace(/[._]/g, ' ');
    // Remove trailing edition labels that may remain
    name = name.replace(/\b(Deluxe|Gold|GOTY|Ultimate|Complete|Enhanced|Definitive|Anniversary|Remaster|Edition)\s*$/gi, '');
    // Collapse multiple spaces, trim
    name = name.replace(/\s{2,}/g, ' ').trim();
    // Remove trailing dash/hyphen if any
    name = name.replace(/[-–—]+$/, '').trim();
    // Title Case: Capitalize the first letter of each word
    name = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    return name;
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalizeName(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return path.basename(fileName, ext).toLowerCase().replace(/[\s_-]+/g, ' ').trim();
}
function hasImageExtension(fileName) {
    return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}
function pickArtworkByNames(files, keywords) {
    const imageFiles = files.filter(hasImageExtension);
    for (const keyword of keywords) {
        const exact = imageFiles.find(f => normalizeName(f) === keyword);
        if (exact)
            return exact;
    }
    for (const keyword of keywords) {
        const partial = imageFiles.find(f => normalizeName(f).includes(keyword));
        if (partial)
            return partial;
    }
    return null;
}
function toFileUrl(filePath) {
    if (!filePath)
        return null;
    return `file://${filePath.replace(/\\/g, '/')}`;
}
function shouldIgnoreExe(fileName) {
    return IGNORED_EXE_PATTERNS.some(p => p.test(fileName));
}
function findExecutables(dir, depth = 0, maxDepth = 6) {
    let results = [];
    if (depth > maxDepth)
        return results;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results = results.concat(findExecutables(fullPath, depth + 1, maxDepth));
            }
            else if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe') && !shouldIgnoreExe(entry.name)) {
                try {
                    const stat = fs.statSync(fullPath);
                    results.push({ name: entry.name, fullPath, size: stat.size });
                }
                catch {
                    results.push({ name: entry.name, fullPath, size: 0 });
                }
            }
        }
    }
    catch {
        // ignore read errors
    }
    return results;
}
/**
 * Auto-detect the best game executable in a folder recursively.
 * Rules:
 *   1. Filter out known non-game exes
 *   2. Prefer exe whose name matches game title
 *   3. Fall back to largest exe
 */
export function detectBestExe(folderPath, gameTitle) {
    const entries = findExecutables(folderPath);
    if (entries.length === 0)
        return null;
    if (entries.length === 1)
        return entries[0].fullPath;
    // Try name match first
    const normalized = gameTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameMatch = entries.find(e => {
        const exeName = e.name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\.exe$/, '');
        return exeName.includes(normalized) || normalized.includes(exeName);
    });
    if (nameMatch)
        return nameMatch.fullPath;
    // Fall back to largest
    entries.sort((a, b) => b.size - a.size);
    return entries[0].fullPath;
}
function addTagToGame(db, gameId, tagName) {
    const cleaned = tagName.trim();
    if (!cleaned)
        return;
    db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(cleaned);
    const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(cleaned);
    if (!tag)
        return;
    db.prepare('INSERT OR IGNORE INTO game_tags (game_id, tag_id) VALUES (?, ?)').run(gameId, tag.id);
}
export async function enrichGameFromIgdb(db, gameId, gameName) {
    try {
        const match = await findBestIGDBMatch(gameName);
        if (!match)
            return false;
        const details = await fetchGameDetails(match.id);
        if (!details)
            return false;
        db.prepare(`
      UPDATE games
      SET
        igdb_id          = COALESCE(igdb_id, @igdbId),
        description      = CASE WHEN description IS NULL OR description = '' THEN @description ELSE description END,
        cover_url        = COALESCE(cover_url, @coverUrl),
        metacritic_score = COALESCE(metacritic_score, @metacriticScore),
        release_year     = COALESCE(release_year, @releaseYear),
        game_modes       = COALESCE(game_modes, @gameModes)
      WHERE id = @gameId
    `).run({
            gameId,
            igdbId: details.igdbId,
            description: details.description || null,
            coverUrl: details.coverUrl,
            metacriticScore: details.metacriticScore,
            releaseYear: details.releaseYear ?? null,
            gameModes: details.gameModes?.join(', ') ?? null,
        });
        const screenshotCount = db.prepare('SELECT COUNT(*) as count FROM screenshots WHERE game_id = ?').get(gameId);
        if (screenshotCount.count === 0) {
            const insertScreenshot = db.prepare('INSERT INTO screenshots (game_id, image_url) VALUES (?, ?)');
            for (const url of details.screenshots.slice(0, 10))
                insertScreenshot.run(gameId, url);
        }
        const dlcCount = db.prepare('SELECT COUNT(*) as count FROM dlcs WHERE game_id = ?').get(gameId);
        if (dlcCount.count === 0) {
            const insertDlc = db.prepare('INSERT INTO dlcs (game_id, dlc_name) VALUES (?, ?)');
            for (const dlcName of details.dlcs)
                insertDlc.run(gameId, dlcName);
        }
        const allTags = [...details.genres, ...details.themes];
        for (const tagName of allTags)
            addTagToGame(db, gameId, tagName);
        return true;
    }
    catch {
        return false;
    }
}
export async function scanFolders(db, options = {}) {
    const folders = db.prepare('SELECT * FROM scan_folders').all();
    let added = 0;
    let enriched = 0;
    for (const folder of folders) {
        if (!fs.existsSync(folder.path))
            continue;
        const entries = fs.readdirSync(folder.path, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const gameFolderPath = path.join(folder.path, entry.name);
            const existing = db.prepare('SELECT id FROM games WHERE folder_path = ?').get(gameFolderPath);
            if (existing)
                continue;
            // Normalize game title
            const cleanTitle = cleanGameName(entry.name);
            const gameFiles = fs.readdirSync(gameFolderPath);
            const coverFile = pickArtworkByNames(gameFiles, COVER_NAMES);
            const heroFile = pickArtworkByNames(gameFiles, HERO_NAMES);
            const logoFile = pickArtworkByNames(gameFiles, LOGO_NAMES);
            const coverUrl = toFileUrl(coverFile ? path.join(gameFolderPath, coverFile) : null);
            const heroUrl = toFileUrl(heroFile ? path.join(gameFolderPath, heroFile) : null);
            const logoUrl = toFileUrl(logoFile ? path.join(gameFolderPath, logoFile) : null);
            // Auto-detect executable
            const exePath = detectBestExe(gameFolderPath, cleanTitle);
            const result = db.prepare(`
        INSERT INTO games (title, folder_path, exe_path, cover_url, hero_url, logo_url, added_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(cleanTitle, gameFolderPath, exePath, coverUrl, heroUrl, logoUrl);
            added++;
            if (!options.enrichWithIgdb)
                continue;
            const gameId = Number(result.lastInsertRowid);
            if (!Number.isNaN(gameId)) {
                const wasEnriched = await enrichGameFromIgdb(db, gameId, cleanTitle);
                if (wasEnriched)
                    enriched++;
            }
        }
    }
    const total = db.prepare('SELECT COUNT(*) as count FROM games').get().count;
    return { added, total, enriched };
}
//# sourceMappingURL=scanner.js.map