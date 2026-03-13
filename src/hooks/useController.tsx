import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

export type ControllerAction =
  | 'ui_up'
  | 'ui_down'
  | 'ui_left'
  | 'ui_right'
  | 'ui_confirm'
  | 'ui_cancel'
  | 'ui_menu';

export type ControllerInputCode =
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right'
  | 'left_stick_up'
  | 'left_stick_down'
  | 'left_stick_left'
  | 'left_stick_right'
  | 'button_south'
  | 'button_east'
  | 'button_west'
  | 'button_north'
  | 'start'
  | 'select'
  | 'left_shoulder'
  | 'right_shoulder';

export type ControllerFamily = 'xbox' | 'playstation' | 'nintendo' | 'generic';
export type ControllerNavScope = 'content' | 'sidebar' | 'topbar';

export interface ControllerDevice {
  id: string;
  index: number;
  name: string;
  family: ControllerFamily;
}

export interface ControllerToast {
  id: number;
  message: string;
  type: 'connected' | 'disconnected';
}

export type ControllerMapping = Record<ControllerAction, ControllerInputCode[]>;

export interface ControllerActionEvent {
  action: ControllerAction;
  controllerId: string;
  controllerIndex: number;
  timestamp: number;
}

interface ControllerContextValue {
  controllers: ControllerDevice[];
  activeControllerId: string | null;
  navScope: ControllerNavScope;
  toast: ControllerToast | null;
  mapping: ControllerMapping;
  setNavScope: (scope: ControllerNavScope) => void;
  setActionMapping: (action: ControllerAction, inputs: ControllerInputCode[]) => void;
  resetMapping: () => void;
}

export interface ControllerGlyphs {
  confirm: string;
  cancel: string;
  menu: string;
}

const STORAGE_KEY = 'libraryxxx.controller.mapping.v1';
const STICK_DEADZONE = 0.55;
const NAV_REPEAT_DELAY = 360;
const NAV_REPEAT_RATE = 110;

const NAV_ACTIONS: ControllerAction[] = ['ui_up', 'ui_down', 'ui_left', 'ui_right'];

const ACTION_LABELS: Record<ControllerAction, string> = {
  ui_up: 'Navegar arriba',
  ui_down: 'Navegar abajo',
  ui_left: 'Navegar izquierda',
  ui_right: 'Navegar derecha',
  ui_confirm: 'Confirmar',
  ui_cancel: 'Cancelar',
  ui_menu: 'Abrir menu',
};

export const CONTROLLER_ACTION_ORDER: ControllerAction[] = [
  'ui_up',
  'ui_down',
  'ui_left',
  'ui_right',
  'ui_confirm',
  'ui_cancel',
  'ui_menu',
];

export const CONTROLLER_INPUT_OPTIONS: Array<{ value: ControllerInputCode; label: string }> = [
  { value: 'dpad_up', label: 'D-Pad Arriba' },
  { value: 'dpad_down', label: 'D-Pad Abajo' },
  { value: 'dpad_left', label: 'D-Pad Izquierda' },
  { value: 'dpad_right', label: 'D-Pad Derecha' },
  { value: 'left_stick_up', label: 'Stick Izq. Arriba' },
  { value: 'left_stick_down', label: 'Stick Izq. Abajo' },
  { value: 'left_stick_left', label: 'Stick Izq. Izquierda' },
  { value: 'left_stick_right', label: 'Stick Izq. Derecha' },
  { value: 'button_south', label: 'Boton Sur (A / Cross)' },
  { value: 'button_east', label: 'Boton Este (B / Circle)' },
  { value: 'button_west', label: 'Boton Oeste (X / Square)' },
  { value: 'button_north', label: 'Boton Norte (Y / Triangle)' },
  { value: 'start', label: 'Start / Options' },
  { value: 'select', label: 'Select / Share' },
  { value: 'left_shoulder', label: 'L1 / LB' },
  { value: 'right_shoulder', label: 'R1 / RB' },
];

const DEFAULT_MAPPING: ControllerMapping = {
  ui_up: ['dpad_up', 'left_stick_up'],
  ui_down: ['dpad_down', 'left_stick_down'],
  ui_left: ['dpad_left', 'left_stick_left'],
  ui_right: ['dpad_right', 'left_stick_right'],
  ui_confirm: ['button_south'],
  ui_cancel: ['button_east'],
  ui_menu: ['start'],
};

const ControllerContext = createContext<ControllerContextValue | null>(null);

type ActionListener = (event: ControllerActionEvent) => void;
const actionListeners = new Set<ActionListener>();

function sanitizeMapping(candidate: unknown): ControllerMapping {
  if (!candidate || typeof candidate !== 'object') return DEFAULT_MAPPING;

  const safe = { ...DEFAULT_MAPPING } as ControllerMapping;

  for (const action of CONTROLLER_ACTION_ORDER) {
    const value = (candidate as Record<string, unknown>)[action];
    if (!Array.isArray(value)) continue;

    const cleaned = value
      .filter((item): item is ControllerInputCode => CONTROLLER_INPUT_OPTIONS.some(opt => opt.value === item))
      .slice(0, 2);

    if (cleaned.length > 0) safe[action] = cleaned;
  }

  return safe;
}

function loadMapping(): ControllerMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MAPPING;
    return sanitizeMapping(JSON.parse(raw));
  } catch {
    return DEFAULT_MAPPING;
  }
}

function detectControllerFamily(id: string): ControllerFamily {
  const normalized = id.toLowerCase();
  if (normalized.includes('xbox') || normalized.includes('xinput') || normalized.includes('microsoft')) return 'xbox';
  if (normalized.includes('playstation') || normalized.includes('dualshock') || normalized.includes('dualsense') || normalized.includes('sony')) return 'playstation';
  if (normalized.includes('nintendo') || normalized.includes('switch') || normalized.includes('joy-con') || normalized.includes('pro controller')) return 'nintendo';
  return 'generic';
}

function normalizeInputs(gp: Gamepad): Set<ControllerInputCode> {
  const pressed = new Set<ControllerInputCode>();
  const buttons = gp.buttons;
  const axes = gp.axes;

  if (buttons[12]?.pressed) pressed.add('dpad_up');
  if (buttons[13]?.pressed) pressed.add('dpad_down');
  if (buttons[14]?.pressed) pressed.add('dpad_left');
  if (buttons[15]?.pressed) pressed.add('dpad_right');

  if ((axes[0] ?? 0) <= -STICK_DEADZONE) pressed.add('left_stick_left');
  if ((axes[0] ?? 0) >= STICK_DEADZONE) pressed.add('left_stick_right');
  if ((axes[1] ?? 0) <= -STICK_DEADZONE) pressed.add('left_stick_up');
  if ((axes[1] ?? 0) >= STICK_DEADZONE) pressed.add('left_stick_down');

  if (buttons[0]?.pressed) pressed.add('button_south');
  if (buttons[1]?.pressed) pressed.add('button_east');
  if (buttons[2]?.pressed) pressed.add('button_west');
  if (buttons[3]?.pressed) pressed.add('button_north');
  if (buttons[4]?.pressed) pressed.add('left_shoulder');
  if (buttons[5]?.pressed) pressed.add('right_shoulder');
  if (buttons[8]?.pressed) pressed.add('select');
  if (buttons[9]?.pressed) pressed.add('start');

  return pressed;
}

function cycleNavScope(scope: ControllerNavScope): ControllerNavScope {
  if (scope === 'content') return 'sidebar';
  if (scope === 'sidebar') return 'topbar';
  return 'content';
}
export function ControllerProvider({ children }: PropsWithChildren) {
  const [controllers, setControllers] = useState<ControllerDevice[]>([]);
  const [activeControllerId, setActiveControllerId] = useState<string | null>(null);
  const [navScope, setNavScope] = useState<ControllerNavScope>('content');
  const [toast, setToast] = useState<ControllerToast | null>(null);
  const [mapping, setMapping] = useState<ControllerMapping>(() => loadMapping());

  const mappingRef = useRef(mapping);
  const holdStateRef = useRef<Map<string, { start: number; last: number }>>(new Map());
  const prevInputsRef = useRef<Map<number, Set<ControllerInputCode>>>(new Map());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    mappingRef.current = mapping;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  }, [mapping]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timeout);
  }, [toast]);

  const emitAction = useCallback((event: ControllerActionEvent) => {
    for (const listener of actionListeners) {
      listener(event);
    }
  }, []);

  const emitToast = useCallback((message: string, type: 'connected' | 'disconnected') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  const controllersFromGamepads = useCallback((): ControllerDevice[] => {
    return Array.from(navigator.getGamepads())
      .filter((gp): gp is Gamepad => Boolean(gp && gp.connected))
      .map(gp => ({
        id: gp.id,
        index: gp.index,
        name: gp.id || `Controller ${gp.index + 1}`,
        family: detectControllerFamily(gp.id),
      }))
      .sort((a, b) => a.index - b.index);
  }, []);

  const refreshControllers = useCallback(() => {
    const nextControllers = controllersFromGamepads();
    setControllers(nextControllers);

    if (nextControllers.length === 0) {
      setActiveControllerId(null);
      return;
    }

    setActiveControllerId(prev => {
      if (prev && nextControllers.some(ctrl => ctrl.id === prev)) return prev;
      return nextControllers[0].id;
    });
  }, [controllersFromGamepads]);

  useEffect(() => {
    const onConnected = (event: Event) => {
      const gpEvent = event as GamepadEvent;
      const name = gpEvent.gamepad?.id || `Controller ${gpEvent.gamepad?.index ?? 0}`;
      emitToast(`Controller connected: ${name}`, 'connected');
      refreshControllers();
    };

    const onDisconnected = (event: Event) => {
      const gpEvent = event as GamepadEvent;
      const name = gpEvent.gamepad?.id || `Controller ${gpEvent.gamepad?.index ?? 0}`;
      emitToast(`Controller disconnected: ${name}`, 'disconnected');
      refreshControllers();
      prevInputsRef.current.delete(gpEvent.gamepad?.index ?? -1);
    };

    window.addEventListener('gamepadconnected', onConnected);
    window.addEventListener('gamepaddisconnected', onDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', onConnected);
      window.removeEventListener('gamepaddisconnected', onDisconnected);
    };
  }, [emitToast, refreshControllers]);

  useEffect(() => {
    let running = true;

    const loop = (now: number) => {
      if (!running) return;
      const gamepads = Array.from(navigator.getGamepads()).filter((gp): gp is Gamepad => Boolean(gp && gp.connected));

      setControllers(prev => {
        if (prev.length !== gamepads.length) return controllersFromGamepads();
        return prev;
      });

      for (const gp of gamepads) {
        const pressed = normalizeInputs(gp);
        const prev = prevInputsRef.current.get(gp.index) ?? new Set<ControllerInputCode>();

        for (const action of CONTROLLER_ACTION_ORDER) {
          const mappedInputs = mappingRef.current[action] ?? [];
          const isPressed = mappedInputs.some(input => pressed.has(input));
          const wasPressed = mappedInputs.some(input => prev.has(input));

          if (!isPressed) {
            holdStateRef.current.delete(`${gp.index}:${action}`);
            continue;
          }

          if (action === 'ui_menu' && !wasPressed) {
            setNavScope(prev => cycleNavScope(prev));
          }

          if (NAV_ACTIONS.includes(action)) {
            const key = `${gp.index}:${action}`;
            const holdState = holdStateRef.current.get(key);

            if (!holdState || !wasPressed) {
              holdStateRef.current.set(key, { start: now, last: now });
              emitAction({ action, controllerId: gp.id, controllerIndex: gp.index, timestamp: now });
              setActiveControllerId(gp.id);
              continue;
            }

            if (now - holdState.start >= NAV_REPEAT_DELAY && now - holdState.last >= NAV_REPEAT_RATE) {
              holdStateRef.current.set(key, { ...holdState, last: now });
              emitAction({ action, controllerId: gp.id, controllerIndex: gp.index, timestamp: now });
              setActiveControllerId(gp.id);
            }

            continue;
          }

          if (!wasPressed) {
            emitAction({ action, controllerId: gp.id, controllerIndex: gp.index, timestamp: now });
            setActiveControllerId(gp.id);
          }
        }

        prevInputsRef.current.set(gp.index, pressed);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [controllersFromGamepads, emitAction]);

  const setActionMapping = useCallback((action: ControllerAction, inputs: ControllerInputCode[]) => {
    setMapping(prev => ({
      ...prev,
      [action]: inputs.filter(Boolean).slice(0, 2),
    }));
  }, []);

  const resetMapping = useCallback(() => {
    setMapping(DEFAULT_MAPPING);
  }, []);

  const value = useMemo<ControllerContextValue>(
    () => ({
      controllers,
      activeControllerId,
      navScope,
      toast,
      mapping,
      setNavScope,
      setActionMapping,
      resetMapping,
    }),
    [controllers, activeControllerId, navScope, toast, mapping, setActionMapping, resetMapping]
  );

  return <ControllerContext.Provider value={value}>{children}</ControllerContext.Provider>;
}

function useControllerContext() {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error('useControllerContext must be used inside ControllerProvider.');
  }
  return context;
}

export function useControllerState() {
  return useControllerContext();
}

export function useControllerActions(handler: (event: ControllerActionEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const listener: ActionListener = event => handler(event);
    actionListeners.add(listener);
    return () => {
      actionListeners.delete(listener);
    };
  }, [handler, enabled]);
}

export function getControllerActionLabel(action: ControllerAction): string {
  return ACTION_LABELS[action];
}

export function getControllerGlyphs(family: ControllerFamily | null | undefined): ControllerGlyphs {
  if (family === 'playstation') {
    return { confirm: 'Cross', cancel: 'Circle', menu: 'Options' };
  }
  if (family === 'nintendo') {
    return { confirm: 'B', cancel: 'A', menu: '+' };
  }
  return { confirm: 'A', cancel: 'B', menu: 'Menu' };
}














