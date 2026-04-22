/**
 * v0.9.0 Consequence System — Phase 1 Session 1 effect-type writer contracts.
 *
 * Covers the 5 new EventEffect variants that back the divergence-event matrix:
 *   - guerrilla_threat
 *   - recruitment_modifier
 *   - doctrine_constraint (merges into existing event_constraints bus)
 *   - alliance_lock
 *   - bot_priority_shift
 *
 * This slice tests WRITERS only. Consumers land in Phase 1 Session 2 and will
 * own their own reader-contract tests. Readers MUST filter by
 * `expires_turn > currentTurn` because cleanup GC has not landed yet.
 */
import { describe, it, expect } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import type { EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

/** Minimal GameState stub mirroring tests/event_effects.test.ts. */
function makeState(overrides?: Partial<GameState>): GameState {
    return {
        schema_version: 1,
        meta: { turn: 10, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'a' } as GameState['meta'],
        factions: [
            { id: 'RBiH', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: {} as any, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            general_supply_reserve: { RBiH: 50, RS: 70, HRHB: 40 },
            heavy_munitions_reserve: { RBiH: 30, RS: 50, HRHB: 20 },
            fired_event_ids: [],
        } as unknown as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
        } as GameState['political'],
        ...overrides,
    } as GameState;
}

describe('guerrilla_threat writer', () => {
    it('pushes an entry with expires_turn = currentTurn + duration_turns', () => {
        const state = makeState();
        const effect: EventEffect = {
            kind: 'guerrilla_threat',
            faction: 'RS',
            municipalities: ['zvornik', 'bratunac'],
            intensity: 0.6,
            duration_turns: 20,
        };
        applyEventEffects(state, [effect]);
        expect(state.military.guerrilla_threats).toHaveLength(1);
        const entry = state.military.guerrilla_threats![0];
        expect(entry.faction).toBe('RS');
        expect(entry.intensity).toBe(0.6);
        expect(entry.expires_turn).toBe(30); // turn 10 + 20
    });

    it('clamps intensity to [0, 1]', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'guerrilla_threat', faction: 'RS', municipalities: ['foca'], intensity: 5, duration_turns: 10 },
            { kind: 'guerrilla_threat', faction: 'RS', municipalities: ['foca'], intensity: -3, duration_turns: 10 },
        ]);
        expect(state.military.guerrilla_threats![0].intensity).toBe(1);
        expect(state.military.guerrilla_threats![1].intensity).toBe(0);
    });

    it('sorts municipalities for deterministic serialization', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'guerrilla_threat',
                faction: 'RS',
                municipalities: ['zvornik', 'bratunac', 'foca', 'visegrad'],
                intensity: 0.5,
                duration_turns: 10,
            },
        ]);
        expect(state.military.guerrilla_threats![0].municipalities).toEqual([
            'bratunac', 'foca', 'visegrad', 'zvornik',
        ]);
    });

    it('stacks when applied repeatedly', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'guerrilla_threat', faction: 'RS', municipalities: ['foca'], intensity: 0.3, duration_turns: 10 },
        ]);
        applyEventEffects(state, [
            { kind: 'guerrilla_threat', faction: 'RS', municipalities: ['visegrad'], intensity: 0.7, duration_turns: 20 },
        ]);
        expect(state.military.guerrilla_threats).toHaveLength(2);
        expect(state.military.guerrilla_threats![0].intensity).toBe(0.3);
        expect(state.military.guerrilla_threats![1].intensity).toBe(0.7);
    });
});

describe('recruitment_modifier writer', () => {
    it('pushes entry with pool_multiplier passed through unclamped', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 1.15, duration_turns: 25 },
        ]);
        expect(state.military.recruitment_modifiers).toHaveLength(1);
        const entry = state.military.recruitment_modifiers![0];
        expect(entry.faction).toBe('RBiH');
        expect(entry.pool_multiplier).toBe(1.15);
        expect(entry.expires_turn).toBe(35); // turn 10 + 25
    });

    it('stacks multiple modifiers on the same faction', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 0.8, duration_turns: 20 },
            { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 1.15, duration_turns: 20 },
        ]);
        expect(state.military.recruitment_modifiers).toHaveLength(2);
    });
});

describe('doctrine_constraint writer', () => {
    it('merges operation_blocks into event_constraints with effect duration', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'doctrine_constraint',
                faction: 'RS',
                constraint: {
                    operation_blocks: [
                        { faction: 'RS', expires_turn: 999, reason: 'drina_corps_pinned' },
                    ],
                },
                duration_turns: 30,
            },
        ]);
        const blocks = state.military.event_constraints!.operation_blocks!;
        expect(blocks).toHaveLength(1);
        expect(blocks[0].faction).toBe('RS');
        expect(blocks[0].reason).toBe('drina_corps_pinned');
        // Duration override: 999 replaced with currentTurn + duration_turns
        expect(blocks[0].expires_turn).toBe(40);
    });

    it('merges doctrine_overrides and scope_restrictions in one payload', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'doctrine_constraint',
                faction: 'RS',
                constraint: {
                    doctrine_overrides: [
                        { faction: 'RS', forced_stance: 'defensive', expires_turn: 0, reason: 'exhausted' },
                    ],
                    scope_restrictions: [
                        { faction: 'RS', blocked_municipalities: ['zvornik'], reason: 'supply_severed' },
                    ],
                },
                duration_turns: 15,
            },
        ]);
        const overrides = state.military.event_constraints!.doctrine_overrides!;
        const scopes = state.military.event_constraints!.scope_restrictions!;
        expect(overrides).toHaveLength(1);
        expect(overrides[0].forced_stance).toBe('defensive');
        expect(overrides[0].expires_turn).toBe(25);
        expect(scopes).toHaveLength(1);
        expect(scopes[0].blocked_municipalities).toEqual(['zvornik']);
        expect(scopes[0].expires_turn).toBe(25);
    });

    it('does not clobber pre-existing event_constraints entries', () => {
        const state = makeState();
        state.military.event_constraints = {
            operation_blocks: [
                { faction: 'HRHB', expires_turn: 20, reason: 'prior_constraint' },
            ],
        };
        applyEventEffects(state, [
            {
                kind: 'doctrine_constraint',
                faction: 'RS',
                constraint: {
                    operation_blocks: [
                        { faction: 'RS', expires_turn: 0, reason: 'new_constraint' },
                    ],
                },
                duration_turns: 10,
            },
        ]);
        expect(state.military.event_constraints!.operation_blocks).toHaveLength(2);
        // Order preserved: pre-existing first, new appended
        expect(state.military.event_constraints!.operation_blocks![0].reason).toBe('prior_constraint');
        expect(state.military.event_constraints!.operation_blocks![1].reason).toBe('new_constraint');
    });
});

describe('alliance_lock writer', () => {
    it('floor mode pushes entry with value and expires_turn', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'alliance_lock', mode: 'floor', value: 0.5, duration_turns: 40 },
        ]);
        expect(state.military.alliance_locks).toHaveLength(1);
        const lock = state.military.alliance_locks![0];
        expect(lock.mode).toBe('floor');
        expect(lock.value).toBe(0.5);
        expect(lock.expires_turn).toBe(50);
    });

    it('ceiling mode coexists with floor mode', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'alliance_lock', mode: 'floor', value: 0.5, duration_turns: 20 },
            { kind: 'alliance_lock', mode: 'ceiling', value: 0.9, duration_turns: 20 },
        ]);
        expect(state.military.alliance_locks).toHaveLength(2);
        expect(state.military.alliance_locks![0].mode).toBe('floor');
        expect(state.military.alliance_locks![1].mode).toBe('ceiling');
    });

    it('clamps value to [-1, 1]', () => {
        const state = makeState();
        applyEventEffects(state, [
            { kind: 'alliance_lock', mode: 'floor', value: 5, duration_turns: 10 },
            { kind: 'alliance_lock', mode: 'ceiling', value: -3, duration_turns: 10 },
        ]);
        expect(state.military.alliance_locks![0].value).toBe(1);
        expect(state.military.alliance_locks![1].value).toBe(-1);
    });
});

describe('bot_priority_shift writer', () => {
    it('pushes entry with sorted add/remove objectives', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'bot_priority_shift',
                faction: 'RS',
                add_objectives: ['zvornik', 'bratunac'],
                remove_objectives: ['foca', 'cerska'],
                duration_turns: 20,
            },
        ]);
        expect(state.military.bot_priority_shifts).toHaveLength(1);
        const shift = state.military.bot_priority_shifts![0];
        expect(shift.faction).toBe('RS');
        expect(shift.add_objectives).toEqual(['bratunac', 'zvornik']);
        expect(shift.remove_objectives).toEqual(['cerska', 'foca']);
        expect(shift.expires_turn).toBe(30);
    });

    it('leaves undefined when add or remove arrays are omitted', () => {
        const state = makeState();
        applyEventEffects(state, [
            {
                kind: 'bot_priority_shift',
                faction: 'RBiH',
                add_objectives: ['sarajevo'],
                duration_turns: 10,
            },
        ]);
        const shift = state.military.bot_priority_shifts![0];
        expect(shift.add_objectives).toEqual(['sarajevo']);
        expect(shift.remove_objectives).toBeUndefined();
    });
});

describe('consequence effects: deterministic ordering', () => {
    it('new effect kinds apply in stable alphabetical order', () => {
        const state = makeState();
        // Mixed-kind batch; if writer ordering is non-deterministic, array
        // contents could shuffle. Each writer pushes to its own array, so we
        // verify they all landed and the event_constraints merge survived.
        const effects: EventEffect[] = [
            { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: 1.1, duration_turns: 10 },
            { kind: 'alliance_lock', mode: 'floor', value: 0.3, duration_turns: 10 },
            { kind: 'guerrilla_threat', faction: 'RS', municipalities: ['foca'], intensity: 0.5, duration_turns: 10 },
            { kind: 'bot_priority_shift', faction: 'RS', add_objectives: ['zvornik'], duration_turns: 10 },
            {
                kind: 'doctrine_constraint',
                faction: 'RS',
                constraint: { operation_blocks: [{ faction: 'RS', expires_turn: 0, reason: 'x' }] },
                duration_turns: 10,
            },
        ];
        applyEventEffects(state, effects);
        expect(state.military.guerrilla_threats).toHaveLength(1);
        expect(state.military.recruitment_modifiers).toHaveLength(1);
        expect(state.military.alliance_locks).toHaveLength(1);
        expect(state.military.bot_priority_shifts).toHaveLength(1);
        expect(state.military.event_constraints!.operation_blocks).toHaveLength(1);
    });
});
