import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/state/game_state.js';
import type { CommanderOutput, CommanderState } from '../../src/sim/combat/commander/commander_state.js';
import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';

function makeState(): GameState {
    return {
        meta: { turn: 12 } as GameState['meta'],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            corps_command: {
                vrs_1st_krajina: {
                    command_span: 3,
                    subordinate_count: 6,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 12,
                    stance: 'balanced',
                    active_operations: [],
                },
            },
        } as unknown as GameState['military'],
        political: {} as GameState['political'],
        factions: {} as GameState['factions'],
        displacement: {} as GameState['displacement'],
    };
}

function makeOutput(): CommanderOutput {
    return {
        directive: {
            assigned_front_ids: [],
            offensive_targets: [],
            hold_osids: [],
            avoid_osids: [],
            max_attackers_per_target: 3,
            reserve_fraction: 0.2,
            min_attack_outcome: 'risky',
            aggression_modifier: 0,
        },
        operations: [],
        sector_stances: [],
        updated_state: {} as CommanderState,
        garrison_locks: [],
        reinforcement_requests: [
            { zone_id: 'zone:vrs_1st_krajina:ozren', brigades_needed: 2, priority: 'critical' },
            { zone_id: 'zone:vrs_1st_krajina:doboj', brigades_needed: 1, priority: 'medium' },
        ],
        plan_updates: [],
    };
}

describe('commander reinforcement signal flow', () => {
    it('applyCommanderOutput persists commander reinforcement requests on corps state', () => {
        const state = makeState();
        applyCommanderOutput(state, 'vrs_1st_krajina', makeOutput());

        expect(state.military.corps_command?.vrs_1st_krajina?.commander_reinforcement_requests).toEqual([
            { zone_id: 'zone:vrs_1st_krajina:ozren', brigades_needed: 2, priority: 'critical' },
            { zone_id: 'zone:vrs_1st_krajina:doboj', brigades_needed: 1, priority: 'medium' },
        ]);
    });
});
