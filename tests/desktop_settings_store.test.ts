import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const require = createRequire(import.meta.url);

it('merges independent preference patches against the current native profile', () => {
    const profile = mkdtempSync(join(tmpdir(), 'awwv-settings-test-'));
    const app = { getPath: () => profile };
    const { loadSettings, saveSettings } = require('../src/desktop/settings_store.cjs');
    const futureSetting = { retained: true };
    try {
        expect(saveSettings(app, { futureSetting })).toBe(true);
        expect(saveSettings(app, { audioPreferences: { muted: true } }, {
            merge: true,
            audioDefaults: { masterVolume: .35, musicEnabled: false, musicVolume: .5, futureAudioKey: 'keep' },
        })).toBe(true);
        expect(saveSettings(app, { interfaceScale: 150 }, { merge: true })).toBe(true);
        expect(saveSettings(app, { audioPreferences: { musicEnabled: true, musicVolume: .65 } }, {
            merge: true,
            audioDefaults: { masterVolume: 1, muted: false },
        })).toBe(true);
        expect(loadSettings(app)).toMatchObject({
            futureSetting,
            interfaceScale: 150,
            audioPreferences: { muted: true, masterVolume: .35, musicEnabled: true, musicVolume: .65, futureAudioKey: 'keep' },
        });
        expect(saveSettings(app, { interfaceScale: 125 })).toBe(true);
        expect(loadSettings(app).audioPreferences).toBeUndefined();
    } finally {
        rmSync(profile, { recursive: true, force: true });
    }
});
