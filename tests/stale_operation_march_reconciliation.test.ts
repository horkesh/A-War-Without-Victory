import { afterEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import {
    correctTransitStates,
    reconcileStaleOperationMarchOrders,
} from '../src/sim/combat/commander_march_correction.js';

const B = 'brigade';
const OLD = 'old_objective';
const CURRENT = 'current_objective';
const APPROACH = 'current_approach';
const STAGING = 'axis_staging';

function graph(reverse = false): Map<string, string[]> {
    const entries: Array<[string, string[]]> = [
        ['start', reverse ? [OLD, 'mid'] : ['mid', OLD]],
        ['mid', reverse ? [APPROACH, 'start'] : ['start', APPROACH]],
        [APPROACH, reverse ? [CURRENT, 'mid'] : ['mid', CURRENT]],
        [CURRENT, [APPROACH]],
        [OLD, ['start']],
        [STAGING, []],
    ];
    return new Map(reverse ? entries.reverse() : entries);
}

function state(overrides: {
    owner?: string;
    phase?: string;
    participant?: boolean;
    duplicateOperation?: boolean;
    duplicateAxis?: boolean;
    loanedTo?: string | null;
    onLoan?: boolean;
    oldFriendly?: boolean;
    emptyApproach?: boolean;
    activeTransit?: boolean;
    destination?: string;
    validRoutine?: boolean;
    reserve?: boolean;
    reassignment?: boolean;
    competingPhase?: string;
    crossCorpsLiveOverlap?: boolean;
    foreignHostOnly?: boolean;
} = {}): GameState {
    const destination = overrides.destination ?? OLD;
    const axis = {
        axis_id: 'axis', name: 'Axis', assigned_brigades: overrides.participant === false ? ['other'] : [B],
        objectives: [OLD, CURRENT], current_objective_index: 1,
        staging_osid: STAGING, status: 'executing', failure_count: 0,
        consecutive_failures_on_current: 0, momentum: 1, attack_attempt_count: 1,
        objective_capture_count: 1, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
    };
    const op = {
        name: 'Operation', type: 'sector_attack', phase: overrides.phase ?? 'execution',
        started_turn: 1, phase_started_turn: 1, planning_duration: 1,
        participating_brigades: overrides.participant === false ? ['other'] : [B],
        objectives: [OLD, CURRENT], current_objective_index: 1,
        axes: overrides.duplicateAxis ? [axis, { ...axis, axis_id: 'axis-2' }] : [axis],
        min_attack_outcome: 'repulsed', occupies_on_victory: true,
    };
    const receivingCorps = overrides.loanedTo === null ? 'home' : 'receiving';
    const formation: Record<string, unknown> = {
        id: B, name: B, faction: 'HRHB', corps_id: 'home', kind: 'brigade', status: 'active',
        readiness: 'active', location_osid: 'start', personnel: 1000, max_personnel: 1000,
        cohesion: 60, morale: 60, posture: 'defend', created_turn: 0, assignment: null,
    };
    if (overrides.loanedTo !== null) {
        formation.elite_loan_state = {
            on_loan: overrides.onLoan ?? true, loaned_to_corps: overrides.loanedTo ?? receivingCorps, loan_start_turn: 0,
            last_recall_turn: null, loan_start_personnel: 1000,
            permanently_degraded: false, current_episode_id: 0,
        };
    }
    if (overrides.validRoutine) {
        formation.assigned_sub_segment_id = 'subseg';
        formation.assignment = { kind: 'sector', role: 'front', sector_id: 'sector' };
    }
    const operations = [
        op,
        ...(overrides.duplicateOperation ? [{ ...op, name: 'Operation 2' }] : []),
        ...(overrides.competingPhase ? [{ ...op, name: `Competing ${overrides.competingPhase}`, phase: overrides.competingPhase }] : []),
    ];
    const effectiveOperations = overrides.foreignHostOnly ? [] : operations;
    const foreignOperations = overrides.crossCorpsLiveOverlap || overrides.foreignHostOnly
        ? [{ ...op, name: 'Foreign hosted operation' }]
        : [];
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'test', phase: 'war' },
        factions: [{ id: 'HRHB' }, { id: 'RS' }, { id: 'RBiH' }],
        political: { political_controllers: {
            start: 'HRHB', mid: 'HRHB', [APPROACH]: overrides.emptyApproach ? 'RS' : 'HRHB',
            [CURRENT]: 'RS', [OLD]: overrides.oldFriendly === false ? 'RS' : 'HRHB', [STAGING]: 'HRHB',
        } },
        military: {
            formations: { [B]: formation },
            brigade_movement_orders: {
                [B]: { destination_sids: [destination], owner: overrides.owner ?? 'bot_discretionary', stance: 'column' },
            },
            brigade_movement_state: overrides.activeTransit ? {
                [B]: { destination_sids: [destination], owner: 'bot_discretionary', stance: 'column', status: 'in_transit', path: ['start', destination], turns_remaining: 1 },
            } : {},
            corps_command: {
                [receivingCorps]: { command_span: 1, subordinate_count: 1, og_slots: 1, active_ogs: [], stance: 'offensive', corps_exhaustion: 0, active_operations: effectiveOperations },
                ...(foreignOperations.length > 0 ? {
                    foreign: { command_span: 1, subordinate_count: 1, og_slots: 1, active_ogs: [], stance: 'offensive', corps_exhaustion: 0, active_operations: foreignOperations },
                } : {}),
                ...(overrides.reassignment ? {
                    home: {
                        command_span: 1, subordinate_count: 1, og_slots: 1, active_ogs: [],
                        stance: 'balanced', corps_exhaustion: 0, active_operations: [],
                        directive: { sector_reassignment_orders: [{ brigade_id: B, to_sector_id: 'reassignment-sector' }] },
                    },
                } : {}),
            },
            corps_front_sectors: overrides.validRoutine || overrides.reserve || overrides.reassignment ? {
                sector: {
                    sector_id: 'sector', corps_id: receivingCorps, faction: 'HRHB', opposing_factions: ['RS'],
                    edge_ids: [], length_edges: 1, territory_osids: [OLD],
                    assigned_brigade_ids: overrides.reserve ? [] : [B], reserve_brigade_ids: overrides.reserve ? [B] : [],
                    rear_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 1,
                    sector_stance: 'defend', stance_source: 'bot',
                    sub_segments: [{ sub_segment_id: 'subseg', edge_ids: [], friendly_osids: [OLD], enemy_osids: [CURRENT], primary_brigade_ids: [B], length_edges: 1 }],
                },
                ...(overrides.reassignment ? {
                    'reassignment-sector': {
                        sector_id: 'reassignment-sector', corps_id: 'home', faction: 'HRHB', opposing_factions: ['RS'],
                        edge_ids: [], length_edges: 1, territory_osids: [OLD], assigned_brigade_ids: [],
                        reserve_brigade_ids: [], rear_brigade_ids: [], density: 0, threat_ratio: 1,
                        defensive_power: 0, sector_stance: 'defend', stance_source: 'bot',
                        sub_segments: [{ sub_segment_id: 'reassignment-subseg', edge_ids: [], friendly_osids: [OLD], enemy_osids: [], primary_brigade_ids: [], length_edges: 1 }],
                    },
                } : {}),
            } : {},
        },
        displacement: {},
    } as unknown as GameState;
}

function reconcile(input: GameState, adjacency = graph()): void {
    reconcileStaleOperationMarchOrders(input, adjacency, new Map() as never);
}

describe('pre-T3 stale operation march reconciliation', () => {
    it('retargets one proven completed-axis objective to the nearest current approach without choosing staging', () => {
        const input = state();
        const commitments = structuredClone(input.military.corps_command);
        const loan = structuredClone(input.military.formations![B]!.elite_loan_state);
        reconcile(input);
        expect(input.military.brigade_movement_orders?.[B]).toEqual({
            destination_sids: [APPROACH], owner: 'bot_discretionary', stance: 'column',
        });
        expect(input.military.brigade_movement_orders?.[B]?.destination_sids).not.toContain(STAGING);
        expect(input.military.corps_command).toEqual(commitments);
        expect(input.military.formations![B]!.elite_loan_state).toEqual(loan);
    });

    it('selects deterministically under map and neighbor insertion-order permutations', () => {
        const first = state();
        const second = state();
        reconcile(first, graph(false));
        reconcile(second, graph(true));
        expect(second.military.brigade_movement_orders?.[B]).toEqual(first.military.brigade_movement_orders?.[B]);
    });

    it.each([
        ['authored/non-bot owner', { owner: 'authored_preplanned' }],
        ['retreat owner', { owner: 'retreat' }],
        ['loan-lifecycle owner', { owner: 'loan_lifecycle' }],
        ['active transit', { activeTransit: true }],
        ['nonparticipant', { participant: false }],
        ['ambiguous operations', { duplicateOperation: true }],
        ['live plus recovery membership', { competingPhase: 'recovery' }],
        ['live plus completed membership', { competingPhase: 'completed' }],
        ['cross-corps live overlap', { crossCorpsLiveOverlap: true }],
        ['foreign-host-only joint membership', { foreignHostOnly: true }],
        ['ambiguous axes', { duplicateAxis: true }],
        ['recovery operation', { phase: 'recovery' }],
        ['completed operation', { phase: 'completed' }],
        ['non-loan home-corps operation', { loanedTo: null }],
        ['inactive loan with stale receiver', { onLoan: false }],
        ['active loan with empty receiver', { loanedTo: '' }],
        ['invalid loan recipient', { loanedTo: 'other' }],
        ['prior objective no longer friendly-held', { oldFriendly: false }],
        ['empty current approach', { emptyApproach: true }],
        ['current staging order', { destination: STAGING }],
        ['valid routine order', { validRoutine: true }],
        ['explicit corps reassignment', { reassignment: true }],
        ['reserve roster', { reserve: true }],
    ])('preserves %s byte-for-byte', (_name, overrides) => {
        const input = state(overrides);
        const before = structuredClone(input);
        reconcile(input);
        expect(input).toEqual(before);
    });

    it('preserves the stale order when every path to the current approach crosses hostile control', () => {
        const input = state();
        input.political.political_controllers!.mid = 'RS';
        const before = structuredClone(input);
        reconcile(input);
        expect(input).toEqual(before);
    });

    it('leaves an already valid current-approach order byte-identical', () => {
        const input = state({ destination: APPROACH });
        const before = structuredClone(input);
        reconcile(input);
        expect(input).toEqual(before);
    });

    it('does not weaken T6: an independently injected bad transit is still cancelled', () => {
        const input = state({ validRoutine: true, activeTransit: true });
        input.military.brigade_movement_state![B]!.destination_sids = ['unrelated_bad_destination'];
        correctTransitStates(input, graph());
        expect(input.military.brigade_movement_state?.[B]).toBeUndefined();
    });
});

describe('reconciliation write observer', () => {
    const originalTopics = process.env.AWWV_DEBUG_REASON_CODES;

    afterEach(() => {
        if (originalTopics === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
        else process.env.AWWV_DEBUG_REASON_CODES = originalTopics;
        resetReasonCodeTopicCacheForTests();
        vi.restoreAllMocks();
    });

    function records(log: ReturnType<typeof vi.spyOn>): Array<Record<string, any>> {
        return log.mock.calls
            .map(([line]) => String(line))
            .filter((line) => line.startsWith('[reconciliation_write] '))
            .map((line) => JSON.parse(line.slice('[reconciliation_write] '.length)));
    }

    it('is absent when off and leaves the full state and serialization byte-identical', () => {
        delete process.env.AWWV_DEBUG_REASON_CODES;
        resetReasonCodeTopicCacheForTests();
        const input = state();
        const control = structuredClone(input);
        const beforeBytes = serializeState(input);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        reconcile(input);
        reconcile(control);

        expect(records(log)).toEqual([]);
        expect(input).toEqual(control);
        expect(serializeState(input)).toBe(serializeState(control));
        expect(beforeBytes).not.toBe(serializeState(input));
    });

    it('records actual reached guards, memberships, and the real pre/post assignment', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'reconciliation_write';
        resetReasonCodeTopicCacheForTests();
        const input = state();
        const control = structuredClone(input);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        reconcile(input);
        const observedBytes = serializeState(input);
        delete process.env.AWWV_DEBUG_REASON_CODES;
        resetReasonCodeTopicCacheForTests();
        reconcile(control);

        expect(input).toEqual(control);
        expect(observedBytes).toBe(serializeState(control));
        const rows = records(log);
        const terminal = rows.find((row) => row.kind === 'candidate_terminal');
        if (!terminal) throw new Error('missing reconciliation candidate terminal');
        expect(terminal).toMatchObject({
            actual_exit: 'replaced',
            brigade_id: B,
            old_order: { owner: 'bot_discretionary', stance: 'column', destination_sids: [OLD] },
            new_order: { owner: 'bot_discretionary', stance: 'column', destination_sids: [APPROACH] },
            selected_operation: { name: 'Operation', phase: 'execution' },
            selected_axis: { axis_id: 'axis', current_objective_index: 1 },
        });
        expect(terminal.guards.order_present).toBe(true);
        expect(terminal.guards.replacement_authorized).toBe(true);
        expect(terminal.approaches).toEqual([APPROACH]);
        expect(rows.at(0)).toMatchObject({ kind: 'call_start', turn: 10, order_count: 1 });
        expect(rows.at(-1)).toMatchObject({ kind: 'call_terminal', actual_exit: 'completed', candidate_count: 1 });
    });

    it.each([
        ['valid competing owner', { owner: 'authored_preplanned' }, 'order_owner_or_stance'],
        ['active transit', { activeTransit: true }, 'active_transit'],
        ['recovery operation', { phase: 'recovery' }, 'operation_phase'],
        ['reserve membership', { reserve: true }, 'reserve_membership'],
        ['non-loan home-corps operation', { loanedTo: null }, 'effective_corps_missing'],
        ['inactive loan with stale receiver', { onLoan: false }, 'effective_corps_missing'],
    ])('marks later guards NOT_REACHED for %s', (_name, overrides, actualExit) => {
        process.env.AWWV_DEBUG_REASON_CODES = 'reconciliation_write';
        resetReasonCodeTopicCacheForTests();
        const input = state(overrides as Parameters<typeof state>[0]);
        const before = structuredClone(input);
        const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

        reconcile(input);

        const terminal = records(log).find((row) => row.kind === 'candidate_terminal');
        if (!terminal) throw new Error('missing reconciliation candidate terminal');
        expect(terminal.actual_exit).toBe(actualExit);
        if (actualExit === 'effective_corps_missing') {
            expect(terminal.guards.effective_corps_present).toBe(false);
            expect(terminal.guards.unique_membership).toBe('NOT_REACHED');
        }
        expect(terminal.guards.replacement_authorized).toBe('NOT_REACHED');
        expect(input).toEqual(before);
    });

    it('reports the no-orders terminal and isolates a throwing stdout sink', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'reconciliation_write';
        resetReasonCodeTopicCacheForTests();
        const empty = state();
        delete empty.military.brigade_movement_orders;
        const log = vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('sink failed'); });

        expect(() => reconcile(empty)).not.toThrow();

        log.mockRestore();
        const capture = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        reconcile(empty);
        expect(records(capture)).toEqual([
            expect.objectContaining({ kind: 'call_start', order_count: 0 }),
            expect.objectContaining({ kind: 'call_terminal', actual_exit: 'no_orders', candidate_count: 0 }),
        ]);
    });
});
