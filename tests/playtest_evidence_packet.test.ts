import { describe, expect, it } from 'vitest';
import { AUDIO_PREFERENCES_STORAGE_KEY } from '../src/ui/map/audio/audio_preferences';
import { LOCALE_STORAGE_KEY } from '../src/ui/map/i18n';
import {
    CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY,
    createCrashDiagnosticsQueue,
} from '../src/ui/map/services/telemetry/telemetryQueue';
import {
    AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY,
    buildLocalPlaytestEvidencePacket,
    clearPlaytestEvidenceBreadcrumbs,
    listPlaytestEvidenceBreadcrumbs,
    recordPlaytestEvidenceBreadcrumb,
} from '../src/ui/map/services/telemetry/playtestEvidencePacket';
import {
    COLORBLIND_PRESET_STORAGE_KEY,
    REDUCE_MOTION_STORAGE_KEY,
} from '../src/ui/shared/factionPalette';

function createMemoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
        removeItem: (key: string) => {
            values.delete(key);
        },
    };
}

describe('local playtest evidence packet', () => {
    it('keeps breadcrumbs default-off until diagnostics consent is enabled', () => {
        const storage = createMemoryStorage();

        const result = recordPlaytestEvidenceBreadcrumb({
            surface: 'settings',
            action: 'open_settings',
        }, { storage });

        expect(result).toEqual({ stored: false, reason: 'consent_disabled' });
        expect(storage.getItem(AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY)).toBeNull();
    });

    it('exports bounded local UI evidence with preferences and redacted crash reports', () => {
        const storage = createMemoryStorage();
        const queue = createCrashDiagnosticsQueue({ storage, sessionId: 'playtest-session' });
        queue.setConsentEnabled(true);
        storage.setItem(LOCALE_STORAGE_KEY, 'bcs');
        storage.setItem(REDUCE_MOTION_STORAGE_KEY, '1');
        storage.setItem(COLORBLIND_PRESET_STORAGE_KEY, 'deuteranopia');
        storage.setItem(AUDIO_PREFERENCES_STORAGE_KEY, JSON.stringify({ muted: false, masterVolume: 0.75 }));

        queue.recordCrash({
            appVersion: '0.9.9-test',
            platform: 'desktop',
            osFamily: 'windows',
            uiSurface: 'army hq',
            errorCategory: 'unhandled_error',
            stack: 'Error: failed at C:\\Users\\Mina\\scenario_dump.json',
        });
        recordPlaytestEvidenceBreadcrumb({ surface: 'desk', action: 'route_desk' }, { storage });
        recordPlaytestEvidenceBreadcrumb({ surface: 'army hq', action: 'route_army_hq' }, { storage });
        recordPlaytestEvidenceBreadcrumb({ surface: 'settings', action: 'export_playtest_evidence' }, { storage });

        const packet = buildLocalPlaytestEvidencePacket({
            appVersion: '0.9.9-test',
            storage,
            crashReports: queue.exportReports(),
            currentSurface: 'settings',
            platform: 'desktop',
            osFamily: 'windows',
        });
        const serialized = JSON.stringify(packet);

        expect(packet).toEqual({
            schemaVersion: 1,
            packetKind: 'local_playtest_evidence',
            appVersion: '0.9.9-test',
            platform: 'desktop',
            osFamily: 'windows',
            currentSurface: 'settings',
            preferences: {
                locale: 'bcs',
                reduceMotion: true,
                colorblindPreset: 'deuteranopia',
                audio: { muted: false, masterVolume: 0.75 },
                crashDiagnosticsConsent: true,
            },
            counts: {
                breadcrumbs: 3,
                crashReports: 1,
            },
            breadcrumbs: [
                { schemaVersion: 1, sequence: 1, surface: 'desk', action: 'route_desk' },
                { schemaVersion: 1, sequence: 2, surface: 'army hq', action: 'route_army_hq' },
                { schemaVersion: 1, sequence: 3, surface: 'settings', action: 'export_playtest_evidence' },
            ],
            crashReports: [
                {
                    schemaVersion: 1,
                    appVersion: '0.9.9-test',
                    platform: 'desktop',
                    osFamily: 'windows',
                    uiSurface: 'army hq',
                    errorCategory: 'unhandled_error',
                    redactedStack: expect.any(String),
                    sessionId: 'playtest-session',
                    sequence: 1,
                },
            ],
        });
        expect(serialized).not.toContain('Mina');
        expect(serialized).not.toContain('C:\\Users');
        expect(serialized).not.toContain('scenario_dump');
        expect(serialized).not.toContain('timestamp');
        expect(serialized).not.toContain('generatedAt');
    });

    it('clears local playtest breadcrumbs without touching consent state', () => {
        const storage = createMemoryStorage();
        storage.setItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY, '1');
        recordPlaytestEvidenceBreadcrumb({ surface: 'records', action: 'route_records' }, { storage });

        clearPlaytestEvidenceBreadcrumbs({ storage });

        expect(listPlaytestEvidenceBreadcrumbs({ storage })).toEqual([]);
        expect(storage.getItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY)).toBe('1');
    });
});
