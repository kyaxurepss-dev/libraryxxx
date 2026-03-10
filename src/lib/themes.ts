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
        name: 'Dark Classic',
        description: 'The default modern dark blue aesthetic.',
        colors: {
            primary: '#071224',
            accent: '#3b82f6',
        }
    },
    steamdeck: {
        id: 'steamdeck',
        name: 'Handheld',
        description: 'Inspired by the Steam Deck interface.',
        colors: {
            primary: '#1a1b1c',
            accent: '#1a9fff',
        }
    },
    minimal: {
        id: 'minimal',
        name: 'Minimal Black',
        description: 'Pure black backgrounds with white accents for OLED screens.',
        colors: {
            primary: '#000000',
            accent: '#ffffff',
        }
    },
    neon: {
        id: 'neon',
        name: 'Cyber Neon',
        description: 'High contrast synthwave vibes.',
        colors: {
            primary: '#090914',
            accent: '#f43f5e',
        }
    }
};
