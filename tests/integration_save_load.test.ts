import { describe, it, expect } from 'vitest';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyMigrations, getLatestSchemaVersion } from '../src/state/save_migration.js';
import type { GameState } from '../src/state/game_state.js';

/**
 * Minimal fixture matching GameState shape. Uses serializeGameState (no validation)
 * for round-trip testing since serializeState/deserializeState require full state validation.
 */
function makeFullFixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 12, seed: 'integration-save-load', phase: 'war', player_faction: 'RBiH', decision_mode: 'historical' } as any,
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0.5, legitimacy: 0.5, control: 0.5, logistics: 0.5, exhaustion: 0.1 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 3,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
            {
                id: 'RS',
                profile: { authority: 0.6, legitimacy: 0.4, control: 0.6, logistics: 0.7, exhaustion: 0.2 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 3,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
            {
                id: 'HRHB',
                profile: { authority: 0.4, legitimacy: 0.5, control: 0.4, logistics: 0.5, exhaustion: 0.05 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 2,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
        ],
        military: {
            formations: {
                'brig_test': {
                    id: 'brig_test',
                    faction: 'RBiH',
                    force_label: 'ARBiH',
                    name: 'Test Brigade',
                    created_turn: 0,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    readiness: 'active',
                    cohesion: 60,
                    morale: 60,
                    activation_gated: false,
                    activation_turn: null,
                    ops: { fatigue: 0, last_supplied_turn: null },
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {
                'op:sarajevo:sarajevo_1': 'RBiH',
                'op:banja-luka:banja_luka_2': 'RS',
            },
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
        },
        displacement: {
            displacement_event_log: [],
        },
    } as unknown as GameState;
}

describe('save/load integration', () => {
    it('serializeGameState -> JSON.parse round-trip preserves state identity', () => {
        const state = makeFullFixture();
        const serialized = serializeGameState(state, 2);
        const restored = JSON.parse(serialized);

        expect(restored.meta.turn).toBe(state.meta.turn);
        expect(restored.meta.seed).toBe(state.meta.seed);
        expect(restored.factions.length).toBe(state.factions.length);
        expect(restored.factions[0].id).toBe('RBiH');
        expect(restored.factions[1].id).toBe('RS');
        expect(restored.factions[2].id).toBe('HRHB');
        expect(restored.political.political_controllers).toEqual(
            (state as any).political.political_controllers
        );
        expect(Object.keys(restored.military.formations)).toEqual(
            Object.keys((state as any).military.formations)
        );
        expect(restored.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('re-serializing a parsed state produces byte-identical output', () => {
        const state = makeFullFixture();
        const serialized1 = serializeGameState(state, 2);
        const restored = JSON.parse(serialized1);
        const serialized2 = serializeGameState(restored, 2);
        expect(serialized1).toBe(serialized2);
    });

    it('applyMigrations brings old schema to current version', () => {
        const oldState = {
            schema_version: 0,
            military: {
                enclave_resilience: {
                    sarajevo: { resilience: 20, isolation_turns: 5, hardening_active: false },
                },
            },
        } as any;

        const applied = applyMigrations(oldState);
        expect(applied).toBeGreaterThan(0);
        expect(oldState.schema_version).toBe(getLatestSchemaVersion());
    });

    it('current-version state gets zero migrations applied', () => {
        const currentState = {
            schema_version: getLatestSchemaVersion(),
            military: {},
        } as any;

        const applied = applyMigrations(currentState);
        expect(applied).toBe(0);
    });
});
