/**
 * DIAGNOSTIC — is the cohesion dissolution criterion reachable?
 *
 * RE Phase 0, Task 0.0b. Raised by the railroad-hunter seat, 2026-08-26.
 *
 * `brigade_dissolution.ts` requires 2 of 3 for an ordinary brigade and 3 of 3 for an
 * enclave-tagged one:
 *     personnel < T_personnel   |   cohesion <= T_cohesion   |   morale <= T_morale
 *
 * `cohesion_drift.ts` clamps cohesion UP to a per-faction floor, and that pass runs BEFORE
 * the dissolution pass in the same turn. So where
 *
 *     floor(faction, turn)  >  T_cohesion(faction, turn)
 *
 * a brigade restored to its floor cannot satisfy the cohesion criterion on the following pass.
 *
 * ⚠ CORRECTED 2026-08-26 — THE ORIGINAL VERSION OF THIS NOTE OVERSTATED THE MECHANISM, and the
 * overstatement was load-bearing: a fix aimed at the wrong clamp would have measured a delta
 * that meant nothing. What this docblock previously called an UNCONDITIONAL clamp is not one.
 * Three escape paths, all confirmed at HEAD by the Engine/systems seat:
 *
 *   1. `cohesion_drift.ts:139` — `if (engagedSet.has(id)) continue;` The clamp is SKIPPED for
 *      every formation engaged in combat this turn, and combat writes cohesion DOWN immediately
 *      before it (repulsed −8, catastrophic −15, decisive defender −15). An engaged brigade
 *      therefore reaches the dissolution pass carrying an unclamped, combat-reduced value.
 *   2. `morale_drift.ts:306` — `f.cohesion = Math.max(0, cohesion − 2)` when morale is below
 *      critical. That step runs AFTER the clamp and BEFORE dissolution, unconditionally.
 *   3. A `kind` mismatch: `cohesion_drift.ts` accepts `'brigade' | 'operational_group'` while
 *      `brigade_dissolution.ts` accepts `'brigade' | 'og'`, and OGs are created as `'og'` —
 *      so an OG is dissolvable and never clamped. A plain bug, separable from everything else.
 *
 * Empirically, on the t39 save, 4 of 221 active brigades sit BELOW their faction floor. But
 * 0 of 221 sit at or below the dissolution threshold, because the floor-to-threshold gap
 * (36pp RBiH, 20pp RS at t39) exceeds any single-turn decrement (max −15) and the clamp
 * restores on the first unengaged turn.
 *
 * ⇒ THE CORRECT CLAIM IS "EFFECTIVELY UNREACHABLE IN PRACTICE", NOT "ARITHMETICALLY IMPOSSIBLE".
 * The conclusion stands — the criterion is not doing work, and for an ENCLAVE brigade needing
 * all three criteria it is the binding one, so the §6 enclave guard was passing because it
 * could not fail. But the mechanism is the COMBAT-DECREMENT clamp
 * (`attack_post_battle_effects.ts`, `COMBAT_COHESION_FLOOR_CAP = 35`), not the drift clamp
 * this file names. A second arithmetic guarantee sits one door down and is also §6-material:
 * `LAST_STAND_COHESION_MIN = 40` against an RBiH floor of ≥42 from turn 13 means a surrounded
 * RBiH brigade takes the last-stand branch ALWAYS and the surrender branch NEVER.
 *
 * RELATIONSHIP TO `tests/cohesion_floor_vs_dissolution.test.ts` (added 2026-08-26, Phase 0 item
 * 0.0b). This file is the REPORT — the readable table, run on demand. The test is the STANDING
 * CHECK. They deliberately do different jobs:
 *
 *   - A test asserting the INTENDED relationship (floor <= threshold) would be permanently RED,
 *     and this repo's own lesson is that a permanently-red gate is worse than a missing one:
 *     it gets disabled, and everything behind it goes dark. `checkpoint_oct1995` did exactly
 *     that this session until the owner reset it.
 *   - A test asserting the CURRENT relationship as if intended would be a defect with a test
 *     defending it (napkin 0l) — whoever fixes the engine gets told they broke something.
 *
 *   The test therefore CHARACTERIZES: it pins 27/27 and fails loudly if the count moves in
 *   EITHER direction, with a message telling the reader which way and what it implies. It never
 *   silently approves, and it never blocks a fix. This script stays because a table a human can
 *   read beats an assertion when the question is "how bad, and where".
 *
 * ⇒ THE MOMENT THE DEFECT IS FIXED, this script's exit-1 becomes a real gate, and the test's
 *   pinned constant must be updated deliberately — not reflexively — because restoring the
 *   cohesion criterion is dissolution-INCREASING and moves territory.
 *
 *   node_modules/.bin/tsx tools/hooks/floor_vs_dissolution.ts
 *
 * Exit 1 if any faction/turn is unreachable, so it can gate a future change once fixed.
 */
import { readFileSync } from 'node:fs';
import { getFactionCohesionFloor } from '../../src/sim/combat/faction_progression.js';
import { resolveDissolutionThreshold } from '../../src/sim/combat/brigade_dissolution.js';
import { DISSOLUTION_COHESION_THRESHOLD } from '../../src/sim/combat/brigade_dissolution.js';
import type { WarTimeline } from '../../src/state/war_timeline.js';

const TIMELINE_PATH = 'data/scenarios/timelines/apr1992.json';
const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const TURNS = [0, 13, 26, 39, 52, 80, 104, 140, 188];

const timeline = JSON.parse(readFileSync(TIMELINE_PATH, 'utf8')) as WarTimeline;

console.log(`\nCOHESION FLOOR vs DISSOLUTION THRESHOLD — ${TIMELINE_PATH}`);
console.log('A brigade can only satisfy the cohesion criterion where floor <= threshold.\n');

const header = ['turn', ...FACTIONS.map((f) => f.padStart(22))].join(' ');
console.log(header);
console.log('-'.repeat(header.length));

let unreachable = 0;
let comparisons = 0;

for (const turn of TURNS) {
    const cells = FACTIONS.map((faction) => {
        const floor = getFactionCohesionFloor(faction, turn, timeline);
        const threshold = resolveDissolutionThreshold(
            timeline, 'dissolution_cohesion_threshold', faction, turn, DISSOLUTION_COHESION_THRESHOLD,
        );
        comparisons += 1;
        const bad = floor > threshold;
        if (bad) unreachable += 1;
        return `${String(floor).padStart(3)} vs ${String(threshold).padStart(3)}  ${bad ? 'UNREACHABLE' : 'ok         '}`;
    });
    console.log([String(turn).padStart(4), ...cells].join(' '));
}

// LIVENESS: assert how much was COMPARED, not just what came out. A loop over an empty
// set prints a clean table and means nothing (napkin 0h/B).
console.log(`\ncompared ${comparisons} faction/turn pairs (expected ${FACTIONS.length * TURNS.length})`);
if (comparisons !== FACTIONS.length * TURNS.length) {
    console.error('LIVENESS FAILURE — comparison count is wrong; this report is not trustworthy.');
    process.exit(2);
}

if (unreachable > 0) {
    console.error(`\n★ ${unreachable} of ${comparisons} faction/turn pairs have an UNREACHABLE cohesion criterion.`);
    console.error('  Ordinary brigades: dissolution has degraded from 2-of-3 to 1-of-2.');
    console.error('  ENCLAVE brigades (3-of-3, brigade_dissolution.ts): CAN NEVER DISSOLVE.');
    console.error('  ⇒ The §6 enclave guard is passing because it cannot fail. Refer to the §6 panel.');
    console.error('  ⇒ See docs/plans/2026-08-26-engine-integrity-plan.md §3.8.');
    process.exit(1);
}
console.log('\nAll faction/turn pairs reachable — the criterion is live.');
