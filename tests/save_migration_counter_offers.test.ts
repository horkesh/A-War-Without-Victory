import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

function legacySave(): any {
    return {
        schema_version: 12,
        meta: {
            turn: 70,
            phase: 'war',
            seed: 'counter-offer-migration',
            game_over: false,
            referendum_held: false,
            referendum_turn: null,
            war_start_turn: 0,
            peace_scheduled_referendum_turn: null,
            peace_scheduled_war_start_turn: null,
            peace_war_start_control_path: null,
            referendum_eligible_turn: null,
            referendum_deadline_turn: null,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            formations: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
            },
        },
        political: {
            political_controllers: {},
            negotiation_status: {
                ceasefire_active: false,
                ceasefire_since_turn: null,
                last_offer_turn: null,
            },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            municipalities: {},
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        },
    };
}

describe('counter-offer save migration', () => {
    it('moves old saves to current schema and materializes neutral counter-offer defaults', () => {
        const hydrated = deserializeState(JSON.stringify(legacySave()));

        expect(CURRENT_SCHEMA_VERSION).toBe(21);
        expect(hydrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(hydrated.meta.player_faction).toBe('RBiH');
        expect(hydrated.military.negotiation?.pending_counter_offers).toEqual([]);
        expect(hydrated.political.negotiation_status?.last_counter_turn).toEqual({});
    });

    it('round-trips migrated counter-offer fields byte-stably', () => {
        const hydrated = deserializeState(JSON.stringify(legacySave()));
        const once = serializeState(hydrated);
        const twice = serializeState(deserializeState(once));

        expect(twice).toBe(once);
    });
});
