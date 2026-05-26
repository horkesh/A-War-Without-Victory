import { describe, expect, test } from 'vitest';
import {
    ALLIANCE_FLOOR_BEFORE_WAR,
    DEFAULT_INIT_ALLIANCE,
    ensureRbihHrhbState,
    mapPhase0RelationshipToAlliance
} from '../src/sim/early_war/alliance_update.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(phase0Value?: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'phase0-handoff', phase: 'war', referendum_held: true, war_start_turn: 0 },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as GameState['military'],
        political: {
            political_controllers: {},
            ...(phase0Value === undefined
                ? {}
                : { phase0_relationships: { rbih_rs: 0.5, rbih_hrhb: phase0Value } })
        } as GameState['political'],
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        }
    } as GameState;
}

describe('Phase 0 RBiH-HRHB alliance handoff', () => {
    test('maps perfect Phase 0 relationship to default initial alliance', () => {
        expect(mapPhase0RelationshipToAlliance(1)).toBe(DEFAULT_INIT_ALLIANCE);
    });

    test('clamps collapsed Phase 0 relationship to pre-war floor', () => {
        expect(mapPhase0RelationshipToAlliance(0)).toBe(ALLIANCE_FLOOR_BEFORE_WAR);
    });

    test('maps partial Phase 0 relationship between floor and default', () => {
        const mapped = mapPhase0RelationshipToAlliance(0.5);
        expect(mapped).toBeGreaterThan(ALLIANCE_FLOOR_BEFORE_WAR);
        expect(mapped).toBeLessThan(DEFAULT_INIT_ALLIANCE);
    });

    test('ensureRbihHrhbState derives initial alliance from phase0_relationships.rbih_hrhb', () => {
        const state = makeState(0.5);
        ensureRbihHrhbState(state);

        expect(state.political.war_alliance_rbih_hrhb).toBe(mapPhase0RelationshipToAlliance(0.5));
    });

    test('missing phase0 relationship preserves existing default behavior', () => {
        const state = makeState();
        ensureRbihHrhbState(state);

        expect(state.political.war_alliance_rbih_hrhb).toBe(DEFAULT_INIT_ALLIANCE);
    });
});
