import { describe, expect, it } from 'vitest';
import {
    countBlockingPlayerDecisions,
    listBlockingPlayerDecisions,
    summarizePlayerDecisions,
} from '../src/state/player_decision_manifest.js';

// R4 Phase 6 Task 6.1 — terminal-state decision gate.
//
// A concluded campaign (`meta.game_over === true`) must never report a blocking
// player decision. Otherwise a dangling request/receipt pair — e.g. a Dayton menu
// resolved on the desktop path, which historically failed to consume
// `pending_dayton` — holds shut `advance-turn` forever (advance-turn checks
// `listBlockingPlayerDecisions` before running the turn pipeline, so the uncleaned
// state self-seals the only gate through which any pipeline cleanup could run).
// This is the RS-ahistorical-playthrough Pyrrhic-panel deadlock, root-caused by
// four independent specialists. The guard is GENERAL: it covers every decision
// family, not just Dayton, and it also rescues already-saved concluded games,
// since the manifest is recomputed from state on load.
describe('desktop game-over advance gate', () => {
    function daytonStuckState(gameOver: boolean): any {
        return {
            meta: {
                player_faction: 'RS',
                turn: 188,
                ...(gameOver ? { game_over: true } : {}),
            },
            military: {
                negotiation: { pending_dayton: { turn: 188 } },
                pending_event_decisions: [
                    {
                        event_id: 'rs_required',
                        event_title: 'RS required decision',
                        faction: 'RS',
                        requires_player_response: true,
                    },
                ],
            },
        };
    }

    it('reports zero blocking decisions once the game is over', () => {
        const state = daytonStuckState(true);
        expect(countBlockingPlayerDecisions(state, 'RS')).toBe(0);
        expect(listBlockingPlayerDecisions(state, 'RS')).toEqual([]);
        expect(summarizePlayerDecisions(state, 'RS').blockingCount).toBe(0);
    });

    it('control: the same state still blocks while the game is live', () => {
        // Proves the fixture genuinely blocks pre-guard — the game-over branch is
        // what neutralizes it, not an empty fixture.
        const state = daytonStuckState(false);
        expect(countBlockingPlayerDecisions(state, 'RS')).toBeGreaterThan(0);
        expect(
            listBlockingPlayerDecisions(state, 'RS').map((item) => item.familyId),
        ).toContain('dayton_negotiation');
    });
});
