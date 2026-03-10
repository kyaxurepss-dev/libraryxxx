import type Database from 'better-sqlite3';

export interface Emulator {
    id: number;
    name: string;
    exe_path: string;
    args_template: string;
    platforms: string | null;
}

export function getEmulators(db: Database.Database): Emulator[] {
    return db.prepare('SELECT * FROM emulators ORDER BY name ASC').all() as Emulator[];
}

export function addEmulator(db: Database.Database, data: Omit<Emulator, 'id'>): number {
    const result = db.prepare(`
        INSERT INTO emulators (name, exe_path, args_template, platforms)
        VALUES (@name, @exe_path, @args_template, @platforms)
    `).run({
        name: data.name,
        exe_path: data.exe_path,
        args_template: data.args_template,
        platforms: data.platforms ?? null,
    });
    return Number(result.lastInsertRowid);
}

export function updateEmulator(db: Database.Database, id: number, data: Partial<Omit<Emulator, 'id'>>) {
    const sets: string[] = [];
    const values: any = { id };
    for (const [k, v] of Object.entries(data)) {
        sets.push(`${k} = @${k}`);
        values[k] = v;
    }
    if (sets.length === 0) return;
    db.prepare(`UPDATE emulators SET ${sets.join(', ')} WHERE id = @id`).run(values);
}

export function deleteEmulator(db: Database.Database, id: number) {
    db.prepare('DELETE FROM emulators WHERE id = ?').run(id);
}
