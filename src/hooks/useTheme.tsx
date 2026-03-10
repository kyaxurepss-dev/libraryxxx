import { useState, useEffect, createContext, useContext } from 'react';
import { themes } from '../lib/themes';
import type { ThemeId } from '../lib/themes';

interface ThemeContextType {
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'default',
    setTheme: () => { }
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeId>('default');

    useEffect(() => {
        // Load initial theme
        window.electron.getSetting('app_theme').then((savedTheme: string | null) => {
            if (savedTheme && themes[savedTheme as ThemeId]) {
                setThemeState(savedTheme as ThemeId);
            }
        });
    }, []);

    useEffect(() => {
        // Apply theme class to html/body
        const root = document.documentElement;

        // Remove all theme classes
        Object.keys(themes).forEach(t => {
            if (t !== 'default') {
                root.classList.remove(`theme-${t}`);
            }
        });

        // Add active theme class
        if (theme !== 'default') {
            root.classList.add(`theme-${theme}`);
        }

    }, [theme]);

    const setTheme = (newTheme: ThemeId) => {
        setThemeState(newTheme);
        window.electron.setSetting('app_theme', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
