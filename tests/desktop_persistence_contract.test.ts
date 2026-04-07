import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('desktop persistence contract', () => {
  it('autonomy and proposal IPC writes keep currentGameStateJson on the canonical serializer path', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );

    expect(source).toContain('function readCanonicalCurrentState(sim)');
    expect(source).toContain('function writeCanonicalCurrentState(sim, state, excludeSender)');
    expect(source).not.toContain('currentGameStateJson = JSON.stringify(state)');
    expect(source).toContain('writeCanonicalCurrentState(sim, state);');
    expect(source).toContain('writeCanonicalCurrentState(sim, state, event.sender);');
  });

  it('autonomy readback uses canonical deserialization instead of raw JSON.parse', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );

    const autonomyHandlerStart = source.indexOf("ipcMain.handle('get-autonomy-state'");
    const autonomyHandlerEnd = source.indexOf("ipcMain.handle('set-autonomy-level'");
    const autonomyHandler = source.slice(autonomyHandlerStart, autonomyHandlerEnd);

    expect(autonomyHandler).toContain('const sim = getDesktopSim();');
    expect(autonomyHandler).toContain('const state = readCanonicalCurrentState(sim);');
    expect(autonomyHandler).not.toContain('JSON.parse(currentGameStateJson)');
  });
});
