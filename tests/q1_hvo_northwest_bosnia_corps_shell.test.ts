/**
 * LANE-NIGHTSHIFT-Q1-HVO-NORTHWEST-BOSNIA-EMPTY-CORPS (2026-05-07)
 *
 * Surface: Petković AI commander Turn 1 of API smoke run `bft5bixcj`
 * (commit a2d564e6) reported the corps `hvo_northwest_bosnia` with
 * 0 brigades + 0 personnel at t0/t1 despite the corps being created
 * at t0 with `created_turn=0`.
 *
 * Root cause: `runBotRecruitment` (in recruitment_engine.ts) created
 * every OOB corps formation unconditionally at scenario init,
 * ignoring `available_from`. This produced "empty shell" corps at t0
 * for OZs whose brigade catalog entries were OOB-gated to spawn at
 * later weeks (e.g. hvo_northwest_bosnia: corps available_from=10,
 * brigades available_from=2/8). The brigade-creation paths in the
 * same function correctly respected `available_from`, but the
 * corps-creation loop did not — producing the briefing-vs-state
 * desync.
 *
 * Fix: gate corps formation creation on `c.available_from <=
 * currentTurn`, mirroring the existing brigade gates. Faction-symmetric
 * — applies uniformly to all OOB corps regardless of faction.
 */

import assert from 'node:assert';
import { describe, test } from 'vitest';
import type { OobBrigade, OobCorps } from '../src/scenario/oob_loader.js';
import {
    initializeRecruitmentResources,
    runBotRecruitment
} from '../src/sim/recruitment_engine.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import { RECRUITMENT_DEFAULTS } from '../src/state/recruitment_types.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeBrigade(
    overrides: Partial<OobBrigade> & Pick<OobBrigade, 'id' | 'faction' | 'name' | 'home_mun'>
): OobBrigade {
    return {
        kind: 'brigade',
        ...RECRUITMENT_DEFAULTS,
        home_osid: `op:${overrides.home_mun}:core`,
        ...overrides
    };
}

function makeCorps(overrides: Partial<OobCorps> & Pick<OobCorps, 'id' | 'faction' | 'name' | 'hq_mun'>): OobCorps {
    return {
        kind: 'corps',
        available_from: 0,
        ...overrides
    };
}

function makeState(overrides?: Partial<GameState>): GameState {
    const overrideMilitary = (overrides?.military ?? {}) as Record<string, unknown>;
    const overridePolitical = (overrides?.political ?? {}) as Record<string, unknown>;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'test' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            ...overrideMilitary
        } as any,
        political: {
            political_controllers: {},
            ...overridePolitical
        } as any,
        ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([key]) => key !== 'military' && key !== 'political')),
    } as unknown as GameState;
}

function buildPlayerChoiceState(turn: number): GameState {
    const orasje_pool = militiaPoolKey('orasje', 'HRHB');
    const zenica_pool = militiaPoolKey('zenica', 'RBiH');
    const banja_pool = militiaPoolKey('banja_luka', 'RS');
    return makeState({
        meta: { turn, seed: 'test' } as any,
        military: {
            militia_pools: {
                [orasje_pool]: { mun_id: 'orasje', faction: 'HRHB', available: 5000, committed: 0, exhausted: 0, updated_turn: turn },
                [zenica_pool]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: turn },
                [banja_pool]: { mun_id: 'banja_luka', faction: 'RS', available: 5000, committed: 0, exhausted: 0, updated_turn: turn }
            }
        } as any,
        political: {
            political_controllers: {
                's_orasje': 'HRHB',
                's_zenica': 'RBiH',
                's_banja': 'RS'
            }
        } as any
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Q1 — hvo_northwest_bosnia corps shell (LANE-NIGHTSHIFT-Q1)', () => {

    // T1: Corps with available_from > currentTurn must NOT be created at t0.
    test('T1: corps with available_from=10 is not created at turn 0', () => {
        const state = buildPlayerChoiceState(0);
        const sidToMun = new Map([['s_orasje', 'orasje']]);
        const resources = initializeRecruitmentResources(['HRHB']);

        const corps: OobCorps[] = [
            makeCorps({
                id: 'hvo_northwest_bosnia',
                faction: 'HRHB',
                name: 'Northwest Bosnia OZ',
                hq_mun: 'orasje',
                available_from: 10
            })
        ];

        runBotRecruitment(
            state,
            corps,
            [],
            resources,
            sidToMun,
            { orasje: 's_orasje' }
        );

        assert.strictEqual(
            state.military.formations!['hvo_northwest_bosnia'],
            undefined,
            'corps formation must not exist at turn 0 when available_from=10'
        );
    });

    // T2: Once turn >= available_from, corps SHOULD activate.
    test('T2: corps with available_from=10 IS created at turn 10', () => {
        const state = buildPlayerChoiceState(10);
        const sidToMun = new Map([['s_orasje', 'orasje']]);
        const resources = initializeRecruitmentResources(['HRHB']);

        const corps: OobCorps[] = [
            makeCorps({
                id: 'hvo_northwest_bosnia',
                faction: 'HRHB',
                name: 'Northwest Bosnia OZ',
                hq_mun: 'orasje',
                available_from: 10
            })
        ];

        runBotRecruitment(
            state,
            corps,
            [],
            resources,
            sidToMun,
            { orasje: 's_orasje' }
        );

        const formation = state.military.formations!['hvo_northwest_bosnia'];
        assert.ok(formation, 'corps formation must exist at turn >= available_from');
        assert.strictEqual(formation.faction, 'HRHB');
        assert.strictEqual(formation.created_turn, 10);
        assert.strictEqual(formation.kind, 'corps_asset');
    });

    // T3: Determinism — same inputs produce same corps state across runs.
    test('T3: deterministic — same inputs produce identical corps composition', () => {
        const sidToMun = new Map([['s_orasje', 'orasje']]);
        const corpsCatalog: OobCorps[] = [
            makeCorps({ id: 'hvo_northwest_bosnia', faction: 'HRHB', name: 'NW Bosnia', hq_mun: 'orasje', available_from: 10 }),
            makeCorps({ id: 'hvo_central_bosnia', faction: 'HRHB', name: 'Central', hq_mun: 'orasje', available_from: 5 })
        ];

        // Run A: turn 0
        const stateA0 = buildPlayerChoiceState(0);
        const resA0 = initializeRecruitmentResources(['HRHB']);
        runBotRecruitment(stateA0, corpsCatalog, [], resA0, sidToMun, { orasje: 's_orasje' });

        // Run B: turn 0 (independent)
        const stateB0 = buildPlayerChoiceState(0);
        const resB0 = initializeRecruitmentResources(['HRHB']);
        runBotRecruitment(stateB0, corpsCatalog, [], resB0, sidToMun, { orasje: 's_orasje' });

        const idsA = Object.keys(stateA0.military.formations!).sort();
        const idsB = Object.keys(stateB0.military.formations!).sort();
        assert.deepStrictEqual(idsA, idsB, 're-run must produce byte-identical corps composition');

        // Both runs: neither corps activated at turn 0 (both have available_from > 0).
        assert.strictEqual(idsA.length, 0);
    });

    // T4: Backward-compat — corps with available_from=0 (or default) still creates at t0.
    test('T4: backward-compat — available_from=0 corps still creates at turn 0', () => {
        const state = buildPlayerChoiceState(0);
        const sidToMun = new Map([['s_banja', 'banja_luka']]);
        const resources = initializeRecruitmentResources(['RS']);

        const corps: OobCorps[] = [
            makeCorps({
                id: 'vrs_1st_krajina',
                faction: 'RS',
                name: '1st Krajina Corps',
                hq_mun: 'banja_luka',
                available_from: 0
            })
        ];

        runBotRecruitment(
            state,
            corps,
            [],
            resources,
            sidToMun,
            { banja_luka: 's_banja' }
        );

        assert.ok(
            state.military.formations!['vrs_1st_krajina'],
            'available_from=0 corps must still activate at turn 0'
        );
        assert.strictEqual(state.military.formations!['vrs_1st_krajina'].created_turn, 0);
    });

    // T5: Faction-symmetric — gate applies uniformly to RBiH, RS, HRHB.
    test('T5: faction-symmetric — available_from gates RBiH, RS, and HRHB uniformly', () => {
        const state = buildPlayerChoiceState(5);
        const sidToMun = new Map([
            ['s_orasje', 'orasje'],
            ['s_zenica', 'zenica'],
            ['s_banja', 'banja_luka']
        ]);
        const resources = initializeRecruitmentResources(['RBiH', 'RS', 'HRHB']);

        const corps: OobCorps[] = [
            // available_from=10 — all should be gated out at turn 5
            makeCorps({ id: 'hvo_late', faction: 'HRHB', name: 'HVO Late', hq_mun: 'orasje', available_from: 10 }),
            makeCorps({ id: 'arbih_late', faction: 'RBiH', name: 'ARBiH Late', hq_mun: 'zenica', available_from: 10 }),
            makeCorps({ id: 'vrs_late', faction: 'RS', name: 'VRS Late', hq_mun: 'banja_luka', available_from: 10 }),
            // available_from=0 — all should activate at turn 5
            makeCorps({ id: 'hvo_early', faction: 'HRHB', name: 'HVO Early', hq_mun: 'orasje', available_from: 0 }),
            makeCorps({ id: 'arbih_early', faction: 'RBiH', name: 'ARBiH Early', hq_mun: 'zenica', available_from: 0 }),
            makeCorps({ id: 'vrs_early', faction: 'RS', name: 'VRS Early', hq_mun: 'banja_luka', available_from: 0 })
        ];

        runBotRecruitment(
            state,
            corps,
            [],
            resources,
            sidToMun,
            { orasje: 's_orasje', zenica: 's_zenica', banja_luka: 's_banja' }
        );

        // Late corps gated for ALL factions
        assert.strictEqual(state.military.formations!['hvo_late'], undefined, 'HRHB late corps should be gated');
        assert.strictEqual(state.military.formations!['arbih_late'], undefined, 'RBiH late corps should be gated');
        assert.strictEqual(state.military.formations!['vrs_late'], undefined, 'RS late corps should be gated');

        // Early corps available for ALL factions
        assert.ok(state.military.formations!['hvo_early'], 'HRHB early corps should activate');
        assert.ok(state.military.formations!['arbih_early'], 'RBiH early corps should activate');
        assert.ok(state.military.formations!['vrs_early'], 'RS early corps should activate');
    });

    // T6: Idempotency — once created, subsequent calls don't re-create.
    test('T6: idempotent — once a corps is created, later calls do not recreate or overwrite', () => {
        const state = buildPlayerChoiceState(10);
        const sidToMun = new Map([['s_orasje', 'orasje']]);
        const resources1 = initializeRecruitmentResources(['HRHB']);
        const resources2 = initializeRecruitmentResources(['HRHB']);

        const corps: OobCorps[] = [
            makeCorps({
                id: 'hvo_northwest_bosnia',
                faction: 'HRHB',
                name: 'NW Bosnia',
                hq_mun: 'orasje',
                available_from: 10
            })
        ];

        // First call: should create.
        runBotRecruitment(state, corps, [], resources1, sidToMun, { orasje: 's_orasje' });
        const firstFormation = state.military.formations!['hvo_northwest_bosnia'];
        assert.ok(firstFormation);
        const firstCreatedTurn = firstFormation.created_turn;

        // Advance the turn and call again — formation should NOT be replaced.
        state.meta.turn = 12;
        runBotRecruitment(state, corps, [], resources2, sidToMun, { orasje: 's_orasje' });
        const secondFormation = state.military.formations!['hvo_northwest_bosnia'];
        assert.strictEqual(
            secondFormation.created_turn,
            firstCreatedTurn,
            'created_turn must not be overwritten on subsequent calls'
        );
    });
});
