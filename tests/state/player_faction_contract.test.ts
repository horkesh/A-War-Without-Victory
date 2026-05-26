import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import { deserializeState } from '../../src/state/serialize.js';
import { validateGameStateShape } from '../../src/state/validateGameState.js';

function minimalState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const meta = {
        turn: 0,
        phase: 'war',
        referendum_held: false,
        referendum_turn: null,
        war_start_turn: null,
        peace_scheduled_referendum_turn: null,
        peace_scheduled_war_start_turn: null,
        peace_war_start_control_path: null,
        referendum_eligible_turn: null,
        referendum_deadline_turn: null,
        game_over: false,
        player_faction: 'RBiH',
    };

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta,
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            assignable_front_segments: [],
            brigade_front_assignment: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
        },
        political: {
            political_controllers: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null, last_counter_turn: {} },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
        },
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        },
        ...overrides,
    };
}

describe('player_faction loaded-state contract', () => {
    it('requires current loaded gameplay state to carry a canonical player faction', () => {
        const missing = minimalState({ meta: { ...minimalState().meta as Record<string, unknown>, player_faction: undefined } });
        const explicitNull = minimalState({ meta: { ...minimalState().meta as Record<string, unknown>, player_faction: null } });

        const missingResult = validateGameStateShape(missing, { requireVersion: CURRENT_SCHEMA_VERSION });
        const nullResult = validateGameStateShape(explicitNull, { requireVersion: CURRENT_SCHEMA_VERSION });

        expect(missingResult.ok).toBe(false);
        expect(nullResult.ok).toBe(false);
        if (!missingResult.ok) {
            expect(missingResult.errors).toContain('meta.player_faction is required and must be one of: RBiH, RS, HRHB');
        }
        if (!nullResult.ok) {
            expect(nullResult.errors).toContain('meta.player_faction is required and must be one of: RBiH, RS, HRHB');
        }
    });

    it('migrates legacy saves without player_faction through the desktop default policy', () => {
        const legacyMeta = { ...minimalState().meta as Record<string, unknown> };
        delete legacyMeta.player_faction;

        const legacy = minimalState({
            schema_version: 13,
            meta: legacyMeta,
        });

        const migrated = deserializeState(JSON.stringify(legacy));

        expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
        expect(migrated.meta.player_faction).toBe('RBiH');
    });
});
