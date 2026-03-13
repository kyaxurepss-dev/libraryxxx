import {
  CONTROLLER_ACTION_ORDER,
  CONTROLLER_INPUT_OPTIONS,
  getControllerActionLabel,
  type ControllerAction,
  type ControllerInputCode,
  useControllerState,
} from '@/hooks/useController';

export function ControllerSettingsCard() {
  const { controllers, mapping, setActionMapping, resetMapping } = useControllerState();

  const handleSlotChange = (action: ControllerAction, slot: 0 | 1, value: string) => {
    const current = [...(mapping[action] ?? [])];

    if (!value) {
      current[slot] = undefined as unknown as ControllerInputCode;
    } else {
      current[slot] = value as ControllerInputCode;
    }

    const cleaned = current.filter(Boolean);
    const deduped = Array.from(new Set(cleaned));
    setActionMapping(action, deduped);
  };

  return (
    <section className="p-6 md:p-7 rounded-2xl glass-panel border border-white/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">Controller Controls</h2>
          <p className="text-sm text-text-secondary mt-1">
            Mapeo universal para navegacion con Xbox, PlayStation, Nintendo y mandos genericos.
          </p>
        </div>
        <button
          onClick={resetMapping}
          className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors"
        >
          Restablecer
        </button>
      </div>

      <div className="mb-4 text-xs text-text-muted">
        {controllers.length > 0
          ? `${controllers.length} controller(s) connected`
          : 'No hay mandos conectados ahora mismo'}
      </div>

      <div className="space-y-3">
        {CONTROLLER_ACTION_ORDER.map(action => {
          const selected = mapping[action] ?? [];
          return (
            <div key={action} className="grid grid-cols-1 md:grid-cols-[210px_1fr_1fr] gap-2.5 items-center rounded-xl border border-white/8 bg-black/20 p-3">
              <div className="text-sm font-semibold text-white">{getControllerActionLabel(action)}</div>

              <select
                value={selected[0] ?? ''}
                onChange={event => handleSlotChange(action, 0, event.target.value)}
                className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
              >
                <option value="">Sin asignar</option>
                {CONTROLLER_INPUT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={selected[1] ?? ''}
                onChange={event => handleSlotChange(action, 1, event.target.value)}
                className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-accent/50"
              >
                <option value="">Alternativo (opcional)</option>
                {CONTROLLER_INPUT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
