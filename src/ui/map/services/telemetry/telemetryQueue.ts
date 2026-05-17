import { redactCrashDiagnosticText } from './telemetryRedaction';

export const CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY = 'awwv.crashDiagnostics.consent.v1';
export const CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY = 'awwv.crashDiagnostics.queue.v1';
export const CRASH_DIAGNOSTICS_SESSION_STORAGE_KEY = 'awwv.crashDiagnostics.session.v1';

const DEFAULT_MAX_REPORTS = 20;
const SCHEMA_VERSION = 1;

export type CrashDiagnosticsPlatform = 'desktop' | 'browser' | 'unknown';
export type CrashDiagnosticsOsFamily = 'windows' | 'macos' | 'linux' | 'unknown';
export type CrashDiagnosticsErrorCategory = 'unhandled_error' | 'unhandled_rejection' | 'manual';

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface CrashDiagnosticInput {
    appVersion: string;
    platform: CrashDiagnosticsPlatform;
    osFamily: CrashDiagnosticsOsFamily;
    uiSurface: string;
    errorCategory: CrashDiagnosticsErrorCategory;
    stack: unknown;
}

export interface CrashDiagnosticReport {
    schemaVersion: 1;
    appVersion: string;
    platform: CrashDiagnosticsPlatform;
    osFamily: CrashDiagnosticsOsFamily;
    uiSurface: string;
    errorCategory: CrashDiagnosticsErrorCategory;
    redactedStack: string;
    sessionId: string;
    sequence: number;
}

export type CrashRecordResult =
    | { stored: true; report: CrashDiagnosticReport }
    | { stored: false; reason: 'consent_disabled' | 'storage_unavailable' };

interface CrashDiagnosticsQueueOptions {
    storage?: StorageLike | null;
    maxReports?: number;
    sessionId?: string;
}

export interface CrashDiagnosticsQueue {
    isConsentEnabled(): boolean;
    setConsentEnabled(enabled: boolean): void;
    recordCrash(input: CrashDiagnosticInput): CrashRecordResult;
    listReports(): CrashDiagnosticReport[];
    exportReports(): CrashDiagnosticReport[];
    exportReportsJson(): string;
    clearReports(): void;
}

export function createCrashDiagnosticsQueue(options: CrashDiagnosticsQueueOptions = {}): CrashDiagnosticsQueue {
    const storage = options.storage ?? getBrowserStorage();
    const maxReports = Math.max(1, Math.floor(options.maxReports ?? DEFAULT_MAX_REPORTS));
    const sessionId = options.sessionId ?? getOrCreateSessionId(storage);

    const readReports = (): CrashDiagnosticReport[] => {
        if (!storage) return [];
        try {
            const raw = storage.getItem(CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(isCrashDiagnosticReport) : [];
        } catch {
            return [];
        }
    };

    const writeReports = (reports: CrashDiagnosticReport[]) => {
        if (!storage) return false;
        try {
            if (reports.length === 0) {
                storage.removeItem(CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY);
            } else {
                storage.setItem(CRASH_DIAGNOSTICS_QUEUE_STORAGE_KEY, JSON.stringify(reports));
            }
            return true;
        } catch {
            return false;
        }
    };

    return {
        isConsentEnabled() {
            return storage?.getItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY) === '1';
        },
        setConsentEnabled(enabled: boolean) {
            if (!storage) return;
            if (enabled) {
                storage.setItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY, '1');
                return;
            }
            storage.removeItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY);
            writeReports([]);
        },
        recordCrash(input: CrashDiagnosticInput): CrashRecordResult {
            if (!storage) return { stored: false, reason: 'storage_unavailable' };
            if (storage.getItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY) !== '1') {
                return { stored: false, reason: 'consent_disabled' };
            }
            const currentReports = readReports();
            const nextSequence = currentReports.reduce((max, report) => Math.max(max, report.sequence), 0) + 1;
            const report: CrashDiagnosticReport = {
                schemaVersion: SCHEMA_VERSION,
                appVersion: input.appVersion,
                platform: input.platform,
                osFamily: input.osFamily,
                uiSurface: input.uiSurface,
                errorCategory: input.errorCategory,
                redactedStack: redactCrashDiagnosticText(input.stack),
                sessionId,
                sequence: nextSequence,
            };
            const boundedReports = [...currentReports, report].slice(-maxReports);
            return writeReports(boundedReports)
                ? { stored: true, report }
                : { stored: false, reason: 'storage_unavailable' };
        },
        listReports() {
            return readReports();
        },
        exportReports() {
            return readReports();
        },
        exportReportsJson() {
            return JSON.stringify(readReports(), null, 2);
        },
        clearReports() {
            writeReports([]);
        },
    };
}

function getBrowserStorage(): StorageLike | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function getOrCreateSessionId(storage: StorageLike | null): string {
    if (!storage) return 'session-unavailable';
    try {
        const existing = storage.getItem(CRASH_DIAGNOSTICS_SESSION_STORAGE_KEY);
        if (existing) return existing;
        const generated = generateSessionId();
        storage.setItem(CRASH_DIAGNOSTICS_SESSION_STORAGE_KEY, generated);
        return generated;
    } catch {
        return 'session-unavailable';
    }
}

function generateSessionId(): string {
    const cryptoApi = typeof crypto !== 'undefined' ? crypto : undefined;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
    if (cryptoApi?.getRandomValues) {
        const bytes = new Uint8Array(16);
        cryptoApi.getRandomValues(bytes);
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return 'session-local';
}

function isCrashDiagnosticReport(value: unknown): value is CrashDiagnosticReport {
    if (!value || typeof value !== 'object') return false;
    const report = value as Partial<CrashDiagnosticReport>;
    return report.schemaVersion === SCHEMA_VERSION
        && typeof report.appVersion === 'string'
        && typeof report.platform === 'string'
        && typeof report.osFamily === 'string'
        && typeof report.uiSurface === 'string'
        && typeof report.errorCategory === 'string'
        && typeof report.redactedStack === 'string'
        && typeof report.sessionId === 'string'
        && typeof report.sequence === 'number';
}
