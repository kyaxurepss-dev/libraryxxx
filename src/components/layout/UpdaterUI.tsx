import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, DownloadCloud, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error'
  | 'not-available';

const BUSY: Partial<Record<UpdaterStatus, { label: string; className: string }>> = {
  checking: { label: 'Checking for updates', className: 'text-paper-dim' },
  available: { label: 'Update available', className: 'text-accent' },
  downloaded: { label: 'Preparing install', className: 'text-paper-dim' },
  installing: { label: 'Installing — restart soon', className: 'text-warning' },
};

export function UpdaterUI() {
  const [state, setState] = useState<UpdaterStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleUpdaterState = (eventState: { status: string; data?: unknown }) => {
      const { status, data } = eventState;
      const updateData = data as { percent?: number; message?: string } | undefined;

      switch (status) {
        case 'checking':
          setState('checking');
          break;
        case 'available':
          setState('available');
          break;
        case 'downloading':
          setState('downloading');
          if (updateData?.percent) setProgress(updateData.percent);
          break;
        case 'downloaded':
          setState('downloaded');
          break;
        case 'installing':
          setState('installing');
          break;
        case 'error':
          setState('error');
          setErrorMsg(updateData?.message || 'Unknown error');
          break;
        case 'not-available':
          setState('not-available');
          hideTimer.current = setTimeout(() => setState('idle'), 2500);
          break;
        default:
          setState('idle');
      }
    };

    window.electron.onUpdaterState(handleUpdaterState);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      window.electron.removeUpdaterStateListener();
    };
  }, []);

  const handleCheck = () => {
    setState('checking');
    window.electron.checkForUpdates();
  };

  if (state === 'error') {
    return (
      <button
        onClick={handleCheck}
        title={`Update error: ${errorMsg}. Click to retry.`}
        aria-label="Update error — retry"
        className="flex h-9 w-9 items-center justify-center rounded-control text-danger transition-colors hover:bg-danger/10"
      >
        <AlertCircle className="h-4 w-4" />
      </button>
    );
  }

  if (state === 'downloading') {
    return (
      <div
        className="flex h-9 w-9 flex-col items-center justify-center gap-1"
        title={`Downloading update… ${Math.round(progress)}%`}
        role="status"
        aria-label={`Downloading update, ${Math.round(progress)} percent`}
      >
        <DownloadCloud className="h-4 w-4 text-accent" />
        <span className="h-0.5 w-6 overflow-hidden rounded-full bg-plate-hover">
          <span
            className="block h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </span>
      </div>
    );
  }

  const busy = BUSY[state];

  return (
    <button
      onClick={handleCheck}
      disabled={Boolean(busy)}
      title={busy?.label ?? 'Check for updates'}
      aria-label={busy?.label ?? 'Check for updates'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-control transition-colors hover:bg-plate disabled:pointer-events-none',
        busy?.className ?? 'text-muted hover:text-paper-dim',
      )}
    >
      {state === 'checking' || state === 'downloaded' || state === 'installing' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === 'not-available' ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : state === 'available' ? (
        <DownloadCloud className="h-4 w-4 animate-pulse" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
    </button>
  );
}