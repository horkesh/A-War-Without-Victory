import assert from 'node:assert';
import { test } from 'node:test';
import type { SettlementRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { seedOrganizationalPenetrationFromControl } from '../src/state/seed_organizational_penetration_from_control.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'seed-org-pen-test', phase: 'phase_0' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            },
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            },
            {
                id: 'HRHB',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            SID_A_1: 'RS',
            SID_A_2: 'RS',
            SID_B_1: 'RBiH',
            SID_B_2: 'RBiH'
        },
        municipalities: {
            mun_a: {},
            mun_b: {}
        }
    };
}

function makeSettlements(): Map<string, SettlementRecord> {
    return new Map<string, SettlementRecord>([
        ['SID_A_1', { mun_code: 'mun_a', mun1990_id: 'mun_a' } as SettlementRecord],
        ['SID_A_2', { mun_code: 'mun_a', mun1990_id: 'mun_a' } as SettlementRecord],
        ['SID_B_1', { mun_code: 'mun_b', mun1990_id: 'mun_b' } as SettlementRecord],
        ['SID_B_2', { mun_code: 'mun_b', mun1990_id: 'mun_b' } as SettlementRecord]
    ]);
}

test('seed function is deterministic for same inputs', () => {
    const left = makeState();
    const right = makeState();
    const settlements = makeSettlements();
    const options = {
        municipality_controller_by_mun: { mun_a: 'RS' as const, mun_b: 'RBiH' as const },
        population_1991_by_mun: {
            mun_a: { total: 1000, bosniak: 120, serb: 760, croat: 80, other: 40 },
            mun_b: { total: 1000, bosniak: 700, serb: 120, croat: 100, other: 80 }
        },
        planned_war_start_brigade_by_mun: {
            mun_a: { RS: true, RBiH: false, HRHB: false },
            mun_b: { RS: false, RBiH: false, HRHB: false }
        }
    };
    seedOrganizationalPenetrationFromControl(left, settlements, options);
    seedOrganizationalPenetrationFromControl(right, settlements, options);
    assert.deepStrictEqual(left.municipalities, right.municipalities);
});

test('A/B/C factors create municipality variance in seeded organizational penetration', () => {
    const state = makeState();
    seedOrganizationalPenetrationFromControl(state, makeSettlements(), {
        municipality_controller_by_mun: { mun_a: 'RS', mun_b: 'RBiH' },
        population_1991_by_mun: {
            mun_a: { total: 1000, bosniak: 120, serb: 760, croat: 80, other: 40 },
            mun_b: { total: 1000, bosniak: 700, serb: 120, croat: 100, other: 80 }
        },
        planned_war_start_brigade_by_mun: {
            mun_a: { RS: true },
            mun_b: { RBiH: false }
        }
    });

    const munA = state.municipalities?.mun_a?.organizational_penetration;
    const munB = state.municipalities?.mun_b?.organizational_penetration;
    assert.ok(munA && munB);

    assert.ok((munA.sds_penetration ?? 0) > (munB.sds_penetration ?? 0), 'RS signals in mun_a should raise SDS penetration');
    assert.ok((munB.sda_penetration ?? 0) > (munA.sda_penetration ?? 0), 'RBiH signals in mun_b should raise SDA penetration');
    assert.ok((munA.paramilitary_rs ?? 0) > (munB.paramilitary_rs ?? 0), 'war-start RS brigade in mun_a should raise RS paramilitary');
});

test('mun id normalization bridges alias mismatches deterministically', () => {
    const state = makeState();
    seedOrganizationalPenetrationFromControl(state, makeSettlements(), {
        municipality_controller_by_mun: { muna: 'RS', munb: 'RBiH' },
        population_1991_by_mun: {
            muna: { total: 1000, bosniak: 120, serb: 760, croat: 80, other: 40 },
            munb: { total: 1000, bosniak: 700, serb: 120, croat: 100, other: 80 }
        },
        planned_war_start_brigade_by_mun: {
            muna: { RS: true },
            munb: { RBiH: true }
        }
    });

    const munA = state.municipalities?.mun_a?.organizational_penetration;
    const munB = state.municipalities?.mun_b?.organizational_penetration;
    assert.ok(munA && munB);
    assert.ok((munA.sds_penetration ?? 0) > 20);
    assert.ok((munB.sda_penetration ?? 0) > 20);
});
