import { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type UpdaterStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error' | 'not-available';

export function UpdaterUI() {
    const [state, setState] = useState<UpdaterStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [version, setVersion] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleUpdaterState = (eventState: { status: string; data?: any }) => {
            const { status, data } = eventState;

            switch (status) {
                case 'checking':
                    setState('checking');
                    setIsVisible(true);
                    break;
                case 'available':
                    setState('available');
                    if (data?.version) setVersion(data.version);
                    setIsVisible(true);
                    break;
                case 'downloading':
                    setState('downloading');
                    if (data?.percent) setProgress(data.percent);
                    setIsVisible(true);
                    break;
                case 'downloaded':
                    setState('downloaded');
                    if (data?.version) setVersion(data.version);
                    setIsVisible(true);
                    break;
                case 'installing':
                    setState('installing');
                    if (data?.version) setVersion(data.version);
                    setIsVisible(true);
                    break;
                case 'error':
                    setState('error');
                    setErrorMsg(data?.message || 'Unknown error');
                    setIsVisible(true);
                    break;
                case 'not-available':
                    setState('not-available');
                    setIsVisible(true);
                    // Auto-hide after 3 seconds
                    setTimeout(() => setIsVisible(false), 3000);
                    break;
                default:
                    setState('idle');
            }
        };

        window.electron.onUpdaterState(handleUpdaterState);

        return () => {
            window.electron.removeUpdaterStateListener();
        };
    }, []);

    const handleCheck = () => {
        setIsVisible(true);
        setState('checking');
        window.electron.checkForUpdates();
    };

    const handleRetry = () => {
        setState('checking');
        setErrorMsg('');
        window.electron.checkForUpdates();
    };

    // ── Idle: just a check button ──
    if (!isVisible) {
        return (
            <button
                onClick={handleCheck}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 text-text-secondary hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-semibold border border-transparent"
                title="Check for Updates"
            >
                <RefreshCw className="w-4 h-4" />
                Check Updates
            </button>
        );
    }

    return (
        <div className="w-full bg-[#0d1b2a]/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-lg relative overflow-hidden flex flex-col gap-2 animate-fade-in">
            <div className="flex flex-col gap-1">
                {/* Checking */}
                {state === 'checking' && (
                    <div className="flex items-center gap-2 text-blue-400">
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span className="text-sm font-semibold">Checking for updates...</span>
                    </div>
                )}

                {/* Up to date */}
                {state === 'not-available' && (
                    <div className="flex items-center gap-2 text-text-secondary">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-semibold">App is up to date</span>
                    </div>
                )}

                {/* Update found — auto downloading */}
                {state === 'available' && (
                    <div className="flex items-center gap-2 text-blue-400">
                        <DownloadCloud className="w-4 h-4 shrink-0 animate-pulse" />
                        <span className="text-sm font-semibold">Update {version} found, downloading...</span>
                    </div>
                )}

                {/* Downloading with progress */}
                {state === 'downloading' && (
                    <>
                        <div className="flex items-center justify-between text-blue-400 text-xs font-semibold mb-1">
                            <span>Downloading update...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </>
                )}

                {/* Downloaded — about to install */}
                {state === 'downloaded' && (
                    <div className="flex items-center gap-2 text-green-400">
                        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                        <span className="text-sm font-semibold">Preparing to install...</span>
                    </div>
                )}

                {/* Installing — app will restart */}
                {state === 'installing' && (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-amber-400">
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                            <span className="text-sm font-semibold">Updating… restarting app</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-linear-to-r from-amber-400 to-orange-500 rounded-full animate-pulse w-full" />
                        </div>
                    </div>
                )}

                {/* Error */}
                {state === 'error' && (
                    <>
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-semibold">Update Error</span>
                        </div>
                        <p className="text-xs text-red-400/80 mt-1 line-clamp-2" title={errorMsg}>
                            {errorMsg}
                        </p>
                        <button
                            onClick={handleRetry}
                            className="mt-2 w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors border border-red-500/30"
                        >
                            Retry
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
