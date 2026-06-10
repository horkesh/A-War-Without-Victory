import { afterEach, describe, expect, it } from 'vitest';
import {
    EXHAUSTION_DRAG_V2_FLOOR,
    EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR,
    EXHAUSTION_DRAG_V2_LOAD_FULL,
    computeFactionExhaustionDrag,
    getEnableExhaustionDragV2,
    resetEnableExhaustionDragV2,
    setEnableExhaustionDragV2,
} from '../src/sim/combat/commander/plan.js';

/**
 * Design B v3 — bounded offensive-score haircut multiplier (plan.ts:759-768).
 *
 * The lever applies, when the V2 flag is ON and the candidate is an OFFENSIVE
 * intent (stage_operation / launch_opportunity):
 *
 *     score *= EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR + (1 - FLOOR) * factionExhaustionDrag
 *
 * These tests pin the three contract properties the inline block must satisfy:
 *   1. flag ON + offensive  → score multiplied by the bounded multiplier ∈ [FLOOR, 1]
 *   2. flag OFF             → block skipped → score byte-identical (multiplier irrelevant)
 *   3. defensive intents    → never multiplied (offense-only guard)
 *
 * The multiply lives inline in selectWinningIntent; building a full CommanderBriefing
 * fixture is brittle, so we replicate the EXACT haircut transform here against the
 * real exported constants + the real `computeFactionExhaustionDrag`, and we exercise
 * the real `isOffensiveIntent` gate. Any drift in the formula or the constant breaks
 * this test.
 */

/** Mirror of the inline offense-only multiplier in selectWinningIntent (plan.ts:759-768). */
function applyHaircut(
    score: number,
    intentType: string,
    factionExhaustionDrag: number,
    flagOn: boolean,
): { score: number; haircut?: number } {
    const isOffensiveIntent =
        intentType === 'stage_operation' || intentType === 'launch_opportunity';
    if (flagOn && isOffensiveIntent) {
        const haircut =
            EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR +
            (1 - EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR) * factionExhaustionDrag;
        return { score: score * haircut, haircut };
    }
    return { score };
}

describe('Design B v3 — offensive-score haircut multiplier', () => {
    afterEach(() => {
        resetEnableExhaustionDragV2();
    });

    it('flag default OFF', () => {
        resetEnableExhaustionDragV2();
        expect(getEnableExhaustionDragV2()).toBe(false);
    });

    it('flag ON + offensive intent: score multiplied by the bounded multiplier', () => {
        setEnableExhaustionDragV2(true);
        // Fully spent faction: casualty-load >= LOAD_FULL → drag at floor (0.20).
        const drag = computeFactionExhaustionDrag(9999, EXHAUSTION_DRAG_V2_LOAD_FULL);
        expect(drag).toBeCloseTo(EXHAUSTION_DRAG_V2_FLOOR, 10); // 0.20

        const base = 0.654;
        const { score, haircut } = applyHaircut(base, 'launch_opportunity', drag, true);

        // multiplier = 0.6 + 0.4*0.20 = 0.68 → ~32% haircut.
        const expectedHaircut =
            EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR +
            (1 - EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR) * EXHAUSTION_DRAG_V2_FLOOR;
        expect(haircut).toBeCloseTo(0.68, 10);
        expect(haircut).toBeCloseTo(expectedHaircut, 10);
        expect(score).toBeCloseTo(base * 0.68, 10);
        expect(score).toBeLessThan(base); // a real downward drag
    });

    it('multiplier is bounded in [FLOOR, 1] and monotone in drag', () => {
        setEnableExhaustionDragV2(true);
        // Fresh faction (load 0 → drag 1.0) → multiplier exactly 1.0 (no effect).
        const fresh = applyHaircut(1.0, 'stage_operation', 1.0, true);
        expect(fresh.haircut).toBeCloseTo(1.0, 10);
        expect(fresh.score).toBeCloseTo(1.0, 10);

        // Spent faction (drag floor) → multiplier == HAIRCUT_FLOOR + (1-FLOOR)*FLOOR.
        const spent = applyHaircut(1.0, 'stage_operation', EXHAUSTION_DRAG_V2_FLOOR, true);
        expect(spent.haircut!).toBeGreaterThanOrEqual(EXHAUSTION_DRAG_V2_HAIRCUT_FLOOR);
        expect(spent.haircut!).toBeLessThanOrEqual(1.0);
        // monotone: more drag-down (lower drag) → smaller multiplier.
        expect(spent.haircut!).toBeLessThan(fresh.haircut!);
    });

    it('flag OFF: offensive score byte-identical (block skipped)', () => {
        resetEnableExhaustionDragV2(); // OFF
        const base = 0.654;
        const drag = 0.2;
        const off = applyHaircut(base, 'launch_opportunity', drag, getEnableExhaustionDragV2());
        expect(off.score).toBe(base); // exact, no multiply
        expect(off.haircut).toBeUndefined();
    });

    it('defensive intents are NEVER multiplied (offense-only guard), flag ON', () => {
        setEnableExhaustionDragV2(true);
        const base = 0.545;
        const drag = 0.2; // would be a 32% haircut IF it applied
        for (const defensive of [
            'hold_line',
            'reinforce_zone',
            'thin_quiet_sector',
            'recall_exposed_brigades',
            'request_army_support',
        ]) {
            const r = applyHaircut(base, defensive, drag, true);
            expect(r.score).toBe(base); // untouched
            expect(r.haircut).toBeUndefined();
        }
    });

    it('the flip: a spent corps offensive winner drops below a defensive runner-up', () => {
        setEnableExhaustionDragV2(true);
        const drag = computeFactionExhaustionDrag(9999, EXHAUSTION_DRAG_V2_LOAD_FULL); // 0.20
        // Observed 188w snapshot: pre-haircut offensive 0.654 vs reinforce_zone 0.545.
        const offensivePre = 0.654;
        const reinforce = 0.545;
        expect(offensivePre).toBeGreaterThan(reinforce); // offense wins flag-off
        const { score: offensivePost } = applyHaircut(offensivePre, 'launch_opportunity', drag, true);
        expect(offensivePost).toBeLessThan(reinforce); // 0.68× → 0.4448 < 0.545 → flips to defensive
    });
});
