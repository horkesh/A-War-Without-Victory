/**
 * ENGINE-HEALTH B3 — Tactical Group donation readiness is AUGMENTATION, not a veto.
 *
 * Audit: docs/40_reports/20260919_OPERATION_LIFECYCLE_ENGINE_HEALTH_AUDIT.md finding B3.
 *
 * THE CONTRACT
 *
 *   Donor support is optional augmentation. An operation that is executable without a
 *   Tactical Group must not become non-executable merely because a donor pool exists but
 *   is too weak to satisfy the TG readiness standard. Donation readiness decides whether
 *   the TG AUGMENTATION forms — it never vetoes the underlying ordinary operation.
 *
 *   MONOTONIC PROPERTY. For otherwise identical state, adding an eligible donor with a
 *   non-negative contribution must not change an operation from executable to blocked
 *   solely because the donation is insufficient.
 *
 * THE DEFECT THIS FILE PINS
 *
 *   Before B3, `donationReadinessBlocksAxis` returned false for an EMPTY donor pool
 *   ("degrade to lone-anchor") but true for a non-empty pool below the readiness
 *   fraction — so ADDING a small amount of available support turned an executable axis
 *   into `insufficient_donation`, and `advanceSectorOffensives` then sent the whole
 *   operation to recovery. The Phase-1.5 rationale for the zero-donor branch
 *   ("with zero donors no TG would form anyway, so blocking degrades a valid lone-anchor
 *   op into a cancellation") applies verbatim to the weak-donor case; it had simply been
 *   applied at one boundary instead of to the whole predicate.
 *
 *   Symmetrically, `formTgsAtReadyTransition` declined to form a TG only on an EMPTY
 *   pool and would happily form one from a sub-readiness pool. The two sites disagreed
 *   about what "insufficient donation" means. B3 gives the readiness rule one owner:
 *   the formation site.
 *
 * Determinism: pure synchronous assertions over hand-built minimal GameState. No I/O,
 * no async, no randomness, no timestamps.
 */

import { describe, expect, it } from 'vitest';

import { evaluateOpeningAttackReadiness } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { formTgsAtReadyTransition } from '../src/sim/combat/operation_preparation.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import { selectDonors } from '../src/sim/combat/tactical_group_selection.js';
import {
    DONATION_READINESS_FRACTION,
    DONATION_READINESS_FRACTION_HRHB,
    ENABLE_TG_FORMATION,
} from '../src/sim/combat/tactical_group_config.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { CorpsOperation, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

// ── Geometry ───────────────────────────────────────────────────────────────
// One enemy objective, one friendly approach adjacent to it (the anchor stands there),
// and a friendly rear cell adjacent to the approach (donors stand there, 1 BFS hop from
// the staging OSID). Both friendly cells belong to the attacking faction.
const OBJECTIVE = 'op:target:objective';
const APPROACH = 'op:target:approach';
const REAR = 'op:target:rear';

const ANCHOR_PERSONNEL = 2000;

interface DonorSpec {
    id: string;
    personnel: number;
}

function makeDonor(spec: DonorSpec, faction: FactionId): FormationState {
    return makeFormation({
        id: spec.id,
        faction,
        corps_id: 'test_corps',
        location_osid: REAR,
        personnel: spec.personnel,
        // Above COHESION_HEALTHY_THRESHOLD (50) so `isEligibleDonor` admits it.
        cohesion: 80,
    });
}

function makeAxisOperation(): CorpsOperation {
    return {
        name: 'Op Augmentation',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 1,
        phase_started_turn: 1,
        participating_brigades: ['anchor'],
        objectives: [OBJECTIVE],
        current_objective_index: 0,
        planning_duration: 1,
        staging_osid: APPROACH,
        axes: [{
            axis_id: 'main',
            name: 'Main Axis',
            assigned_brigades: ['anchor'],
            main_brigade: 'anchor',
            objectives: [OBJECTIVE],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            staging_osid: APPROACH,
        }],
    } as unknown as CorpsOperation;
}

/**
 * Minimal state in which the axis is executable on its own merits: the anchor stands on
 * a friendly cell with a live front edge to an undefended enemy objective, so every gate
 * upstream of the donation check (approach OSIDs, assembly floor, attack floor,
 * opening-attack prediction) passes. Only the donor pool varies between cases.
 */
function makeState(
    donors: DonorSpec[],
    op: CorpsOperation,
    faction: FactionId = 'RS',
): GameState {
    const enemyFaction: FactionId = faction === 'RBiH' ? 'RS' : 'RBiH';
    const formations: Record<string, FormationState> = {
        test_corps: makeCorps({ id: 'test_corps', faction, hq_sid: 'S1' } as never),
        anchor: makeFormation({
            id: 'anchor',
            faction,
            corps_id: 'test_corps',
            location_osid: APPROACH,
            personnel: ANCHOR_PERSONNEL,
            cohesion: 80,
        }),
    };
    for (const spec of donors) formations[spec.id] = makeDonor(spec, faction);

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, phase: 'war', seed: 'b3-monotonic' },
        factions: [{ id: faction }, { id: enemyFaction }],
        military: {
            formations,
            corps_command: {
                test_corps: {
                    command_span: 1,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [op],
                },
            },
            corps_front_sectors: {},
            tactical_groups: {},
            war_front_edges_osid: [
                { a: APPROACH, b: OBJECTIVE },
                { a: REAR, b: APPROACH },
            ],
        },
        political: {
            political_controllers: {
                [OBJECTIVE]: enemyFaction,
                [APPROACH]: faction,
                [REAR]: faction,
            },
        },
    } as unknown as GameState;
}

function readiness(donors: DonorSpec[], faction: FactionId = 'RS') {
    const op = makeAxisOperation();
    const state = makeState(donors, op, faction);
    return {
        state,
        op,
        result: evaluateOpeningAttackReadiness(state, 'test_corps' as never, faction, op),
    };
}

/** Total personnel the donor pool would actually pledge, per the production selector. */
function pledgedPersonnel(donors: DonorSpec[], faction: FactionId = 'RS'): number {
    const op = makeAxisOperation();
    const state = makeState(donors, op, faction);
    return selectDonors(state, { anchor_brigade_id: 'anchor' as never, staging_osid: APPROACH })
        .reduce((sum, d) => sum + d.personnel_lent, 0);
}

// A single small donor: eligible (active, same corps, healthy cohesion, 1 hop) and it
// pledges a POSITIVE amount, but its pledge lands far below 0.6 x 2000 = 1200.
// Donation math (kind 'brigade', residual floor 800, 1 hop → falloff 0.85, cap 0.30):
// floor(min(0.85P, 0.30P, P-800)) = P-800 for 800 < P <= 1142 → 1000 pledges 200.
const WEAK_DONOR: DonorSpec[] = [{ id: 'weak_donor', personnel: 1000 }];
// Enough donor mass that the pledge clears the standard readiness fraction.
const STRONG_DONORS: DonorSpec[] = [
    { id: 'strong_donor_a', personnel: 2600 },
    { id: 'strong_donor_b', personnel: 2600 },
];

describe('B3 — the fixture itself is sound', () => {
    it('the TG formation flag is on, so the donation path is live', () => {
        expect(ENABLE_TG_FORMATION).toBe(true);
    });

    it('the weak donor is eligible and pledges a positive amount BELOW the readiness floor', () => {
        const pledged = pledgedPersonnel(WEAK_DONOR);
        expect(pledged).toBeGreaterThan(0);
        expect(pledged).toBeLessThan(DONATION_READINESS_FRACTION * ANCHOR_PERSONNEL);
    });

    it('the strong pool pledges at or above the readiness floor', () => {
        expect(pledgedPersonnel(STRONG_DONORS))
            .toBeGreaterThanOrEqual(DONATION_READINESS_FRACTION * ANCHOR_PERSONNEL);
    });
});

describe('B3 — operation executability is monotonic in donor support', () => {
    // CASE A. The baseline: an executable operation with no donors at all.
    it('A: zero eligible donors — the operation is executable', () => {
        const { result } = readiness([]);
        expect(result.executable).toBe(true);
        expect(result.blocker).toBeUndefined();
    });

    // CASE B. THE DEFECT. Identical operation, plus one small eligible donor.
    // Before B3 this returned { executable: false, blocker: 'insufficient_donation' }.
    it('B: adding one weak donor does NOT block the operation', () => {
        const { result } = readiness(WEAK_DONOR);
        expect(result.blocker).not.toBe('insufficient_donation');
        expect(result.executable).toBe(true);
    });

    // CASE C. Sufficient donor mass was never the problem; pin it so a future change
    // cannot "fix" monotonicity by breaking the healthy case.
    it('C: sufficient donor mass — the operation is executable', () => {
        const { result } = readiness(STRONG_DONORS);
        expect(result.executable).toBe(true);
        expect(result.blocker).toBeUndefined();
    });

    // CASE C'. Several donors, still collectively below the floor.
    it("C': multiple weak donors still below readiness do NOT block the operation", () => {
        const { result } = readiness([
            { id: 'weak_a', personnel: 1000 },
            { id: 'weak_b', personnel: 1000 },
            { id: 'weak_c', personnel: 1000 },
        ]);
        expect(result.blocker).not.toBe('insufficient_donation');
        expect(result.executable).toBe(true);
    });

    // THE PROPERTY ITSELF, stated as one assertion over the three populations.
    it('MONOTONIC: executable=true is never turned into executable=false by adding donors', () => {
        const none = readiness([]).result;
        const weak = readiness(WEAK_DONOR).result;
        const strong = readiness(STRONG_DONORS).result;

        expect(none.executable).toBe(true);
        // Adding non-negative support may not remove executability.
        expect(weak.executable).toBe(true);
        expect(strong.executable).toBe(true);
    });

    // CASE I. No target-, faction- or OSID-specific behaviour: the same shape holds for
    // an unrelated operation run by the other faction over its own geometry.
    it('I: an unrelated RBiH operation shows the same monotonic behaviour', () => {
        expect(readiness([], 'RBiH').result.executable).toBe(true);
        expect(readiness(WEAK_DONOR, 'RBiH').result.executable).toBe(true);
        expect(readiness(STRONG_DONORS, 'RBiH').result.executable).toBe(true);
    });
});

describe('B3 — inadequate support declines the augmentation instead of the operation', () => {
    function formWith(donors: DonorSpec[], faction: FactionId = 'RS') {
        const op = makeAxisOperation();
        const state = makeState(donors, op, faction);
        formTgsAtReadyTransition(state, op, 5);
        return { state, op };
    }

    it('A: zero donors — no TG forms, the anchor fights alone (unchanged behaviour)', () => {
        const { state } = formWith([]);
        expect(Object.keys(state.military.tactical_groups ?? {})).toHaveLength(0);
    });

    // CASE B. The augmentation is declined and NO donor cost is paid.
    it('B: one weak donor — no TG forms and the donor lends nothing', () => {
        const { state } = formWith(WEAK_DONOR);
        expect(Object.keys(state.military.tactical_groups ?? {})).toHaveLength(0);

        const donor = state.military.formations?.weak_donor;
        expect(donor?.personnel_lent_by_tg ?? {}).toEqual({});
        expect(donor?.equipment_lent_by_tg ?? {}).toEqual({});
        // No cohesion bleed and no per-scenario donation counter consumed.
        expect(donor?.cohesion).toBe(80);
        expect(donor?.tg_donations_this_scenario ?? 0).toBe(0);
        expect(donor?.tg_cooldown_until_turn ?? null).toBeNull();
    });

    it('C: multiple weak donors still below readiness — same decline, no costs', () => {
        const { state } = formWith([
            { id: 'weak_a', personnel: 1000 },
            { id: 'weak_b', personnel: 1000 },
            { id: 'weak_c', personnel: 1000 },
        ]);
        expect(Object.keys(state.military.tactical_groups ?? {})).toHaveLength(0);
        for (const id of ['weak_a', 'weak_b', 'weak_c']) {
            expect(state.military.formations?.[id]?.personnel_lent_by_tg ?? {}).toEqual({});
        }
    });

    // CASE D. The healthy path is untouched: a sufficient pool still forms a TG and the
    // existing donor accounting still runs.
    it('D: sufficient donors — a TG forms and the existing donor accounting applies', () => {
        const { state } = formWith(STRONG_DONORS);
        const tgs = Object.values(state.military.tactical_groups ?? {});
        expect(tgs).toHaveLength(1);
        expect(tgs[0]?.anchor_brigade_id).toBe('anchor');
        expect(tgs[0]?.donor_contributions.length).toBeGreaterThan(0);

        const lent = state.military.formations?.strong_donor_a?.personnel_lent_by_tg ?? {};
        expect(Object.keys(lent)).toHaveLength(1);
        expect(Object.values(lent)[0]).toBeGreaterThan(0);
    });

    // CASE F. Combat strength changes only through the existing TG power path. The
    // fallback adds nothing: a declined augmentation leaves the anchor exactly as it was.
    it('F: declining the augmentation does not alter the anchor', () => {
        const before = makeState([], makeAxisOperation()).military.formations?.anchor;
        const { state } = formWith(WEAK_DONOR);
        const after = state.military.formations?.anchor;
        expect(after?.personnel).toBe(before?.personnel);
        expect(after?.cohesion).toBe(before?.cohesion);
        expect(after?.personnel_lent_by_tg ?? {}).toEqual({});
    });

    // CASE G. Selection exclusions are untouched — an already-committed donor is still
    // ineligible, so it neither forms nor blocks anything.
    it('G: a donor already lending to another TG stays excluded', () => {
        const op = makeAxisOperation();
        const state = makeState(STRONG_DONORS, op);
        state.military.formations!.strong_donor_a!.personnel_lent_by_tg = { 'tg:other': 100 };
        const donors = selectDonors(state, {
            anchor_brigade_id: 'anchor' as never,
            staging_osid: APPROACH,
        });
        expect(donors.map((d) => d.brigade_id)).not.toContain('strong_donor_a');
    });

    // CASE J. Deterministic: identical input state produces an identical decision.
    it('J: the decision is deterministic across repeated evaluation', () => {
        const a = formWith(WEAK_DONOR);
        const b = formWith(WEAK_DONOR);
        expect(Object.keys(a.state.military.tactical_groups ?? {}))
            .toEqual(Object.keys(b.state.military.tactical_groups ?? {}));
        expect(readiness(WEAK_DONOR).result).toEqual(readiness(WEAK_DONOR).result);
    });
});

describe('B3 — declining a TG never manufactures an attack', () => {
    // CASE E. The ordinary opening-attack gate remains authoritative. Strip the anchor
    // below the attack floor: the operation must still be refused, and refused for an
    // attack-readiness reason, not silently waved through by the augmentation fallback.
    it('E: an axis that cannot attack is still blocked once the TG is declined', () => {
        const op = makeAxisOperation();
        const state = makeState(WEAK_DONOR, op);
        state.military.formations!.anchor!.personnel = 1; // below MIN_ATTACK_PERSONNEL
        const result = evaluateOpeningAttackReadiness(state, 'test_corps' as never, 'RS', op);
        expect(result.executable).toBe(false);
        expect(result.blocker).not.toBe('insufficient_donation');
    });

    it('E2: an axis with no live front edge to its objective is still blocked', () => {
        const op = makeAxisOperation();
        const state = makeState(WEAK_DONOR, op);
        state.military.war_front_edges_osid = [{ a: REAR, b: APPROACH }] as never;
        const result = evaluateOpeningAttackReadiness(state, 'test_corps' as never, 'RS', op);
        expect(result.executable).toBe(false);
        expect(result.blocker).not.toBe('insufficient_donation');
    });
});

describe('B3 — HRHB readiness band is characterised, not hidden', () => {
    // CASE H. After B3 the HRHB fraction can no longer veto any operation. Its only
    // remaining effect is the TG FORMATION bar: an HVO axis forms a Tactical Group on a
    // smaller local pledge than the other factions. Pinned explicitly so no faction
    // exception can survive by accident.
    it('H1: the HRHB fraction is still strictly lower than the default', () => {
        expect(DONATION_READINESS_FRACTION_HRHB).toBeLessThan(DONATION_READINESS_FRACTION);
    });

    it('H2: an HRHB operation is executable at every donor level, exactly like the others', () => {
        expect(readiness([], 'HRHB').result.executable).toBe(true);
        expect(readiness(WEAK_DONOR, 'HRHB').result.executable).toBe(true);
        expect(readiness(STRONG_DONORS, 'HRHB').result.executable).toBe(true);
    });

    it('H3: the HRHB band affects only whether the augmentation forms', () => {
        // A pledge that sits between the HRHB floor and the default floor.
        const midband: DonorSpec[] = [{ id: 'midband_donor', personnel: 1700 }];
        const pledged = pledgedPersonnel(midband, 'HRHB');
        expect(pledged).toBeGreaterThanOrEqual(DONATION_READINESS_FRACTION_HRHB * ANCHOR_PERSONNEL);
        expect(pledged).toBeLessThan(DONATION_READINESS_FRACTION * ANCHOR_PERSONNEL);

        const hrhbOp = makeAxisOperation();
        const hrhbState = makeState(midband, hrhbOp, 'HRHB');
        formTgsAtReadyTransition(hrhbState, hrhbOp, 5);
        expect(Object.keys(hrhbState.military.tactical_groups ?? {})).toHaveLength(1);

        const rsOp = makeAxisOperation();
        const rsState = makeState(midband, rsOp, 'RS');
        formTgsAtReadyTransition(rsState, rsOp, 5);
        expect(Object.keys(rsState.military.tactical_groups ?? {})).toHaveLength(0);
        // …and the RS operation is still executable despite forming no TG.
        expect(readiness(midband, 'RS').result.executable).toBe(true);
    });
});

describe('B3 — the TG-formation decline is observable, and absent by default', () => {
    function formWithTopic(topic: string | undefined, donors: DonorSpec[], faction: FactionId = 'RS') {
        const previous = process.env.AWWV_DEBUG_REASON_CODES;
        if (topic === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
        else process.env.AWWV_DEBUG_REASON_CODES = topic;
        resetReasonCodeTopicCacheForTests();
        try {
            const op = makeAxisOperation();
            const state = makeState(donors, op, faction);
            formTgsAtReadyTransition(state, op, 5);
            return op;
        } finally {
            if (previous === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
            else process.env.AWWV_DEBUG_REASON_CODES = previous;
            resetReasonCodeTopicCacheForTests();
        }
    }

    it('default run: no decline record is written, so the save is unmoved', () => {
        const op = formWithTopic(undefined, WEAK_DONOR);
        expect(op.axes?.[0]?.tg_formation_decline).toBeUndefined();
        expect(Object.keys(op.axes?.[0] ?? {})).not.toContain('tg_formation_decline');
    });

    it('topic on: a weak pool records every field the retired reason code could not', () => {
        const op = formWithTopic('tg_formation', WEAK_DONOR);
        const detail = op.axes?.[0]?.tg_formation_decline;
        expect(detail).toBeDefined();
        expect(detail).toMatchObject({
            declined: true,
            reason: 'donation_below_readiness',
            anchor_brigade_id: 'anchor',
            anchor_personnel: ANCHOR_PERSONNEL,
            faction: 'RS',
            donor_count: 1,
            readiness_fraction: DONATION_READINESS_FRACTION,
            required_donation: DONATION_READINESS_FRACTION * ANCHOR_PERSONNEL,
            // The fact the old `insufficient_donation` blocker asserted the opposite of.
            operation_remains_executable: true,
        });
        expect(detail!.donated_personnel).toBeGreaterThan(0);
        expect(detail!.donated_personnel).toBeLessThan(detail!.required_donation);
    });

    it('topic on: an empty pool is distinguished from a weak one', () => {
        const detail = formWithTopic('tg_formation', []).axes?.[0]?.tg_formation_decline;
        expect(detail?.reason).toBe('no_eligible_donors');
        expect(detail?.donor_count).toBe(0);
        expect(detail?.donated_personnel).toBe(0);
    });

    it('topic on: a TG that actually forms records no decline', () => {
        const op = formWithTopic('tg_formation', STRONG_DONORS);
        expect(op.axes?.[0]?.tg_formation_decline).toBeUndefined();
    });

    it('topic on: the HRHB band is reported explicitly, not implied', () => {
        const detail = formWithTopic('tg_formation', [{ id: 'tiny', personnel: 900 }], 'HRHB')
            .axes?.[0]?.tg_formation_decline;
        expect(detail?.readiness_fraction).toBe(DONATION_READINESS_FRACTION_HRHB);
        expect(detail?.faction).toBe('HRHB');
    });
});

describe('B3 — insufficient_donation is retired as an operation-level blocker', () => {
    it('no donor population produces an insufficient_donation blocker', () => {
        for (const donors of [[], WEAK_DONOR, STRONG_DONORS,
            [{ id: 'w1', personnel: 1000 }, { id: 'w2', personnel: 1000 }]]) {
            for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
                expect(readiness(donors, faction).result.blocker).not.toBe('insufficient_donation');
            }
        }
    });
});
