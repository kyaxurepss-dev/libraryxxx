import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let accessToken: string | null = null;
let clientId: string | null = null;
let tokenExpiry = 0;

const IGDB_AUTH_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_API_URL = 'https://api.igdb.com/v4';

export interface IGDBSearchGame {
    id: number;
    name: string;
    cover?: { image_id: string };
    summary?: string;
    aggregated_rating?: number;
}

function escapeIgdbString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function authenticateIGDB(id: string, secret: string): Promise<boolean> {
    try {
        const response = await fetch(
            `${IGDB_AUTH_URL}?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
            { method: 'POST' }
        );
        if (!response.ok) return false;

        const data = await response.json() as { access_token: string; expires_in: number };
        accessToken = data.access_token;
        clientId = id;
        tokenExpiry = Date.now() + data.expires_in * 1000;
        return true;
    } catch {
        return false;
    }
}

async function igdbRequest(endpoint: string, body: string): Promise<unknown[]> {
    if (!accessToken || !clientId || Date.now() > tokenExpiry) {
        throw new Error('IGDB not authenticated');
    }

    const response = await fetch(`${IGDB_API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain',
        },
        body,
    });

    if (!response.ok) throw new Error(`IGDB API error: ${response.status}`);
    return response.json() as Promise<unknown[]>;
}

export async function searchIGDB(query: string): Promise<IGDBSearchGame[]> {
    const escapedQuery = escapeIgdbString(query);
    return igdbRequest('games', `
    search "${escapedQuery}";
    fields name, cover.image_id, summary, aggregated_rating;
    limit 10;
  `) as Promise<IGDBSearchGame[]>;
}

export async function findBestIGDBMatch(query: string): Promise<IGDBSearchGame | null> {
    const results = await searchIGDB(query);
    if (results.length === 0) return null;

    const normalizedQuery = normalizeTitle(query);

    const exact = results.find(r => normalizeTitle(r.name) === normalizedQuery);
    if (exact) return exact;

    const startsWith = results.find(r => normalizeTitle(r.name).startsWith(normalizedQuery));
    if (startsWith) return startsWith;

    const contains = results.find(r => normalizeTitle(r.name).includes(normalizedQuery));
    if (contains) return contains;

    return results[0];
}

export async function fetchGameDetails(igdbId: number) {
    const games = await igdbRequest('games', `
    where id = ${igdbId};
    fields name, summary, cover.image_id, screenshots.image_id, videos.video_id, videos.name,
           dlcs.name, aggregated_rating, genres.name, themes.name,
           game_modes.name, first_release_date;
  `) as Array<{
        id: number;
        name: string;
        summary?: string;
        cover?: { image_id: string };
        screenshots?: Array<{ image_id: string }>;
        videos?: Array<{ video_id: string; name: string }>;
        dlcs?: Array<{ name: string }>;
        aggregated_rating?: number;
        genres?: Array<{ name: string }>;
        themes?: Array<{ name: string }>;
        game_modes?: Array<{ name: string }>;
        first_release_date?: number; // Unix timestamp
    }>;

    if (games.length === 0) return null;

    const game = games[0];

    const coverUrl = game.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
        : null;

    const screenshots = (game.screenshots || []).map(s =>
        `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${s.image_id}.jpg`
    );

    let localCoverPath: string | null = null;
    if (coverUrl) {
        localCoverPath = await downloadImage(coverUrl, `cover_${igdbId}.jpg`);
    }

    const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : null;

    return {
        igdbId: game.id,
        title: game.name,
        description: game.summary || '',
        coverUrl: localCoverPath || coverUrl,
        screenshots,
        videos: (game.videos || []).map(v => ({ videoId: v.video_id, name: v.name })),
        dlcs: (game.dlcs || []).map(d => d.name),
        metacriticScore: game.aggregated_rating ? Math.round(game.aggregated_rating) : null,
        genres: (game.genres || []).map(g => g.name),
        themes: (game.themes || []).map(t => t.name),
        gameModes: (game.game_modes || []).map(m => m.name),
        releaseYear,
    };
}

async function downloadImage(url: string, filename: string): Promise<string> {
    const cacheDir = path.join(app.getPath('userData'), 'image-cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, filename);
    if (fs.existsSync(filePath)) return filePath;

    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return filePath;
}
