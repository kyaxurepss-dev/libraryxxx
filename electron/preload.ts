import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
    // Database: Games
    getGames: () => ipcRenderer.invoke('db:getGames'),
    getGame: (id: number) => ipcRenderer.invoke('db:getGame', id),
    updateGame: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('db:updateGame', id, data),
    deleteGame: (id: number) => ipcRenderer.invoke('db:deleteGame', id),
    toggleFavorite: (id: number) => ipcRenderer.invoke('db:toggleFavorite', id),
    getFavorites: () => ipcRenderer.invoke('db:getFavorites'),

    // Database: Screenshots
    getScreenshots: (gameId: number) => ipcRenderer.invoke('db:getScreenshots', gameId),

    // Database: Videos
    getGameVideos: (gameId: number) => ipcRenderer.invoke('db:getGameVideos', gameId),
    addGameVideo: (gameId: number, videoId: string, name: string) => ipcRenderer.invoke('db:addGameVideo', gameId, videoId, name),

    // Database: DLCs
    getDlcs: (gameId: number) => ipcRenderer.invoke('db:getDlcs', gameId),

    // Database: Tags
    getTags: () => ipcRenderer.invoke('db:getTags'),
    createTag: (name: string) => ipcRenderer.invoke('db:createTag', name),
    deleteTag: (id: number) => ipcRenderer.invoke('db:deleteTag', id),
    getGameTags: (gameId: number) => ipcRenderer.invoke('db:getGameTags', gameId),
    addGameTag: (gameId: number, tagId: number) => ipcRenderer.invoke('db:addGameTag', gameId, tagId),
    removeGameTag: (gameId: number, tagId: number) => ipcRenderer.invoke('db:removeGameTag', gameId, tagId),

    // Database: Collections
    getCollections: () => ipcRenderer.invoke('db:getCollections'),
    createCollection: (name: string) => ipcRenderer.invoke('db:createCollection', name),
    deleteCollection: (id: number) => ipcRenderer.invoke('db:deleteCollection', id),
    getCollectionGames: (collectionId: number) => ipcRenderer.invoke('db:getCollectionGames', collectionId),
    addGameToCollection: (collectionId: number, gameId: number) => ipcRenderer.invoke('db:addGameToCollection', collectionId, gameId),
    removeGameFromCollection: (collectionId: number, gameId: number) => ipcRenderer.invoke('db:removeGameFromCollection', collectionId, gameId),

    // Smart Collections
    getSmartCollections: () => ipcRenderer.invoke('db:getSmartCollections'),
    getSmartCollectionGames: (id: string) => ipcRenderer.invoke('db:getSmartCollectionGames', id),

    // Database: Extras
    getExtras: (gameId: number) => ipcRenderer.invoke('db:getExtras', gameId),
    addExtra: (gameId: number, name: string, path: string, type: string) => ipcRenderer.invoke('db:addExtra', gameId, name, path, type),
    deleteExtra: (id: number) => ipcRenderer.invoke('db:deleteExtra', id),

    // Search
    searchGames: (query: string) => ipcRenderer.invoke('db:searchGames', query),
    advancedSearch: (query: string) => ipcRenderer.invoke('db:advancedSearch', query),

    // Statistics
    getStats: () => ipcRenderer.invoke('db:getStats'),

    // Play Sessions
    getPlaySessions: (gameId?: number) => ipcRenderer.invoke('db:getPlaySessions', gameId),
    getWeeklyPlaytime: () => ipcRenderer.invoke('db:getWeeklyPlaytime'),
    getMonthlyStats: () => ipcRenderer.invoke('db:getMonthlyStats'),

    // Launch Options
    getLaunchOptions: (gameId: number) => ipcRenderer.invoke('db:getLaunchOptions', gameId),
    setLaunchOptions: (gameId: number, opts: string) => ipcRenderer.invoke('db:setLaunchOptions', gameId, opts),

    // Scanner
    scan: () => ipcRenderer.invoke('scanner:scan'),
    getScanFolders: () => ipcRenderer.invoke('scanner:getScanFolders'),
    addScanFolder: () => ipcRenderer.invoke('scanner:addScanFolder'),
    removeScanFolder: (id: number) => ipcRenderer.invoke('scanner:removeScanFolder', id),
    updateScanFolder: (id: number, data: { name?: string; icon?: string; color?: string }) => ipcRenderer.invoke('scanner:updateScanFolder', id, data),

    // Watcher
    startWatcher: () => ipcRenderer.invoke('watcher:start'),
    stopWatcher: () => ipcRenderer.invoke('watcher:stop'),

    // IGDB
    authenticateIGDB: (clientId: string, clientSecret: string) => ipcRenderer.invoke('igdb:authenticate', clientId, clientSecret),
    searchIGDB: (query: string) => ipcRenderer.invoke('igdb:search', query),
    fetchIGDBDetails: (igdbId: number) => ipcRenderer.invoke('igdb:fetchDetails', igdbId),

    // Launcher
    launchGame: (gameId: number) => ipcRenderer.invoke('launcher:launch', gameId),
    isGameRunning: (gameId: number) => ipcRenderer.invoke('launcher:isRunning', gameId),

    // Files
    selectExe: () => ipcRenderer.invoke('files:selectExe'),
    openFolder: (path: string) => ipcRenderer.invoke('files:openFolder', path),
    openFile: (path: string) => ipcRenderer.invoke('files:openFile', path),

    // Emulators
    getEmulators: () => ipcRenderer.invoke('emulators:get'),
    addEmulator: (data: any) => ipcRenderer.invoke('emulators:add', data),
    updateEmulator: (id: number, data: any) => ipcRenderer.invoke('emulators:update', id, data),
    deleteEmulator: (id: number) => ipcRenderer.invoke('emulators:delete', id),

    // Disk Management
    getGameSize: (gameId: number) => ipcRenderer.invoke('disk:getGameSize', gameId),
    deleteGameFiles: (gameId: number) => ipcRenderer.invoke('disk:deleteGame', gameId),

    // Backup
    exportBackup: () => ipcRenderer.invoke('backup:export'),
    importBackup: () => ipcRenderer.invoke('backup:import'),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

    // Window
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),

    // Updater
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateMessage: (callback: (data: any) => void) => {
        ipcRenderer.on('update-message', (_event, data) => callback(data));
    },
    removeUpdateMessageListener: () => {
        ipcRenderer.removeAllListeners('update-message');
    },

    // Plugins
    getPlugins: () => ipcRenderer.invoke('plugins:get'),
    togglePlugin: (id: string) => ipcRenderer.invoke('plugins:toggle', id),
};

contextBridge.exposeInMainWorld('electron', electronAPI);

export type ElectronAPI = typeof electronAPI;
