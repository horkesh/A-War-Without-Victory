import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
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
            on_loan: true, loaned_to_corps: overrides.loanedTo ?? receivingCorps, loan_start_turn: 0,
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
        meta: { turn: 10, seed: 'test', phase: 'war' },
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
