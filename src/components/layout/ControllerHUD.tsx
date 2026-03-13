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

export function ControllerHUD() {
  const { controllers, activeControllerId, toast } = useControllerState();

  const activeController = useMemo(
    () => controllers.find(ctrl => ctrl.id === activeControllerId) ?? controllers[0],
    [controllers, activeControllerId]
  );

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
            <span className="font-semibold text-white">{familyLabel(activeController.family)}</span>
            <span className="text-text-muted truncate max-w-[260px]">{activeController.name}</span>
            {controllers.length > 1 && (
              <span className="ml-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white">x{controllers.length}</span>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-text-muted flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>No controller</span>
          </div>
        )}
      </div>
    </>
  );
}
