import electronUpdaterPkg from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';
import log from 'electron-log';

const { autoUpdater } = electronUpdaterPkg;

// Configure logger for updater
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

export function initUpdater(mainWindow: BrowserWindow) {
    // Enable fully automatic background updates
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    // Trigger the initial background check silently
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
        log.error('Error checking for updates on startup:', err);
    });

    // Send messages to the renderer process
    const sendStatus = (text: string, data?: any) => {
        mainWindow.webContents.send('update-message', { text, data });
    };

    autoUpdater.on('checking-for-update', () => {
        sendStatus('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        sendStatus('Update available.', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        sendStatus('Update not available.', info);
    });

    autoUpdater.on('error', (err) => {
        sendStatus('Error in auto-updater.', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        sendStatus('Downloading...', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        sendStatus('Update downloaded.', info);
    });

    // IPC Handlers
    ipcMain.handle('updater:getVersion', () => {
        return require('electron').app.getVersion();
    });

    ipcMain.handle('updater:check', async () => {
        try {
            const result = await autoUpdater.checkForUpdates();
            return { success: true, result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('updater:download', async () => {
        try {
            await autoUpdater.downloadUpdate();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('updater:install', () => {
        autoUpdater.quitAndInstall(false, true);
    });
}
