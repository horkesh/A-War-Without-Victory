import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyMigrations, getLatestSchemaVersion } from '../src/state/save_migration.js';

function minimalLegacyState(schemaVersion = 2): any {
    return {
        schema_version: schemaVersion,
        meta: {
            turn: 5,
            seed: 'save-migration-versioned-steps',
        },
        factions: [
            {
                id: 'ARBiH',
                profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 },
                areasOfResponsibility: [],
            },
        ],
        military: {
            front_segments: {
                fs1: {},
            },
            formations: {
                brigade_1: {
                    id: 'brigade_1',
                    name: '1st Brigade',
                    faction: 'ARBiH',
                    personnel: 100,
                },
            },
            militia_pools: {
                'mun1:ARBiH': {
                    mun_id: 'mun1',
                    faction: 'ARBiH',
                    available: 4,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 0,
                },
            },
        },
        political: {
            political_controllers: {},
        },
        displacement: {},
    };
}

describe('versioned save migration steps', () => {
    it('bumps GameState schema to the latest registered migration', () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(getLatestSchemaVersion());
        expect(getLatestSchemaVersion()).toBe(13);
    });

    it('materializes legacy defaults through versioned registry steps', () => {
        const state = minimalLegacyState();

        applyMigrations(state);

        expect(state.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(state.meta.referendum_held).toBe(false);
        expect(state.meta.game_over).toBe(false);
        expect(state.factions[0].id).toBe('RBiH');
        expect(state.factions[0].declaration_pressure).toBe(0);
        expect(state.factions[0].negotiation.capital).toBe(0);
        expect(state.military.theatres).toEqual({});
        expect(state.military.assignable_front_segments).toEqual([]);
        expect(state.military.front_segments.fs1.active_streak).toBe(0);
        expect(state.military.formations.brigade_1.kind).toBe('brigade');
        expect(state.military.formations.brigade_1.force_label).toBe('ARBiH');
        expect(state.military.militia_pools['mun1:ARBiH'].faction).toBe('RBiH');
        expect(state.military.militia_pools['mun1:ARBiH'].fatigue).toBe(0);
        expect(state.political.negotiation_status).toEqual({
            ceasefire_active: false,
            ceasefire_since_turn: null,
            last_offer_turn: null,
            last_counter_turn: {},
        });
        expect(state.military.negotiation.pending_counter_offers).toEqual([]);
        expect(state.political.supply_rights).toEqual({ corridors: [] });
        expect(state.displacement.displacement_event_log).toEqual([]);
        expect(state.displacement.displacement_humanitarian_aggregates).toEqual({});
    });
});
