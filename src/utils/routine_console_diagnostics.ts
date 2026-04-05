let routineDiagnosticsSuppressionDepth = 0;

function forceRoutineDiagnostics(): boolean {
    return process.env.AWWV_FORCE_ROUTINE_DIAGNOSTICS === '1';
}

export function pushRoutineConsoleDiagnosticsSuppressed(): void {
    routineDiagnosticsSuppressionDepth += 1;
}

export function popRoutineConsoleDiagnosticsSuppressed(): void {
    routineDiagnosticsSuppressionDepth = Math.max(0, routineDiagnosticsSuppressionDepth - 1);
}

export function shouldEmitRoutineConsoleDiagnostics(): boolean {
    return forceRoutineDiagnostics() || routineDiagnosticsSuppressionDepth === 0;
}

export function emitRoutineConsoleDebug(...args: unknown[]): void {
    if (!shouldEmitRoutineConsoleDiagnostics()) return;
    try {
        console.debug(...args);
    } catch {
        // stdout/stderr can disappear under Electron on Windows; diagnostics must never abort flow.
    }
}

export function emitRoutineConsoleWarn(...args: unknown[]): void {
    if (!shouldEmitRoutineConsoleDiagnostics()) return;
    try {
        console.warn(...args);
    } catch {
        // Keep routine diagnostics non-fatal in odd host environments.
    }
}
