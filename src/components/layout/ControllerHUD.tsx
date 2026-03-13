import { Gamepad2, PlugZap } from 'lucide-react';
import { useMemo } from 'react';
import { useControllerState } from '@/hooks/useController';

function familyLabel(family: 'xbox' | 'playstation' | 'nintendo' | 'generic') {
  switch (family) {
    case 'xbox':
      return 'Xbox';
    case 'playstation':
      return 'PlayStation';
    case 'nintendo':
      return 'Nintendo';
    default:
      return 'Generic';
  }
}

function scopeUi(scope: 'content' | 'sidebar' | 'topbar') {
  if (scope === 'sidebar') return { label: 'SIDEBAR', className: 'text-cyan-300 border-cyan-300/40 bg-cyan-400/10' };
  if (scope === 'topbar') return { label: 'TOPBAR', className: 'text-amber-300 border-amber-300/40 bg-amber-400/10' };
  return { label: 'CONTENT', className: 'text-green-300 border-green-300/40 bg-green-400/10' };
}

export function ControllerHUD() {
  const { controllers, activeControllerId, navScope, toast } = useControllerState();

  const activeController = useMemo(
    () => controllers.find(ctrl => ctrl.id === activeControllerId) ?? controllers[0],
    [controllers, activeControllerId]
  );

  const scope = scopeUi(navScope);

  return (
    <>
      {toast && (
        <div className="fixed right-5 top-12 z-[120] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="rounded-xl border border-white/15 bg-black/70 backdrop-blur-lg px-4 py-2.5 text-sm text-white shadow-2xl flex items-center gap-2">
            <PlugZap className={`w-4 h-4 ${toast.type === 'connected' ? 'text-green-400' : 'text-amber-300'}`} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="fixed right-5 bottom-5 z-[110]">
        {activeController ? (
          <div className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-md px-3 py-2 text-xs text-text-secondary flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5 text-accent" />
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${scope.className}`}>{scope.label}</span>
            <span className="font-semibold text-white">{familyLabel(activeController.family)}</span>
            <span className="text-text-muted truncate max-w-[260px]">{activeController.name}</span>
            {controllers.length > 1 && (
              <span className="ml-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white">x{controllers.length}</span>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-text-muted flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${scope.className}`}>{scope.label}</span>
            <span>No controller</span>
          </div>
        )}
      </div>
    </>
  );
}
