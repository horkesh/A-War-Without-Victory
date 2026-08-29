import { describe, expect, it } from 'vitest';
import { detectSrebrenicaChainBroken } from '../src/scenario/anomaly_detector';
import type { GameState } from '../src/state/game_state';

/**
 * The Srebrenica/Zepa atrocity chain hangs from one flag with one setter, inside a
 * turn 6-20 window. If that window closes without `srebrenica_enclave_forms_1992`,
 * the genocide rupture is unreachable for the rest of the run and the failure is
 * SILENT — no fall, no condemnation, no grade cap, and no stalemate counter-narrative.
 * That happened at 037396e3c, short by three OSIDs and one week, and nothing caught it.
 *
 * These tests exist to prove the detector discriminates. A detector that cannot fail
 * is worse than no detector, because it reads as coverage.
 */
function stateWith(turn: number, fired: string[]): GameState {
    return {
        meta: { turn },
        military: { fired_event_ids: fired },
    } as unknown as GameState;
}

// Called directly rather than through the aggregator: that runs ~25 other detectors which
// need a full GameState, and building one here would exercise them, not this.
const findChainBreak = (state: GameState, startWeek: number) =>
    detectSrebrenicaChainBroken(state, startWeek).filter((r) => r.type === 'srebrenica_chain_broken');

describe('Srebrenica chain-break detector', () => {
    it('FIRES when the window closed without the enclave event', () => {
        const reports = findChainBreak(stateWith(188, ['some_other_event']), 0);
        expect(reports).toHaveLength(1);
        expect(reports[0].severity).toBe('critical');
        expect(reports[0].category).toBe('timeline');
        expect(reports[0].entities).toContain('srebrenica_enclave_forms_1992');
    });

    it('stays SILENT when the enclave event did fire — the healthy path', () => {
        const fired = ['srebrenica_enclave_forms_1992', 'srebrenica_falls_1995'];
        expect(findChainBreak(stateWith(188, fired), 0)).toHaveLength(0);
    });

    it('stays SILENT inside the window, where absence is not yet a failure', () => {
        // Turn 20 is the last turn the event may still fire on.
        expect(findChainBreak(stateWith(20, []), 0)).toHaveLength(0);
    });

    it('FIRES on the first turn after the window, not later', () => {
        expect(findChainBreak(stateWith(21, []), 0)).toHaveLength(1);
    });

    it('stays SILENT for a mid-war scenario that starts after the window', () => {
        // jan1993 and later starts never had the opportunity; reporting them would be noise.
        expect(findChainBreak(stateWith(188, []), 70)).toHaveLength(0);
    });
});
