import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { CorpsFrontSector, FactionId, FormationId, FormationState, GameState } from '../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import type { BrigadeEvaluation, CommanderBriefing, ZoneId } from '../../src/sim/combat/commander/commander_state.js';
import type { SpatialContext } from '../../src/sim/spatial_context.js';
import { predictCombatOutcome } from '../../src/sim/combat/combat_predictor.js';
import { emitCommanderOutput } from '../../src/sim/combat/commander/emit.js';
import { COMMANDER_CREATION_PREFIX, resetReasonCodeTopicCacheForTests } from '../../src/sim/combat/reason_code_debug.js';

const FACTION: FactionId = 'RBiH';
const CORPS_ID = 'arbih_4th_corps' as FormationId;
const APPROACH = 'op:test:approach';
const REAR = 'op:test:rear';
const TARGET = 'op:test:target';
const SECOND_TARGET = 'op:test:target-z';
const DEPTHS = Array.from({ length: 6 }, (_, index) => `op:test:depth-${index}`);

interface HarnessOptions {
    defenderPersonnel?: number;
    brigadeLocation?: string;
    cooldownUntilTurn?: number;
    targetController?: FactionId;
    faction?: FactionId;
    corpsId?: FormationId;
    turn?: number;
    canLaunchOps?: boolean;
    emptyEnemySet?: boolean;
    secondCandidate?: boolean;
    reverseCandidateInsertion?: boolean;
    noEligibleBrigade?: boolean;
    noSector?: boolean;
    missingSearchPrerequisite?: boolean;
    localOccupationBypass?: boolean;
}

const require = createRequire(import.meta.url);

function setTopics(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

afterEach(() => {
    setTopics(undefined);
    vi.restoreAllMocks();
});

function brigade(id: string, owner: FactionId, location: string, personnel: number): FormationState {
    return {
        id: id as FormationId,
        faction: owner,
        corps_id: (owner === FACTION ? CORPS_ID : 'vrs_test_corps') as FormationId,
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel,
        cohesion: 70,
        morale: 70,
        disrupted_turns: 0,
        entrenchment_turns: 0,
        location_osid: location,
    } as FormationState;
}

function evaluation(id: FormationId): BrigadeEvaluation {
    return {
        brigade_id: id,
        fitness_offense: 0.9,
        fitness_defense: 0.5,
        fitness_garrison: 0.4,
        equipment_class: undefined,
        equipment_priority: 0,
        tier: 'active_defense',
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 70,
        current_zone: 'zone:test:0' as ZoneId,
    };
}

function runHarness(options: HarnessOptions = {}) {
    const faction = options.faction ?? FACTION;
    const corpsId = options.corpsId ?? CORPS_ID;
    const turn = options.turn ?? 178;
    const brigadeLocation = options.brigadeLocation ?? APPROACH;
    const controller = options.targetController ?? (faction === 'RS' ? 'RBiH' : 'RS');
    const attacker = brigade('probe', faction, brigadeLocation, options.localOccupationBypass ? 5_000 : 1_800);
    attacker.corps_id = corpsId;
    const defender = brigade('defender', controller, TARGET, options.defenderPersonnel ?? 1_800);
    const secondDefender = brigade('defender-z', controller, SECOND_TARGET, options.defenderPersonnel ?? 1_800);
    const adjacency = new Map<string, string[]>([
        [REAR, [APPROACH]],
        [APPROACH, options.secondCandidate
            ? [REAR, ...(options.reverseCandidateInsertion ? [SECOND_TARGET, TARGET] : [TARGET, SECOND_TARGET])]
            : [REAR, TARGET]],
        [TARGET, [APPROACH, ...DEPTHS]],
        [SECOND_TARGET, [APPROACH]],
        ...DEPTHS.map((osid): [string, string[]] => [osid, [TARGET]]),
    ]);
    if (options.localOccupationBypass) {
        adjacency.clear();
        adjacency.set(APPROACH, [TARGET]);
        adjacency.set(TARGET, [APPROACH]);
    }
    const sector = {
        sector_id: `sector:${corpsId}:0`,
        corps_id: corpsId,
        faction,
        opposing_factions: [controller],
        edge_ids: ['e1'],
        sub_segments: [{
            sub_segment_id: `subseg:${corpsId}:0`,
            edge_ids: ['e1'],
            friendly_osids: options.emptyEnemySet ? [REAR] : [APPROACH],
            enemy_osids: [TARGET],
            primary_brigade_ids: [attacker.id],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: [APPROACH, REAR],
        assigned_brigade_ids: [attacker.id],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'probe-target-filter' },
        factions: [{ id: FACTION }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {
                [attacker.id]: attacker,
                ...(options.localOccupationBypass ? {} : { [defender.id]: defender }),
                ...(options.secondCandidate ? { [secondDefender.id]: secondDefender } : {}),
            },
            brigade_movement_state: {},
            corps_front_sectors: { [sector.sector_id]: sector },
            sector_intel: options.localOccupationBypass ? {
                [sector.sector_id]: [{
                    enemy_sector_id: 'sector:enemy:0', confidence: 1, last_updated_turn: turn, sources: ['passive_contact'],
                }],
            } : undefined,
            corps_command: {
                [corpsId]: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    active_operations: [],
                    corps_exhaustion: 0,
                    faction_war_exhaustion: 0,
                    stance: 'offensive',
                    consecutive_probes: 0,
                },
            },
        },
        political: {
            political_controllers: {
                [APPROACH]: faction,
                [REAR]: faction,
                [TARGET]: controller,
                ...(options.secondCandidate ? { [SECOND_TARGET]: controller } : {}),
                ...Object.fromEntries(DEPTHS.map((osid) => [osid, controller])),
            },
        },
        displacement: {},
    } as unknown as GameState;
    const friendlyByFaction = new Map<FactionId, ReadonlySet<string>>([
        [faction, new Set([APPROACH, REAR])],
        ['RS', controller === 'RS' ? new Set([TARGET, ...(options.secondCandidate ? [SECOND_TARGET] : []), ...DEPTHS]) : new Set()],
        ['HRHB', controller === 'HRHB' ? new Set([TARGET, ...(options.secondCandidate ? [SECOND_TARGET] : []), ...DEPTHS]) : new Set()],
    ]);
    const spatial = {
        adjacency: options.missingSearchPrerequisite ? undefined : adjacency,
        sharedBoundaryAdjacency: adjacency,
        friendlyOsidsByFaction: friendlyByFaction,
        componentsByFaction: new Map(),
        frontEdgesOsid: undefined,
        computedAtTurn: turn,
        phase: 'pre-combat',
    } as SpatialContext;
    const reverseMap = new Map<string, string[]>([
        [APPROACH, ['S1']],
        [REAR, ['S0']],
        [TARGET, ['S2']],
        [SECOND_TARGET, ['S9']],
        ...DEPTHS.map((osid, index): [string, string[]] => [osid, [`S${index + 3}`]]),
    ]);
    const failed = options.cooldownUntilTurn == null
        ? {}
        : { [TARGET]: { failure_count: 1, cooldown_until_turn: options.cooldownUntilTurn } };
    const briefing = {
        corps_id: corpsId,
        faction,
        turn,
        spatial,
        sectors: options.noSector ? [] : [sector],
        brigades: [attacker],
        state_ref: state,
        reverse_map: reverseMap,
        osid_population_map: options.localOccupationBypass ? new Map([[TARGET, 1]]) : null,
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'offensive',
        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: { tanks: 0, artillery: 0, infantry_only: true },
        adjacent_corps: [],
        officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.8, competence: 0.6 },
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        failed_offensive_objectives: failed,
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
    } as CommanderBriefing;
    const probeEvaluation = {
        ...evaluation(attacker.id),
        is_combat_effective: options.noEligibleBrigade ? false : true,
    } as BrigadeEvaluation;
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { lines.push(args.map(String).join(' ')); });
    const output = emitCommanderOutput(
        briefing,
        [],
        {
            total_brigades: 1,
            combat_effective: 1,
            evaluations: [probeEvaluation],
            by_zone: { 'zone:test:0': [probeEvaluation] },
            tier_counts: { main_effort: 0, active_defense: 1, garrison: 0 },
            total_surplus: 1,
        },
        {
            zones: [],
            garrison_locks: [],
            surplus_pool: [probeEvaluation],
            total_garrison_budget: 0,
            can_launch_ops: options.canLaunchOps ?? true,
        },
        {
            plan: null,
            action: 'none',
            reason: 'no plan',
            decision_trace: { turn, winning_intent_id: null, candidates: [], hard_constraints: [], lessons_applied: [], relationships_applied: [] },
        },
        {
            stance_changes: [],
            reserve_shifts: [],
            intel_picture: {
                zone_confidence: {},
                offensive_signs: {},
                concentration_detected: {},
                last_updated_turn: turn,
            },
            activity_entries: [],
            suspend_plan: false,
            reinforcement_requests: [],
        },
        { threatened_zones: [], enemy_concentration_zones: [], recent_losses: [], overall_pressure: 'low' },
    );
    spy.mockRestore();
    const prediction = predictCombatOutcome(state, attacker.id, TARGET, adjacency, reverseMap, {}, 'attack');
    const receiptLine = lines.find((line) => line.startsWith(COMMANDER_CREATION_PREFIX));
    const receipt = receiptLine
        ? JSON.parse(receiptLine.slice(COMMANDER_CREATION_PREFIX.length + 1)) as Record<string, any>
        : null;
    return { output, prediction: prediction?.predicted_outcome ?? null, receipt, state };
}

function selectedObjectives(options: HarnessOptions = {}): readonly string[] {
    return runHarness(options).output.operations.flatMap((operation) => operation.objectives ?? []);
}

describe('fallback probe target production filters', () => {
    it('reports the selected brigade and reached target filters for the exact diagnostic selector', () => {
        setTopics('commander_creation');
        const result = runHarness();

        expect(result.receipt?.probe_gate_receipt?.target_selection_detail).toMatchObject({
            status: 'generic_search',
            selected_brigade_id: 'probe',
            selected_brigade_location: APPROACH,
            derived_sector_id: `sector:${CORPS_ID}:0`,
            enemy_candidate_ids: [TARGET],
            direct_candidate_ids: [TARGET],
            survivor_ids: [TARGET],
            ranked_objective_ids: [TARGET],
            targets: [{
                target_id: TARGET,
                cooldown_raw_present: false,
                cooldown_raw_value: null,
                cooldown_effective_value: 0,
                controller: 'RS',
                prediction_present: true,
                prediction_outcome: 'stalemate',
                prediction_threshold: 'stalemate',
                direct: true,
                reachable: true,
                approach_distance: 0,
                passed: true,
                first_rejecting_filter: null,
            }],
        });
    });

    it('distinguishes missing, zero, expired, and future cooldown values at the real boundary', () => {
        setTopics('commander_creation');
        const missing = runHarness().receipt!.probe_gate_receipt.target_selection_detail.targets[0];
        const zero = runHarness({ cooldownUntilTurn: 0 }).receipt!.probe_gate_receipt.target_selection_detail.targets[0];
        const expired = runHarness({ cooldownUntilTurn: 178 }).receipt!.probe_gate_receipt.target_selection_detail.targets[0];
        const future = runHarness({ cooldownUntilTurn: 179 }).receipt!.probe_gate_receipt.target_selection_detail.targets[0];

        expect(missing).toMatchObject({ cooldown_raw_present: false, cooldown_raw_value: null, cooldown_effective_value: 0, cooldown_filter_passed: true });
        expect(zero).toMatchObject({ cooldown_raw_present: true, cooldown_raw_value: 0, cooldown_effective_value: 0, cooldown_filter_passed: true });
        expect(expired).toMatchObject({ cooldown_raw_present: true, cooldown_raw_value: 178, cooldown_filter_passed: true, passed: true });
        expect(future).toMatchObject({
            cooldown_raw_present: true,
            cooldown_raw_value: 179,
            cooldown_filter_passed: false,
            politics_filter_reached: false,
            politics_filter_passed: null,
            prediction_present: true,
            prediction_outcome: 'stalemate',
            passed: false,
            first_rejecting_filter: 'cooldown',
        });
    });

    it('retains computed politics and prediction while reporting the first reached rejecting filter', () => {
        setTopics('commander_creation');
        const bothFail = runHarness({ targetController: 'HRHB', cooldownUntilTurn: 179 });
        const political = bothFail.receipt!.probe_gate_receipt.target_selection_detail.targets[0];

        expect(bothFail.prediction).toBe('victory');
        expect(political).toMatchObject({
            politically_blocked: true,
            prediction_present: true,
            prediction_outcome: 'victory',
            predicted_viable: true,
            cooldown_filter_reached: true,
            cooldown_filter_passed: false,
            politics_filter_reached: false,
            prediction_filter_reached: false,
            first_rejecting_filter: 'cooldown',
        });

        const politicsOnly = runHarness({ targetController: 'HRHB' }).receipt!.probe_gate_receipt.target_selection_detail.targets[0];
        expect(politicsOnly).toMatchObject({
            cooldown_filter_passed: true,
            politics_filter_reached: true,
            politics_filter_passed: false,
            prediction_filter_reached: false,
            first_rejecting_filter: 'politics',
        });
    });

    it('reports the real stalemate admission and repulsed prediction rejection', () => {
        setTopics('commander_creation');
        const admitted = runHarness({ defenderPersonnel: 1_800 }).receipt!.probe_gate_receipt.target_selection_detail.targets[0];
        const rejected = runHarness({ defenderPersonnel: 4_000 }).receipt!.probe_gate_receipt.target_selection_detail.targets[0];

        expect(admitted).toMatchObject({ prediction_outcome: 'stalemate', prediction_filter_reached: true, prediction_filter_passed: true, passed: true });
        expect(rejected).toMatchObject({ prediction_outcome: 'repulsed', prediction_filter_reached: true, prediction_filter_passed: false, passed: false, first_rejecting_filter: 'predicted_viable' });
    });

    it('keeps the derived sector while separating pre-direct candidates from an empty direct set', () => {
        setTopics('commander_creation');
        const detail = runHarness({ brigadeLocation: REAR }).receipt!.probe_gate_receipt.target_selection_detail;

        expect(detail).toMatchObject({
            status: 'empty_direct_set',
            selected_brigade_location: REAR,
            derived_sector_id: `sector:${CORPS_ID}:0`,
            enemy_candidate_ids: [TARGET],
            direct_candidate_ids: [],
            survivor_ids: [],
            ranked_objective_ids: [],
            targets: [{
                target_id: TARGET,
                direct: false,
                direct_filter_reached: true,
                direct_filter_passed: false,
                first_rejecting_filter: 'direct',
                cooldown_raw_present: null,
                cooldown_raw_value: null,
                cooldown_effective_value: null,
                controller: null,
                politically_blocked: null,
                prediction_present: null,
                prediction_outcome: null,
                predicted_viable: null,
                reachable: null,
                approach_distance: null,
                cooldown_filter_reached: false,
                politics_filter_reached: false,
                reachable_filter_reached: false,
                prediction_filter_reached: false,
                passed: false,
            }],
        });
    });

    it('keeps viable unselected targets as survivors while reporting the actual ranked objective', () => {
        setTopics('commander_creation');
        const detail = runHarness({ secondCandidate: true }).receipt!.probe_gate_receipt.target_selection_detail;

        expect(detail.enemy_candidate_ids).toEqual([TARGET, SECOND_TARGET]);
        expect(detail.direct_candidate_ids).toEqual([TARGET, SECOND_TARGET]);
        expect(detail.survivor_ids).toEqual([TARGET, SECOND_TARGET]);
        expect(detail.ranked_objective_ids).toEqual([TARGET]);
        expect(detail.targets).toEqual([
            expect.objectContaining({ target_id: TARGET, passed: true, first_rejecting_filter: null }),
            expect.objectContaining({ target_id: SECOND_TARGET, passed: true, first_rejecting_filter: null }),
        ]);
    });

    it('canonicalizes detached inventories across reversed candidate insertion without changing output or state', () => {
        setTopics('commander_creation');
        const forward = runHarness({ secondCandidate: true });
        const reversed = runHarness({ secondCandidate: true, reverseCandidateInsertion: true });

        expect(reversed.receipt!.probe_gate_receipt.target_selection_detail).toEqual(
            forward.receipt!.probe_gate_receipt.target_selection_detail,
        );
        expect(reversed.output).toEqual(forward.output);
        expect(reversed.state).toEqual(forward.state);
    });

    it('distinguishes an empty enemy collection from collection not reached', () => {
        setTopics('commander_creation');
        expect(runHarness({ emptyEnemySet: true }).receipt!.probe_gate_receipt.target_selection_detail).toMatchObject({
            status: 'empty_enemy_set',
            enemy_candidate_ids: [],
            direct_candidate_ids: [],
        });
        expect(runHarness({ canLaunchOps: false }).receipt!.probe_gate_receipt.target_selection_detail).toMatchObject({
            status: 'not_reached',
            selected_brigade_id: null,
            enemy_candidate_ids: [],
        });
    });

    it('emits detail only for the exact topic, faction, corps, and turn selector', () => {
        setTopics(undefined);
        expect(runHarness().receipt).toBeNull();

        setTopics('commander_creation');
        for (const options of [
            { faction: 'RS' as FactionId },
            { corpsId: 'arbih_3rd_corps' as FormationId },
            { turn: 176 },
            { turn: 180 },
        ]) {
            expect(runHarness(options).receipt?.probe_gate_receipt).toBeUndefined();
        }

        for (const turn of [177, 179]) {
            const oldReceipt = runHarness({ turn }).receipt?.probe_gate_receipt;
            expect(oldReceipt).toBeDefined();
            expect(oldReceipt).not.toHaveProperty('target_selection_detail');
        }
    });

    it('preserves returned output and state with the selector on', () => {
        setTopics(undefined);
        const off = runHarness();
        setTopics('commander_creation');
        const on = runHarness();

        expect(on.output).toEqual(off.output);
        expect(on.state).toEqual(off.state);
    });

    it('uses the real predictor at the unchanged stalemate threshold', () => {
        const viable = runHarness({ defenderPersonnel: 1_800 });
        const rejected = runHarness({ defenderPersonnel: 4_000 });

        expect(viable.prediction).toBe('stalemate');
        expect(viable.output.operations[0]?.objectives).toEqual([TARGET]);
        expect(rejected.prediction).toBe('repulsed');
        expect(rejected.output.operations).toHaveLength(0);
    });

    it('admits an expired cooldown and rejects a future cooldown', () => {
        expect(selectedObjectives({ cooldownUntilTurn: 178 })).toEqual([TARGET]);
        expect(selectedObjectives({ cooldownUntilTurn: 179 })).toEqual([]);
    });

    it('admits an RS target and rejects the same target under the RBiH-HRHB combat block', () => {
        const blocked = runHarness({ targetController: 'HRHB' });

        expect(selectedObjectives({ targetController: 'RS' })).toEqual([TARGET]);
        // Victory clears the unchanged stalemate admission floor, so only the political block rejects it.
        expect(blocked.prediction).toBe('victory');
        expect(blocked.output.operations).toHaveLength(0);
    });

    it('requires the chosen probe brigade to be directly adjacent to the candidate', () => {
        expect(selectedObjectives({ brigadeLocation: APPROACH })).toEqual([TARGET]);
        expect(selectedObjectives({ brigadeLocation: REAR })).toEqual([]);
    });
});

describe('producer-bound commander target-selection reader', () => {
    const statusFixtures: Array<[string, HarnessOptions]> = [
        ['not_reached', { canLaunchOps: false }],
        ['no_brigade', { noEligibleBrigade: true }],
        ['no_sector', { noSector: true }],
        ['missing_adjacency_or_friendly_set_or_location', { missingSearchPrerequisite: true }],
        ['local_occupation_bypass', { localOccupationBypass: true }],
        ['empty_enemy_set', { emptyEnemySet: true }],
        ['empty_direct_set', { brigadeLocation: REAR }],
        ['all_filtered', { defenderPersonnel: 4_000 }],
        ['generic_search', {}],
    ];

    function producerRows(): Record<string, any>[] {
        setTopics('commander_creation');
        return statusFixtures.map(([expectedStatus, options]) => {
            const row = runHarness(options).receipt;
            expect(row?.phase).toBe('build_operations_complete');
            expect(row?.probe_gate_receipt?.target_selection_detail?.status).toBe(expectedStatus);
            return row!;
        });
    }

    it('accepts full completion rows emitted by the real producer for every reachable status', () => {
        const reader = require('../../tools/diagnostics/commander_target_selection_reader.cjs');
        const tracked203 = require('../../tools/diagnostics/commander_creation_reader_203.cjs');
        const rows = producerRows();

        for (const row of rows) {
            expect(tracked203.checkRow(row, row.probe_gate_receipt.target_selection_detail.status)).toEqual([]);
            expect(reader.detailErrors(row, row.probe_gate_receipt.target_selection_detail.status)).toEqual([]);
        }

        const capturePath = process.env.AWWV_790_CAPTURE_ROWS;
        if (capturePath) writeFileSync(
            capturePath,
            `${rows.map((row) => `${COMMANDER_CREATION_PREFIX} ${JSON.stringify(row)}`).join('\n')}\n`,
            { flag: 'wx' },
        );
    });

    it('rejects contradictory status mutations and malformed stage, rank, fitness, filter, and selection fields', () => {
        const reader = require('../../tools/diagnostics/commander_target_selection_reader.cjs');
        const rows = producerRows();
        const byStatus = Object.fromEntries(rows.map((row) => [row.probe_gate_receipt.target_selection_detail.status, row]));
        const clone = (status: string) => structuredClone(byStatus[status]);
        const controls: Array<[string, Record<string, any>]> = [];
        const contradictory: Array<[string, string]> = [
            ['not_reached', 'generic_search'],
            ['no_brigade', 'generic_search'],
            ['no_sector', 'generic_search'],
            ['missing_adjacency_or_friendly_set_or_location', 'generic_search'],
            ['local_occupation_bypass', 'generic_search'],
            ['empty_enemy_set', 'empty_direct_set'],
            ['empty_direct_set', 'all_filtered'],
            ['all_filtered', 'generic_search'],
            ['generic_search', 'all_filtered'],
        ];
        for (const [source, replacement] of contradictory) {
            const row = clone(source);
            row.probe_gate_receipt.target_selection_detail.status = replacement;
            controls.push([`${source} as ${replacement}`, row]);
        }

        const badStage = clone('generic_search');
        badStage.probe_gate_receipt.target_selection_detail.brigade_candidates[0].elite_available = 'NOT_REACHED';
        controls.push(['stage after passing predecessor', badStage]);
        const badRank = clone('generic_search');
        badRank.probe_gate_receipt.target_selection_detail.brigade_candidates[0].sorted_rank = 4;
        controls.push(['rank mismatch', badRank]);
        const badFitness = clone('generic_search');
        badFitness.probe_gate_receipt.target_selection_detail.brigade_candidates[0].actual_fitness = 'finite-ish';
        controls.push(['fitness tag', badFitness]);
        const badFilter = clone('generic_search');
        badFilter.probe_gate_receipt.target_selection_detail.targets[0].cooldown_filter_reached = false;
        controls.push(['target filter reachability', badFilter]);
        const badCooldownValue = clone('generic_search');
        badCooldownValue.probe_gate_receipt.target_selection_detail.targets[0].cooldown_effective_value = 999;
        controls.push(['cooldown result binding', badCooldownValue]);
        const badPoliticsValue = clone('generic_search');
        badPoliticsValue.probe_gate_receipt.target_selection_detail.targets[0].politics_filter_passed = false;
        controls.push(['politics result binding', badPoliticsValue]);
        const badReachableValue = clone('generic_search');
        badReachableValue.probe_gate_receipt.target_selection_detail.targets[0].reachable_filter_passed = false;
        controls.push(['reachable result binding', badReachableValue]);
        const badPredictionValue = clone('generic_search');
        badPredictionValue.probe_gate_receipt.target_selection_detail.targets[0].prediction_filter_passed = false;
        controls.push(['prediction result binding', badPredictionValue]);
        const badRawCooldown = clone('generic_search');
        badRawCooldown.probe_gate_receipt.target_selection_detail.targets[0].cooldown_raw_present = true;
        controls.push(['raw cooldown consistency', badRawCooldown]);
        const badPredictionPresence = clone('generic_search');
        badPredictionPresence.probe_gate_receipt.target_selection_detail.targets[0].prediction_present = false;
        controls.push(['prediction presence binding', badPredictionPresence]);
        const badControllerPolitics = clone('generic_search');
        badControllerPolitics.probe_gate_receipt.target_selection_detail.targets[0].controller = null;
        badControllerPolitics.probe_gate_receipt.target_selection_detail.targets[0].politically_blocked = true;
        controls.push(['controller politics binding', badControllerPolitics]);
        const multiTarget = runHarness({ secondCandidate: true }).receipt!;
        expect(reader.detailErrors(multiTarget, 'multi target producer')).toEqual([]);
        const badTargetOrder = structuredClone(multiTarget);
        badTargetOrder.probe_gate_receipt.target_selection_detail.targets.reverse();
        controls.push(['target order', badTargetOrder]);
        const badSurvivorOrder = structuredClone(multiTarget);
        badSurvivorOrder.probe_gate_receipt.target_selection_detail.survivor_ids.reverse();
        controls.push(['survivor rank order', badSurvivorOrder]);
        const badSelection = clone('generic_search');
        badSelection.probe_gate_receipt.target_selection_detail.selected_brigade_id = 'other';
        controls.push(['selected identity', badSelection]);

        expect(controls).toHaveLength(23);
        for (const [name, row] of controls) {
            expect(reader.detailErrors(row, name), name).not.toEqual([]);
        }
    });
});
