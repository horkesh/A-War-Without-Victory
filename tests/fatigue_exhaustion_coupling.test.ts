import assert from 'node:assert';
import { test } from 'vitest';

import { applyFatigueRecovery } from '../src/state/formation_fatigue.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

function makeFormation(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id,
        faction: 'RBiH',
        name: id,
        kind: 'brigade',
        created_turn: 1,
        status: 'active',
        tags: [],
        corps_id: 'arbih_1st_corps',
        ops: { fatigue: 0, last_supplied_turn: 120 },
        brigade_history: { battles_fought: 0, engagements: [] },
        ...overrides,
    };
}

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 120, seed: 'fatigue-exhaustion-test', phase: 'war' } as any,
        factions: [{ id: 'RBiH' as any }],
        military: {
            formations: {
                front_quiet: makeFormation('front_quiet', {
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                }),
                reserve_recent_combat: makeFormation('reserve_recent_combat', {
                    assignment: { kind: 'sector', role: 'reserve', sector_id: 'sector:front' },
                    brigade_history: {
                        battles_fought: 1,
                        engagements: [{ turn: 80, role: 'defender', enemy_faction: 'RS' }],
                    },
                }),
                reserve_old_combat: makeFormation('reserve_old_combat', {
                    assignment: { kind: 'sector', role: 'reserve', sector_id: 'sector:front' },
                    brigade_history: {
                        battles_fought: 1,
                        engagements: [{ turn: 20, role: 'defender', enemy_faction: 'RS' }],
                    },
                }),
                engaged_this_turn: makeFormation('engaged_this_turn', {
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                    ops: { fatigue: 2, last_supplied_turn: 120 },
                    brigade_history: {
                        battles_fought: 1,
                        engagements: [{ turn: 120, role: 'attacker', enemy_faction: 'RS' }],
                    },
                }),
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_front_sectors: {
                'sector:front': {
                    sector_id: 'sector:front',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    edge_ids: ['S1__S2'],
                    assigned_brigade_ids: ['front_quiet', 'engaged_this_turn'],
                    reserve_brigade_ids: ['reserve_recent_combat', 'reserve_old_combat'],
                    rear_brigade_ids: [],
                    sub_segments: [],
                    opposing_factions: ['RS'],
                    length_edges: 1,
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                },
            },
        } as any,
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 90 },
        } as any,
        displacement: {
            displacement_event_log: [],
        } as any,
    } as GameState;
}

test('late-war exhaustion preserves a small fatigue residue for recently combat-engaged formations', () => {
    const state = makeState();

    applyFatigueRecovery(state, new Set(['engaged_this_turn']));

    assert.strictEqual(state.military.formations.front_quiet.ops?.fatigue, 0.5);
    assert.strictEqual(state.military.formations.reserve_recent_combat.ops?.fatigue, 1);
    assert.strictEqual(state.military.formations.reserve_old_combat.ops?.fatigue, 0);
    assert.strictEqual(state.military.formations.engaged_this_turn.ops?.fatigue, 2.5);
});

test('recent combat residue is inactive before the late-war exhaustion window', () => {
    const state = makeState();
    state.meta.turn = 80;

    applyFatigueRecovery(state);

    assert.strictEqual(state.military.formations.reserve_recent_combat.ops?.fatigue, 0);
});
