import type { ElectronAPI } from '../electron/preload';

declare global {
    interface Window {
        electron: ElectronAPI & {
            onUpdaterState: (callback: (state: { status: string; data?: any }) => void) => void;
            removeUpdaterStateListener: () => void;
        };
    }
}
