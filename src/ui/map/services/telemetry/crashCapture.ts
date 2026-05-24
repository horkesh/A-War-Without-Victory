import {
    createCrashDiagnosticsQueue,
    type CrashDiagnosticsErrorCategory,
    type CrashDiagnosticsOsFamily,
    type CrashDiagnosticsPlatform,
} from './telemetryQueue';

interface InstallCrashCaptureOptions {
    appVersion: string;
    uiSurface?: string;
    target?: Window;
}

interface RecordCrashDiagnosticOptions extends InstallCrashCaptureOptions {
    errorCategory: CrashDiagnosticsErrorCategory;
    stack: unknown;
}

export const CRASH_DIAGNOSTICS_APP_VERSION = '0.9.6-alpha.1';

export function recordCrashDiagnostic(options: RecordCrashDiagnosticOptions) {
    const target = options.target ?? (typeof window !== 'undefined' ? window : undefined);
    if (!target) return null;

    const queue = createCrashDiagnosticsQueue({ storage: target.localStorage });
    return queue.recordCrash({
        appVersion: options.appVersion,
        platform: resolvePlatform(target),
        osFamily: resolveOsFamily(target),
        uiSurface: options.uiSurface ?? 'tactical_map',
        errorCategory: options.errorCategory,
        stack: options.stack,
    });
}

export function installCrashDiagnosticsCapture(options: InstallCrashCaptureOptions): (() => void) | null {
    const target = options.target ?? (typeof window !== 'undefined' ? window : undefined);
    if (!target) return null;

    const record = (errorCategory: CrashDiagnosticsErrorCategory, stack: unknown) => {
        recordCrashDiagnostic({
            appVersion: options.appVersion,
            uiSurface: options.uiSurface ?? 'tactical_map',
            errorCategory,
            target,
            stack,
        });
    };

    const onError = (event: ErrorEvent) => {
        record('unhandled_error', event.error?.stack ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        record('unhandled_rejection', reason?.stack ?? reason);
    };

    target.addEventListener('error', onError);
    target.addEventListener('unhandledrejection', onRejection);

    return () => {
        target.removeEventListener('error', onError);
        target.removeEventListener('unhandledrejection', onRejection);
    };
}

function resolvePlatform(target: Window): CrashDiagnosticsPlatform {
    return target.navigator.userAgent.includes('Electron') ? 'desktop' : 'browser';
}

function resolveOsFamily(target: Window): CrashDiagnosticsOsFamily {
    const agent = target.navigator.userAgent.toLowerCase();
    if (agent.includes('windows')) return 'windows';
    if (agent.includes('mac os') || agent.includes('macintosh')) return 'macos';
    if (agent.includes('linux')) return 'linux';
    return 'unknown';
}
