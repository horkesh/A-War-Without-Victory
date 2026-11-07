import { readFileSync } from 'node:fs';
import { createContext, runInContext, runInNewContext } from 'node:vm';
import { afterEach, expect, it, vi } from 'vitest';

const source = readFileSync('src/desktop/electron-main.cjs', 'utf8');
const probeSource = source.slice(
    source.indexOf('function armGameStatePushProbe('),
    source.indexOf('function armTurnReportPushProbe('),
);

function createProbeFixture() {
    const listeners = new Set<(state: string) => void>();
    const renderer = createContext({
        window: {
            location: { search: '?desktop_window=operational' },
            awwv: {
                subscribeGameStateUpdated(listener: (state: string) => void) {
                    listeners.add(listener);
                    return () => listeners.delete(listener);
                },
            },
        },
        setTimeout,
        clearTimeout,
    });
    const win = {
        webContents: {
            async executeJavaScript(code: string) {
                const result = runInContext(code, renderer);
                if (result === true) {
                    // Electron arms a promise in the page before collecting it.
                    // Observe its rejection here so the regression is reported by collect.
                    runInContext('window.__awwvProbeGameStatePush.catch(() => {})', renderer);
                }
                return result;
            },
        },
    };
    const functions = runInNewContext(
        probeSource + '\n({ armGameStatePushProbe, collectGameStatePushProbe });',
        { setTimeout, clearTimeout },
    );
    return {
        arm: () => functions.armGameStatePushProbe(win),
        collect: () => functions.collectGameStatePushProbe(win, 'operational', 'packaged tactical map window'),
        send() {
            const json = JSON.stringify({ meta: { player_faction: 'RBiH', turn: 0 } });
            for (const listener of listeners) listener(json);
        },
        listeners,
    };
}

afterEach(() => vi.useRealTimers());

it('accepts a state update dispatched after a slow probe setup', async () => {
    vi.useFakeTimers();
    const fixture = createProbeFixture();
    await fixture.arm();
    await vi.advanceTimersByTimeAsync(5_001);
    fixture.send();

    await expect(fixture.collect()).resolves.toEqual({ route_mode: 'operational', player_faction: 'RBiH', turn: 0 });
    expect(fixture.listeners.size).toBe(0);
});

it('still rejects an absent update with a bounded, window-specific wait after dispatch', async () => {
    vi.useFakeTimers();
    const fixture = createProbeFixture();
    await fixture.arm();
    const pending = fixture.collect();
    const expected = expect(pending).rejects.toThrow('packaged tactical map window timed out waiting for game-state-updated');
    await vi.advanceTimersByTimeAsync(5_000);
    await expected;
});
