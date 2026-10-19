/**
 * Operation-owned capture receipts and emitted-order ownership (opt-in phase gate).
 *
 * Production paths only: the bot order dispatcher (`generateAllBotOrdersOsid` -> evaluator ->
 * merge boundary), the ordinary-combat resolver (`resolveAttackOrdersOsid`) and the real
 * `syncAttackOrderOwners` / `recordOwnedCaptureReceipt` boundaries. No reachable n39 state is
 * fabricated: the fixture is a hand-built two-axis operation entering through the real functions.
 *
 * Contract under test (see src/sim/combat/operation_phase_gate.ts):
 *  - ownership belongs to the exact operation instance, axis, brigade, target and turn of the
 *    SURVIVING emitted order; it is written only for operations that carry a phase gate;
 *  - a receipt needs the ACTUAL resolving lead's surviving owned order + a real enemy-to-friendly
 *    flip; unowned/foreign/stale leads, pre-existing friendly control and non-flips never count;
 *  - the resolver refuses held capture orders from ANY writer (final consumer) but keeps lawful
 *    approach captures outside the gated set;
 *  - absent opt-in never acquires the sidecar field.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import {
    advanceLatePhaseGates,
    buildAttackOrderOwner,
    syncAttackOrderOwners,
} from '../src/sim/combat/operation_phase_gate.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type {
    BrigadeAttackOrderOwner,
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
    OperationAxis,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';

afterEach(() => {
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
    vi.restoreAllMocks();
});

const OP_NAME = 'Phase Gate Test Op';
const HOST_CORPS = 'vrs_1st';
const OP_ID = `${HOST_CORPS}:${OP_NAME}:t3`;
const MAIN_TARGET = 'op:rbih:main_target';
const HELD_TARGET = 'op:rbih:held_target';
const LATER_TARGET = 'op:rbih:later_target';
const APPROACH_TARGET = 'op:rbih:approach_cell';

function makeFormation(
    id: string,
    faction: FactionId,
    kind: 'brigade' | 'corps',
    locationOsid: string,
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id, name: id, faction, kind, status: 'active',
        personnel: 5000, cohesion: 80, morale: 80, experience: 0.5,
        location_osid: locationOsid,
        posture: 'attack',
        composition: {
            infantry: 2000,
            tanks: 20,
            artillery: 15,
            aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
        ...overrides,
    } as FormationState;
}

function makeDefender(id: string, locationOsid: string): FormationState {
    return makeFormation(id, 'RBiH', 'brigade', locationOsid, {
        personnel: 300, cohesion: 30, morale: 30, experience: 0.1,
        posture: 'defend' as never,
        composition: {
            infantry: 200, tanks: 0, artillery: 0, aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        } as never,
    });
}

function makeSubSegment(id: string, enemy: string[], friendly: string[], edgeIds: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id, edge_ids: edgeIds, enemy_osids: enemy, friendly_osids: friendly,
        primary_brigade_ids: [], length_edges: edgeIds.length,
    };
}

function makeSector(brigadeIds: string[], subSegments: CorpsFrontSubSegment[]): CorpsFrontSector {
    return {
        sector_id: `sector:${HOST_CORPS}:0`,
        corps_id: HOST_CORPS as never,
        faction: 'RS',
        opposing_factions: [],
        edge_ids: subSegments.flatMap((s) => s.edge_ids),
        sub_segments: subSegments,
        length_edges: 3,
        territory_osids: subSegments.flatMap((s) => s.friendly_osids),
        assigned_brigade_ids: brigadeIds as never[],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1.0,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

function makeAxis(axisId: string, brigades: string[], objectives: string[], extra: Partial<OperationAxis> = {}): OperationAxis {
    return {
        axis_id: axisId, name: axisId, assigned_brigades: brigades, objectives,
        current_objective_index: 0, status: 'executing', failure_count: 0,
        consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0,
        objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
        ...extra,
    } as OperationAxis;
}

interface Scenario {
    state: GameState;
    edges: EdgeRecord[];
    operation: CorpsOperation;
    adjacency: Map<string, string[]>;
}

/**
 * Two-axis operation: main axis (brig_main) attacks MAIN_TARGET; held axis (brig_held) is gated
 * (late_phase.holding) with HELD_TARGET/LATER_TARGET as its complete capture-authority set and
 * requires an owned capture of MAIN_TARGET. APPROACH_TARGET is an enemy cell OUTSIDE the gated set.
 */
function makeScenario(opts: { gated?: boolean; ownMain?: boolean } = {}): Scenario {
    const gated = opts.gated ?? true;
    const brigMain = makeFormation('brig_main', 'RS', 'brigade', 'op:rs:staging', { corps_id: HOST_CORPS });
    const brigHeld = makeFormation('brig_held', 'RS', 'brigade', 'op:rs:hq', { corps_id: HOST_CORPS });
    const corps = makeFormation(HOST_CORPS, 'RS', 'corps', 'op:rs:hq');
    const defMain = makeDefender('def_main', MAIN_TARGET);
    const defHeld = makeDefender('def_held', HELD_TARGET);
    const defApproach = makeDefender('def_approach', APPROACH_TARGET);

    const mainAxis = makeAxis('axis_main', ['brig_main'], [MAIN_TARGET]);
    const heldAxis = makeAxis('axis_held', ['brig_held'], [HELD_TARGET, LATER_TARGET], gated ? {
        late_phase: {
            phase: 'holding',
            main_axis_id: 'axis_main',
            requires: [MAIN_TARGET],
            gated_objectives: [HELD_TARGET, LATER_TARGET],
            receipts: [],
            hold_started_turn: 3,
        },
    } : {});

    const operation = {
        name: OP_NAME,
        type: 'sector_attack',
        occupies_on_victory: true,
        phase: 'execution',
        started_turn: 3,
        phase_started_turn: 3,
        participating_brigades: ['brig_main', 'brig_held'],
        objectives: [MAIN_TARGET, HELD_TARGET, LATER_TARGET],
        objective_capture_count: 0,
        attack_attempt_count: 0,
        sector_id: `sector:${HOST_CORPS}:0`,
        axes: [mainAxis, heldAxis],
    } as unknown as CorpsOperation;

    const sector = makeSector(['brig_main', 'brig_held'], [
        makeSubSegment('sub:0:0', [MAIN_TARGET, HELD_TARGET, APPROACH_TARGET], ['op:rs:staging', 'op:rs:hq'], ['e1', 'e2', 'e3']),
    ]);

    const formations = {
        [HOST_CORPS]: corps, brig_main: brigMain, brig_held: brigHeld,
        def_main: defMain, def_held: defHeld, def_approach: defApproach,
    };
    const state = {
        meta: {
            turn: 5, phase: 'war', seed: 'ownership-test',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        } as unknown as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }] as GameState['factions'],
        formations,
        political: {
            political_controllers: {
                'op:rs:staging': 'RS', 'op:rs:hq': 'RS',
                [MAIN_TARGET]: 'RBiH', [HELD_TARGET]: 'RBiH', [LATER_TARGET]: 'RBiH', [APPROACH_TARGET]: 'RBiH',
            },
            control_events: [],
        } as unknown as GameState['political'],
        military: {
            formations,
            corps_command: {
                [HOST_CORPS]: {
                    command_span: 3, subordinate_count: 2, og_slots: 1, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [operation],
                },
            },
            corps_front_sectors: { [`sector:${HOST_CORPS}:0`]: sector },
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        },
        displacement: {},
    } as unknown as GameState;

    if (opts.ownMain ?? true) {
        state.military.brigade_attack_orders = { brig_main: MAIN_TARGET } as never;
        state.military.brigade_attack_order_owners = {
            brig_main: { operation_id: OP_ID, axis_id: 'axis_main', target: MAIN_TARGET, turn: 5 },
        } as never;
    }

    const edges: EdgeRecord[] = [
        { edge_id: 'e1', a: 'op:rs:staging', b: MAIN_TARGET } as EdgeRecord,
        { edge_id: 'e2', a: 'op:rs:hq', b: HELD_TARGET } as EdgeRecord,
        { edge_id: 'e3', a: 'op:rs:hq', b: APPROACH_TARGET } as EdgeRecord,
        { edge_id: 'e4', a: MAIN_TARGET, b: LATER_TARGET } as EdgeRecord,
    ];
    const adjacency = new Map<string, string[]>([
        ['op:rs:staging', [MAIN_TARGET]],
        ['op:rs:hq', [HELD_TARGET, APPROACH_TARGET]],
        [MAIN_TARGET, ['op:rs:staging', LATER_TARGET]],
        [HELD_TARGET, ['op:rs:hq']],
        [APPROACH_TARGET, ['op:rs:hq']],
        [LATER_TARGET, [MAIN_TARGET]],
    ]);
    return { state, edges, operation, adjacency };
}

function receiptsOf(operation: CorpsOperation) {
    return operation.axes!.find((a) => a.axis_id === 'axis_held')!.late_phase!.receipts;
}

describe('operation-owned capture receipt (resolver boundary)', () => {
    it('after an owned prerequisite capture, the handed-off brigade attacks through the destination axis owner', () => {
        const { state, edges, operation, adjacency } = makeScenario();
        const held = operation.axes!.find((axis) => axis.axis_id === 'axis_held')!;
        held.assigned_brigades = [];
        delete held.main_brigade;
        delete held.support_brigades;
        operation.participating_brigades = ['brig_main'];
        held.late_phase!.handoff = { brigade_id: 'brig_main', source_axis_id: 'axis_main' };

        const prerequisiteReport = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(prerequisiteReport.flips_applied).toBe(1);
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS', 5);
        expect(operation.axes!.find((axis) => axis.axis_id === 'axis_main')!.assigned_brigades).toEqual([]);
        expect(held.assigned_brigades).toEqual(['brig_main']);

        state.meta.turn = 6;
        state.military.formations!.brig_main!.location_osid = 'op:rs:hq';
        state.military.brigade_attack_orders = { brig_main: HELD_TARGET } as never;
        const destinationOwner = buildAttackOrderOwner(state, 'brig_main', HELD_TARGET, 6)!;
        expect(destinationOwner).toMatchObject({ operation_id: OP_ID, axis_id: 'axis_held', target: HELD_TARGET, turn: 6 });
        state.military.brigade_attack_order_owners = { brig_main: destinationOwner } as never;

        const destinationReport = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(destinationReport.flips_applied).toBe(1);
        expect(destinationReport.battles[0]).toMatchObject({
            attacker_brigade: 'brig_main', target_osid: HELD_TARGET, attacker_won: true,
        });
        expect(state.political.political_controllers![HELD_TARGET]).toBe('RS');
    });

    it('emits reader-positive real two-pass coverage and a non-required post-activation owned capture', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_activation,operation_capture_ownership';
        resetReasonCodeTopicCacheForTests();
        const { state, edges, operation, adjacency } = makeScenario();
        const heldGate = operation.axes!.find((axis) => axis.axis_id === 'axis_held')!.late_phase!;
        heldGate.phase = 'capture';
        heldGate.activated_turn = 4;
        heldGate.requires = [HELD_TARGET];
        const lines: string[] = [];
        const originalLog = console.log;
        vi.spyOn(console, 'log').mockImplementation((line) => { lines.push(String(line)); originalLog(line); });
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS', 5, undefined, undefined, 'pre_results');
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS', 5, undefined, undefined, 'post_results');
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.flips_applied).toBe(1);
        const rows = lines.map((line) => JSON.parse(line.slice(line.indexOf('{'))));
        expect(rows.filter((row) => row.kind === 'caller_pass_start').map((row) => row.caller_stage)).toEqual(['pre_results', 'post_results']);
        const capture = rows.find((row) => row.kind === 'owned_capture_resolution');
        expect(capture).toMatchObject({ target_osid: MAIN_TARGET, resolving_lead: 'brig_main', attacker_faction: 'RS', controller_before: 'RBiH', controller_after: 'RS', receipt_recorded: false });
        expect(receiptsOf(operation)).toHaveLength(0);
    });

    it('observes the surviving owner joined to the actual resolving lead and post-revert flip', () => {
        const off = makeScenario();
        const offLines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => offLines.push(String(line)));
        const offReport = resolveAttackOrdersOsid(off.state, off.edges, off.adjacency);
        expect(offLines.filter((line) => line.startsWith('[operation_capture_ownership] '))).toHaveLength(0);
        vi.restoreAllMocks();
        process.env.AWWV_DEBUG_REASON_CODES = 'operation_capture_ownership';
        resetReasonCodeTopicCacheForTests();
        const { state, edges, adjacency } = makeScenario();
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        const onReport = resolveAttackOrdersOsid(state, edges, adjacency);
        const rows = lines.map((line) => JSON.parse(line.slice(line.indexOf('{'))));
        expect(rows.map((row) => row.kind)).toEqual(['resolver_pass_start', 'owned_capture_resolution', 'resolver_pass_end']);
        expect(rows.every((row) => row.schema_version === 1)).toBe(true);
        expect(rows[1]).toMatchObject({ resolving_lead: 'brig_main', target_osid: MAIN_TARGET, controller_before: 'RBiH', controller_after: 'RS', flip_after_revert: true, receipt_recorded: true });
        expect(rows[1].owner).toEqual({ operation_id: OP_ID, axis_id: 'axis_main', target: MAIN_TARGET, turn: 5 });
        expect(Buffer.from(JSON.stringify(state)).equals(Buffer.from(JSON.stringify(off.state)))).toBe(true);
        expect(Buffer.from(JSON.stringify(onReport)).equals(Buffer.from(JSON.stringify(offReport)))).toBe(true);
    });

    it('records a receipt for the actual resolving lead whose surviving order is owned by this exact instance', () => {
        const { state, edges, operation, adjacency } = makeScenario();
        const report = resolveAttackOrdersOsid(state, edges, adjacency);

        expect(report.flips_applied).toBe(1);
        expect(state.political.political_controllers![MAIN_TARGET]).toBe('RS');
        const receipts = receiptsOf(operation);
        expect(receipts).toHaveLength(1);
        expect(receipts[0]).toMatchObject({
            osid: MAIN_TARGET,
            turn: 5,
            attacker_brigade: 'brig_main',
            operation_id: OP_ID,
            axis_id: 'axis_main',
            battle_id: `5:${MAIN_TARGET}:brig_main:def_main`,
        });
        // Pending ownership is consumed with the orders: nothing persists after resolution.
        expect(state.military.brigade_attack_orders).toBeUndefined();
        expect('brigade_attack_order_owners' in state.military).toBe(false);
    });

    it('records nothing when the lead has no owner entry (unowned lead), even on a real flip', () => {
        const { state, edges, operation, adjacency } = makeScenario({ ownMain: false });
        state.military.brigade_attack_orders = { brig_main: MAIN_TARGET } as never;
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.flips_applied).toBe(1);
        expect(receiptsOf(operation)).toHaveLength(0);
    });

    it('records nothing for a foreign operation instance, a stale turn, a different target or another axis', () => {
        const variants: Array<Partial<BrigadeAttackOrderOwner>> = [
            { operation_id: `${HOST_CORPS}:${OP_NAME}:t99` },
            { operation_id: `other_corps:${OP_NAME}:t3` },
            { turn: 4 },
            { target: HELD_TARGET },
            { axis_id: 'axis_held' },
        ];
        for (const variant of variants) {
            const { state, edges, operation, adjacency } = makeScenario();
            const owner = state.military.brigade_attack_order_owners!.brig_main as BrigadeAttackOrderOwner;
            state.military.brigade_attack_order_owners = { brig_main: { ...owner, ...variant } } as never;
            const report = resolveAttackOrdersOsid(state, edges, adjacency);
            expect(report.flips_applied).toBe(1);
            expect(receiptsOf(operation)).toHaveLength(0);
        }
    });

    it('does not record a receipt when the target was already friendly (pre-existing control: no battle, no flip)', () => {
        const friendly = makeScenario();
        friendly.state.political.political_controllers![MAIN_TARGET] = 'RS';
        delete friendly.state.military.formations!.def_main; // nobody to fight: the cell is simply ours
        const friendlyReport = resolveAttackOrdersOsid(friendly.state, friendly.edges, friendly.adjacency);
        expect(friendlyReport.battles).toHaveLength(0);
        expect(friendlyReport.flips_applied).toBe(0);
        expect(receiptsOf(friendly.operation)).toHaveLength(0);
    });

    it('does not record a receipt when ordinary combat does not flip the target', () => {
        const lost = makeScenario();
        lost.state.military.formations!.brig_main = makeFormation('brig_main', 'RS', 'brigade', 'op:rs:staging', {
            corps_id: HOST_CORPS, personnel: 60, cohesion: 5, morale: 5, experience: 0,
            composition: {
                infantry: 40, tanks: 0, artillery: 0, aa_systems: 0,
                tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
            } as never,
        });
        lost.state.military.formations!.def_main = makeFormation('def_main', 'RBiH', 'brigade', MAIN_TARGET, {
            personnel: 9000, cohesion: 95, morale: 95, experience: 1, posture: 'defend' as never,
        });
        const lostReport = resolveAttackOrdersOsid(lost.state, lost.edges, lost.adjacency);
        expect(lostReport.battles[0]?.attacker_won).toBe(false);
        expect(lostReport.flips_applied).toBe(0);
        expect(receiptsOf(lost.operation)).toHaveLength(0);
    });

    it('keeps combat lead selection: a foreign lead does not satisfy this operation, but mixed support does not invalidate an owned lead', () => {
        // Foreign lead: "aaa_foreign" sorts first, belongs to an UNGATED operation, and attacks the same
        // target. The battle is led by aaa_foreign; this operation's brig_main is only support.
        const foreignLead = makeScenario();
        foreignLead.state.military.formations!.aaa_foreign = makeFormation('aaa_foreign', 'RS', 'brigade', 'op:rs:staging', { corps_id: 'other_corps' });
        foreignLead.state.military.corps_command!.other_corps = {
            command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [], corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [{
                name: 'Foreign Op', type: 'sector_attack', occupies_on_victory: true, phase: 'execution',
                started_turn: 1, phase_started_turn: 1, participating_brigades: ['aaa_foreign'],
                objectives: [MAIN_TARGET], sector_id: 'sector:other:0',
                axes: [makeAxis('axis_foreign', ['aaa_foreign'], [MAIN_TARGET])],
            } as unknown as CorpsOperation],
        } as never;
        foreignLead.state.military.brigade_attack_orders = { aaa_foreign: MAIN_TARGET, brig_main: MAIN_TARGET } as never;
        const foreignReport = resolveAttackOrdersOsid(foreignLead.state, foreignLead.edges, foreignLead.adjacency);
        expect(foreignReport.battles[0]?.attacker_brigade).toBe('aaa_foreign');
        expect(foreignReport.battles[0]?.attacker_brigades).toContain('brig_main');
        expect(receiptsOf(foreignLead.operation)).toHaveLength(0);

        // Owned lead with mixed support: brig_main (this op) leads ("brig_main" < "zzz_foreign").
        const ownedLead = makeScenario();
        ownedLead.state.military.formations!.zzz_foreign = makeFormation('zzz_foreign', 'RS', 'brigade', 'op:rs:staging', { corps_id: 'other_corps' });
        ownedLead.state.military.brigade_attack_orders = { brig_main: MAIN_TARGET, zzz_foreign: MAIN_TARGET } as never;
        const ownedReport = resolveAttackOrdersOsid(ownedLead.state, ownedLead.edges, ownedLead.adjacency);
        expect(ownedReport.battles[0]?.attacker_brigade).toBe('brig_main');
        expect(ownedReport.battles[0]?.attacker_brigades).toContain('zzz_foreign');
        expect(receiptsOf(ownedLead.operation)).toHaveLength(1);
    });

    it('never creates a receipt or an owner field for an operation without the opt-in', () => {
        const { state, edges, operation, adjacency } = makeScenario({ gated: false });
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.flips_applied).toBe(1);
        expect(operation.axes!.every((axis) => axis.late_phase === undefined)).toBe(true);
        expect('brigade_attack_order_owners' in state.military).toBe(false);
    });
});

describe('held capture authority is enforced at the resolver for every writer', () => {
    it('refuses a held-axis capture order onto a gated objective (no battle, no flip) from an unowned writer', () => {
        const { state, edges, adjacency } = makeScenario({ ownMain: false });
        // A non-evaluator writer (counterattack/merged/GUI shape): no owner, direct order record.
        state.military.brigade_attack_orders = { brig_held: HELD_TARGET } as never;
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.skipped_attack_orders).toEqual([
            expect.objectContaining({ brigade_id: 'brig_held', target_osid: HELD_TARGET, reason: 'capture_phase_held' }),
        ]);
        expect(report.battles).toHaveLength(0);
        expect(report.flips_applied).toBe(0);
        expect(state.political.political_controllers![HELD_TARGET]).toBe('RBiH');
    });

    it('refuses FUTURE gated objectives as well, but keeps a lawful approach capture outside the gated set', () => {
        const future = makeScenario({ ownMain: false });
        future.state.military.formations!.brig_held = makeFormation('brig_held', 'RS', 'brigade', MAIN_TARGET, { corps_id: HOST_CORPS });
        future.state.political.political_controllers![MAIN_TARGET] = 'RS';
        future.state.military.brigade_attack_orders = { brig_held: LATER_TARGET } as never;
        const futureReport = resolveAttackOrdersOsid(future.state, future.edges, future.adjacency);
        expect(futureReport.skipped_attack_orders?.[0]?.reason).toBe('capture_phase_held');
        expect(future.state.political.political_controllers![LATER_TARGET]).toBe('RBiH');

        const approach = makeScenario({ ownMain: false });
        approach.state.military.brigade_attack_orders = { brig_held: APPROACH_TARGET } as never;
        const approachReport = resolveAttackOrdersOsid(approach.state, approach.edges, approach.adjacency);
        expect(approachReport.skipped_attack_orders ?? []).toHaveLength(0);
        expect(approachReport.flips_applied).toBe(1);
        expect(approach.state.political.political_controllers![APPROACH_TARGET]).toBe('RS');
        // A lawful approach capture is not a gated receipt.
        expect(receiptsOf(approach.operation)).toHaveLength(0);
    });

    it('does not hold anything once the axis is in its capture phase', () => {
        const { state, edges, operation, adjacency } = makeScenario({ ownMain: false });
        operation.axes![1]!.late_phase!.phase = 'capture';
        state.military.brigade_attack_orders = { brig_held: HELD_TARGET } as never;
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.skipped_attack_orders ?? []).toHaveLength(0);
        expect(report.flips_applied).toBe(1);
    });
});

describe('emitted ownership through the real dispatcher (evaluator -> merge boundary)', () => {
    function generate(scenario: Scenario): void {
        delete scenario.state.military.brigade_attack_orders;
        delete scenario.state.military.brigade_attack_order_owners;
        generateAllBotOrdersOsid(scenario.state, ['RS'], {
            edges: scenario.edges,
            reverseMap: {} as never,
            adjacency: scenario.adjacency,
        });
    }

    it('writes ownership for the operation evaluator order of a gated operation member, tied to instance/axis/target/turn', () => {
        const scenario = makeScenario({ ownMain: false });
        generate(scenario);
        expect(scenario.state.military.brigade_attack_orders?.brig_main).toBe(MAIN_TARGET);
        expect(scenario.state.military.brigade_attack_order_owners?.brig_main).toEqual({
            operation_id: OP_ID, axis_id: 'axis_main', target: MAIN_TARGET, turn: 5,
        });
        // The held axis brigade is adjacent to its gated objective: the evaluator withholds capture.
        expect(scenario.state.military.brigade_attack_orders?.brig_held).not.toBe(HELD_TARGET);
        expect(scenario.state.military.brigade_attack_order_owners?.brig_held).toBeUndefined();
    });

    it('an absent opt-in operation never acquires the owner field', () => {
        const scenario = makeScenario({ gated: false, ownMain: false });
        generate(scenario);
        expect(scenario.state.military.brigade_attack_orders?.brig_main).toBe(MAIN_TARGET);
        expect('brigade_attack_order_owners' in scenario.state.military).toBe(false);
    });

    it('buildAttackOrderOwner is null for a brigade of an ungated operation and for a brigade in no operation', () => {
        const gated = makeScenario();
        expect(buildAttackOrderOwner(gated.state, 'brig_main', MAIN_TARGET, 5)).toEqual({
            operation_id: OP_ID, axis_id: 'axis_main', target: MAIN_TARGET, turn: 5,
        });
        expect(buildAttackOrderOwner(gated.state, 'not_a_member', MAIN_TARGET, 5)).toBeNull();
        const ungated = makeScenario({ gated: false });
        expect(buildAttackOrderOwner(ungated.state, 'brig_main', MAIN_TARGET, 5)).toBeNull();
    });
});

describe('ownership survives only for the order that wins the dispatcher merge', () => {
    const owner = (target: string): BrigadeAttackOrderOwner => ({ operation_id: OP_ID, axis_id: 'axis_main', target, turn: 5 });

    function stateWithOrders(orders: Record<string, string | null>, priorOwners?: Record<string, BrigadeAttackOrderOwner>): GameState {
        return {
            military: {
                brigade_attack_orders: orders,
                ...(priorOwners ? { brigade_attack_order_owners: priorOwners } : {}),
            },
        } as unknown as GameState;
    }

    it('drops ownership on overwrite by another target, on removal, and creates no field when nothing survives', () => {
        const state = stateWithOrders({ b1: 'op:x:other' });
        syncAttackOrderOwners(state, { b1: owner(MAIN_TARGET) } as never, {}, {}, false, () => false);
        expect('brigade_attack_order_owners' in state.military).toBe(false);

        const removed = stateWithOrders({});
        syncAttackOrderOwners(removed, { b1: owner(MAIN_TARGET) } as never, {}, {}, false, () => false);
        expect('brigade_attack_order_owners' in removed.military).toBe(false);
    });

    it('merge mode: an existing order for the same brigade wins and the new owner is dropped; prior owners of untouched orders are retained', () => {
        const state = stateWithOrders(
            { b1: MAIN_TARGET, b2: MAIN_TARGET },
            { b2: owner(MAIN_TARGET) },
        );
        syncAttackOrderOwners(
            state,
            { b1: owner(MAIN_TARGET) } as never,
            { b2: owner(MAIN_TARGET) } as never,
            { b1: HELD_TARGET },
            true,
            () => false,
        );
        expect(Object.keys(state.military.brigade_attack_order_owners ?? {})).toEqual(['b2']);
    });

    it('replace mode: a replaced order loses its prior owner, a preserved (unprocessed-faction) order keeps it, a surviving new owner is kept', () => {
        const state = stateWithOrders({ b1: MAIN_TARGET, b2: MAIN_TARGET, b3: MAIN_TARGET });
        syncAttackOrderOwners(
            state,
            { b1: owner(MAIN_TARGET) } as never,
            { b2: owner(MAIN_TARGET), b3: owner(MAIN_TARGET) } as never,
            {},
            false,
            (bid) => bid === 'b3',
        );
        expect(Object.keys(state.military.brigade_attack_order_owners ?? {}).sort()).toEqual(['b1', 'b3']);
    });
});

describe('receipt invalidation on control loss (real resolver control mutation)', () => {
    const RBIH_STAGE = 'op:rbih:stage';

    function addWeakDefender(state: GameState, id: string, faction: FactionId, at: string): void {
        state.military.formations![id] = makeFormation(id, faction, 'brigade', at, {
            personnel: 200, cohesion: 20, morale: 20, experience: 0.1, posture: 'defend' as never,
            composition: {
                infantry: 150, tanks: 0, artillery: 0, aa_systems: 0,
                tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
            } as never,
        });
    }

    it('operation-owned flip -> actual loss -> foreign recapture -> prerequisite refusal -> new owned capture re-establishes it', () => {
        const scenario = makeScenario();
        const { state, edges, operation, adjacency } = scenario;

        // 1. The operation's own owned capture records a receipt (turn 5).
        resolveAttackOrdersOsid(state, edges, adjacency);
        expect(receiptsOf(operation)).toHaveLength(1);
        expect(state.political.political_controllers![MAIN_TARGET]).toBe('RS');

        // 2. An enemy attack actually takes the cell back: the receipt is void at the control change.
        state.meta.turn = 6;
        state.political.political_controllers![RBIH_STAGE] = 'RBiH';
        state.military.formations!.rbih_attacker = makeFormation('rbih_attacker', 'RBiH', 'brigade', RBIH_STAGE, { personnel: 9000, cohesion: 95, morale: 95, experience: 1 });
        addWeakDefender(state, 'rs_def_main', 'RS', MAIN_TARGET);
        state.military.brigade_attack_orders = { rbih_attacker: MAIN_TARGET } as never;
        // The resolver memoizes adjacency per edges ARRAY, so later steps use a fresh array holding the new edge.
        const edgesWithEnemyStage: EdgeRecord[] = [...edges, { edge_id: 'e5', a: RBIH_STAGE, b: MAIN_TARGET } as EdgeRecord];
        const lossReport = resolveAttackOrdersOsid(state, edgesWithEnemyStage, adjacency);
        expect(lossReport.flips_applied, JSON.stringify({ skipped: lossReport.skipped_attack_orders, battles: lossReport.battles.length })).toBe(1);
        expect(state.political.political_controllers![MAIN_TARGET]).toBe('RBiH');
        expect(receiptsOf(operation)).toHaveLength(0);

        // 3. A FOREIGN, unowned recapture returns control to RS: the old receipt must NOT come back.
        state.meta.turn = 7;
        // The enemy brigade that just won the cell is not a reserve for this step's defense.
        delete state.military.formations!.rbih_attacker;
        state.military.formations!.foreign_rs = makeFormation('foreign_rs', 'RS', 'brigade', 'op:rs:staging', { corps_id: 'other_corps', personnel: 20000 });
        addWeakDefender(state, 'rbih_def_main', 'RBiH', MAIN_TARGET);
        delete state.military.formations!.rs_def_main;
        state.military.brigade_attack_orders = { foreign_rs: MAIN_TARGET } as never;
        const recaptureReport = resolveAttackOrdersOsid(state, edgesWithEnemyStage, adjacency);
        expect(recaptureReport.flips_applied, JSON.stringify({ skipped: recaptureReport.skipped_attack_orders, battles: recaptureReport.battles.map((b) => [b.attacker_brigade, b.outcome, b.attacker_won]) })).toBe(1);
        expect(state.political.political_controllers![MAIN_TARGET]).toBe('RS');
        expect(receiptsOf(operation)).toHaveLength(0);
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS' as FactionId, 7);
        expect(operation.axes![1]!.late_phase!.phase).toBe('holding');

        // 4. A NEW valid capture by this exact operation establishes a new receipt and satisfies it.
        state.meta.turn = 8;
        state.political.political_controllers![MAIN_TARGET] = 'RBiH';
        delete state.military.formations!.rbih_def_main;
        addWeakDefender(state, 'rbih_def_main2', 'RBiH', MAIN_TARGET);
        state.military.brigade_attack_orders = { brig_main: MAIN_TARGET } as never;
        state.military.brigade_attack_order_owners = {
            brig_main: { operation_id: OP_ID, axis_id: 'axis_main', target: MAIN_TARGET, turn: 8 },
        } as never;
        resolveAttackOrdersOsid(state, edges, adjacency);
        expect(receiptsOf(operation)).toHaveLength(1);
        expect(receiptsOf(operation)[0]!.turn).toBe(8);
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS' as FactionId, 8);
        expect(operation.axes![1]!.late_phase!.phase).toBe('capture');
    });

    it('a loss written by a non-resolver control writer is also caught at the next gate pass (no resurrection by a later recapture)', () => {
        const { state, operation } = makeScenario();
        receiptsOf(operation).push({
            osid: MAIN_TARGET, turn: 5, battle_id: `5:${MAIN_TARGET}:brig_main:def_main`,
            attacker_brigade: 'brig_main', operation_id: OP_ID, axis_id: 'axis_main',
        });
        state.political.political_controllers![MAIN_TARGET] = 'RBiH'; // event/displacement-style writer
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS' as FactionId, 6);
        expect(receiptsOf(operation)).toHaveLength(0);
        state.political.political_controllers![MAIN_TARGET] = 'RS'; // later foreign recapture
        advanceLatePhaseGates(state, operation, HOST_CORPS, 'RS' as FactionId, 7);
        expect(operation.axes![1]!.late_phase!.phase).toBe('holding');
    });
});

describe('final consumer inspects EVERY held-axis membership (probe overlap)', () => {
    function withProbeOverlap(): Scenario {
        const scenario = makeScenario({ ownMain: false });
        // 'aaa_corps' sorts BEFORE the host corps, so findBrigadeOperationAnywhere would classify
        // brig_held through this ungated probe and miss its held-axis membership.
        scenario.state.military.corps_command!.aaa_corps = {
            command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [], corps_exhaustion: 0, stance: 'offensive',
            active_operations: [{
                name: 'Overlap Probe', type: 'probe', occupies_on_victory: true, phase: 'execution',
                started_turn: 1, phase_started_turn: 1, participating_brigades: ['brig_held', 'probe_only'],
                objectives: [HELD_TARGET], sector_id: 'sector:aaa:0',
            } as unknown as CorpsOperation],
        } as never;
        scenario.state.military.formations!.probe_only = makeFormation('probe_only', 'RS', 'brigade', 'op:rs:hq', { corps_id: 'aaa_corps' });
        return scenario;
    }

    it('refuses the held-axis brigade even when another (ungated) operation sorts first for it', () => {
        const { state, edges, adjacency } = withProbeOverlap();
        state.military.brigade_attack_orders = { brig_held: HELD_TARGET } as never;
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.skipped_attack_orders).toEqual([
            expect.objectContaining({ brigade_id: 'brig_held', target_osid: HELD_TARGET, reason: 'capture_phase_held' }),
        ]);
        expect(state.political.political_controllers![HELD_TARGET]).toBe('RBiH');
    });

    it('an unrelated brigade of the other operation (no held-axis membership) stays free under its own authority', () => {
        const { state, edges, adjacency } = withProbeOverlap();
        state.military.brigade_attack_orders = { probe_only: HELD_TARGET } as never;
        const report = resolveAttackOrdersOsid(state, edges, adjacency);
        expect(report.skipped_attack_orders ?? []).toHaveLength(0);
        expect(report.battles).toHaveLength(1);
    });
});
