import electronUpdaterPkg from 'electron-updater';
import { ipcMain, app } from 'electron';
import log from 'electron-log';
import path from 'path';
const { autoUpdater } = electronUpdaterPkg;
export function initUpdater(mainWindow, db) {
    // 1. Configure logging to userData/logs/updater.log
    const logPath = path.join(app.getPath('userData'), 'logs', 'updater.log');
    log.transports.file.resolvePath = () => logPath;
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    log.info('App starting. Initializing updater...');
    // Get "silent_updates" setting from DB
    // Assuming '1' is true, '0' is false, defaulting to '0'
    const getSilentUpdateSetting = () => {
        try {
            const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('silent_updates');
            return row?.value === '1';
        }
        catch (e) {
            log.error('Could not read silent_updates setting:', e);
            return false;
        }
    };
    const isSilent = getSilentUpdateSetting();
    log.info(`Silent updates enabled: ${isSilent}`);
    // 2. Configure electron-updater properties
    autoUpdater.autoDownload = isSilent;
    autoUpdater.autoInstallOnAppQuit = isSilent;
    autoUpdater.allowDowngrade = false;
    // Trigger the initial background check
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
        log.error('Error checking for updates on startup:', err);
    });
    // Send messages to the renderer process
    const sendUpdaterState = (status, data) => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:state', { status, data });
        }
    };
    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for updates...');
        sendUpdaterState('checking');
    });
    autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info.version);
        sendUpdaterState('available', info);
    });
    autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available. Current version:', app.getVersion());
        sendUpdaterState('not-available', info);
    });
    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater:', err);
        sendUpdaterState('error', { message: err.message || err.toString() });
    });
    autoUpdater.on('download-progress', (progressObj) => {
        log.info(`Downloading... ${progressObj.percent.toFixed(2)}%`);
        sendUpdaterState('downloading', progressObj);
    });
    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded. Ready to install:', info.version);
        sendUpdaterState('downloaded', info);
    });
    // ── IPC Handlers ──
    ipcMain.handle('updater:getVersion', () => {
        return app.getVersion();
    });
    ipcMain.handle('updater:check', async () => {
        try {
            log.info('Manual update check requested.');
            const result = await autoUpdater.checkForUpdates();
            return { success: true, result };
        }
        catch (error) {
            log.error('Manual check failed:', error);
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('updater:download', async () => {
        try {
            log.info('Manual download requested.');
            await autoUpdater.downloadUpdate();
            return { success: true };
        }
        catch (error) {
            log.error('Manual download failed:', error);
            return { success: false, error: error.message };
        }
    });
    ipcMain.handle('updater:install', () => {
        log.info('Applying update and restarting...');
        autoUpdater.quitAndInstall(false, true);
    });
}
//# sourceMappingURL=updater.js.map