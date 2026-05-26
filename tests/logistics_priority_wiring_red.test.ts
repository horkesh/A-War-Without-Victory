import { describe, expect, it } from 'vitest';
import type { FrontRegionsFile } from '../src/map/front_regions.js';
import { getSupplyMult } from '../src/sim/combat/combat_math.js';
import { getFormationSupplyMultiplier } from '../src/state/formation_fatigue.js';
import { CURRENT_SCHEMA_VERSION, type FormationState, type GameState } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

const EDGE_ID = 'alpha__bravo';
const REGION_ID = 'test_region';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 12,
            seed: 'logistics-priority-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
            },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            logistics_priority: {},
        } as GameState['military'],
        political: {
            political_controllers: {},
            capacity_modifiers: {
                by_sid: {
                    alpha: { authority_mult: 1, cohesion_mult: 1, supply_mult: 1, pressure_cap_mult: 1 },
                    bravo: { authority_mult: 1, cohesion_mult: 1, supply_mult: 1, pressure_cap_mult: 1 },
                },
            },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

function makeFormation(): FormationState {
    return {
        id: 'arbih_test_brigade',
        name: 'ARBiH Test Brigade',
        faction: 'RBiH',
        type: 'brigade',
        status: 'active',
        personnel: 1000,
        equipment: {},
        location_osid: 'test_osid',
        assignment: { kind: 'edge', edge_id: EDGE_ID },
    } as unknown as FormationState;
}

function makeRegionFormation(): FormationState {
    return {
        ...makeFormation(),
        assignment: { kind: 'region', region_id: REGION_ID },
    } as unknown as FormationState;
}

function makeSupplyReport(): SupplyStateByOsidReport {
    return {
        schema: 1,
        turn: 12,
        factions: [
            {
                faction_id: 'RBiH',
                by_osid: [{ osid: 'test_osid', state: 'adequate' }],
            },
        ],
    };
}

describe('logistics priority wiring', () => {
    it('ignores the orphan top-level logistics priority path', () => {
        const state = makeState() as GameState & { logistics_priority?: Record<string, Record<string, number>> };
        state.logistics_priority = { RBiH: { [EDGE_ID]: 1.5 } };

        expect(getSupplyMult(makeFormation(), state, 'attack', makeSupplyReport())).toBe(1);
    });

    it('applies canonical logistics priority in combat supply math', () => {
        const state = makeState();
        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 1.5 } };

        expect(getSupplyMult(makeFormation(), state, 'attack', makeSupplyReport())).toBe(1.5);
    });

    it('keeps the existing formation fatigue canonical logistics priority path alive', () => {
        const state = makeState();
        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 1.5 } };

        expect(getFormationSupplyMultiplier(
            state,
            makeFormation(),
            { schema: 1, turn: 12, regions: [{ region_id: REGION_ID, edge_ids: [EDGE_ID], side_pair: 'RBiH--RS', settlements: [], active_edge_count: 1 }] },
            [],
        )).toBe(1.5);
    });

    it('clamps logistics priority while leaving default priority byte-stable', () => {
        const state = makeState();
        const formation = makeFormation();

        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 0.1 } };
        expect(getSupplyMult(formation, state, 'attack', makeSupplyReport())).toBe(0.5);

        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 5 } };
        expect(getSupplyMult(formation, state, 'attack', makeSupplyReport())).toBe(1.5);

        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 1 } };
        expect(getSupplyMult(formation, state, 'attack', makeSupplyReport())).toBe(1);

        state.military.logistics_priority = {};
        expect(getSupplyMult(formation, state, 'attack', makeSupplyReport())).toBe(1);
    });

    it('applies boosted edge priorities to region-assigned formations only when the full region is boosted', () => {
        const state = makeState();
        const frontRegions: FrontRegionsFile = {
            schema: 1,
            turn: 12,
            regions: [{ region_id: REGION_ID, edge_ids: [EDGE_ID, 'bravo__charlie'], side_pair: 'RBiH--RS', settlements: [], active_edge_count: 2 }],
        };

        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 1.5 } };
        expect(getFormationSupplyMultiplier(state, makeRegionFormation(), frontRegions, [])).toBe(1);

        state.military.logistics_priority = { RBiH: { [EDGE_ID]: 1.5, bravo__charlie: 1.5 } };
        expect(getFormationSupplyMultiplier(state, makeRegionFormation(), frontRegions, [])).toBe(1.5);
    });
});
