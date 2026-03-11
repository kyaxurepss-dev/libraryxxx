import { useState, useEffect } from 'react';
import { DownloadCloud, RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

export function UpdaterUI() {
    const [state, setState] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'not-available'>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [version, setVersion] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleUpdaterState = (eventState: { status: string; data?: any }) => {
            const { status, data } = eventState;
            
            if (status !== 'idle' && status !== 'not-available') {
                setIsVisible(true);
            }

            switch (status) {
                case 'checking':
                    setState('checking');
                    break;
                case 'available':
                    setState('available');
                    if (data?.version) setVersion(data.version);
                    break;
                case 'downloading':
                    setState('downloading');
                    if (data?.percent) setProgress(data.percent);
                    break;
                case 'downloaded':
                    setState('downloaded');
                    if (data?.version) setVersion(data.version);
                    break;
                case 'error':
                    setState('error');
                    setErrorMsg(data?.message || 'Unknown error');
                    break;
                case 'not-available':
                    setState('not-available');
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

    const handleDownload = () => {
        window.electron.downloadUpdate();
    };

    const handleInstall = () => {
        window.electron.installUpdate();
    };

    const handleCheck = () => {
        setIsVisible(true);
        setState('checking');
        window.electron.checkForUpdates();
    };

    const handleDismiss = () => {
        setIsVisible(false);
        if (state === 'error' || state === 'not-available' || state === 'downloaded') {
            setState('idle');
        }
    };

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
        <div className="w-full bg-[#0d1b2a]/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-lg relative overflow-hidden flex flex-col gap-2">
            <button onClick={handleDismiss} className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors">
                <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1 pr-6">
                {state === 'checking' && (
                    <>
                        <div className="flex items-center gap-2 text-blue-400">
                            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                            <span className="text-sm font-semibold">Checking for updates...</span>
                        </div>
                    </>
                )}

                {state === 'not-available' && (
                    <>
                        <div className="flex items-center gap-2 text-text-secondary">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-semibold">App is up to date</span>
                        </div>
                    </>
                )}

                {state === 'available' && (
                    <>
                        <div className="flex items-center gap-2 text-blue-400">
                            <DownloadCloud className="w-4 h-4 shrink-0 animate-pulse" />
                            <span className="text-sm font-semibold">Update {version} available!</span>
                        </div>
                        <button
                            onClick={handleDownload}
                            className="mt-2 w-full py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            Download Now
                        </button>
                    </>
                )}

                {state === 'downloading' && (
                    <>
                        <div className="flex items-center justify-between text-blue-400 text-xs font-semibold mb-1">
                            <span>Downloading...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </>
                )}

                {state === 'downloaded' && (
                    <>
                        <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-semibold text-green-400">Ready to Install</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">Version {version} is ready.</p>
                        <button
                            onClick={handleInstall}
                            className="mt-2 w-full py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            Restart & Install
                        </button>
                    </>
                )}

                {state === 'error' && (
                    <>
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-semibold">Update Error</span>
                        </div>
                        <p className="text-xs text-red-400/80 mt-1 line-clamp-2" title={errorMsg}>
                            {errorMsg}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
