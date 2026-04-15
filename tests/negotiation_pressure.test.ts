import { describe, expect, it } from 'vitest';
import type { FrontEdge } from '../src/map/front_edges.js';
import type { ExhaustionStats } from '../src/state/exhaustion.js';
import type { FormationFatigueStepReport } from '../src/state/formation_fatigue.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { MilitiaFatigueStepReport } from '../src/state/militia_fatigue.js';
import { updateNegotiationPressure } from '../src/state/negotiation_pressure.js';

function createTestState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 5, seed: 'test-seed' },
  factions: [
            {
                id: 'faction_a',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 },
                areasOfResponsibility: ['sid1', 'sid2'],
                supply_sources: [],
                negotiation: { pressure: 5, last_change_turn: 3, capital: 0, spent_total: 0, last_capital_change_turn: null }
            },
            {
                id: 'faction_b',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 },
                areasOfResponsibility: ['sid3', 'sid4'],
                supply_sources: [],
                negotiation: { pressure: 10, last_change_turn: 4, capital: 0, spent_total: 0, last_capital_change_turn: null }
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {} as any, displacement: {} as any
};
}

describe('negotiation pressure', () => {
it('negotiation pressure: increases by exhaustion delta', () => {
    const state = createTestState();
    const derivedFrontEdges: FrontEdge[] = [];

    const exhaustionReport: ExhaustionStats = {
        per_faction: [
            { faction_id: 'faction_a', exhaustion_before: 10, exhaustion_after: 13, delta: 3, work_supplied: 20, work_unsupplied: 5 },
            { faction_id: 'faction_b', exhaustion_before: 20, exhaustion_after: 20, delta: 0, work_supplied: 0, work_unsupplied: 0 }
        ]
    };

    const report = updateNegotiationPressure(state, derivedFrontEdges, exhaustionReport, undefined, undefined, undefined);

    expect(report.per_faction.length).toBe(2);
    const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
    expect(factionA).toBeTruthy();
    expect(factionA?.pressure_before).toBe(5);
    expect(factionA?.pressure_after).toBe(8); // 5 + 3 (exhaustion delta)
    expect(factionA?.components.exhaustion_delta).toBe(3);
    expect(factionA?.components.instability_breaches).toBe(0);
    expect(factionA?.components.supply_formations).toBe(0);
    expect(factionA?.components.supply_militia).toBe(0);
    expect(factionA?.components.sustainability_collapse).toBe(0);
    expect(state.factions[0].negotiation?.pressure).toBe(8);
    expect(state.factions[0].negotiation?.last_change_turn).toBe(5);

    const factionB = report.per_faction.find((f) => f.faction_id === 'faction_b');
    expect(factionB).toBeTruthy();
    expect(factionB?.pressure_before).toBe(10);
    expect(factionB?.pressure_after).toBe(10); // 10 + 0 (no exhaustion delta)
    expect(factionB?.components.exhaustion_delta).toBe(0);
});

it('negotiation pressure: breach count contributes with cap', () => {
    const state = createTestState();
    // Set up front pressure to create breaches
    state.military.front_pressure = {
        edge1: { edge_id: 'edge1', value: 25, max_abs: 25, last_updated_turn: 5 },
        edge2: { edge_id: 'edge2', value: -22, max_abs: 22, last_updated_turn: 5 },
        edge3: { edge_id: 'edge3', value: 21, max_abs: 21, last_updated_turn: 5 },
        edge4: { edge_id: 'edge4', value: 23, max_abs: 23, last_updated_turn: 5 },
        edge5: { edge_id: 'edge5', value: 24, max_abs: 24, last_updated_turn: 5 }
    };
    state.military.front_segments = {
        edge1: { edge_id: 'edge1', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 },
        edge2: { edge_id: 'edge2', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 },
        edge3: { edge_id: 'edge3', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 },
        edge4: { edge_id: 'edge4', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 },
        edge5: { edge_id: 'edge5', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 }
    };

    const derivedFrontEdges: FrontEdge[] = [
        { edge_id: 'edge1', a: 'sid1', b: 'sid3', side_a: 'faction_a', side_b: 'faction_b' },
        { edge_id: 'edge2', a: 'sid2', b: 'sid4', side_a: 'faction_a', side_b: 'faction_b' },
        { edge_id: 'edge3', a: 'sid1', b: 'sid4', side_a: 'faction_a', side_b: 'faction_b' },
        { edge_id: 'edge4', a: 'sid2', b: 'sid3', side_a: 'faction_a', side_b: 'faction_b' },
        { edge_id: 'edge5', a: 'sid1', b: 'sid3', side_a: 'faction_a', side_b: 'faction_b' }
    ];

    const report = updateNegotiationPressure(state, derivedFrontEdges, undefined, undefined, undefined, undefined);

    const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
    expect(factionA).toBeTruthy();
    // faction_a is on side_a of 5 breaches, but cap is 3
    expect(factionA?.components.instability_breaches).toBe(3);

    const factionB = report.per_faction.find((f) => f.faction_id === 'faction_b');
    expect(factionB).toBeTruthy();
    // faction_b is on side_b of 5 breaches, but cap is 3
    expect(factionB?.components.instability_breaches).toBe(3);
});

it('negotiation pressure: unsupplied formations contribute with floor', () => {
    const state = createTestState();
    const derivedFrontEdges: FrontEdge[] = [];

    const formationFatigueReport: FormationFatigueStepReport = {
        by_formation: [],
        by_faction: [
            { faction_id: 'faction_a', formations_active: 12, formations_supplied: 7, formations_unsupplied: 5, total_fatigue: 10, total_commit_points: 5000 },
            { faction_id: 'faction_b', formations_active: 8, formations_supplied: 3, formations_unsupplied: 5, total_fatigue: 8, total_commit_points: 3000 }
        ]
    };

    const report = updateNegotiationPressure(state, derivedFrontEdges, undefined, formationFatigueReport, undefined, undefined);

    const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
    expect(factionA).toBeTruthy();
    expect(factionA?.components.supply_formations).toBe(1); // floor(5/5) = 1

    const factionB = report.per_faction.find((f) => f.faction_id === 'faction_b');
    expect(factionB).toBeTruthy();
    expect(factionB?.components.supply_formations).toBe(1); // floor(5/5) = 1
});

it('negotiation pressure: unsupplied militia pools contribute with floor', () => {
    const state = createTestState();
    const derivedFrontEdges: FrontEdge[] = [];

    const militiaFatigueReport: MilitiaFatigueStepReport = {
        by_municipality: [],
        by_faction: [
            { faction_id: 'faction_a', pools_total: 15, pools_supplied: 5, pools_unsupplied: 10, total_fatigue: 20 },
            { faction_id: 'faction_b', pools_total: 8, pools_supplied: 3, pools_unsupplied: 5, total_fatigue: 8 }
        ]
    };

    const report = updateNegotiationPressure(state, derivedFrontEdges, undefined, undefined, militiaFatigueReport, undefined);

    const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
    expect(factionA).toBeTruthy();
    expect(factionA?.components.supply_militia).toBe(1); // floor(10/10) = 1

    const factionB = report.per_faction.find((f) => f.faction_id === 'faction_b');
    expect(factionB).toBeTruthy();
    expect(factionB?.components.supply_militia).toBe(0); // floor(5/10) = 0
});

it('negotiation pressure: monotonic non-decreasing', () => {
    const state = createTestState();
    state.factions[0].negotiation = { pressure: 10, last_change_turn: 3, capital: 0, spent_total: 0, last_capital_change_turn: null };
    const derivedFrontEdges: FrontEdge[] = [];

    // Even with no inputs, pressure should not decrease
    const report = updateNegotiationPressure(state, derivedFrontEdges, undefined, undefined, undefined, undefined);

    const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
    expect(factionA).toBeTruthy();
    expect(factionA?.pressure_after).toBe(10); // unchanged, not decreased
    expect(state.factions[0].negotiation?.pressure).toBe(10);
});

it('negotiation pressure: all components combined', () => {
    const state = createTestState();
    state.factions[0].negotiation = { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null };
    const derivedFrontEdges: FrontEdge[] = [];

    const exhaustionReport: ExhaustionStats = {
        per_faction: [{ faction_id: 'faction_a', exhaustion_before: 10, exhaustion_after: 12, delta: 2, work_supplied: 15, work_unsupplied: 5 }]
    };

    const formationFatigueReport: FormationFatigueStepReport = {
        by_formation: [],
        by_faction: [{ faction_id: 'faction_a', formations_active: 10, formations_supplied: 5, formations_unsupplied: 5, total_fatigue: 5, total_commit_points: 5000 }]
    };

    const militiaFatigueReport: MilitiaFatigueStepReport = {
        by_municipality: [],
        by_faction: [{ faction_id: 'faction_a', pools_total: 10, pools_supplied: 0, pools_unsupplied: 10, total_fatigue: 10 }]
    };

    // Set up 2 breaches for faction_a
    state.military.front_pressure = {
        edge1: { edge_id: 'edge1', value: 25, max_abs: 25, last_updated_turn: 5 },
        edge2: { edge_id: 'edge2', value: 22, max_abs: 22, last_updated_turn: 5 }
    };
    state.military.front_segments = {
        edge1: { edge_id: 'edge1', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 },
        edge2: { edge_id: 'edge2', active: true, created_turn: 1, since_turn: 1, last_active_turn: 5, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 }
    };
    const derivedFrontEdgesWithBreaches: FrontEdge[] = [
        { edge_id: 'edge1', a: 'sid1', b: 'sid3', side_a: 'faction_a', side_b: 'faction_b' },
        { edge_id: 'edge2', a: 'sid2', b: 'sid4', side_a: 'faction_a', side_b: 'faction_b' }
    ];

    const report = updateNegotiationPressure(
        state,
        derivedFrontEdgesWithBreaches,
        exhaustionReport,
        formationFatigueReport,
        militiaFatigueReport,
        undefined
    );

    const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
    expect(factionA).toBeTruthy();
    expect(factionA?.components.exhaustion_delta).toBe(2);
    expect(factionA?.components.instability_breaches).toBe(2); // 2 breaches, under cap
    expect(factionA?.components.supply_formations).toBe(1); // floor(5/5) = 1
    expect(factionA?.components.supply_militia).toBe(1); // floor(10/10) = 1
    expect(factionA?.components.sustainability_collapse).toBe(0);
    expect(factionA?.total_increment).toBe(6); // 2 + 2 + 1 + 1 + 0
    expect(factionA?.pressure_after).toBe(6); // 0 + 6
    expect(state.factions[0].negotiation?.last_change_turn).toBe(5);
});

it('negotiation pressure: determinism across identical runs', () => {
    const state1 = createTestState();
    const state2 = createTestState();
    const derivedFrontEdges: FrontEdge[] = [];

    const exhaustionReport: ExhaustionStats = {
        per_faction: [{ faction_id: 'faction_a', exhaustion_before: 10, exhaustion_after: 13, delta: 3, work_supplied: 20, work_unsupplied: 5 }]
    };

    const report1 = updateNegotiationPressure(state1, derivedFrontEdges, exhaustionReport, undefined, undefined, undefined);
    const report2 = updateNegotiationPressure(state2, derivedFrontEdges, exhaustionReport, undefined, undefined, undefined);

    expect(report1.per_faction.length).toBe(report2.per_faction.length);
    for (let i = 0; i < report1.per_faction.length; i += 1) {
        const f1 = report1.per_faction[i];
        const f2 = report2.per_faction[i];
        expect(f1.faction_id).toBe(f2.faction_id);
        expect(f1.pressure_before).toBe(f2.pressure_before);
        expect(f1.pressure_after).toBe(f2.pressure_after);
        expect(f1.delta).toBe(f2.delta);
        expect(f1.components.exhaustion_delta).toBe(f2.components.exhaustion_delta);
        expect(f1.components.instability_breaches).toBe(f2.components.instability_breaches);
        expect(f1.components.supply_formations).toBe(f2.components.supply_formations);
        expect(f1.components.supply_militia).toBe(f2.components.supply_militia);
        expect(f1.components.sustainability_collapse).toBe(f2.components.sustainability_collapse);
    }
});
});
