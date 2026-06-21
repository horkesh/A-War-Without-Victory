import { AUDIO_PREFERENCES_STORAGE_KEY, loadAudioPreferences, type AudioPreferences } from '../../audio/audio_preferences';
import { LOCALE_STORAGE_KEY, resolveLocale, type Locale } from '../../i18n';
import {
    COLORBLIND_PRESETS,
    COLORBLIND_PRESET_STORAGE_KEY,
    REDUCE_MOTION_STORAGE_KEY,
    type ColorblindPreset,
} from '../../../shared/factionPalette';
import { redactCrashDiagnosticText } from './telemetryRedaction';
import {
    CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY,
    type CrashDiagnosticReport,
    type CrashDiagnosticsOsFamily,
    type CrashDiagnosticsPlatform,
    type StorageLike,
} from './telemetryQueue';

export const AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY = 'awwv.playtestEvidence.breadcrumbs.v1';

const SCHEMA_VERSION = 1;
const DEFAULT_MAX_BREADCRUMBS = 50;

export interface PlaytestEvidenceBreadcrumbInput {
    surface: string;
    action: string;
}

export interface PlaytestEvidenceBreadcrumb {
    schemaVersion: 1;
    sequence: number;
    surface: string;
    action: string;
}

export type PlaytestEvidenceRecordResult =
    | { stored: true; breadcrumb: PlaytestEvidenceBreadcrumb }
    | { stored: false; reason: 'consent_disabled' | 'storage_unavailable' };

export interface LocalPlaytestEvidencePreferences {
    locale: Locale;
    reduceMotion: boolean;
    colorblindPreset: ColorblindPreset;
    audio: AudioPreferences;
    crashDiagnosticsConsent: boolean;
}

export interface LocalPlaytestEvidencePacket {
    schemaVersion: 1;
    packetKind: 'local_playtest_evidence';
    appVersion: string;
    platform: CrashDiagnosticsPlatform;
    osFamily: CrashDiagnosticsOsFamily;
    currentSurface: string;
    preferences: LocalPlaytestEvidencePreferences;
    counts: {
        breadcrumbs: number;
        crashReports: number;
    };
    breadcrumbs: PlaytestEvidenceBreadcrumb[];
    crashReports: CrashDiagnosticReport[];
}

interface PlaytestEvidenceStorageOptions {
    storage?: StorageLike | null;
}

interface RecordBreadcrumbOptions extends PlaytestEvidenceStorageOptions {
    maxBreadcrumbs?: number;
}

interface BuildPacketOptions extends PlaytestEvidenceStorageOptions {
    appVersion: string;
    platform: CrashDiagnosticsPlatform;
    osFamily: CrashDiagnosticsOsFamily;
    currentSurface: string;
    crashReports: CrashDiagnosticReport[];
}

export function recordPlaytestEvidenceBreadcrumb(
    input: PlaytestEvidenceBreadcrumbInput,
    options: RecordBreadcrumbOptions = {},
): PlaytestEvidenceRecordResult {
    const storage = options.storage ?? getBrowserStorage();
    if (!storage) return { stored: false, reason: 'storage_unavailable' };
    if (!isConsentEnabled(storage)) return { stored: false, reason: 'consent_disabled' };

    const current = readBreadcrumbs(storage);
    const nextSequence = current.reduce((max, breadcrumb) => Math.max(max, breadcrumb.sequence), 0) + 1;
    const breadcrumb: PlaytestEvidenceBreadcrumb = {
        schemaVersion: SCHEMA_VERSION,
        sequence: nextSequence,
        surface: normalizeEvidenceToken(input.surface),
        action: normalizeEvidenceToken(input.action),
    };
    const maxBreadcrumbs = Math.max(1, Math.floor(options.maxBreadcrumbs ?? DEFAULT_MAX_BREADCRUMBS));
    const next = [...current, breadcrumb].slice(-maxBreadcrumbs);
    return writeBreadcrumbs(storage, next)
        ? { stored: true, breadcrumb }
        : { stored: false, reason: 'storage_unavailable' };
}

export function listPlaytestEvidenceBreadcrumbs(options: PlaytestEvidenceStorageOptions = {}): PlaytestEvidenceBreadcrumb[] {
    const storage = options.storage ?? getBrowserStorage();
    return storage ? readBreadcrumbs(storage) : [];
}

export function clearPlaytestEvidenceBreadcrumbs(options: PlaytestEvidenceStorageOptions = {}): void {
    const storage = options.storage ?? getBrowserStorage();
    if (!storage) return;
    try {
        storage.removeItem(AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY);
    } catch {
        // Best-effort local cleanup only.
    }
}

export function buildLocalPlaytestEvidencePacket(options: BuildPacketOptions): LocalPlaytestEvidencePacket {
    const storage = options.storage ?? getBrowserStorage();
    const breadcrumbs = listPlaytestEvidenceBreadcrumbs({ storage });
    const crashReports = options.crashReports.map(redactCrashDiagnosticReport);

    return {
        schemaVersion: SCHEMA_VERSION,
        packetKind: 'local_playtest_evidence',
        appVersion: options.appVersion,
        platform: options.platform,
        osFamily: options.osFamily,
        currentSurface: normalizeEvidenceToken(options.currentSurface),
        preferences: readPreferences(storage),
        counts: {
            breadcrumbs: breadcrumbs.length,
            crashReports: crashReports.length,
        },
        breadcrumbs,
        crashReports,
    };
}

export function buildLocalPlaytestEvidencePacketJson(options: BuildPacketOptions): string {
    return JSON.stringify(buildLocalPlaytestEvidencePacket(options), null, 2);
}

function getBrowserStorage(): StorageLike | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function isConsentEnabled(storage: StorageLike): boolean {
    try {
        return storage.getItem(CRASH_DIAGNOSTICS_CONSENT_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function readBreadcrumbs(storage: StorageLike): PlaytestEvidenceBreadcrumb[] {
    try {
        const raw = storage.getItem(AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(isPlaytestEvidenceBreadcrumb) : [];
    } catch {
        return [];
    }
}

function writeBreadcrumbs(storage: StorageLike, breadcrumbs: PlaytestEvidenceBreadcrumb[]): boolean {
    try {
        if (breadcrumbs.length === 0) {
            storage.removeItem(AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY);
        } else {
            storage.setItem(AWWV_PLAYTEST_EVIDENCE_BREADCRUMB_STORAGE_KEY, JSON.stringify(breadcrumbs));
        }
        return true;
    } catch {
        return false;
    }
}

function readPreferences(storage: StorageLike | null): LocalPlaytestEvidencePreferences {
    return {
        locale: readLocale(storage),
        reduceMotion: readBooleanPreference(storage, REDUCE_MOTION_STORAGE_KEY),
        colorblindPreset: readColorblindPreset(storage),
        audio: loadAudioPreferences(storage),
        crashDiagnosticsConsent: storage ? isConsentEnabled(storage) : false,
    };
}

function readLocale(storage: StorageLike | null): Locale {
    if (!storage) return 'en';
    try {
        return resolveLocale(storage.getItem(LOCALE_STORAGE_KEY));
    } catch {
        return 'en';
    }
}

function readBooleanPreference(storage: StorageLike | null, key: string): boolean {
    if (!storage) return false;
    try {
        const value = storage.getItem(key);
        return value === '1' || value === 'true';
    } catch {
        return false;
    }
}

function readColorblindPreset(storage: StorageLike | null): ColorblindPreset {
    if (!storage) return 'default';
    try {
        const stored = storage.getItem(COLORBLIND_PRESET_STORAGE_KEY);
        return stored && (COLORBLIND_PRESETS as ReadonlyArray<string>).includes(stored)
            ? stored as ColorblindPreset
            : 'default';
    } catch {
        return 'default';
    }
}

function redactCrashDiagnosticReport(report: CrashDiagnosticReport): CrashDiagnosticReport {
    return {
        ...report,
        redactedStack: redactCrashDiagnosticText(report.redactedStack),
    };
}

function normalizeEvidenceToken(input: unknown): string {
    const text = typeof input === 'string' ? input : 'unknown';
    const redacted = redactCrashDiagnosticText(text).replace(/\.json\b/gi, '[json]');
    return redacted.slice(0, 80);
}

function isPlaytestEvidenceBreadcrumb(value: unknown): value is PlaytestEvidenceBreadcrumb {
    if (!value || typeof value !== 'object') return false;
    const breadcrumb = value as Partial<PlaytestEvidenceBreadcrumb>;
    return breadcrumb.schemaVersion === SCHEMA_VERSION
        && typeof breadcrumb.sequence === 'number'
        && Number.isInteger(breadcrumb.sequence)
        && breadcrumb.sequence > 0
        && typeof breadcrumb.surface === 'string'
        && typeof breadcrumb.action === 'string';
}
