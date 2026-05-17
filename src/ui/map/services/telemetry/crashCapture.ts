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

export function installCrashDiagnosticsCapture(options: InstallCrashCaptureOptions): (() => void) | null {
    const target = options.target ?? (typeof window !== 'undefined' ? window : undefined);
    if (!target) return null;

    const queue = createCrashDiagnosticsQueue({ storage: target.localStorage });
    const record = (errorCategory: CrashDiagnosticsErrorCategory, stack: unknown) => {
        queue.recordCrash({
            appVersion: options.appVersion,
            platform: resolvePlatform(target),
            osFamily: resolveOsFamily(target),
            uiSurface: options.uiSurface ?? 'tactical_map',
            errorCategory,
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
