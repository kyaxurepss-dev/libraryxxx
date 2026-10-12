export type ThemeId = 'default' | 'minimal' | 'neon' | 'steamdeck';

export interface ThemeConfig {
    id: ThemeId;
    name: string;
    description: string;
    colors: {
        primary: string;
        accent: string;
    };
}

export const themes: Record<ThemeId, ThemeConfig> = {
    default: {
        id: 'default',
        name: 'Archive',
        description: 'Ink-dark editorial baseline. Vermilion for action only.',
        colors: {
            primary: '#0a0b0d',
            accent: '#ff5a4f',
        }
    },
    minimal: {
        id: 'minimal',
        name: 'OLED',
        description: 'Pure black material, white action. For OLED screens.',
        colors: {
            primary: '#000000',
            accent: '#f5f5f5',
        }
    },
    neon: {
        id: 'neon',
        name: 'Signal',
        description: 'Deep indigo ink with a rose signal accent.',
        colors: {
            primary: '#0b0a14',
            accent: '#ff2d78',
        }
    },
    steamdeck: {
        id: 'steamdeck',
        name: 'Handheld',
        description: 'Steel grey material with a cool blue action color.',
        colors: {
            primary: '#131518',
            accent: '#4da3ff',
        }
    }
};