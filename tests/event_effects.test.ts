import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import type { EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WAR_1992_PATH = join(HERE, '..', 'data', 'scenarios', 'events', 'war_1992.json');

/** Minimal GameState stub for event effect tests. */
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
            formations: {
                'brig_1': { id: 'brig_1', faction: 'RBiH', name: 'B1', created_turn: 0, status: 'active', assignment: null, morale: 60, cohesion: 70 },
                'brig_2': { id: 'brig_2', faction: 'RBiH', name: 'B2', created_turn: 0, status: 'active', assignment: null, morale: 50, cohesion: 80 },
                'brig_3': { id: 'brig_3', faction: 'RS', name: 'B3', created_turn: 0, status: 'active', assignment: null, morale: 55, cohesion: 65 },
            },
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

describe('applyEventEffects', () => {
    it('morale_change applies to faction brigades only', () => {
        const state = makeState();
        const effects: EventEffect[] = [
            { kind: 'morale_change', faction: 'RBiH', delta: 5 },
        ];
        applyEventEffects(state, effects);
        expect(state.military.formations['brig_1'].morale).toBe(65);
        expect(state.military.formations['brig_2'].morale).toBe(55);
        // RS brigade unchanged
        expect(state.military.formations['brig_3'].morale).toBe(55);
    });

    it('morale_change clamps to [0, 100]', () => {
        const state = makeState();
        state.military.formations['brig_1'].morale = 98;
        applyEventEffects(state, [{ kind: 'morale_change', faction: 'RBiH', delta: 10 }]);
        expect(state.military.formations['brig_1'].morale).toBe(100);

        state.military.formations['brig_2'].morale = 3;
        applyEventEffects(state, [{ kind: 'morale_change', faction: 'RBiH', delta: -10 }]);
        expect(state.military.formations['brig_2'].morale).toBe(0);
    });

    it('supply_delta modifies general reserve', () => {
        const state = makeState();
        applyEventEffects(state, [{ kind: 'supply_delta', faction: 'RBiH', delta: 10 }]);
        expect(state.military.general_supply_reserve!['RBiH']).toBe(60);
    });

    it('supply_delta floors at 0', () => {
        const state = makeState();
        applyEventEffects(state, [{ kind: 'supply_delta', faction: 'HRHB', delta: -100 }]);
        expect(state.military.general_supply_reserve!['HRHB']).toBe(0);
    });

    it('alliance_change clamps to [-1, 1]', () => {
        const state = makeState();
        applyEventEffects(state, [{ kind: 'alliance_change', delta: 0.8 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBe(1);

        applyEventEffects(state, [{ kind: 'alliance_change', delta: -3 }]);
        expect(state.political.war_alliance_rbih_hrhb).toBe(-1);
    });

    it('narrative has no mechanical effect', () => {
        const state = makeState();
        const before = JSON.stringify(state);
        applyEventEffects(state, [{ kind: 'narrative', text: 'Something happened.' }]);
        // Only fired_event_ids could differ; compare without it
        const after = JSON.stringify(state);
        expect(after).toBe(before);
    });

    it('cohesion_change applies to faction brigades', () => {
        const state = makeState();
        applyEventEffects(state, [{ kind: 'cohesion_change', faction: 'RBiH', delta: -10 }]);
        expect(state.military.formations['brig_1'].cohesion).toBe(60);
        expect(state.military.formations['brig_2'].cohesion).toBe(70);
        expect(state.military.formations['brig_3'].cohesion).toBe(65); // RS unchanged
    });

    it('effects applied in sorted order (deterministic)', () => {
        const state = makeState();
        // Supply delta before morale (alphabetical: 'morale_change' < 'supply_delta')
        // Application order: alliance_change, cohesion, humanitarian, morale, narrative, negotiation, patron, supply
        const effects: EventEffect[] = [
            { kind: 'supply_delta', faction: 'RBiH', delta: 5 },
            { kind: 'alliance_change', delta: 0.1 },
            { kind: 'morale_change', faction: 'RBiH', delta: 3 },
        ];
        applyEventEffects(state, effects);
        // All three applied
        expect(state.political.war_alliance_rbih_hrhb).toBeCloseTo(0.6);
        expect(state.military.formations['brig_1'].morale).toBe(63);
        expect(state.military.general_supply_reserve!['RBiH']).toBe(55);
    });
});

describe('recruitment_modifier effect (Codex/#54)', () => {
    /** Read a response option's effects directly from the canonical event data. */
    function responseEffects(eventId: string, responseId: string): EventEffect[] {
        const raw = JSON.parse(readFileSync(WAR_1992_PATH, 'utf8'));
        const events = Array.isArray(raw) ? raw : raw.events;
        const ev = events.find((e: { id: string }) => e.id === eventId);
        if (!ev) throw new Error(`event ${eventId} not found`);
        const opt = (ev.response_options ?? []).find((o: { id: string }) => o.id === responseId);
        if (!opt) throw new Error(`response ${responseId} not found on ${eventId}`);
        return (opt.effects ?? []) as EventEffect[];
    }

    for (const responseId of ['ask', 'always_allow']) {
        it(`rbih_paramilitary_policy_1992 "${responseId}" yields a finite pool_multiplier and passes validation`, () => {
            const effects = responseEffects('rbih_paramilitary_policy_1992', responseId);
            const rm = effects.find((e) => e.kind === 'recruitment_modifier');
            expect(rm, 'response must carry a recruitment_modifier effect').toBeDefined();
            // Canonical field is pool_multiplier, NOT delta (the #54 bug).
            expect((rm as { pool_multiplier?: unknown }).pool_multiplier).toBeTypeOf('number');

            const state = makeState();
            applyEventEffects(state, effects);

            const mods = state.military.recruitment_modifiers ?? [];
            expect(mods.length).toBe(1);
            expect(Number.isFinite(mods[0].pool_multiplier)).toBe(true);

            // Resulting state must serialize/validate cleanly (the bug produced a
            // non-finite pool_multiplier that validateGameState rejected).
            const result = validateGameStateShape(state);
            const recruitErrors = result.ok ? [] : result.errors.filter((e) => e.includes('recruitment_modifiers'));
            expect(recruitErrors).toEqual([]);
        });
    }

    it('clamps a non-finite pool_multiplier to identity (1.0) so malformed data cannot break serialization', () => {
        const state = makeState();
        // Simulate malformed data: applier reads `effect.pool_multiplier` which is
        // undefined when the JSON wrongly used `delta`, yielding NaN/undefined.
        const malformed = { kind: 'recruitment_modifier', faction: 'RBiH', pool_multiplier: undefined, duration_turns: 10 } as unknown as EventEffect;
        applyEventEffects(state, [malformed]);

        const mods = state.military.recruitment_modifiers ?? [];
        expect(mods.length).toBe(1);
        expect(mods[0].pool_multiplier).toBe(1.0);
        expect(Number.isFinite(mods[0].pool_multiplier)).toBe(true);

        const result = validateGameStateShape(state);
        const recruitErrors = result.ok ? [] : result.errors.filter((e) => e.includes('recruitment_modifiers'));
        expect(recruitErrors).toEqual([]);
    });
});

describe('evaluateEvents fired_event_ids', () => {
    it('once-only events tracked and prevented from re-firing', () => {
        const testEvents = [
            { id: 'test_once', trigger: { turn_min: 5, turn_max: 15, phase: 'war' as const }, effect: { kind: 'narrative' as const, text: 'Once-only event.' }, once: true },
            { id: 'test_repeatable', trigger: { turn_min: 5, turn_max: 15, phase: 'war' as const }, effect: { kind: 'narrative' as const, text: 'Repeatable event.' } },
        ];

        const state = makeState();
        const rng = () => 0.99;

        // First evaluation: both events fire
        const result1 = evaluateEvents(state, rng, 10, testEvents);
        expect(result1.fired.length).toBe(2);
        expect(state.military.fired_event_ids).toContain('test_once');

        // Second evaluation: once-only is skipped, repeatable fires again
        const result2 = evaluateEvents(state, rng, 10, testEvents);
        expect(result2.fired.length).toBe(1);
        expect(result2.fired[0].id).toBe('test_repeatable');
    });
});
