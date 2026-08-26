/**
 * PHASE 0 ITEM 0.0b — cohesion floor vs dissolution threshold.
 *
 * ★ THIS TEST DELIBERATELY DOES NOT DO WHAT THE PLAN ASKED FOR, and the reason is the point.
 *
 * The plan specifies: "Test present; currently RED for all three factions, which IS the
 * finding." A permanently-red test is the one thing this repo has already learned not to build
 * — `engine_health_gate.cjs` carries the note in its own source that a permanently-red gate is
 * worse than a missing one, because it gets disabled and then everything behind it goes dark.
 * Today's session produced a live example: `checkpoint_oct1995` sat above measured and failed on
 * every run until the owner reset it.
 *
 * The opposite construction is no better: a test asserting the CURRENT (broken) relationship is
 * a defect with a test defending it, so that whoever fixes the engine is told they broke
 * something.
 *
 * So this is a CHARACTERIZATION test. It records the measured state, passes today, and fails
 * loudly the moment the arithmetic moves in EITHER direction — at which point a human reads the
 * message and decides whether a fix landed or a regression did. It never silently approves.
 *
 * ── WHAT IS ACTUALLY BROKEN ────────────────────────────────────────────────────────────────
 * `brigade_dissolution.ts` requires 2 of 3 for an ordinary brigade and 3 of 3 for an
 * enclave-tagged one:  personnel < T_p  |  cohesion <= T_c  |  morale <= T_m
 *
 * Across all 27 faction x turn pairs, the per-faction cohesion FLOOR sits ABOVE the dissolution
 * THRESHOLD (e.g. RBiH 62 vs 20 from turn 52; RS 20 vs 15; HRHB 30 vs 20). A brigade restored to
 * its floor cannot satisfy the cohesion criterion. Ordinary dissolution degrades to 1-of-2; an
 * ENCLAVE brigade, needing all three, effectively cannot dissolve at all — which is why the §6
 * enclave guard was passing because it could not fail.
 *
 * ⚠ THE MECHANISM IS NOT THE DRIFT CLAMP. An earlier version of this finding said the drift
 * clamp was unconditional. It is not: it skips formations engaged in combat this turn,
 * `morale_drift.ts` writes cohesion down AFTER it and before dissolution, and a `kind` mismatch
 * (`'og'` vs `'operational_group'`) leaves OGs unclamped entirely. On the t39 save 4 of 221
 * brigades sit BELOW their floor — but 0 of 221 reach the dissolution threshold, because the
 * gap exceeds any single-turn decrement. The honest claim is EFFECTIVELY UNREACHABLE IN
 * PRACTICE, not arithmetically impossible, and the binding mechanism is the combat-decrement
 * clamp (`COMBAT_COHESION_FLOOR_CAP = 35`). A fix aimed at the drift clamp would move nothing.
 *
 * Full report: `node_modules/.bin/tsx tools/hooks/floor_vs_dissolution.ts`
 * Plan: `docs/plans/2026-08-26-engine-integrity-plan.md` §3.8.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getFactionCohesionFloor } from '../src/sim/combat/faction_progression.js';
import { resolveDissolutionThreshold, DISSOLUTION_COHESION_THRESHOLD } from '../src/sim/combat/brigade_dissolution.js';
import type { WarTimeline } from '../src/state/war_timeline.js';

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const TURNS = [0, 13, 26, 39, 52, 80, 104, 140, 188];

/** Measured 2026-08-26. Every pair is UNREACHABLE (floor > threshold). */
const EXPECTED_UNREACHABLE = FACTIONS.length * TURNS.length; // 27

function timeline(): WarTimeline {
    return JSON.parse(readFileSync('data/scenarios/timelines/apr1992.json', 'utf8')) as WarTimeline;
}

function survey(): { unreachable: number; compared: number; worst: string } {
    const tl = timeline();
    let unreachable = 0;
    let compared = 0;
    let worstGap = -Infinity;
    let worst = '';
    for (const f of FACTIONS) {
        for (const t of TURNS) {
            // Signature is (timeline, field, faction, turn, defaultValue) — NOT (faction, turn,
            // timeline). A first draft used the latter; vitest transpiles WITHOUT typechecking,
            // so it silently returned undefined, every `floor > undefined` was false, and the
            // test reported a confident 0/27 against the script's 27/27. Caught only because the
            // two disagreed. Seventh vacuous-result instance of 2026-08-26 — and the reason the
            // characterization test is pinned to an exact expected number rather than to "> 0".
            const floor = getFactionCohesionFloor(f, t, tl);
            const threshold = resolveDissolutionThreshold(
                tl, 'dissolution_cohesion_threshold', f, t, DISSOLUTION_COHESION_THRESHOLD,
            );
            expect(Number.isFinite(floor) && Number.isFinite(threshold),
                `non-numeric floor/threshold for ${f}@t${t} — check the call signature`).toBe(true);
            compared++;
            if (floor > threshold) {
                unreachable++;
                if (floor - threshold > worstGap) { worstGap = floor - threshold; worst = `${f}@t${t} ${floor} vs ${threshold}`; }
            }
        }
    }
    return { unreachable, compared, worst };
}

describe('cohesion floor vs dissolution threshold (Phase 0, item 0.0b)', () => {
    it('LIVENESS: the survey compares every faction x turn pair', () => {
        // A survey that silently compared zero pairs would report "0 unreachable" and read as
        // healthy. Five vacuous checks shipped in this repo on 2026-08-26; this is the guard.
        const { compared } = survey();
        expect(compared).toBe(EXPECTED_UNREACHABLE);
    });

    it('CHARACTERIZATION: the cohesion criterion is unreachable for every faction at every turn', () => {
        const { unreachable, compared, worst } = survey();
        console.log(`[0.0b] ${unreachable}/${compared} faction-turn pairs UNREACHABLE; widest gap ${worst}`);
        expect(unreachable, unreachable < EXPECTED_UNREACHABLE
            ? `FEWER pairs are unreachable than when this was measured (${unreachable} < ${EXPECTED_UNREACHABLE}). `
              + `That is probably GOOD NEWS — someone moved a cohesion floor or a dissolution threshold and the `
              + `criterion is becoming reachable. Do not just update the number: dissolution is currently `
              + `1-of-2 for ordinary brigades, so restoring the cohesion criterion is strictly `
              + `dissolution-INCREASING for every faction and moves territory. It needs a paired 188w and a `
              + `threshold re-tune, and the ENCLAVE case (3-of-3) is a §6 panel matter.`
            : `MORE pairs are unreachable than when this was measured. A floor rose or a threshold fell, `
              + `widening a gap that already disables the criterion everywhere.`,
        ).toBe(EXPECTED_UNREACHABLE);
    });

    it('the enclave consequence is stated, not assumed: 3-of-3 with one criterion dead is 2-of-2', () => {
        // Not arithmetic on the engine — arithmetic on the RULE, so the §6 consequence cannot be
        // lost if someone edits the numbers above without reading the prose.
        const { unreachable, compared } = survey();
        const cohesionCriterionAlive = unreachable < compared;
        expect(cohesionCriterionAlive, 'While the cohesion criterion is dead, an enclave-tagged brigade needing '
            + '3 of 3 needs 2 of 2 — and the §6 enclave guard passes because it cannot fail, not because the '
            + 'enclaves held. If this assertion starts passing, the guard has become real and the §6 records '
            + 'that relied on it can stop being provisional.').toBe(false);
    });
});
