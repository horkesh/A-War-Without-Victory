export type CrashDiagnosticsUploadDisabledReason = 'disabled' | 'offline' | 'not_configured';

export interface CrashDiagnosticsUploadResult {
    ok: false;
    reason: CrashDiagnosticsUploadDisabledReason;
}

export function uploadCrashDiagnostics(_payload: unknown): CrashDiagnosticsUploadResult {
    return { ok: false, reason: 'disabled' };
}
