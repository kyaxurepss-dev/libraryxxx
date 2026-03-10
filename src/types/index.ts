export interface Game {
    id: number;
    title: string;
    folder_path: string | null;
    exe_path: string | null;
    cover_url: string | null;
    hero_url: string | null;
    logo_url: string | null;
    description: string | null;
    metacritic_score: number | null;
    playtime_minutes: number;
    favorite: number;
    added_at: string;
    last_played: string | null;
    igdb_id?: number | null;
    release_year?: number | null;
    launch_options?: string | null;
    game_modes?: string | null;
    emulator_id?: number | null;
    rom_path?: string | null;
}

export interface Emulator {
    id: number;
    name: string;
    exe_path: string;
    args_template: string;
    platforms: string | null;
}

export interface Screenshot {
    id: number;
    game_id: number;
    image_url: string;
}

export interface Video {
    id: number;
    game_id: number;
    video_id: string;
    name: string;
}

export interface PluginData {
    id: string;
    name: string;
    version: string;
    description: string;
    main: string;
    author?: string;
    enabled: boolean;
    error?: string;
}

export interface DLC {
    id: number;
    game_id: number;
    dlc_name: string;
}

export interface Tag {
    id: number;
    name: string;
}

export interface Collection {
    id: number;
    name: string;
}

export interface SmartCollection {
    id: string;
    name: string;
    icon: string;
    count: number;
}

export interface Extra {
    id: number;
    game_id: number;
    name: string;
    path: string;
    type: 'mod' | 'soundtrack' | 'manual' | 'other';
}

export interface ScanFolder {
    id: number;
    path: string;
    name: string | null;
    icon: string;
    color: string;
}

export interface ScanResult {
    added: number;
    total: number;
    enriched?: number;
}

export interface IGDBSearchResult {
    id: number;
    name: string;
    cover?: { image_id: string };
    summary?: string;
    aggregated_rating?: number;
}

export interface IGDBGameDetails {
    igdbId: number;
    title: string;
    description: string;
    coverUrl: string | null;
    screenshots: string[];
    dlcs: string[];
    metacriticScore: number | null;
    genres: string[];
    themes: string[];
    gameModes: string[];
    releaseYear: number | null;
}

export interface LibraryStats {
    totalGames: number;
    totalPlaytime: number;
    playedCount: number;
    mostPlayed: Game | null;
    recentGames: Game[];
    topByPlaytime: Pick<Game, 'id' | 'title' | 'playtime_minutes'>[];
    recentSessions: PlaySession[];
}

export interface PlaySession {
    id: number;
    game_id: number;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number;
    game_title?: string;
    cover_url?: string | null;
}
