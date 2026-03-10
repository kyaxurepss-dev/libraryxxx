import { contextBridge, ipcRenderer } from 'electron';
const electronAPI = {
    // Database: Games
    getGames: () => ipcRenderer.invoke('db:getGames'),
    getGame: (id) => ipcRenderer.invoke('db:getGame', id),
    updateGame: (id, data) => ipcRenderer.invoke('db:updateGame', id, data),
    deleteGame: (id) => ipcRenderer.invoke('db:deleteGame', id),
    toggleFavorite: (id) => ipcRenderer.invoke('db:toggleFavorite', id),
    getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
    // Database: Screenshots
    getScreenshots: (gameId) => ipcRenderer.invoke('db:getScreenshots', gameId),
    // Database: Videos
    getGameVideos: (gameId) => ipcRenderer.invoke('db:getGameVideos', gameId),
    addGameVideo: (gameId, videoId, name) => ipcRenderer.invoke('db:addGameVideo', gameId, videoId, name),
    // Database: DLCs
    getDlcs: (gameId) => ipcRenderer.invoke('db:getDlcs', gameId),
    // Database: Tags
    getTags: () => ipcRenderer.invoke('db:getTags'),
    createTag: (name) => ipcRenderer.invoke('db:createTag', name),
    deleteTag: (id) => ipcRenderer.invoke('db:deleteTag', id),
    getGameTags: (gameId) => ipcRenderer.invoke('db:getGameTags', gameId),
    addGameTag: (gameId, tagId) => ipcRenderer.invoke('db:addGameTag', gameId, tagId),
    removeGameTag: (gameId, tagId) => ipcRenderer.invoke('db:removeGameTag', gameId, tagId),
    // Database: Collections
    getCollections: () => ipcRenderer.invoke('db:getCollections'),
    createCollection: (name) => ipcRenderer.invoke('db:createCollection', name),
    deleteCollection: (id) => ipcRenderer.invoke('db:deleteCollection', id),
    getCollectionGames: (collectionId) => ipcRenderer.invoke('db:getCollectionGames', collectionId),
    addGameToCollection: (collectionId, gameId) => ipcRenderer.invoke('db:addGameToCollection', collectionId, gameId),
    removeGameFromCollection: (collectionId, gameId) => ipcRenderer.invoke('db:removeGameFromCollection', collectionId, gameId),
    // Smart Collections
    getSmartCollections: () => ipcRenderer.invoke('db:getSmartCollections'),
    getSmartCollectionGames: (id) => ipcRenderer.invoke('db:getSmartCollectionGames', id),
    // Database: Extras
    getExtras: (gameId) => ipcRenderer.invoke('db:getExtras', gameId),
    addExtra: (gameId, name, path, type) => ipcRenderer.invoke('db:addExtra', gameId, name, path, type),
    deleteExtra: (id) => ipcRenderer.invoke('db:deleteExtra', id),
    // Search
    searchGames: (query) => ipcRenderer.invoke('db:searchGames', query),
    advancedSearch: (query) => ipcRenderer.invoke('db:advancedSearch', query),
    // Statistics
    getStats: () => ipcRenderer.invoke('db:getStats'),
    // Play Sessions
    getPlaySessions: (gameId) => ipcRenderer.invoke('db:getPlaySessions', gameId),
    getWeeklyPlaytime: () => ipcRenderer.invoke('db:getWeeklyPlaytime'),
    getMonthlyStats: () => ipcRenderer.invoke('db:getMonthlyStats'),
    // Launch Options
    getLaunchOptions: (gameId) => ipcRenderer.invoke('db:getLaunchOptions', gameId),
    setLaunchOptions: (gameId, opts) => ipcRenderer.invoke('db:setLaunchOptions', gameId, opts),
    // Scanner
    scan: () => ipcRenderer.invoke('scanner:scan'),
    getScanFolders: () => ipcRenderer.invoke('scanner:getScanFolders'),
    addScanFolder: () => ipcRenderer.invoke('scanner:addScanFolder'),
    removeScanFolder: (id) => ipcRenderer.invoke('scanner:removeScanFolder', id),
    updateScanFolder: (id, data) => ipcRenderer.invoke('scanner:updateScanFolder', id, data),
    // Watcher
    startWatcher: () => ipcRenderer.invoke('watcher:start'),
    stopWatcher: () => ipcRenderer.invoke('watcher:stop'),
    // IGDB
    authenticateIGDB: (clientId, clientSecret) => ipcRenderer.invoke('igdb:authenticate', clientId, clientSecret),
    searchIGDB: (query) => ipcRenderer.invoke('igdb:search', query),
    fetchIGDBDetails: (igdbId) => ipcRenderer.invoke('igdb:fetchDetails', igdbId),
    // Launcher
    launchGame: (gameId) => ipcRenderer.invoke('launcher:launch', gameId),
    isGameRunning: (gameId) => ipcRenderer.invoke('launcher:isRunning', gameId),
    // Files
    selectExe: () => ipcRenderer.invoke('files:selectExe'),
    openFolder: (path) => ipcRenderer.invoke('files:openFolder', path),
    openFile: (path) => ipcRenderer.invoke('files:openFile', path),
    // Emulators
    getEmulators: () => ipcRenderer.invoke('emulators:get'),
    addEmulator: (data) => ipcRenderer.invoke('emulators:add', data),
    updateEmulator: (id, data) => ipcRenderer.invoke('emulators:update', id, data),
    deleteEmulator: (id) => ipcRenderer.invoke('emulators:delete', id),
    // Disk Management
    getGameSize: (gameId) => ipcRenderer.invoke('disk:getGameSize', gameId),
    deleteGameFiles: (gameId) => ipcRenderer.invoke('disk:deleteGame', gameId),
    // Backup
    exportBackup: () => ipcRenderer.invoke('backup:export'),
    importBackup: () => ipcRenderer.invoke('backup:import'),
    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    getSetting: (key) => ipcRenderer.invoke('settings:getOne', key),
    setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    // Window
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    // Updater
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateMessage: (callback) => {
        ipcRenderer.on('update-message', (_event, data) => callback(data));
    },
    removeUpdateMessageListener: () => {
        ipcRenderer.removeAllListeners('update-message');
    },
    // Plugins
    getPlugins: () => ipcRenderer.invoke('plugins:get'),
    togglePlugin: (id) => ipcRenderer.invoke('plugins:toggle', id),
};
contextBridge.exposeInMainWorld('electron', electronAPI);
//# sourceMappingURL=preload.js.map