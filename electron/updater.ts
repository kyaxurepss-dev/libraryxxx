import electronUpdaterPkg from 'electron-updater';
import { ipcMain, BrowserWindow, app } from 'electron';
import log from 'electron-log';
import path from 'path';

const { autoUpdater } = electronUpdaterPkg;

type UpdaterStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error' | 'not-available';

interface UpdaterState {
    status: UpdaterStatus;
    data?: any;
}

let currentState: UpdaterState = { status: 'idle' };

export function initUpdater(mainWindow: BrowserWindow) {
    // ── Logging ──
    const logPath = path.join(app.getPath('userData'), 'logs', 'updater.log');
    log.transports.file.resolvePath = () => logPath;
    log.transports.file.level = 'info';
    autoUpdater.logger = log;

    log.info('App starting. Initializing silent updater...');

    // ── Configure for fully silent updates ──
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    // Send state to renderer
    const sendState = (status: UpdaterStatus, data?: any) => {
        currentState = { status, data };
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('updater:state', currentState);
        }
    };

    // ── Events ──
    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for updates...');
        sendState('checking');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('Update available:', info.version);
        sendState('available', info);
        // Download starts automatically because autoDownload = true
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('No update available. Current version:', app.getVersion());
        sendState('not-available', info);
    });

    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater:', err);
        sendState('error', { message: err.message || err.toString() });
    });

    autoUpdater.on('download-progress', (progressObj) => {
        log.info(`Downloading... ${progressObj.percent.toFixed(2)}%`);
        sendState('downloading', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded. Ready to install silently:', info.version);
        sendState('installing', info);

        // Brief delay so the user can see the "Installing..." message
        setTimeout(() => {
            log.info('Applying silent update and restarting...');
            // isSilent = true  → no NSIS installer window
            // isForceRunAfter = true → relaunch app after install
            autoUpdater.quitAndInstall(true, true);
        }, 2000);
    });

    // ── IPC Handlers ──
    ipcMain.handle('updater:getVersion', () => {
        return app.getVersion();
    });

    ipcMain.handle('updater:getState', () => {
        return currentState;
    });

    ipcMain.handle('updater:check', async () => {
        try {
            log.info('Manual update check requested.');
            const result = await autoUpdater.checkForUpdates();
            return { success: true, result };
        } catch (error: any) {
            log.error('Manual check failed:', error);
            return { success: false, error: error.message };
        }
    });

    // Keep download handler for manual trigger if autoDownload fails
    ipcMain.handle('updater:download', async () => {
        try {
            log.info('Manual download requested.');
            await autoUpdater.downloadUpdate();
            return { success: true };
        } catch (error: any) {
            log.error('Manual download failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('updater:install', () => {
        log.info('Manual install requested. Applying silent update...');
        sendState('installing');
        setTimeout(() => {
            autoUpdater.quitAndInstall(true, true);
        }, 500);
    });

    // ── Initial check on startup ──
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
        log.error('Error checking for updates on startup:', err);
    });
}
