import { spawn } from 'child_process';
const runningGames = new Map();
export function killAllGames(db) {
    const nowMs = Date.now();
    for (const [gameId, { process: gameProcess, startTime, sessionId }] of runningGames.entries()) {
        try {
            if (gameProcess.pid) {
                spawn('taskkill', ['/pid', String(gameProcess.pid), '/f', '/t']);
            }
            else {
                gameProcess.kill();
            }
            const elapsed = Math.max(0, Math.floor((nowMs - startTime) / 60000));
            db.prepare(`
              UPDATE games
              SET playtime_minutes = playtime_minutes + ?,
                  last_played = datetime('now')
              WHERE id = ?
            `).run(elapsed, gameId);
            db.prepare(`
              UPDATE play_sessions
              SET ended_at = datetime('now'), duration_minutes = ?
              WHERE id = ?
            `).run(elapsed, sessionId);
        }
        catch (error) {
            console.error(`Failed to kill game ${gameId}:`, error);
        }
    }
    runningGames.clear();
}
export function launchGame(gameId, exePath, db, launchOptions = '') {
    if (runningGames.has(gameId))
        return false;
    const startTime = Date.now();
    // Check for emulator
    const game = db.prepare('SELECT emulator_id, rom_path FROM games WHERE id = ?').get(gameId);
    let targetExe = exePath;
    let args = [];
    if (game?.emulator_id && game.rom_path) {
        const emulator = db.prepare('SELECT exe_path, args_template FROM emulators WHERE id = ?').get(game.emulator_id);
        if (emulator) {
            targetExe = emulator.exe_path;
            const template = emulator.args_template || '"{rom_path}"';
            // Parse arguments: handle quotes properly (a simple split on space isn't enough for paths with spaces)
            // Replace {rom_path} with the actual path
            const filledTemplate = template.replace('{rom_path}', game.rom_path);
            // Simple space-aware arg parser
            const argRegex = /[^\s"]+|"([^"]*)"/g;
            let match;
            while ((match = argRegex.exec(filledTemplate)) !== null) {
                args.push(match[1] ? match[1] : match[0]); // match[1] has the unquoted string, match[0] has unquoted words
            }
        }
    }
    else {
        args = launchOptions?.trim() ? launchOptions.trim().split(/\s+/) : [];
    }
    const cwd = targetExe.substring(0, targetExe.lastIndexOf('\\')) || targetExe.substring(0, targetExe.lastIndexOf('/'));
    const gameProcess = spawn(targetExe, args, {
        detached: true,
        cwd,
    });
    // Record session start
    const sessionResult = db.prepare(`
    INSERT INTO play_sessions (game_id, started_at) VALUES (?, datetime('now'))
  `).run(gameId);
    const sessionId = Number(sessionResult.lastInsertRowid);
    runningGames.set(gameId, { process: gameProcess, startTime, sessionId });
    gameProcess.on('exit', () => {
        if (!runningGames.has(gameId))
            return; // Already cleaned up e.g. on quit
        const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 60000));
        db.prepare(`
      UPDATE games
      SET playtime_minutes = playtime_minutes + ?,
          last_played = datetime('now')
      WHERE id = ?
    `).run(elapsed, gameId);
        db.prepare(`
      UPDATE play_sessions
      SET ended_at = datetime('now'), duration_minutes = ?
      WHERE id = ?
    `).run(elapsed, sessionId);
        runningGames.delete(gameId);
    });
    gameProcess.on('error', () => {
        if (!runningGames.has(gameId))
            return;
        db.prepare(`
      UPDATE play_sessions SET ended_at = datetime('now'), duration_minutes = 0 WHERE id = ?
    `).run(sessionId);
        runningGames.delete(gameId);
    });
    db.prepare("UPDATE games SET last_played = datetime('now') WHERE id = ?").run(gameId);
    return true;
}
export function getRunningGame(gameId) {
    const running = runningGames.get(gameId);
    if (!running)
        return null;
    return { startTime: running.startTime };
}
//# sourceMappingURL=launcher.js.map