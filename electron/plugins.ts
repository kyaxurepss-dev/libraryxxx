import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import type { Database } from 'better-sqlite3';

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    main: string;
    author?: string;
}

export interface PluginData extends PluginManifest {
    enabled: boolean;
    error?: string;
}

export class PluginManager {
    private pluginsDir: string;
    private db: Database;
    private loadedPlugins: Map<string, PluginData> = new Map();

    constructor(db: Database) {
        this.db = db;
        this.pluginsDir = path.join(app.getPath('userData'), 'plugins');

        // Ensure table exists for plugin settings
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS plugins (
                id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 0
            )
        `);

        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }
    }

    public async loadPlugins() {
        this.loadedPlugins.clear();

        try {
            const dirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const dir of dirs) {
                const manifestPath = path.join(this.pluginsDir, dir, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const raw = fs.readFileSync(manifestPath, 'utf-8');
                        const manifest: PluginManifest = JSON.parse(raw);

                        // Check if enabled in DB
                        const row = this.db.prepare('SELECT enabled FROM plugins WHERE id = ?').get(manifest.id) as { enabled: number } | undefined;
                        const enabled = row ? row.enabled === 1 : false;

                        this.loadedPlugins.set(manifest.id, {
                            ...manifest,
                            enabled
                        });

                        if (enabled) {
                            await this.initPlugin(manifest.id);
                        }
                    } catch (e: any) {
                        console.error(`Failed to load plugin manifest in ${dir}:`, e);
                    }
                }
            }
        } catch (e: any) {
            console.error('Failed to read plugins directory:', e);
        }
    }

    private async initPlugin(id: string) {
        const plugin = this.loadedPlugins.get(id);
        if (!plugin) return;

        try {
            const mainPath = path.join(this.pluginsDir, id, plugin.main);
            if (!fs.existsSync(mainPath)) {
                throw new Error(`Main file not found: ${plugin.main}`);
            }

            // In a real app we'd load the module, here as a minimal implementation we just register it
            // const module = await import(fileURLToPath(pathToFileURL(mainPath).href));
            // if (module.activate) await module.activate();

            console.log(`[PluginManager] Plugin activated: ${plugin.name}`);
        } catch (e: any) {
            console.error(`Failed to init plugin ${id}:`, e);
            plugin.error = e.message;
        }
    }

    public getPlugins(): PluginData[] {
        return Array.from(this.loadedPlugins.values());
    }

    public async togglePlugin(id: string) {
        const plugin = this.loadedPlugins.get(id);
        if (!plugin) return;

        const newEnabled = !plugin.enabled;

        // Update DB
        this.db.prepare('INSERT OR REPLACE INTO plugins (id, enabled) VALUES (?, ?)').run(id, newEnabled ? 1 : 0);

        plugin.enabled = newEnabled;

        if (newEnabled) {
            await this.initPlugin(id);
        } else {
            // Deactivate
            console.log(`[PluginManager] Plugin deactivated: ${plugin.name}`);
        }

        return plugin;
    }
}

export function initPlugins(db: Database) {
    const manager = new PluginManager(db);
    manager.loadPlugins();

    ipcMain.handle('plugins:get', () => manager.getPlugins());
    ipcMain.handle('plugins:toggle', async (_e, id: string) => {
        await manager.togglePlugin(id);
        return manager.getPlugins();
    });
}
