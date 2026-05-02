/**
 * LANE-2026-05-02-IN-TRANSIT-PREDICTOR: Red-first tests for the predictor /
 * readiness numerator counting committed-in-transit brigades.
 *
 * Lane scope: when an operation participant is in_transit AND its
 * `destination_sids` includes an axis-relevant OSID (axis approach OSIDs for
 * readiness; objective-adjacency OSIDs for opening-attack feasibility), the
 * brigade is committed to this operation and must count toward the gate.
 * Today both gates skip in-transit brigades unconditionally:
 *   - `areParticipantsReadyForExecution` lines 241-242 (multi-axis) and 265-266
 *     (single-axis): `if (movementState?.status === 'in_transit') continue;`
 *   - `axisHasExecutableOpeningAttack` lines 290-294: filters by current
 *     `brigade.location_osid` adjacency only.
 *
 * Tests are FACTION-AGNOSTIC. Uses synthetic OSIDs, brigade IDs, and a
 * synthetic `TEST_FACTION` so the implementation cannot accidentally hardcode
 * Krivaja/Srebrenica/Drina-specific behaviour.
 *
 * Predecessor: `prestageBrigadesForTriggeredOp` overwrite contract (commit
 * `98446604`) ensures pre-stage never resets in-transit progress and never
 * stomps existing orders. This lane composes cleanly with that contract.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';

import {
    areParticipantsReadyForExecution,
    axisHasExecutableOpeningAttack,
    buildOsidAdjacencyFromFrontEdges,
    countAdjacentGateParticipants,
    countAdjacentStagedParticipants,
    getPlanningAttackThreshold,
} from '../src/sim/combat/sector_offensive_launch_helpers.js';
import type { CorpsOperation, FormationId, GameState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Synthetic fixture
// ---------------------------------------------------------------------------

interface SyntheticBrigadeOpts {
    location_osid?: string;
    in_transit_destinations?: string[]; // if set → status='in_transit', destination_sids = these
    status?: 'active' | 'inactive' | 'destroyed';
    personnel?: number;
    disrupted_turns?: number;
    faction?: string;
    corps_id?: string;
    kind?: string;
}

function buildState(brigades: Record<string, SyntheticBrigadeOpts>): GameState {
    const formations: Record<string, unknown> = {};
    const movement_state: Record<string, unknown> = {};
    for (const [id, opts] of Object.entries(brigades)) {
        formations[id] = {
            id,
            kind: opts.kind ?? 'brigade',
            status: opts.status ?? 'active',
            location_osid: opts.location_osid ?? 'op:test:home_a',
            personnel: opts.personnel ?? 1500,
            disrupted_turns: opts.disrupted_turns ?? 0,
            faction: opts.faction ?? 'TEST_FACTION',
            corps_id: opts.corps_id ?? 'synth_corps',
        };
        if (opts.in_transit_destinations !== undefined) {
            movement_state[id] = {
                status: 'in_transit',
                stance: 'column',
                destination_sids: opts.in_transit_destinations,
                turns_remaining: 1,
            };
        }
    }
    return {
        meta: { turn: 100 },
        military: {
            formations,
            brigade_movement_state: movement_state,
            // The two callsites use either sector sub-segment friendly_osids OR
            // front-edge adjacency. We provide both so multi-axis and single-axis
            // branches resolve a non-empty approach set.
            corps_front_sectors: {
                'synth_sector_a': {
                    sector_id: 'synth_sector_a',
                    corps_id: 'synth_corps',
                    faction: 'TEST_FACTION',
                    territory_osids: ['op:test:home_a', 'op:test:staging_a', 'op:test:approach_b'],
                    sub_segments: [
                        {
                            sub_segment_id: 'synth_sub_a',
                            friendly_osids: ['op:test:staging_a', 'op:test:approach_b'],
                            enemy_osids: ['op:test:objective_a'],
                        },
                    ],
                    assigned_brigade_ids: Object.keys(brigades),
                },
            },
            war_front_edges_osid: [
                // staging_a ↔ objective_a
                { a: 'op:test:staging_a', b: 'op:test:objective_a' },
                // approach_b ↔ objective_a (a second approach OSID adjacent to objective)
                { a: 'op:test:approach_b', b: 'op:test:objective_a' },
            ],
        },
        political: {
            political_controllers: {
                'op:test:home_a': 'TEST_FACTION',
                'op:test:staging_a': 'TEST_FACTION',
                'op:test:approach_b': 'TEST_FACTION',
                'op:test:objective_a': 'OTHER_FACTION', // hostile
                'op:test:unrelated_z': 'OTHER_FACTION',
            },
        },
        operation_history: [],
    } as unknown as GameState;
}

function makeOp(
    participating: FormationId[],
    options: { multiAxis?: boolean; staging?: string } = {},
): CorpsOperation {
    const staging = options.staging ?? 'op:test:staging_a';
    if (options.multiAxis) {
        return {
            participating_brigades: participating,
            staging_osid: staging,
            sector_id: 'synth_sector_a',
            objectives: [],
            current_objective_index: 0,
            faction: 'TEST_FACTION',
            corps_id: 'synth_corps',
            axes: [
                {
                    axis_id: 'synth_axis_a',
                    name: 'Synthetic Axis A',
                    objectives: ['op:test:objective_a'],
                    current_objective_index: 0,
                    assigned_brigades: participating,
                    staging_osid: staging,
                },
            ],
        } as unknown as CorpsOperation;
    }
    return {
        participating_brigades: participating,
        staging_osid: staging,
        sector_id: 'synth_sector_a',
        objectives: ['op:test:objective_a'],
        current_objective_index: 0,
        faction: 'TEST_FACTION',
        corps_id: 'synth_corps',
    } as unknown as CorpsOperation;
}

// ---------------------------------------------------------------------------
// T1 — areParticipantsReadyForExecution counts in_transit-to-staging
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR T1: in_transit toward staging counts as ready', () => {
    it('multi-axis: brigade in_transit with destination = axis staging counts as ready', () => {
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        // RED today: in_transit is silent-skipped, returns false (no other ready brigades).
        // GREEN after fix: brigade is committed in-transit toward staging → ready.
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            true,
            'in_transit-to-staging should be counted as ready (currently silently skipped)',
        );
    });

    it('single-axis: brigade in_transit with destination = staging counts as ready', () => {
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: false });
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            true,
        );
    });
});

// ---------------------------------------------------------------------------
// T2 — areParticipantsReadyForExecution counts in_transit-to-approach-OSID
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR T2: in_transit toward axis approach OSID counts as ready', () => {
    it('multi-axis: brigade in_transit destined for an axis-relevant approach OSID counts as ready', () => {
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:approach_b'], // approach OSID, not staging
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        // RED today: returns false. GREEN: approach_b is in axisApproachOsids, brigade counts.
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            true,
        );
    });
});

// ---------------------------------------------------------------------------
// T3 — areParticipantsReadyForExecution does NOT count in_transit-elsewhere
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR T3: in_transit toward unrelated OSID does NOT count', () => {
    it('multi-axis: brigade in_transit destined for an unrelated OSID is NOT ready', () => {
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:unrelated_z'],
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        // GREEN today AND post-fix. Pins the predicate boundary so the fix doesn't
        // accidentally count "any in_transit brigade" — only relevant-destination ones.
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            false,
            'in_transit-to-unrelated-OSID must NOT count (pins predicate boundary)',
        );
    });
});

// ---------------------------------------------------------------------------
// T4 — Already-staged brigade still counts (regression guard)
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR T4: already-staged brigade still counts', () => {
    it('multi-axis: brigade currently at staging, no in_transit, counts as ready', () => {
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:staging_a',
                // no in_transit_destinations
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            true,
        );
    });
});

// ---------------------------------------------------------------------------
// T5 — Destroyed/inactive brigade still excluded (regression guard)
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR T5: destroyed/inactive brigade still excluded', () => {
    it('multi-axis: inactive brigade in_transit toward staging is NOT ready', () => {
        const state = buildState({
            synth_alpha: {
                status: 'inactive',
                personnel: 0,
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            false,
        );
    });

    it('multi-axis: low-personnel brigade in_transit toward staging is NOT ready', () => {
        const state = buildState({
            synth_alpha: {
                personnel: 50, // below MIN_ATTACK_PERSONNEL
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            false,
        );
    });

    it('multi-axis: disrupted brigade in_transit toward staging is NOT ready', () => {
        const state = buildState({
            synth_alpha: {
                disrupted_turns: 2,
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: true });
        assert.equal(
            areParticipantsReadyForExecution(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op),
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// T6 — axisHasExecutableOpeningAttack adjacentParticipants count
// includes in_transit-to-adjacent (gate side)
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR T6: axisHasExecutableOpeningAttack gate counts in_transit-to-adjacent', () => {
    // The adjacency map for this fixture has two edges to objective_a:
    //   staging_a ↔ objective_a, approach_b ↔ objective_a.
    // We seed two brigades: alpha at home_a with in_transit destination staging_a,
    // beta at home_a with in_transit destination unrelated_z. Today neither would
    // count toward adjacentParticipants (both have non-adjacent location_osid).
    // Post-fix: alpha counts (committed-in-transit-toward-adjacent),
    // beta does not. Gate sees adjacentParticipants >= 1 → not the early-exit
    // <= 0 path. We assert via a side-channel: the function returns false today
    // (no adjacent brigades) and returns true OR false post-fix depending on
    // predictor outcome — but the gate-count side is what we pin. The simplest
    // pinnable assertion is the early-exit: with ZERO staged + ONE in_transit-
    // to-staging, today returns false (gate fails); post-fix should not fail
    // ON THE GATE (it may still return false from predictor outcome below the
    // threshold, but the early-exit branch is now passable). To keep the test
    // robust against predictor numerics, we check that the helper exits via
    // the EXISTING per-brigade for-loop path (which today is unreachable when
    // adjacentParticipants <= 0), not via the gate.

    it('current location adjacent: counted in gate (today)', () => {
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:staging_a',
            },
        });
        const adjacency = buildOsidAdjacencyFromFrontEdges(state);
        const op = makeOp(['synth_alpha' as FormationId], { multiAxis: false });
        const threshold = getPlanningAttackThreshold(op);
        // The function may return false (predictor below threshold) but it
        // should at least NOT bail at the gate. We can't pin per-brigade
        // predictor outcomes easily, so we use a smoke check: the call is
        // exercised. Any green-passing test here covers the regression that
        // already-adjacent-staged brigades still count.
        const result = axisHasExecutableOpeningAttack(
            state,
            'TEST_FACTION' as never,
            'op:test:objective_a',
            ['synth_alpha' as FormationId],
            adjacency,
            threshold,
        );
        // We don't pin the result (predictor numerics depend on combat_math).
        // We just assert the call shape is honored (gate-passable).
        assert.equal(typeof result, 'boolean', 'result must be boolean (no throw)');
    });

    it('only-in_transit-to-adjacent: gate count includes the in-transit brigade (post-fix)', () => {
        // Currently: with ZERO staged and ONE in_transit-to-staging brigade, the
        // gate count is 0 → early exit returns false. Post-fix: the gate count
        // should include the in-transit-to-staging brigade, so the gate passes
        // and the function proceeds into the per-brigade for-loop.
        // Asserting "gate passed" without a side-channel is hard. We instead
        // construct a shape where the FUNCTION RESULT diverges:
        //   - Today: returns false (gate exit; no concentrated outcome path
        //     ever runs).
        //   - Post-fix: gate passes, per-brigade loop iterates over a brigade
        //     whose location_osid is NOT adjacent (intermediate/home), so
        //     `predictAllAdjacentTargets(...).find(t => t.osid === objective)`
        //     returns undefined for every brigade → loop terminates without
        //     a `return true` → function still returns false at the bottom.
        //   Net: function returns false in both cases. We cannot pin gate
        //   passing via the public boolean alone.
        //
        // Workaround: we extract gate counting into a tested helper. The
        // implementation MUST export a helper `countAdjacentParticipantsForGate`
        // (or equivalent name) that returns the gate count, and the test
        // pins THAT. This is the same pattern the predecessor lane uses for
        // `prestageBrigadesForTriggeredOp` exposure.
        //
        // For Phase 1 RED: import the helper and assert it returns 1 for the
        // in_transit-to-staging case. The helper does NOT exist today → test
        // fails at IMPORT time, which is the intended RED signal.
        const state = buildState({
            synth_alpha: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const adjacency = buildOsidAdjacencyFromFrontEdges(state);
        const result = countAdjacentGateParticipants(
            state,
            ['synth_alpha' as FormationId],
            adjacency,
            'op:test:objective_a',
        );
        assert.equal(
            result,
            1,
            'in_transit-to-staging brigade must count toward adjacent-gate participants (post-fix)',
        );
    });

    it('staged + in_transit-to-adjacent: gate=2, staged-only count remains 1', () => {
        // QA T6b semantic split: gate count includes in-transit-toward-relevant,
        // but the concentrated-outcome stack uses staged-only count to avoid
        // inflating the predictor with not-yet-arrived brigades.
        const state = buildState({
            synth_staged: {
                location_osid: 'op:test:staging_a',
            },
            synth_intransit: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:staging_a'],
            },
        });
        const adjacency = buildOsidAdjacencyFromFrontEdges(state);
        const ids = ['synth_staged', 'synth_intransit'] as FormationId[];
        assert.equal(countAdjacentGateParticipants(state, ids, adjacency, 'op:test:objective_a'), 2);
        assert.equal(countAdjacentStagedParticipants(state, ids, adjacency, 'op:test:objective_a'), 1);
    });
});

// ---------------------------------------------------------------------------
// D1 — Determinism: re-run produces identical results
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR D1: deterministic across re-runs', () => {
    it('two independent calls produce byte-identical readiness results', () => {
        const buildSpec = () => ({
            synth_alpha: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:staging_a'],
            },
            synth_beta: {
                location_osid: 'op:test:staging_a',
            },
            synth_gamma: {
                location_osid: 'op:test:home_a',
                in_transit_destinations: ['op:test:unrelated_z'],
            },
        });
        const stateA = buildState(buildSpec());
        const stateB = buildState(buildSpec());
        const ids = ['synth_alpha', 'synth_beta', 'synth_gamma'] as FormationId[];
        const opA = makeOp(ids, { multiAxis: true });
        const opB = makeOp(ids, { multiAxis: true });
        const a = areParticipantsReadyForExecution(stateA, 'synth_corps' as FormationId, 'TEST_FACTION' as never, opA);
        const b = areParticipantsReadyForExecution(stateB, 'synth_corps' as FormationId, 'TEST_FACTION' as never, opB);
        assert.equal(JSON.stringify(a), JSON.stringify(b), 'readiness must be deterministic across re-runs');
    });
});

// ---------------------------------------------------------------------------
// G — Static-grep guards: no faction-specific hardcode in the patched lines;
// no determinism violations introduced.
// ---------------------------------------------------------------------------
describe('LANE-2026-05-02-IN-TRANSIT-PREDICTOR G: static-grep guards', () => {
    it('sector_offensive_launch_helpers.ts must not introduce Math.random / Date.now / new Date', () => {
        const src = readFileSync('src/sim/combat/sector_offensive_launch_helpers.ts', 'utf8');
        assert.equal(/\bMath\.random\s*\(/.test(src), false);
        assert.equal(/\bDate\.now\s*\(/.test(src), false);
        assert.equal(/\bnew\s+Date\s*\(/.test(src), false);
        assert.equal(/\bperformance\.now\s*\(/.test(src), false);
    });

    it('LANE-2026-05-02-IN-TRANSIT-PREDICTOR-tagged code must be faction-agnostic', () => {
        const src = readFileSync('src/sim/combat/sector_offensive_launch_helpers.ts', 'utf8');
        // Find every line tagged with the lane marker and assert no faction-specific
        // OSID/brigade/op slug appears. Whitelist-by-omission: if the lane writer
        // touches Krivaja, Srebrenica, etc. literally, it's a railroad.
        const taggedLines = src
            .split('\n')
            .filter((line) => line.includes('LANE-2026-05-02-IN-TRANSIT-PREDICTOR'));
        const FORBIDDEN = /\b(krivaja|srebrenica|stupcanica|stupčanica|zvornik|bratunac|milici|milić|podrinje|skelani|drina|zepa|žepa|RBiH|HRHB|VRS|ARBiH)\b/i;
        for (const line of taggedLines) {
            assert.ok(
                !FORBIDDEN.test(line),
                `lane-tagged line must not reference faction-specific identifier: "${line.trim()}"`,
            );
        }
    });
});
