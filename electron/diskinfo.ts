import fs from 'fs';
import path from 'path';

/**
 * Calculate the total size of a directory recursively (in bytes).
 */
export function getFolderSize(folderPath: string): number {
    if (!fs.existsSync(folderPath)) return 0;

    let totalSize = 0;

    function walk(dir: string) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                try {
                    if (entry.isDirectory()) {
                        walk(fullPath);
                    } else if (entry.isFile()) {
                        totalSize += fs.statSync(fullPath).size;
                    }
                } catch {
                    // Skip inaccessible files
                }
            }
        } catch {
            // Skip inaccessible directories
        }
    }

    walk(folderPath);
    return totalSize;
}

/**
 * Format bytes into human-readable string.
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Delete a game folder recursively.
 */
export function deleteGameFolder(folderPath: string): boolean {
    if (!fs.existsSync(folderPath)) return false;
    fs.rmSync(folderPath, { recursive: true, force: true });
    return true;
}
