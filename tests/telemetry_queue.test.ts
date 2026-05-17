import { describe, expect, it } from 'vitest';
import {
    CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY,
    CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY,
    createCrashDiagnosticsQueue,
} from '../src/ui/map/services/telemetry/telemetryQueue';
import { uploadCrashDiagnostics } from '../src/ui/map/services/telemetry/telemetryUploadAdapter';

function createMemoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    };
}

describe('local-first crash diagnostics queue', () => {
    it('is off by default and stores no crash report before explicit consent', () => {
        const storage = createMemoryStorage();
        const queue = createCrashDiagnosticsQueue({ storage });

        const result = queue.recordCrash({
            appVersion: '0.9.6-alpha.1',
            platform: 'desktop',
            osFamily: 'windows',
            uiSurface: 'startup',
            errorCategory: 'unhandled_error',
            stack: 'Error: launch failed',
        });

        expect(queue.isConsentEnabled()).toBe(false);
        expect(result).toEqual({ stored: false, reason: 'consent_disabled' });
        expect(storage.getItem(CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY)).toBeNull();
    });

    it('stores a bounded local artifact with approved fields after consent', () => {
        const storage = createMemoryStorage();
        const queue = createCrashDiagnosticsQueue({ storage, maxReports: 2, sessionId: 'session-local' });
        queue.setConsentEnabled(true);

        queue.recordCrash({
            appVersion: '0.9.6-alpha.1',
            platform: 'desktop',
            osFamily: 'windows',
            uiSurface: 'settings',
            errorCategory: 'unhandled_rejection',
            stack: 'Error: failed at C:\\Users\\Mina\\save.json',
        });
        queue.recordCrash({
            appVersion: '0.9.6-alpha.1',
            platform: 'desktop',
            osFamily: 'windows',
            uiSurface: 'map',
            errorCategory: 'unhandled_error',
            stack: 'Error: second',
        });
        queue.recordCrash({
            appVersion: '0.9.6-alpha.1',
            platform: 'desktop',
            osFamily: 'windows',
            uiSurface: 'warroom',
            errorCategory: 'unhandled_error',
            stack: 'Error: third',
        });

        const reports = queue.listReports();
        expect(storage.getItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY)).toBe('1');
        expect(reports).toHaveLength(2);
        expect(reports.map((report) => report.uiSurface)).toEqual(['map', 'warroom']);
        expect(reports[0]).toEqual({
            schemaVersion: 1,
            appVersion: '0.9.6-alpha.1',
            platform: 'desktop',
            osFamily: 'windows',
            uiSurface: 'map',
            errorCategory: 'unhandled_error',
            redactedStack: 'Error: second',
            sessionId: 'session-local',
            sequence: 2,
        });
        expect(JSON.stringify(reports)).not.toContain('Mina');
        expect(JSON.stringify(reports)).not.toContain('timestamp');
    });

    it('withdraws consent and deletes local reports without touching upload', () => {
        const storage = createMemoryStorage();
        const queue = createCrashDiagnosticsQueue({ storage, sessionId: 'session-local' });
        queue.setConsentEnabled(true);
        queue.recordCrash({
            appVersion: '0.9.6-alpha.1',
            platform: 'browser',
            osFamily: 'linux',
            uiSurface: 'map',
            errorCategory: 'unhandled_error',
            stack: 'Error: local only',
        });

        queue.setConsentEnabled(false);

        expect(queue.isConsentEnabled()).toBe(false);
        expect(queue.listReports()).toEqual([]);
        expect(storage.getItem(CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY)).toBeNull();
        expect(uploadCrashDiagnostics(queue.exportReports())).toEqual({ ok: false, reason: 'disabled' });
    });
});
