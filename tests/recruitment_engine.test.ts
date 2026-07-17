import assert from 'node:assert';
import { describe, expect, test } from 'vitest';
import type { OobBrigade, OobCorps } from '../src/scenario/oob_loader.js';
import { createOobFormations } from '../src/scenario/oob_early_war_entry.js';
import {
    applyRecruitment,
    evaluateRecruitmentEligibility,
    initializeRecruitmentResources,
    isEmergentFormationSuppressed,
    recruitBrigade,
    runBotRecruitment
} from '../src/sim/recruitment_engine.js';
import { ensureEmbargoProfiles, getEffectiveHeavyEquipmentAccess } from '../src/state/embargo.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import { RECRUITMENT_DEFAULTS } from '../src/state/recruitment_types.js';

function makeBrigade(overrides: Partial<OobBrigade> & Pick<OobBrigade, 'id' | 'faction' | 'name' | 'home_mun'>): OobBrigade {
    return {
        kind: 'brigade',
        ...RECRUITMENT_DEFAULTS,
        home_osid: `op:${overrides.home_mun}:core`,
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

describe('initializeRecruitmentResources', () => {
    test('creates default resources for all factions', () => {
        const resources = initializeRecruitmentResources(['RBiH', 'RS', 'HRHB']);
        assert.strictEqual(resources.recruitment_capital.RS.points, 250);
        assert.strictEqual(resources.recruitment_capital.RBiH.points, 150);
        assert.strictEqual(resources.recruitment_capital.HRHB.points, 100);
        assert.strictEqual(resources.equipment_pools.RS.points, 300);
        assert.strictEqual(resources.equipment_pools.RBiH.points, 60);
        assert.strictEqual(resources.equipment_pools.HRHB.points, 120);
    });

    test('allows scenario overrides', () => {
        const resources = initializeRecruitmentResources(
            ['RBiH', 'RS'],
            { RBiH: 200, RS: 300 },
            { RBiH: 100, RS: 400 }
        );
        assert.strictEqual(resources.recruitment_capital.RBiH.points, 200);
        assert.strictEqual(resources.recruitment_capital.RS.points, 300);
        assert.strictEqual(resources.equipment_pools.RBiH.points, 100);
        assert.strictEqual(resources.equipment_pools.RS.points, 400);
    });

    test('stores per-turn trickles and per-turn recruit cap', () => {
        const resources = initializeRecruitmentResources(
            ['RBiH', 'RS'],
            undefined,
            undefined,
            { RBiH: 2, RS: 1 },
            { RBiH: 3, RS: 4 },
            1
        );
        assert.strictEqual(resources.recruitment_capital_trickle?.RBiH, 2);
        assert.strictEqual(resources.equipment_points_trickle?.RS, 4);
        assert.strictEqual(resources.max_recruits_per_faction_per_turn, 1);
    });
});

describe('recruitBrigade', () => {
    test('returns stable player-authority and availability reason codes before resource checks', () => {
        const state = makeState({
            meta: { turn: 3, seed: 'test', player_faction: 'RBiH' },
            military: {
                militia_pools: {
                    [militiaPoolKey('zenica', 'RS')]: { mun_id: 'zenica', faction: 'RS', available: 5000, committed: 0, exhausted: 0, updated_turn: 3 },
                },
            } as never,
            political: { political_controllers: { 'op:zenica:core': 'RS' } } as never,
        });
        const resources = initializeRecruitmentResources(['RBiH', 'RS']);
        const sidToMun = new Map([['op:zenica:core', 'zenica']]);

        const wrongFaction = evaluateRecruitmentEligibility(
            state,
            makeBrigade({ id: 'rs_late', faction: 'RS', name: 'RS Late', home_mun: 'zenica', available_from: 8 }),
            'light_infantry',
            resources,
            sidToMun,
            { zenica: 'op:zenica:core' },
            undefined,
            'RBiH',
        );
        expect(wrongFaction).toEqual({ eligible: false, reason_codes: ['wrong_faction', 'not_yet_available'] });
    });

    test('succeeds when all resources available', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const hq: Record<string, string> = { zenica: 's1' };
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_7th_muslim',
            faction: 'RBiH',
            name: '7th Muslim',
            home_mun: 'zenica',
            default_equipment_class: 'mountain'
        });

        const result = recruitBrigade(state, brigade, 'mountain', resources, sidToMun, hq);
        assert.strictEqual(result.success, true);
        assert.ok(result.formation);
        assert.strictEqual(result.formation!.name, '7th Muslim');
        assert.ok(result.formation!.composition);
        assert.strictEqual(result.formation!.composition!.artillery, 2); // mountain template
        assert.strictEqual(result.action!.equipment_spent, 5); // mountain cost
        assert.ok(result.formation!.equipment_state, 'recruited formation should seed equipment_state');
        assert.ok(result.formation!.doctrine_state, 'recruited formation should seed doctrine_state');
    });

    test('seeds recruited equipment from canonical embargo access even when profiles were absent', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_embargo_seed',
            faction: 'RBiH',
            name: 'Embargo Seed',
            home_mun: 'zenica',
            default_equipment_class: 'motorized'
        });

        const result = recruitBrigade(state, brigade, 'motorized', resources, sidToMun, {});
        assert.strictEqual(result.success, true);
        assert.ok(result.formation?.equipment_state);

        ensureEmbargoProfiles(state);
        const faction = state.factions.find((entry) => entry.id === 'RBiH');
        const expectedTotal = Math.round(100 * getEffectiveHeavyEquipmentAccess(faction?.embargo_profile));
        assert.strictEqual(result.formation!.equipment_state!.total_heavy, expectedTotal);
        assert.strictEqual(result.formation!.equipment_state!.operational_heavy, expectedTotal);
    });

    test('fails when no control', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RS' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({ id: 'b1', faction: 'RBiH', name: 'Test', home_mun: 'zenica' });

        const result = recruitBrigade(state, brigade, 'light_infantry', resources, sidToMun, {});
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.reason, 'no_control');
    });

    test('fails when not enough capital', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 5 }); // only 5 capital
        const brigade = makeBrigade({ id: 'b1', faction: 'RBiH', name: 'Test', home_mun: 'zenica', capital_cost: 10 });

        const result = recruitBrigade(state, brigade, 'light_infantry', resources, sidToMun, {});
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.reason, 'no_capital');
    });

    test('fails when not enough equipment', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 200 }, { RBiH: 3 }); // only 3 equipment
        const brigade = makeBrigade({
            id: 'b1', faction: 'RBiH', name: 'Test', home_mun: 'zenica',
            default_equipment_class: 'mountain' // costs 5
        });

        const result = recruitBrigade(state, brigade, 'mountain', resources, sidToMun, {});
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.reason, 'no_equipment');
    });
});

describe('applyRecruitment', () => {
    test('deducts resources and creates formation', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_7th',
            faction: 'RBiH',
            name: '7th Muslim',
            home_mun: 'zenica',
            default_equipment_class: 'mountain'
        });

        const result = recruitBrigade(state, brigade, 'mountain', resources, sidToMun, { zenica: 's1' });
        assert.strictEqual(result.success, true);

        applyRecruitment(state, result, resources);

        // Check formation created
        assert.ok(state.military.formations!['arbih_7th']);
        assert.strictEqual(state.military.formations!['arbih_7th'].name, '7th Muslim');
        assert.ok(state.military.formations!['arbih_7th'].equipment_state, 'applied recruitment should persist equipment_state');
        assert.ok(state.military.formations!['arbih_7th'].doctrine_state, 'applied recruitment should persist doctrine_state');

        // Check resources deducted
        assert.strictEqual(resources.recruitment_capital.RBiH.points, 150 - 10); // default capital_cost
        assert.strictEqual(resources.equipment_pools.RBiH.points, 60 - 5); // mountain cost
        assert.strictEqual(state.military.militia_pools![poolKey]!.available, 2000 - 800); // default manpower_cost

        // Check tracking
        assert.ok(resources.recruited_brigade_ids.includes('arbih_7th'));
    });
});

describe('runBotRecruitment', () => {
    test('adopts a generated formation that already represents the OOB brigade instead of duplicating it', () => {
        const poolKey = militiaPoolKey('ilijas', 'RS');
        const state = makeState({
            meta: { turn: 3, seed: 'test' },
            military: {
                formations: {
                    F_RS_0001: {
                        id: 'F_RS_0001',
                        faction: 'RS',
                        name: '3rd Sarajevo Infantry Brigade (Ilijas)',
                        created_turn: 1,
                        status: 'active',
                        assignment: null,
                        kind: 'brigade',
                        corps_id: 'vrs_sarajevo_romanija',
                        tags: ['generated_phase_i0', 'kind:brigade', 'mun:ilijas', 'oob:rs_ilijas_brigade'],
                        personnel: 800,
                        location_osid: 'op:ilijas:podlugovi',
                    },
                },
                militia_pools: {
                    [poolKey]: { mun_id: 'ilijas', faction: 'RS', available: 2000, committed: 800, exhausted: 0, updated_turn: 3 },
                },
            } as never,
            political: { political_controllers: { 'op:ilijas:podlugovi': 'RS' } } as never,
        });
        const resources = initializeRecruitmentResources(['RS'], { RS: 0 }, { RS: 0 });
        state.military.recruitment_state = resources;
        const brigade = makeBrigade({
            id: 'rs_ilijas_brigade',
            faction: 'RS',
            name: '3rd Sarajevo Infantry Brigade (Ilijas)',
            home_mun: 'ilijas',
            home_osid: 'op:ilijas:podlugovi',
            corps: 'vrs_sarajevo_romanija',
            available_from: 3,
            mandatory: true,
        });

        const report = runBotRecruitment(
            state,
            [],
            [brigade],
            resources,
            new Map([['op:ilijas:podlugovi', 'ilijas']]),
            { ilijas: 'op:ilijas:podlugovi' },
            { includeCorps: false, includeMandatory: true },
        );

        expect(report.mandatory_recruited).toBe(0);
        expect(report.actions).toEqual([]);
        expect(state.military.formations.rs_ilijas_brigade).toBeUndefined();
        expect(Object.keys(state.military.formations)).toEqual(['F_RS_0001']);
        expect(resources.recruited_brigade_ids).toContain('rs_ilijas_brigade');
        expect(isEmergentFormationSuppressed(state, 'ilijas', 'RS')).toBe(true);
    });

    test('recruits brigades for faction with available resources', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const corps: OobCorps[] = [];
        const brigades: OobBrigade[] = [
            makeBrigade({ id: 'b1', faction: 'RBiH', name: 'First', home_mun: 'zenica', priority: 1 }),
            makeBrigade({ id: 'b2', faction: 'RBiH', name: 'Second', home_mun: 'zenica', priority: 2 }),
            makeBrigade({ id: 'b3', faction: 'RBiH', name: 'Third', home_mun: 'zenica', priority: 3 })
        ];

        const report = runBotRecruitment(state, corps, brigades, resources, sidToMun, { zenica: 's1' });

        assert.strictEqual(report.elective_recruited, 3);
        assert.ok(state.military.formations!['b1']);
        assert.ok(state.military.formations!['b2']);
        assert.ok(state.military.formations!['b3']);
    });

    test('mandatory brigades are recruited at zero cost', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 }); // zero capital/equip
        const corps: OobCorps[] = [];
        const brigades: OobBrigade[] = [
            makeBrigade({
                id: 'b1', faction: 'RBiH', name: 'Mandatory Unit', home_mun: 'zenica',
                mandatory: true, default_equipment_class: 'mechanized'
            })
        ];

        const report = runBotRecruitment(state, corps, brigades, resources, sidToMun, { zenica: 's1' });

        assert.strictEqual(report.mandatory_recruited, 1);
        assert.ok(state.military.formations!['b1']);
        // Capital and equipment should not have been charged
        assert.strictEqual(resources.recruitment_capital.RBiH.points, 0);
        assert.strictEqual(resources.equipment_pools.RBiH.points, 0);
    });

    test('mandatory recruitment uses a friendly operational HQ fallback instead of an enemy-controlled fixed home osid', () => {
        const poolKey = militiaPoolKey('donji_vakuf', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'donji_vakuf', faction: 'RBiH', available: 1200, committed: 0, exhausted: 0, updated_turn: 4 }
            }
  } as any,
  political: {
    political_controllers: {
                'op:donji_vakuf:donji_vakuf_2': 'RS',
                'op:donji_vakuf:korenici': 'RBiH'
            }
  } as any,
});
        const sidToMun = new Map([
            ['op:donji_vakuf:donji_vakuf_2', 'donji_vakuf'],
            ['op:donji_vakuf:korenici', 'donji_vakuf'],
        ]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 });
        const brigades: OobBrigade[] = [
            makeBrigade({
                id: 'arbih_770th_slavna_mountain',
                faction: 'RBiH',
                name: '770th Slavna Mountain',
                home_mun: 'donji_vakuf',
                mandatory: true,
                home_osid: 'op:donji_vakuf:donji_vakuf_2',
                priority: 1,
            })
        ];

        const report = runBotRecruitment(
            state,
            [],
            brigades,
            resources,
            sidToMun,
            { donji_vakuf: 'op:donji_vakuf:korenici' },
            { includeCorps: false, includeMandatory: true }
        );

        assert.strictEqual(report.mandatory_recruited, 1);
        assert.strictEqual(state.military.formations!['arbih_770th_slavna_mountain']?.location_osid, 'op:donji_vakuf:korenici');
    });

    test('mandatory recruitment preserves a controlled enclave home position over the municipal HQ', () => {
        const poolKey = militiaPoolKey('rogatica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'rogatica', faction: 'RBiH', available: 1500, committed: 0, exhausted: 0, updated_turn: 0 },
                },
            } as never,
            political: {
                political_controllers: {
                    'op:rogatica:rogatica_2': 'RBiH',
                    'op:rogatica:zepa_2': 'RBiH',
                },
            } as never,
        });
        const sidToMun = new Map([
            ['op:rogatica:rogatica_2', 'rogatica'],
            ['op:rogatica:zepa_2', 'rogatica'],
        ]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 });
        const brigades: OobBrigade[] = [
            makeBrigade({
                id: 'arbih_285th_light',
                faction: 'RBiH',
                name: '285th Light Brigade',
                home_mun: 'rogatica',
                home_osid: 'op:rogatica:zepa_2',
                tags: ['enclave'],
                mandatory: true,
            }),
        ];

        const report = runBotRecruitment(
            state,
            [],
            brigades,
            resources,
            sidToMun,
            { rogatica: 'op:rogatica:rogatica_2' },
            { includeCorps: false, includeMandatory: true },
        );

        expect(report.mandatory_recruited).toBe(1);
        expect(state.military.formations.arbih_285th_light?.location_osid).toBe('op:rogatica:zepa_2');
        expect(state.military.formations.arbih_285th_light?.tags).toContain('placement:fixed_home_osid');
    });

    test('player recruitment rejects allied placement and uses the strict-sorted exact-control fallback', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 },
                },
            } as never,
            political: {
                political_controllers: {
                    'op:zenica:allied': 'HRHB',
                    'op:zenica:zulu': 'RBiH',
                    'op:zenica:Alpha': 'RBiH',
                },
                war_alliance_rbih_hrhb: 1,
            } as never,
        });
        const sidToMun = new Map([
            ['op:zenica:zulu', 'zenica'],
            ['op:zenica:Alpha', 'zenica'],
            ['op:zenica:allied', 'zenica'],
        ]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_exact_control',
            faction: 'RBiH',
            name: 'Exact Control',
            home_mun: 'zenica',
            home_osid: 'op:zenica:allied',
        });

        const result = recruitBrigade(state, brigade, 'light_infantry', resources, sidToMun, {});

        expect(result.success).toBe(true);
        expect(result.formation?.location_osid).toBe('op:zenica:Alpha');
        expect(state.political.political_controllers![result.formation!.location_osid!]).toBe('RBiH');
    });

    test('player recruitment prefers the exact-controlled municipal HQ over an OOB home anchor', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 },
                },
            } as never,
            political: {
                political_controllers: {
                    'op:zenica:home': 'RBiH',
                    'op:zenica:hq': 'RBiH',
                },
            } as never,
        });
        const sidToMun = new Map([
            ['op:zenica:home', 'zenica'],
            ['op:zenica:hq', 'zenica'],
        ]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_hq_preference',
            faction: 'RBiH',
            name: 'HQ Preference',
            home_mun: 'zenica',
            home_osid: 'op:zenica:home',
        });

        const result = recruitBrigade(
            state,
            brigade,
            'light_infantry',
            resources,
            sidToMun,
            { zenica: 'op:zenica:hq' },
        );

        expect(result.success).toBe(true);
        expect(result.formation?.location_osid).toBe('op:zenica:hq');
    });

    test('player recruitment rejects an exact-controlled HQ anchor outside the home municipality', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 },
                },
            } as never,
            political: {
                political_controllers: {
                    'op:mostar:hq': 'RBiH',
                    'op:zenica:home': 'RBiH',
                },
            } as never,
        });
        const sidToMun = new Map([
            ['op:mostar:hq', 'mostar'],
            ['op:zenica:home', 'zenica'],
        ]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_home_boundary',
            faction: 'RBiH',
            name: 'Home Boundary',
            home_mun: 'zenica',
            home_osid: 'op:zenica:home',
        });

        const result = recruitBrigade(
            state,
            brigade,
            'light_infantry',
            resources,
            sidToMun,
            { zenica: 'op:mostar:hq' },
        );

        expect(result.success).toBe(true);
        expect(result.formation?.location_osid).toBe('op:zenica:home');
    });

    test('player recruitment resolves a controlled canonical HQ to its operational OSID', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 },
                },
            } as never,
            political: {
                political_controllers: {
                    'sid-zenica-hq': 'RBiH',
                    'op:zenica:hq': 'RBiH',
                },
            } as never,
        });
        const sidToMun = new Map([
            ['sid-zenica-hq', 'zenica'],
            ['op:zenica:hq', 'zenica'],
        ]);
        const resources = initializeRecruitmentResources(['RBiH']);
        const brigade = makeBrigade({
            id: 'arbih_operational_hq',
            faction: 'RBiH',
            name: 'Operational HQ',
            home_mun: 'zenica',
            home_osid: undefined,
        });

        const result = recruitBrigade(
            state,
            brigade,
            'light_infantry',
            resources,
            sidToMun,
            { zenica: 'sid-zenica-hq' },
            { 'sid-zenica-hq': 'op:zenica:hq' },
        );

        expect(result.success).toBe(true);
        expect(result.formation?.location_osid).toBe('op:zenica:hq');
    });

    test('mandatory recruitment does not seed or mutate a pool when exact-control placement is unavailable', () => {
        const poolKey = militiaPoolKey('srebrenica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'srebrenica', faction: 'RBiH', available: 0, committed: 7, exhausted: 3, updated_turn: 4 },
                },
            } as never,
            political: {
                political_controllers: { 'op:srebrenica:srebrenica_2': 'HRHB' },
                war_alliance_rbih_hrhb: 1,
            } as never,
        });
        const beforePool = structuredClone(state.military.militia_pools![poolKey]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 });
        const brigade = makeBrigade({
            id: 'arbih_srebrenica_unplaced',
            faction: 'RBiH',
            name: 'Srebrenica Unplaced',
            home_mun: 'srebrenica',
            home_osid: 'op:srebrenica:srebrenica_2',
            tags: ['enclave'],
            mandatory: true,
        });

        const report = runBotRecruitment(
            state,
            [],
            [brigade],
            resources,
            new Map([['op:srebrenica:srebrenica_2', 'srebrenica']]),
            { srebrenica: 'op:srebrenica:srebrenica_2' },
            { includeCorps: false },
        );

        expect(report.mandatory_recruited).toBe(0);
        expect(report.brigades_skipped_no_control).toBe(1);
        expect(state.military.formations?.[brigade.id]).toBeUndefined();
        expect(state.military.militia_pools![poolKey]).toEqual(beforePool);
        expect(resources.recruited_brigade_ids).not.toContain(brigade.id);
    });

    test('legacy OOB recruitment leaves formation and pool untouched without exact-control placement', () => {
        const poolKey = militiaPoolKey('srebrenica', 'RBiH');
        const state = makeState({
            military: {
                militia_pools: {
                    [poolKey]: { mun_id: 'srebrenica', faction: 'RBiH', available: 100, committed: 11, exhausted: 2, updated_turn: 0 },
                },
            } as never,
            political: {
                political_controllers: { 'op:srebrenica:srebrenica_2': null },
            } as never,
        });
        const beforePool = structuredClone(state.military.militia_pools![poolKey]);
        const brigade = makeBrigade({
            id: 'arbih_legacy_unplaced',
            faction: 'RBiH',
            name: 'Legacy Unplaced',
            home_mun: 'srebrenica',
            home_osid: 'op:srebrenica:srebrenica_2',
            tags: ['enclave'],
        });

        const report = createOobFormations(
            state,
            [],
            [brigade],
            { srebrenica: 'op:srebrenica:srebrenica_2' },
            new Map([['op:srebrenica:srebrenica_2', 'srebrenica']]),
        );

        expect(report.brigades_created).toBe(0);
        expect(state.military.formations?.[brigade.id]).toBeUndefined();
        expect(state.military.militia_pools![poolKey]).toEqual(beforePool);
    });

    test('bot downgrades equipment when points scarce', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        // Only 3 equipment points -- not enough for mountain (5) or motorized (20)
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 100 }, { RBiH: 3 });
        const corps: OobCorps[] = [];
        const brigades: OobBrigade[] = [
            makeBrigade({
                id: 'b1', faction: 'RBiH', name: 'Motor Unit', home_mun: 'zenica',
                default_equipment_class: 'motorized' // costs 20, should downgrade
            })
        ];

        const report = runBotRecruitment(state, corps, brigades, resources, sidToMun, { zenica: 's1' });

        assert.strictEqual(report.elective_recruited, 1);
        // Should have been downgraded to light_infantry (cost 0)
        const action = report.actions.find(a => a.brigade_id === 'b1');
        assert.ok(action);
        assert.strictEqual(action!.equipment_class, 'light_infantry');
        assert.strictEqual(action!.equipment_spent, 0);
    });

    test('respects available_from turn gate', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  meta: { turn: 4, seed: 'test' },
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 5000, committed: 0, exhausted: 0, updated_turn: 4 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 200 }, { RBiH: 100 });
        const report = runBotRecruitment(
            state,
            [],
            [
                makeBrigade({ id: 'b_early', faction: 'RBiH', name: 'Early', home_mun: 'zenica', available_from: 0, priority: 1 }),
                makeBrigade({ id: 'b_late', faction: 'RBiH', name: 'Late', home_mun: 'zenica', available_from: 8, priority: 2 })
            ],
            resources,
            sidToMun,
            { zenica: 's1' }
        );
        assert.ok(state.military.formations['b_early']);
        assert.ok(!state.military.formations['b_late']);
        assert.strictEqual(report.elective_recruited, 1);
    });

    test('creates startup command formations from HQ presence even when corps available_from is future', () => {
        const state = makeState({
  meta: { turn: 0, seed: 'test' },
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 0 }, { RBiH: 0 });
        const corps: OobCorps[] = [{
            id: 'arbih_future_corps',
            faction: 'RBiH',
            name: 'Future Corps',
            hq_mun: 'zenica',
            kind: 'corps',
            available_from: 24,
        }];

        const report = runBotRecruitment(state, corps, [], resources, sidToMun, { zenica: 's1' });

        assert.ok(state.military.formations!['arbih_future_corps']);
        assert.strictEqual(state.military.formations!['arbih_future_corps'].kind, 'corps_asset');
        assert.strictEqual(state.military.formations!['arbih_future_corps'].personnel, 0);
        assert.strictEqual(report.elective_recruited, 0);
        assert.strictEqual(report.mandatory_recruited, 0);
    });

    test('respects per-faction elective recruit cap', () => {
        const poolKey = militiaPoolKey('zenica', 'RBiH');
        const state = makeState({
  military: {
    militia_pools: {
                [poolKey]: { mun_id: 'zenica', faction: 'RBiH', available: 10000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH' }
  } as any,
});
        const sidToMun = new Map([['s1', 'zenica']]);
        const resources = initializeRecruitmentResources(['RBiH'], { RBiH: 500 }, { RBiH: 500 });
        const report = runBotRecruitment(
            state,
            [],
            [
                makeBrigade({ id: 'b1', faction: 'RBiH', name: 'One', home_mun: 'zenica', priority: 1 }),
                makeBrigade({ id: 'b2', faction: 'RBiH', name: 'Two', home_mun: 'zenica', priority: 2 }),
                makeBrigade({ id: 'b3', faction: 'RBiH', name: 'Three', home_mun: 'zenica', priority: 3 })
            ],
            resources,
            sidToMun,
            { zenica: 's1' },
            { includeCorps: false, includeMandatory: false, maxElectivePerFaction: 1 }
        );
        assert.strictEqual(report.elective_recruited, 1);
        assert.strictEqual(report.actions.length, 1);
    });

    test('respects per-faction mandatory recruit cap when configured', () => {
        const rsPoolKey = militiaPoolKey('prijedor', 'RS');
        const state = makeState({
  military: {
    militia_pools: {
                [rsPoolKey]: { mun_id: 'prijedor', faction: 'RS', available: 2000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RS' }
  } as any,
});
        const sidToMun = new Map([['s1', 'prijedor']]);
        const resources = initializeRecruitmentResources(['RS'], { RS: 0 }, { RS: 0 });
        const report = runBotRecruitment(
            state,
            [],
            [
                makeBrigade({
                    id: 'rs_mand_1',
                    faction: 'RS',
                    name: 'RS Mandatory 1',
                    home_mun: 'prijedor',
                    mandatory: true,
                    priority: 1
                }),
                makeBrigade({
                    id: 'rs_mand_2',
                    faction: 'RS',
                    name: 'RS Mandatory 2',
                    home_mun: 'prijedor',
                    mandatory: true,
                    priority: 2
                })
            ],
            resources,
            sidToMun,
            { prijedor: 's1' },
            { includeCorps: false, includeMandatory: true, maxMandatoryPerFaction: 1 }
        );

        assert.strictEqual(report.mandatory_recruited, 1);
        assert.strictEqual(report.actions.filter((a) => a.mandatory).length, 1);
        assert.ok(state.military.formations['rs_mand_1']);
        assert.ok(!state.military.formations['rs_mand_2']);
    });

    test('RS JNA override: RS mechanized and motorized get 40 tanks, 30 artillery', () => {
        const rsPoolKey = militiaPoolKey('banja_luka', 'RS');
        const state = makeState({
  military: {
    militia_pools: {
                [rsPoolKey]: { mun_id: 'banja_luka', faction: 'RS', available: 5000, committed: 0, exhausted: 0, updated_turn: 0 }
            }
  } as any,
  political: {
    political_controllers: { s1: 'RS' }
  } as any,
});
        const sidToMun = new Map([['s1', 'banja_luka']]);
        const resources = initializeRecruitmentResources(['RS'], { RS: 0 }, { RS: 0 });
        runBotRecruitment(
            state,
            [],
            [
                makeBrigade({
                    id: 'rs_1st_armored',
                    faction: 'RS',
                    name: '1st Armored',
                    home_mun: 'banja_luka',
                    mandatory: true,
                    default_equipment_class: 'mechanized',
                    priority: 1
                }),
                makeBrigade({
                    id: 'rs_1st_guards_motorized',
                    faction: 'RS',
                    name: '1st Guards Motorized',
                    home_mun: 'banja_luka',
                    mandatory: true,
                    default_equipment_class: 'motorized',
                    priority: 2
                })
            ],
            resources,
            sidToMun,
            { banja_luka: 's1' },
            { includeCorps: false, includeMandatory: true }
        );
        const mech = state.military.formations['rs_1st_armored'] as FormationState;
        const mot = state.military.formations['rs_1st_guards_motorized'] as FormationState;
        assert.ok(mech?.composition, 'RS mechanized should have composition');
        assert.ok(mot?.composition, 'RS motorized should have composition');
        assert.strictEqual(mech.composition!.tanks, 40, 'RS mechanized gets JNA heavy tanks');
        assert.strictEqual(mech.composition!.artillery, 30, 'RS mechanized gets JNA heavy artillery');
        assert.strictEqual(mot.composition!.tanks, 40, 'RS motorized gets JNA heavy tanks');
        assert.strictEqual(mot.composition!.artillery, 30, 'RS motorized gets JNA heavy artillery');
    });
});

describe('isEmergentFormationSuppressed', () => {
    test('returns false when no recruitment state', () => {
        const state = makeState();
        assert.strictEqual(isEmergentFormationSuppressed(state, 'zenica', 'RBiH'), false);
    });

    test('returns true when recruited brigade exists in municipality', () => {
        const state = makeState({
  military: {
    formations: {
                b1: {
                    id: 'b1', faction: 'RBiH', name: 'Test', created_turn: 0,
                    status: 'active', assignment: null, kind: 'brigade',
                    tags: ['mun:zenica']
                }
            },
    recruitment_state: {
                recruitment_capital: {},
                equipment_pools: {},
                recruited_brigade_ids: ['b1']
            }
  } as any,
});
        assert.strictEqual(isEmergentFormationSuppressed(state, 'zenica', 'RBiH'), true);
        assert.strictEqual(isEmergentFormationSuppressed(state, 'zenica', 'RS'), false);
        assert.strictEqual(isEmergentFormationSuppressed(state, 'tuzla', 'RBiH'), false);
    });

    test('returns true when a generated formation represents a recruited OOB brigade', () => {
        const state = makeState({
            military: {
                formations: {
                    F_RS_0001: {
                        id: 'F_RS_0001', faction: 'RS', name: 'Ilijas', created_turn: 1,
                        status: 'active', assignment: null, kind: 'brigade',
                        tags: ['generated_phase_i0', 'mun:ilijas', 'oob:rs_ilijas_brigade'],
                    },
                },
                recruitment_state: {
                    recruitment_capital: {},
                    equipment_pools: {},
                    recruited_brigade_ids: ['rs_ilijas_brigade'],
                },
            } as never,
        });

        expect(isEmergentFormationSuppressed(state, 'ilijas', 'RS')).toBe(true);
    });
});
