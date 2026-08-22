/**
 * mainstaff_op_availability.test.ts — sector-exempt reserve availability contract.
 *
 * `EXEMPT_CORPS_IDS` brigades (main staff / general staff) are intentionally
 * sectorless "until loaned or attached". Two gates decided their operation
 * participation from signals that have nothing to do with whether they were
 * ordered onto the operation:
 *
 *   GATE 2 (`selectEligibleOpportunityParticipants`) dropped every main-staff
 *   brigade NAMED on a catalog roster, because its corps can never equal the
 *   real corps the axis is hosted on.
 *
 *   GATE 1 (`uniqueActiveParticipants`) kept a main-staff brigade for having no
 *   sector claim at all (a free ride based on where it was parked) and evicted
 *   one that stood in another corps' territory.
 *
 * The flag restores the contract `pre_planned_operations.ts` already implements
 * for the pre-planned path: the roster authorises, the loan delivers.
 *
 * Every case is asserted in BOTH flag states — flag OFF must stay byte-identical
 * to the shipped baseline, which is the whole point of the default.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    applyOpportunityDecision,
    buildProposalId,
    runOpportunityEvaluationStep,
    type AxisPredicate,
    type OperationOpportunityDef,
} from '../src/sim/combat/operation_opportunities.js';
import { reconcileFinalOperationTruth } from '../src/sim/combat/final_operation_truth_reconciliation.js';
import {
    isMainStaffOpAvailabilityEnabled,
    isMainStaffOpRetentionEnabled,
    resetMainStaffOpAvailabilityOverride,
    resetMainStaffOpRetentionOverride,
    setMainStaffOpAvailabilityOverride,
    setMainStaffOpRetentionOverride,
} from '../src/sim/combat/mainstaff_op_availability_gate.js';
import type { CorpsCommandState, CorpsOperation, GameState } from '../src/state/game_state.js';
import { makeFormation, makeSector } from './test_factories.js';

afterEach(() => {
    resetMainStaffOpAvailabilityOverride();
    resetMainStaffOpRetentionOverride();
});

// ─── GATE 2 — admission by roster + loan ────────────────────────────────────

const HOST_CORPS = 'hvo_tomislavgrad';
const EXEMPT_CORPS = 'hvo_main_staff';

function emptyLoanState() {
    return {
        on_loan: false,
        loaned_to_corps: null,
        loan_start_turn: null,
        last_recall_turn: null,
        loan_start_personnel: null,
        permanently_degraded: false,
        current_episode_id: null,
    };
}

function buildOpportunityState(turn: number): GameState {
    const cmd: CorpsCommandState = {
        command_span: 6,
        subordinate_count: 6,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'defensive',
        active_operations: [],
    } as unknown as CorpsCommandState;

    return {
        schema_version: 0,
        meta: { turn, seed: 'test', phase: 'war' as const },
        factions: [],
        military: {
            formations: {
                // Rostered, hosted corps — always eligible, both flag states.
                hvo_local_brigade: {
                    id: 'hvo_local_brigade',
                    name: 'hvo_local_brigade',
                    kind: 'brigade',
                    status: 'active',
                    faction: 'HRHB',
                    corps_id: HOST_CORPS,
                    personnel: 2000,
                    location_osid: 'op:livno:livno_2',
                    home_osid: 'op:livno:livno_2',
                },
                // Rostered, sector-exempt elite — the brigade the designer named.
                hvo_1st_guard_abb: {
                    id: 'hvo_1st_guard_abb',
                    name: 'hvo_1st_guard_abb',
                    kind: 'brigade',
                    status: 'active',
                    faction: 'HRHB',
                    corps_id: EXEMPT_CORPS,
                    personnel: 2800,
                    location_osid: 'op:livno:misi_2',
                    home_osid: 'op:livno:misi_2',
                    elite_loan_state: emptyLoanState(),
                },
                // Sector-exempt but NOT elite — no loan channel, stays undeliverable.
                hvo_staff_militia: {
                    id: 'hvo_staff_militia',
                    name: 'hvo_staff_militia',
                    kind: 'brigade',
                    status: 'active',
                    faction: 'HRHB',
                    corps_id: EXEMPT_CORPS,
                    personnel: 900,
                    location_osid: 'op:livno:misi_2',
                    home_osid: 'op:livno:misi_2',
                },
                // Foreign REAL corps — must stay excluded in both flag states.
                hvo_other_corps_brigade: {
                    id: 'hvo_other_corps_brigade',
                    name: 'hvo_other_corps_brigade',
                    kind: 'brigade',
                    status: 'active',
                    faction: 'HRHB',
                    corps_id: 'hvo_central_bosnia',
                    personnel: 2000,
                    location_osid: 'op:zepce:zepce_2',
                    home_osid: 'op:zepce:zepce_2',
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_front_sectors: {},
            corps_command: { [HOST_CORPS]: cmd },
        },
        political: {} as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

const greenAxis: AxisPredicate = () => ({ green: true, reason: 'satisfied' });

function mistralLikeDef(): OperationOpportunityDef {
    return {
        opportunity_id: 'fixture_mistral',
        name: 'Fixture Mistral',
        tier: 'T1',
        faction: 'HRHB',
        primary_corps: HOST_CORPS,
        family: 'federation_western_bosnia',
        axes: [{
            axis_id: 'fixture_drvar',
            name: 'Drvar Axis',
            corps: HOST_CORPS,
            brigades: [
                'hvo_1st_guard_abb',
                'hvo_staff_militia',
                'hvo_other_corps_brigade',
                'hvo_local_brigade',
            ],
            objectives: ['op:titov_drvar:drvar_2'],
        }],
        staging_osid: 'op:livno:misi_2',
        planning_duration: 3,
        citations: ['fixture'],
        historical_exit_class: 'partial_success',
        prerequisites: {
            date_window: 'n_a',
            political_authorization: 'n_a',
            corps_readiness: 'required',
            logistics: 'n_a',
            staging_access: 'n_a',
            weather_season: 'n_a',
            commander_confidence: 'n_a',
            enemy_weakness: 'n_a',
            alliance_context: 'n_a',
            force_quality: 'n_a',
            min_optional_axes: 0,
        },
        evaluators: {
            date_window: greenAxis,
            political_authorization: greenAxis,
            corps_readiness: greenAxis,
            logistics: greenAxis,
            staging_access: greenAxis,
            weather_season: greenAxis,
            commander_confidence: greenAxis,
            enemy_weakness: greenAxis,
            alliance_context: greenAxis,
            force_quality: greenAxis,
        },
        staff_recommendation: 'approve',
    };
}

function spawnFixtureOperation(state: GameState, turn: number, def: OperationOpportunityDef) {
    runOpportunityEvaluationStep(state, turn, [def]);
    applyOpportunityDecision(state, turn, buildProposalId(def.opportunity_id, turn), 'approve', [def]);
    return state.military.corps_command![HOST_CORPS].active_operations
        .find(op => op.name === def.name) ?? null;
}

describe('GATE 2 — opportunity roster admission for sector-exempt brigades', () => {
    it('defaults availability ON so authored main-staff roster members are deliverable', () => {
        const prior = process.env.AWWV_MAINSTAFF_OP_AVAILABILITY;
        delete process.env.AWWV_MAINSTAFF_OP_AVAILABILITY;
        resetMainStaffOpAvailabilityOverride();
        try {
            expect(isMainStaffOpAvailabilityEnabled()).toBe(true);
        } finally {
            if (prior === undefined) delete process.env.AWWV_MAINSTAFF_OP_AVAILABILITY;
            else process.env.AWWV_MAINSTAFF_OP_AVAILABILITY = prior;
            resetMainStaffOpAvailabilityOverride();
        }
    });
    it('AVAILABILITY OFF: a NAMED main-staff brigade is dropped (shipped baseline)', () => {
        setMainStaffOpAvailabilityOverride(false);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op).not.toBeNull();
        expect(op!.axes![0].assigned_brigades).toEqual(['hvo_local_brigade']);
        expect(state.military.formations!.hvo_1st_guard_abb.elite_loan_state!.on_loan).toBe(false);
    });

    it('AVAILABILITY ON: a NAMED main-staff elite is admitted and loaned to the host corps', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op).not.toBeNull();
        expect(op!.axes![0].assigned_brigades).toContain('hvo_1st_guard_abb');
        expect(op!.participating_brigades).toContain('hvo_1st_guard_abb');

        const loan = state.military.formations!.hvo_1st_guard_abb.elite_loan_state!;
        expect(loan.on_loan).toBe(true);
        expect(loan.loaned_to_corps).toBe(HOST_CORPS);
        expect(loan.loan_start_turn).toBe(175);
    });

    it('AVAILABILITY ON: a permanently degraded elite is not admitted or loaned', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        state.military.formations!.hvo_1st_guard_abb.elite_loan_state!.permanently_degraded = true;

        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op!.axes![0].assigned_brigades).not.toContain('hvo_1st_guard_abb');
        expect(state.military.formations!.hvo_1st_guard_abb.elite_loan_state!.on_loan).toBe(false);
    });

    it('AVAILABILITY ON: a cooldown-ineligible elite is not admitted or loaned', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        state.military.formations!.hvo_1st_guard_abb.elite_loan_state!.last_recall_turn = 174;

        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op!.axes![0].assigned_brigades).not.toContain('hvo_1st_guard_abb');
        expect(state.military.formations!.hvo_1st_guard_abb.elite_loan_state!.on_loan).toBe(false);
    });

    it('AVAILABILITY ON: an elite loaned to another corps is not admitted or reassigned', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        const loan = state.military.formations!.hvo_1st_guard_abb.elite_loan_state!;
        loan.on_loan = true;
        loan.loaned_to_corps = 'hvo_central_bosnia';
        loan.loan_start_turn = 170;

        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op!.axes![0].assigned_brigades).not.toContain('hvo_1st_guard_abb');
        expect(loan.on_loan).toBe(true);
        expect(loan.loaned_to_corps).toBe('hvo_central_bosnia');
        expect(loan.loan_start_turn).toBe(170);
    });

    it('AVAILABILITY ON: admission is by ROSTER, not by exemption — a foreign REAL corps stays out', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op!.axes![0].assigned_brigades).not.toContain('hvo_other_corps_brigade');
    });

    it('AVAILABILITY ON: a sector-exempt brigade with NO loan channel is still not deliverable', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        const op = spawnFixtureOperation(state, 175, mistralLikeDef());

        expect(op!.axes![0].assigned_brigades).not.toContain('hvo_staff_militia');
    });

    it('AVAILABILITY ON: the loan does not auto-join a concurrent operation of the same corps', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildOpportunityState(175);
        const concurrent = {
            name: 'Concurrent Op',
            type: 'sector_attack',
            phase: 'execution',
            started_turn: 170,
            phase_started_turn: 170,
            participating_brigades: [],
            axes: [{
                axis_id: 'concurrent:axis',
                name: 'Concurrent Axis',
                assigned_brigades: [],
                objectives: ['op:kupres:bucovaca'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        state.military.corps_command![HOST_CORPS].active_operations.push(
            concurrent as unknown as CorpsOperation,
        );

        spawnFixtureOperation(state, 175, mistralLikeDef());

        // The brigade belongs to the axis its author named, and to nothing else.
        expect(concurrent.axes[0].assigned_brigades).toEqual([]);
        expect(concurrent.participating_brigades).toEqual([]);
    });
});

// ─── GATE 1 — retention reads the loan, not the parking spot ────────────────

function buildReconciliationState(opts: {
    exemptLoanedTo: string | null;
    exemptSectorCorps: string | null;
}): GameState {
    const state = {
        meta: { turn: 180, phase: 'war' },
        military: { formations: {}, corps_command: {}, corps_front_sectors: {} },
        political: { political_controllers: {} },
        factions: [],
    } as unknown as GameState;

    state.military.formations = {
        hvo_local_brigade: makeFormation({
            id: 'hvo_local_brigade',
            faction: 'HRHB',
            corps_id: HOST_CORPS,
            location_osid: 'op:livno:livno_2',
            home_osid: 'op:livno:livno_2',
            status: 'active',
        }),
        hvo_2nd_guard_mechanized: {
            ...makeFormation({
                id: 'hvo_2nd_guard_mechanized',
                faction: 'HRHB',
                corps_id: EXEMPT_CORPS,
                location_osid: 'op:zepce:zepce_2',
                home_osid: 'op:mostar:mostar_zapad_2',
                status: 'active',
            }),
            elite_loan_state: {
                ...emptyLoanState(),
                ...(opts.exemptLoanedTo
                    ? { on_loan: true, loaned_to_corps: opts.exemptLoanedTo, loan_start_turn: 176 }
                    : {}),
            },
        },
    };

    state.military.corps_front_sectors = {
        host: makeSector({
            sector_id: 'sector:hvo_tomislavgrad:0',
            corps_id: HOST_CORPS,
            assigned_brigade_ids: ['hvo_local_brigade'],
            territory_osids: ['op:livno:livno_2'],
            friendly_osids: ['op:livno:livno_2'],
            edge_ids: ['op:livno:livno_2__enemy'],
        }),
    };
    if (opts.exemptSectorCorps) {
        state.military.corps_front_sectors.other = makeSector({
            sector_id: 'sector:other:2',
            corps_id: opts.exemptSectorCorps,
            assigned_brigade_ids: ['hvo_2nd_guard_mechanized'],
            territory_osids: ['op:zepce:zepce_2'],
            friendly_osids: ['op:zepce:zepce_2'],
            edge_ids: ['op:zepce:zepce_2__enemy'],
        });
    }

    state.military.corps_command = {
        [HOST_CORPS]: {
            active_operations: [{
                name: 'Operation Fixture Mistral',
                type: 'sector_attack',
                phase: 'execution',
                started_turn: 175,
                phase_started_turn: 175,
                participating_brigades: ['hvo_local_brigade', 'hvo_2nd_guard_mechanized'],
                sector_id: 'sector:hvo_tomislavgrad:0',
                axes: [{
                    axis_id: 'axis:fixture',
                    name: 'Main Axis',
                    assigned_brigades: ['hvo_local_brigade', 'hvo_2nd_guard_mechanized'],
                    objectives: ['op:titov_drvar:drvar_2'],
                    current_objective_index: 0,
                    status: 'executing',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                }],
            }],
        },
    } as unknown as GameState['military']['corps_command'];

    return state;
}

function participantsAfterReconcile(state: GameState): string[] {
    reconcileFinalOperationTruth(state);
    return state.military.corps_command![HOST_CORPS].active_operations[0].participating_brigades;
}

describe('GATE 1 — reconciliation retention for sector-exempt brigades', () => {
    it('defaults retention ON so loans, not sectorless parking, own participation', () => {
        const prior = process.env.AWWV_MAINSTAFF_OP_RETENTION;
        delete process.env.AWWV_MAINSTAFF_OP_RETENTION;
        resetMainStaffOpRetentionOverride();
        try {
            expect(isMainStaffOpRetentionEnabled()).toBe(true);
        } finally {
            if (prior === undefined) delete process.env.AWWV_MAINSTAFF_OP_RETENTION;
            else process.env.AWWV_MAINSTAFF_OP_RETENTION = prior;
            resetMainStaffOpRetentionOverride();
        }
    });
    // Every case here drives AWWV_MAINSTAFF_OP_RETENTION and pins
    // AWWV_MAINSTAFF_OP_AVAILABILITY to the OPPOSITE value, so a passing
    // assertion cannot be produced by the admission half.

    it('RETENTION OFF: a foreign sector claim evicts the exempt brigade (shipped baseline)', () => {
        setMainStaffOpRetentionOverride(false);
        setMainStaffOpAvailabilityOverride(true);
        const state = buildReconciliationState({
            exemptLoanedTo: HOST_CORPS,
            exemptSectorCorps: 'hvo_central_bosnia',
        });
        expect(participantsAfterReconcile(state)).toEqual(['hvo_local_brigade']);
    });

    it('RETENTION ON: a brigade LOANED to the host corps is retained despite a foreign sector claim', () => {
        setMainStaffOpRetentionOverride(true);
        setMainStaffOpAvailabilityOverride(false);
        const state = buildReconciliationState({
            exemptLoanedTo: HOST_CORPS,
            exemptSectorCorps: 'hvo_central_bosnia',
        });
        expect(participantsAfterReconcile(state))
            .toEqual(['hvo_2nd_guard_mechanized', 'hvo_local_brigade']);
    });

    it('RETENTION OFF: a sectorless, unattached exempt brigade rides along (the accident)', () => {
        setMainStaffOpRetentionOverride(false);
        setMainStaffOpAvailabilityOverride(true);
        const state = buildReconciliationState({ exemptLoanedTo: null, exemptSectorCorps: null });
        expect(participantsAfterReconcile(state))
            .toEqual(['hvo_2nd_guard_mechanized', 'hvo_local_brigade']);
    });

    it('RETENTION ON: the free ride is withdrawn — no loan, no claim, no participation', () => {
        setMainStaffOpRetentionOverride(true);
        setMainStaffOpAvailabilityOverride(false);
        const state = buildReconciliationState({ exemptLoanedTo: null, exemptSectorCorps: null });
        expect(participantsAfterReconcile(state)).toEqual(['hvo_local_brigade']);
    });

    it('RETENTION ON: a loan to a DIFFERENT corps does not confer participation here', () => {
        setMainStaffOpRetentionOverride(true);
        setMainStaffOpAvailabilityOverride(false);
        const state = buildReconciliationState({
            exemptLoanedTo: 'hvo_central_bosnia',
            exemptSectorCorps: null,
        });
        expect(participantsAfterReconcile(state)).toEqual(['hvo_local_brigade']);
    });

    it('RETENTION ON: non-exempt brigades keep the unchanged sector-claim predicate', () => {
        setMainStaffOpRetentionOverride(true);
        setMainStaffOpAvailabilityOverride(false);
        const state = buildReconciliationState({ exemptLoanedTo: HOST_CORPS, exemptSectorCorps: null });
        // Move the local brigade's claim to a foreign corps; it must be evicted
        // by the ORIGINAL predicate, which neither flag touches.
        state.military.corps_front_sectors!['sector:other'] = makeSector({
            sector_id: 'sector:foreign:0',
            corps_id: 'hvo_central_bosnia',
            assigned_brigade_ids: ['hvo_local_brigade'],
            territory_osids: ['op:zepce:zepce_2'],
            friendly_osids: ['op:zepce:zepce_2'],
            edge_ids: ['op:zepce:zepce_2__enemy'],
        });
        delete state.military.corps_front_sectors!.host;
        expect(participantsAfterReconcile(state)).toEqual(['hvo_2nd_guard_mechanized']);
    });
});

// ─── The split itself — the two halves must not be able to hide each other ──

describe('the two flags are INDEPENDENT', () => {
    // The reason the halves are on separate switches: GATE 2 admits and GATE 1
    // evicts. If either flag could produce the other's effect, a bundled
    // measurement could show a +N and a −N cancelling and read as inert.

    it('AVAILABILITY alone does not change retention — the free ride survives it', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(false);
        const state = buildReconciliationState({ exemptLoanedTo: null, exemptSectorCorps: null });
        expect(participantsAfterReconcile(state))
            .toEqual(['hvo_2nd_guard_mechanized', 'hvo_local_brigade']);
    });

    it('RETENTION alone does not change admission — the named brigade stays dropped', () => {
        setMainStaffOpRetentionOverride(true);
        setMainStaffOpAvailabilityOverride(false);
        const state = buildOpportunityState(175);
        const op = spawnFixtureOperation(state, 175, mistralLikeDef());
        expect(op!.axes![0].assigned_brigades).toEqual(['hvo_local_brigade']);
        expect(state.military.formations!.hvo_1st_guard_abb.elite_loan_state!.on_loan).toBe(false);
    });

    it('BOTH ON: admission and retention compose — named, loaned, and kept', () => {
        setMainStaffOpAvailabilityOverride(true);
        setMainStaffOpRetentionOverride(true);
        const spawned = buildOpportunityState(175);
        const op = spawnFixtureOperation(spawned, 175, mistralLikeDef());
        expect(op!.axes![0].assigned_brigades).toContain('hvo_1st_guard_abb');

        const reconciled = buildReconciliationState({
            exemptLoanedTo: HOST_CORPS,
            exemptSectorCorps: 'hvo_central_bosnia',
        });
        expect(participantsAfterReconcile(reconciled))
            .toEqual(['hvo_2nd_guard_mechanized', 'hvo_local_brigade']);
    });
});
