import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    emitRoutineConsoleDebug,
    emitRoutineConsoleWarn,
    popRoutineConsoleDiagnosticsSuppressed,
    pushRoutineConsoleDiagnosticsSuppressed,
} from '../src/utils/routine_console_diagnostics.js';
import { warnUnresolvedSectorAssignments } from '../src/sim/combat/brigade_assignment.js';
import type { FactionId, FormationId, FormationState } from '../src/state/game_state.js';

describe('routine console diagnostics', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        popRoutineConsoleDiagnosticsSuppressed();
    });

    it('emits routine debug and warn output by default', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        emitRoutineConsoleDebug('[debug] visible');
        emitRoutineConsoleWarn('[warn] visible');

        expect(debugSpy).toHaveBeenCalledWith('[debug] visible');
        expect(warnSpy).toHaveBeenCalledWith('[warn] visible');
    });

    it('suppresses routine debug and warn output inside a scoped quiet section', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        pushRoutineConsoleDiagnosticsSuppressed();
        emitRoutineConsoleDebug('[debug] hidden');
        emitRoutineConsoleWarn('[warn] hidden');
        popRoutineConsoleDiagnosticsSuppressed();

        expect(debugSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('suppresses brigade-assignment unresolved warnings inside the same scoped quiet section', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const formations: Record<FormationId, FormationState> = {
            brig_test_unresolved: {
                id: 'brig_test_unresolved',
                faction: 'RS' as FactionId,
                corps_id: 'vrs_drina',
                kind: 'brigade',
                status: 'active',
                location_osid: 'op:test:rear',
                personnel: 500,
            } as FormationState,
        };

        pushRoutineConsoleDiagnosticsSuppressed();
        warnUnresolvedSectorAssignments([], formations, 'RS' as FactionId);
        popRoutineConsoleDiagnosticsSuppressed();

        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('still emits brigade-assignment unresolved warnings outside the quiet section', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const formations: Record<FormationId, FormationState> = {
            brig_test_unresolved: {
                id: 'brig_test_unresolved',
                faction: 'RS' as FactionId,
                corps_id: 'vrs_drina',
                kind: 'brigade',
                status: 'active',
                location_osid: 'op:test:rear',
                personnel: 500,
            } as FormationState,
        };

        warnUnresolvedSectorAssignments([], formations, 'RS' as FactionId);

        expect(
            warnSpy.mock.calls.some(([message]) => String(message).includes('UNRESOLVED brig_test_unresolved'))
        ).toBe(true);
    });
});
