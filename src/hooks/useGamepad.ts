import { useEffect, useRef, useCallback } from 'react';

export interface GamepadState {
    connected: boolean;
    buttons: boolean[];
    axes: number[];
}

export type GamepadAction =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'confirm'
    | 'back'
    | 'menu';

type ActionHandler = (action: GamepadAction) => void;

const REPEAT_DELAY = 500;   // ms before repeating directional input
const REPEAT_RATE = 120;   // ms between repeats

export function useGamepad(onAction: ActionHandler) {
    const rafRef = useRef<number>(0);
    const lastAction = useRef<GamepadAction | null>(null);
    const lastTime = useRef<number>(0);
    const repeatStart = useRef<number>(0);

    const getAction = useCallback((gp: Gamepad): GamepadAction | null => {
        const { buttons, axes } = gp;

        // Standard layout mapping (Xbox / DualShock / DualSense)
        const btnA = buttons[0]?.pressed;  // Cross / A
        const btnB = buttons[1]?.pressed;  // Circle / B
        const btnStart = buttons[9]?.pressed; // Start / Options

        const dUp = buttons[12]?.pressed || axes[1] < -0.5;
        const dDown = buttons[13]?.pressed || axes[1] > 0.5;
        const dLeft = buttons[14]?.pressed || axes[0] < -0.5;
        const dRight = buttons[15]?.pressed || axes[0] > 0.5;

        if (dUp) return 'up';
        if (dDown) return 'down';
        if (dLeft) return 'left';
        if (dRight) return 'right';
        if (btnA) return 'confirm';
        if (btnB) return 'back';
        if (btnStart) return 'menu';
        return null;
    }, []);

    useEffect(() => {
        let running = true;

        const loop = (now: number) => {
            if (!running) return;
            rafRef.current = requestAnimationFrame(loop);

            const gamepads = navigator.getGamepads();
            const gp = Array.from(gamepads).find(g => g && g.connected);
            if (!gp) { lastAction.current = null; return; }

            const action = getAction(gp);

            if (!action) {
                lastAction.current = null;
                return;
            }

            if (action !== lastAction.current) {
                // New action — fire immediately
                onAction(action);
                lastAction.current = action;
                repeatStart.current = now;
                lastTime.current = now;
                return;
            }

            // Same action held — repeat after delay
            if (now - repeatStart.current > REPEAT_DELAY && now - lastTime.current > REPEAT_RATE) {
                onAction(action);
                lastTime.current = now;
            }
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            running = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, [onAction, getAction]);
}
