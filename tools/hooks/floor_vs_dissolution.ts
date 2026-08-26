/**
 * DIAGNOSTIC — is the cohesion dissolution criterion reachable?
 *
 * RE Phase 0, Task 0.0b. Raised by the railroad-hunter seat, 2026-08-26.
 *
 * `brigade_dissolution.ts` requires 2 of 3 for an ordinary brigade and 3 of 3 for an
 * enclave-tagged one:
 *     personnel < T_personnel   |   cohesion <= T_cohesion   |   morale <= T_morale
 *
 * But `cohesion_drift.ts` clamps cohesion UP to a per-faction floor, unconditionally, and
 * that pass runs BEFORE the dissolution pass in the same turn. So if
 *
 *     floor(faction, turn)  >  T_cohesion(faction, turn)
 *
 * then no surviving brigade of that faction can ever satisfy the cohesion criterion.
 * Dissolution silently degrades from 2-of-3 to 1-of-2 — and for an ENCLAVE brigade, which
 * needs all three, it becomes UNREACHABLE: the brigade can never dissolve at any personnel,
 * any morale, any turn. That would make the §6 enclave guard pass because it cannot fail.
 *
 * WHY THIS IS A SCRIPT AND NOT A TEST, deliberately:
 * a test asserting the intended relationship would be permanently RED, and this repo's own
 * lesson is that a permanently-red gate is worse than a missing one — it gets disabled, and
 * then everything after it is invisible. A test asserting the CURRENT relationship would be
 * a defect with a test defending it (napkin 0l), so that when someone fixes the engine the
 * suite tells them they broke it. Neither is acceptable. This reports; a human rules.
 *
 * ⇒ THE MOMENT THE DEFECT IS FIXED, convert this to a test asserting floor <= threshold and
 *   delete this note.
 *
 *   node_modules/.bin/tsx tools/hooks/floor_vs_dissolution.ts
 *
 * Exit 1 if any faction/turn is unreachable, so it can gate a future change once fixed.
 */
import { readFileSync } from 'node:fs';
import { getFactionCohesionFloor } from '../../src/sim/combat/faction_progression.js';
import { resolveDissolutionThreshold } from '../../src/sim/combat/brigade_dissolution.js';
import { DISSOLUTION_COHESION_THRESHOLD } from '../../src/sim/combat/brigade_dissolution.js';
import type { WarTimeline } from '../../src/state/game_state.js';

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
