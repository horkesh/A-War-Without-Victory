/**
 * Pipeline step execution proof — Cluster A closeout seam.
 *
 * Proves that update-stranded-brigade-lifecycle and evaluate-rupture-consequences
 * exist in the warPhases array and execute correctly when given a minimal TurnContext.
 *
 * These are NOT full-scenario integration tests. They call the real step's run()
 * from the real warPhases array, proving the step is wired into the pipeline.
 *
 * Deterministic: no Math.random(), no timestamps, no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { TurnContext, TurnReport, NamedPhase } from '../src/sim/turn_pipeline_types.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { setSpatialContextCache } from '../src/sim/turn_pipeline_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function findStep(name: string): NamedPhase {
    const step = warPhases.find(p => p.name === name);
    if (!step) throw new Error(`Step '${name}' not found in warPhases`);
    return step;
}

function makeEmptyReport(): TurnReport {
    return { seed: 'test', phases: [] };
}

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 1, seed: 'test', phase: 'war' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {} as any,
            front_posture_regions: {} as any,
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {},
        },
        displacement: {} as any,
        ...overrides,
    } as GameState;
}

function makeContext(state: GameState, report?: TurnReport): TurnContext {
    return {
        state,
        rng: () => 0.5,
        input: { seed: 'test' },
        report: report ?? makeEmptyReport(),
    };
}

// ── Step existence tests ───────────────────────────────────────────────────

describe('Pipeline step existence', () => {
    const stepNames = warPhases.map(p => p.name);

    it('update-stranded-brigade-lifecycle exists in warPhases', () => {
        expect(stepNames).toContain('update-stranded-brigade-lifecycle');
    });

    it('evaluate-rupture-consequences exists in warPhases', () => {
        expect(stepNames).toContain('evaluate-rupture-consequences');
    });

    it('update-stranded-brigade-lifecycle comes after reconcile-live-operation-truth', () => {
        const idxStranded = stepNames.indexOf('update-stranded-brigade-lifecycle');
        const idxReconcile = stepNames.indexOf('reconcile-live-operation-truth');
        expect(idxReconcile).toBeGreaterThanOrEqual(0);
        expect(idxStranded).toBeGreaterThan(idxReconcile);
    });

    it('evaluate-rupture-consequences comes after update-patron-pressure', () => {
        const idxRupture = stepNames.indexOf('evaluate-rupture-consequences');
        const idxPatron = stepNames.indexOf('update-patron-pressure');
        expect(idxPatron).toBeGreaterThanOrEqual(0);
        expect(idxRupture).toBeGreaterThan(idxPatron);
    });
});

// ── Stranded brigade lifecycle execution proof ─────────────────────────────

describe('update-stranded-brigade-lifecycle execution proof', () => {
    const step = findStep('update-stranded-brigade-lifecycle');

    it('executes without error on minimal war state (no spatial cache → early return)', async () => {
        const state = makeMinimalState();
        const context = makeContext(state);
        // No spatial context cache → step should early-return without error
        await step.run(context);
        expect(context.report.stranded_brigade_lifecycle).toBeUndefined();
    });

    it('executes without error on non-war phase (early return)', async () => {
        const state = makeMinimalState();
        state.meta.phase = 'peace';
        const context = makeContext(state);
        await step.run(context);
        expect(context.report.stranded_brigade_lifecycle).toBeUndefined();
    });

    it('detects stranded brigade and produces report with newly_stranded', async () => {
        // Setup: brigade at osid_isolated, which has no adjacency path to corps sector territory
        const state = makeMinimalState({
            meta: { turn: 10, seed: 'test', phase: 'war' },
            military: {
                formations: {
                    'bde_test_1': {
                        faction: 'RBiH',
                        kind: 'brigade',
                        status: 'active',
                        lifecycle_status: 'active',
                        location_osid: 'op:isolated:isolated_1',
                        corps_id: 'corps_1',
                        cohesion: 80,
                        morale: 70,
                        personnel: 1000,
                    } as any,
                },
                front_segments: {},
                front_posture: {} as any,
                front_posture_regions: {} as any,
                front_pressure: {},
                militia_pools: {},
                corps_front_sectors: {
                    'sector:corps_1': {
                        sector_id: 'sector:corps_1',
                        corps_id: 'corps_1',
                        faction: 'RBiH',
                        opposing_factions: ['RS'],
                        edge_ids: ['e1'],
                        sub_segments: [],
                        length_edges: 1,
                        territory_osids: ['op:tuzla:tuzla_1', 'op:tuzla:tuzla_2'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        density: 0,
                        threat_ratio: 1,
                        defensive_power: 100,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    } as any,
                },
                corps_command: {
                    'corps_1': {
                        stance: 'defend',
                        active_operations: [],
                    } as any,
                },
            } as any,
            political: {
                political_controllers: {
                    'op:isolated:isolated_1': 'RBiH',
                    'op:tuzla:tuzla_1': 'RBiH',
                    'op:tuzla:tuzla_2': 'RBiH',
                    // No adjacency connects isolated_1 to tuzla OSIDs
                },
            } as any,
        });

        const context = makeContext(state);

        // Build adjacency: tuzla_1 <-> tuzla_2, but isolated_1 has NO connections
        const adjacency = new Map<Osid, readonly Osid[]>();
        adjacency.set('op:tuzla:tuzla_1' as Osid, ['op:tuzla:tuzla_2'] as Osid[]);
        adjacency.set('op:tuzla:tuzla_2' as Osid, ['op:tuzla:tuzla_1'] as Osid[]);
        adjacency.set('op:isolated:isolated_1' as Osid, [] as Osid[]); // No neighbors

        // Inject spatial context cache so the step finds adjacency
        setSpatialContextCache(context, {
            preCombat: {
                adjacency,
                sharedBoundaryAdjacency: new Map(),
                friendlyOsidsByFaction: new Map(),
                componentsByFaction: new Map(),
                frontEdgesOsid: undefined,
                computedAtTurn: 10,
                phase: 'pre-combat',
            },
        });

        await step.run(context);

        // Verify: report should have newly_stranded with our brigade
        expect(context.report.stranded_brigade_lifecycle).toBeDefined();
        expect(context.report.stranded_brigade_lifecycle!.newly_stranded).toContain('bde_test_1');
        expect(context.report.stranded_brigade_lifecycle!.updated).toBeGreaterThan(0);

        // Verify: formation should have stranded_status = 'holding'
        const bde = state.military.formations['bde_test_1'];
        expect(bde.stranded_status).toBe('holding');
        expect(bde.stranded_since_turn).toBe(10);
    });
});

// ── Rupture consequences execution proof ───────────────────────────────────

describe('evaluate-rupture-consequences execution proof', () => {
    const step = findStep('evaluate-rupture-consequences');

    it('executes without error on minimal war state (no negotiation state)', async () => {
        const state = makeMinimalState();
        const context = makeContext(state);
        await step.run(context);
        // No negotiation state → early return, no crash
    });

    it('executes without error on non-war phase (early return)', async () => {
        const state = makeMinimalState();
        state.meta.phase = 'peace';
        const context = makeContext(state);
        await step.run(context);
    });

    it('does NOT record rupture when preconditions are not met (no enclave formed)', async () => {
        const state = makeMinimalState({
            meta: { turn: 150, seed: 'test', phase: 'war' },
            military: {
                formations: {},
                front_segments: {},
                front_posture: {} as any,
                front_posture_regions: {} as any,
                front_pressure: {},
                militia_pools: {},
                negotiation: {
                    capital: {},
                    patron_relationships: {},
                    peace_plan_history: [],
                    rupture_consequences: [],
                },
                event_flags: {
                    // srebrenica_enclave_formed NOT set
                },
            } as any,
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RS',
                },
            } as any,
        });

        const context = makeContext(state);
        await step.run(context);

        expect(state.military.negotiation!.rupture_consequences).toEqual([]);
    });

    it('records srebrenica_genocide_1995 when all preconditions met', async () => {
        const state = makeMinimalState({
            meta: { turn: 160, seed: 'test', phase: 'war' },
            military: {
                formations: {},
                front_segments: {},
                front_posture: {} as any,
                front_posture_regions: {} as any,
                front_pressure: {},
                militia_pools: {},
                negotiation: {
                    capital: {},
                    patron_relationships: {},
                    peace_plan_history: [],
                    rupture_consequences: [],
                },
                event_flags: {
                    srebrenica_enclave_formed: true,
                },
            } as any,
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RS',
                },
            } as any,
        });

        const context = makeContext(state);
        await step.run(context);

        const ruptures = state.military.negotiation!.rupture_consequences!;
        expect(ruptures).toHaveLength(1);
        expect(ruptures[0].id).toBe('srebrenica_genocide_1995');
        expect(ruptures[0].recorded_turn).toBe(160);
        expect(ruptures[0].perpetrator_faction).toBe('RS');
        expect(ruptures[0].condemnation_flag).toBe('genocide_condemnation');
    });

    it('is idempotent — does not double-record', async () => {
        const state = makeMinimalState({
            meta: { turn: 160, seed: 'test', phase: 'war' },
            military: {
                formations: {},
                front_segments: {},
                front_posture: {} as any,
                front_posture_regions: {} as any,
                front_pressure: {},
                militia_pools: {},
                negotiation: {
                    capital: {},
                    patron_relationships: {},
                    peace_plan_history: [],
                    rupture_consequences: [{
                        id: 'srebrenica_genocide_1995',
                        recorded_turn: 160,
                        perpetrator_faction: 'RS',
                        description: 'Fall of the Srebrenica safe area and subsequent genocide of Bosniak men and boys',
                        condemnation_flag: 'genocide_condemnation',
                    }],
                },
                event_flags: {
                    srebrenica_enclave_formed: true,
                },
            } as any,
            political: {
                political_controllers: {
                    'op:srebrenica:srebrenica_2': 'RS',
                },
            } as any,
        });

        const context = makeContext(state);
        await step.run(context);

        // Still exactly 1 — not doubled
        expect(state.military.negotiation!.rupture_consequences).toHaveLength(1);
    });
});
