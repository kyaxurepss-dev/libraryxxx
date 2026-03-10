export function getEmulators(db) {
    return db.prepare('SELECT * FROM emulators ORDER BY name ASC').all();
}
export function addEmulator(db, data) {
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
export function updateEmulator(db, id, data) {
    const sets = [];
    const values = { id };
    for (const [k, v] of Object.entries(data)) {
        sets.push(`${k} = @${k}`);
        values[k] = v;
    }
    if (sets.length === 0)
        return;
    db.prepare(`UPDATE emulators SET ${sets.join(', ')} WHERE id = @id`).run(values);
}
export function deleteEmulator(db, id) {
    db.prepare('DELETE FROM emulators WHERE id = ?').run(id);
}
//# sourceMappingURL=emulators.js.map