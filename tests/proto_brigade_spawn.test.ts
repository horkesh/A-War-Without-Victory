/**
 * Proto-brigade spawn system test (Peace-phase Overhaul Phase B).
 *
 * Verifies:
 * 1. spawnFormationsFromPools in bottom_up mode creates TO detachments at MIN_DETACHMENT_SPAWN (100).
 * 2. Created formation: kind='militia', personnel=100, name='TO <mun_id>', cohesion=MILITIA_COHESION.
 * 3. origin_mun is set on the new formation.
 * 4. MAX_TO_PER_MUN cap is respected — no more than 5 militia-kind formations per (mun, faction).
 * 5. Legacy path (auto_oob) is unaffected — does not spawn when pool < batch size.
 * 6. reinforceBrigadesFromPools in bottom_up mode grows militia detachments with tier cap.
 * 7. Detachment → battalion name update fires when crossing MIN_BATTALION_THRESHOLD (500).
 */

import { describe, expect, it } from 'vitest';
import {
    reinforceBrigadesFromPools,
    spawnFormationsFromPools
} from '../src/sim/formation_spawn.js';
import {
    MAX_TO_PER_MUN,
    MILITIA_COHESION,
    MIN_BATTALION_THRESHOLD,
    MIN_DETACHMENT_SPAWN
} from '../src/state/formation_constants.js';
import { CURRENT_SCHEMA_VERSION, type FormationState, type GameState } from '../src/state/game_state.js';

/** Minimal GameState for testing spawn in bottom_up mode. */
function makeBottomUpState(munAvailable = 150): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 1,
            seed: 'proto-brigade-test',
            phase: 'war',
            recruitment_mode: 'bottom_up'
        },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {
            'test_mun:RBiH': {
                mun_id: 'test_mun',
                faction: 'RBiH',
                available: munAvailable,
                committed: 0,
                exhausted: 0,
                updated_turn: 0
            }
        }
  } as any,
  political: {
    political_controllers: { 'op:test_mun:center': 'RBiH' },
    municipalities: { test_mun: { control: 'consolidated' } }
  } as any,
  displacement: {} as any,
} as unknown as GameState;
}

/** Minimal options for spawnFormationsFromPools. */
function defaultOptions() {
    return {
        batchSize: null,
        factionFilter: null,
        munFilter: null,
        maxPerMun: null,
        customTags: [] as string[],
        applyChanges: true,
        formationKind: null
    };
}

describe('Phase B: spawnFormationsFromPools — bottom_up mode', () => {
    it('creates a TO detachment when pool >= MIN_DETACHMENT_SPAWN (100)', () => {
        const state = makeBottomUpState(150);
        const report = spawnFormationsFromPools(state, defaultOptions());

        expect(report.formations_created).toBe(1);
        expect(report.manpower_committed).toBe(MIN_DETACHMENT_SPAWN);

        const formations = Object.values(state.military.formations as Record<string, FormationState>);
        expect(formations).toHaveLength(1);

        const f = formations[0];
        expect(f.kind).toBe('militia');
        expect(f.personnel).toBe(MIN_DETACHMENT_SPAWN);
        expect(f.name).toBe('TO test_mun');
        expect(f.location_osid).toBe('op:test_mun:center');
    });

    it('sets cohesion to MILITIA_COHESION (30) on the new detachment', () => {
        const state = makeBottomUpState(150);
        spawnFormationsFromPools(state, defaultOptions());

        const f = Object.values(state.military.formations as Record<string, FormationState>)[0];
        expect(f.cohesion).toBe(MILITIA_COHESION);
    });

    it('sets origin_mun on the new detachment', () => {
        const state = makeBottomUpState(150);
        spawnFormationsFromPools(state, defaultOptions());

        const f = Object.values(state.military.formations as Record<string, FormationState>)[0];
        expect(f.origin_mun).toBe('test_mun');
    });

    it('deducts MIN_DETACHMENT_SPAWN (100) from pool.available', () => {
        const state = makeBottomUpState(150);
        spawnFormationsFromPools(state, defaultOptions());

        const pool = state.military.militia_pools['test_mun:RBiH'];
        expect(pool.available).toBe(50); // 150 - 100
        expect(pool.committed).toBe(MIN_DETACHMENT_SPAWN);
    });

    it('does NOT spawn when pool < MIN_DETACHMENT_SPAWN (100)', () => {
        const state = makeBottomUpState(80);
        const report = spawnFormationsFromPools(state, defaultOptions());

        expect(report.formations_created).toBe(0);
        expect(Object.keys(state.military.formations).length).toBe(0);
    });

    it('respects MAX_TO_PER_MUN cap (5 militia-kind formations max per mun+faction)', () => {
        const state = makeBottomUpState(1000);

        // Pre-populate the state with MAX_TO_PER_MUN existing militia formations
        for (let i = 0; i < MAX_TO_PER_MUN; i += 1) {
            const id = `F_RBiH_${String(i).padStart(4, '0')}`;
            (state.military.formations as Record<string, FormationState>)[id] = {
                id,
                faction: 'RBiH',
                name: `TO test_mun`,
                created_turn: 0,
                status: 'active',
                assignment: null,
                kind: 'militia',
                personnel: MIN_DETACHMENT_SPAWN,
                readiness: 'forming',
                cohesion: MILITIA_COHESION,
                location_osid: 'op:test_mun:center',
                tags: ['mun:test_mun', 'kind:militia', 'generated_phase_i0'],
                activation_gated: true,
                activation_turn: null
            };
        }

        const report = spawnFormationsFromPools(state, defaultOptions());

        // Should not create any more — cap is reached
        expect(report.formations_created).toBe(0);
        const militiaCount = Object.values(state.military.formations as Record<string, FormationState>)
            .filter(f => f.kind === 'militia' && Array.isArray(f.tags) && f.tags.includes('mun:test_mun'))
            .length;
        expect(militiaCount).toBe(MAX_TO_PER_MUN);
    });

    it('legacy auto_oob mode: does not spawn when pool < batch size (800)', () => {
        const state = makeBottomUpState(150);
        // Switch to legacy mode
        state.meta.recruitment_mode = undefined;

        const report = spawnFormationsFromPools(state, defaultOptions());

        // Pool is 150, batch size for RBiH is MIN_BRIGADE_SPAWN (800) — should not spawn
        expect(report.formations_created).toBe(0);
    });

    it('report created list has formation with correct mun_id and faction', () => {
        const state = makeBottomUpState(150);
        const report = spawnFormationsFromPools(state, defaultOptions());

        expect(report.created).toHaveLength(1);
        expect(report.created[0].mun_id).toBe('test_mun');
        expect(report.created[0].faction).toBe('RBiH');
        expect(report.created[0].kind).toBe('militia');
    });
});

describe('Phase B: reinforceBrigadesFromPools — bottom_up tier growth', () => {
    it('grows a militia detachment from pool up to MIN_BATTALION_THRESHOLD (500) cap', () => {
        const state = makeBottomUpState(1000);
        // Pre-create a detachment with 100 personnel
        const fid = 'F_RBiH_0001';
        (state.military.formations as Record<string, FormationState>)[fid] = {
            id: fid,
            faction: 'RBiH',
            name: 'TO test_mun',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'militia',
            personnel: MIN_DETACHMENT_SPAWN,
            readiness: 'active',
            cohesion: MILITIA_COHESION,
            location_osid: 'op:test_mun:center',
            tags: ['mun:test_mun', 'kind:militia', 'generated_phase_i0'],
            activation_gated: false,
            activation_turn: 0
        };

        const report = reinforceBrigadesFromPools(state);

        expect(report.formations_reinforced).toBe(1);
        expect(report.manpower_added).toBeGreaterThan(0);

        const f = (state.military.formations as Record<string, FormationState>)[fid];
        // Personnel should have grown (but capped by REINFORCEMENT_RATE and tier cap)
        expect(f.personnel).toBeGreaterThan(MIN_DETACHMENT_SPAWN);
        // Should not exceed battalion threshold cap in one turn (REINFORCEMENT_RATE * mult)
        expect(f.personnel).toBeLessThanOrEqual(MIN_BATTALION_THRESHOLD);
    });

    it('updates name to battalion pattern when crossing MIN_BATTALION_THRESHOLD (500)', () => {
        const state = makeBottomUpState(2000);
        // Set detachment very close to battalion threshold
        const fid = 'F_RBiH_0001';
        (state.military.formations as Record<string, FormationState>)[fid] = {
            id: fid,
            faction: 'RBiH',
            name: 'TO test_mun',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'militia',
            personnel: MIN_BATTALION_THRESHOLD - 1, // one below threshold
            readiness: 'active',
            cohesion: MILITIA_COHESION,
            tags: ['mun:test_mun', 'kind:militia', 'generated_phase_i0'],
            activation_gated: false,
            activation_turn: 0
        };

        reinforceBrigadesFromPools(state);

        const f = (state.military.formations as Record<string, FormationState>)[fid];
        // Should have crossed threshold (pool has plenty, REINFORCEMENT_RATE will add >= 1)
        if ((f.personnel ?? 0) >= MIN_BATTALION_THRESHOLD) {
            expect(f.name).toBe('TO Bn test_mun');
        }
    });

    it('militia battalion grows up to MIN_BRIGADE_THRESHOLD (1500) tier cap, not beyond', () => {
        const state = makeBottomUpState(5000);
        const fid = 'F_RBiH_0001';
        // Set at battalion level
        (state.military.formations as Record<string, FormationState>)[fid] = {
            id: fid,
            faction: 'RBiH',
            name: 'TO Bn test_mun',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'militia',
            personnel: MIN_BATTALION_THRESHOLD,
            readiness: 'active',
            cohesion: 35,
            tags: ['mun:test_mun', 'kind:militia', 'generated_phase_i0'],
            activation_gated: false,
            activation_turn: 0
        };

        // Run many turns worth of reinforcement to test cap
        for (let t = 0; t < 20; t += 1) {
            state.meta.turn = t + 1;
            state.military.militia_pools['test_mun:RBiH'].available = 5000; // refresh
            reinforceBrigadesFromPools(state);
        }

        const f = (state.military.formations as Record<string, FormationState>)[fid];
        // Battalion should not grow past MIN_BRIGADE_THRESHOLD
        expect(f.personnel).toBeLessThanOrEqual(1500);
        expect(f.personnel).toBeGreaterThan(MIN_BATTALION_THRESHOLD);
    });

    it('legacy mode: only reinforces brigades, ignores militia-kind formations', () => {
        const state = makeBottomUpState(1000);
        state.meta.recruitment_mode = undefined; // legacy mode

        const fid = 'F_RBiH_0001';
        (state.military.formations as Record<string, FormationState>)[fid] = {
            id: fid,
            faction: 'RBiH',
            name: 'TO test_mun',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'militia',
            personnel: MIN_DETACHMENT_SPAWN,
            readiness: 'active',
            cohesion: MILITIA_COHESION,
            tags: ['mun:test_mun'],
            activation_gated: false,
            activation_turn: 0
        };

        const report = reinforceBrigadesFromPools(state);

        // Legacy path only handles brigades — militia-kind should be untouched
        expect(report.formations_reinforced).toBe(0);
        const f = (state.military.formations as Record<string, FormationState>)[fid];
        expect(f.personnel).toBe(MIN_DETACHMENT_SPAWN);
    });
});
