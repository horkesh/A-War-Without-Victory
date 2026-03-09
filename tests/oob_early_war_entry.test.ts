import assert from 'node:assert';
import { test } from 'node:test';
import type { OobBrigade, OobCorps } from '../src/scenario/oob_loader.js';
import {
    buildSidToMunFromSettlements,
    createOobFormations,
    factionHasPresenceInMun
} from '../src/scenario/oob_early_war_entry.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { RECRUITMENT_DEFAULTS } from '../src/state/recruitment_types.js';

/** Helper to create a minimal OobBrigade with recruitment defaults. */
function makeBrigade(partial: Pick<OobBrigade, 'id' | 'faction' | 'name' | 'home_mun' | 'kind'> & Partial<OobBrigade>): OobBrigade {
    return { ...RECRUITMENT_DEFAULTS, ...partial };
}

test('factionHasPresenceInMun returns false for fragmented mun', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 0, seed: 's' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { s1: 'RS' },
    municipalities: { prijedor: { control: 'fragmented' } }
  } as any,
        displacement: {} as any
    };
    const sidToMun = new Map([['s1', 'prijedor']]);
    assert.strictEqual(factionHasPresenceInMun(state, 'RS', 'prijedor', sidToMun), false);
});

test('factionHasPresenceInMun returns true when controller matches', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 0, seed: 's' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { s1: 'RS', s2: 'RBiH' },
    municipalities: { prijedor: { control: 'consolidated' } }
  } as any,
        displacement: {} as any
    };
    const sidToMun = new Map([['s1', 'prijedor'], ['s2', 'prijedor']]);
    assert.strictEqual(factionHasPresenceInMun(state, 'RS', 'prijedor', sidToMun), true);
    assert.strictEqual(factionHasPresenceInMun(state, 'RBiH', 'prijedor', sidToMun), true);
    assert.strictEqual(factionHasPresenceInMun(state, 'HRHB', 'prijedor', sidToMun), false);
});

test('buildSidToMunFromSettlements includes only entries with mun1990_id', () => {
    const settlements = new Map<string, { mun1990_id?: string }>([
        ['s1', { mun1990_id: 'prijedor' }],
        ['s2', {}],
        ['s3', { mun1990_id: 'banja_luka' }]
    ]);
    const out = buildSidToMunFromSettlements(settlements);
    assert.strictEqual(out.size, 2);
    assert.strictEqual(out.get('s1'), 'prijedor');
    assert.strictEqual(out.get('s3'), 'banja_luka');
});

test('createOobFormations is idempotent and only creates when presence', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 's' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { sid_zenica: 'RBiH' },
    municipalities: { zenica: { control: 'consolidated' }, mostar: { control: 'consolidated' } }
  } as any,
        displacement: {} as any
    };
    const sidToMun = new Map([['sid_zenica', 'zenica'], ['sid_mostar', 'mostar']]);
    const hq: Record<string, string> = { zenica: 'sid_zenica', mostar: 'sid_mostar' };
    const corps: OobCorps[] = [{ id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', hq_mun: 'zenica', kind: 'corps', available_from: 0 }];
    const brigades: OobBrigade[] = [
        makeBrigade({ id: 'arbih_7th_muslim', faction: 'RBiH', name: '7th Muslim', home_mun: 'zenica', kind: 'brigade', corps: 'arbih_3rd_corps' })
    ];

    const r1 = createOobFormations(state, corps, brigades, hq, sidToMun);
    assert.strictEqual(r1.corps_created, 1);
    assert.strictEqual(r1.brigades_created, 1);
    assert.ok(state.military.formations!['arbih_3rd_corps']);
    assert.ok(state.military.formations!['arbih_7th_muslim']);

    const r2 = createOobFormations(state, corps, brigades, hq, sidToMun);
    assert.strictEqual(r2.corps_created, 0);
    assert.strictEqual(r2.brigades_created, 0);
});

test('createOobFormations preserves army_hq corps kind', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 's' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { sid_sarajevo: 'RBiH' },
    municipalities: { centar_sarajevo: { control: 'consolidated' } }
  } as any,
        displacement: {} as any
    };
    const sidToMun = new Map([['sid_sarajevo', 'centar_sarajevo']]);
    const hq: Record<string, string> = { centar_sarajevo: 'sid_sarajevo' };
    const corps: OobCorps[] = [
        { id: 'arbih_general_staff', faction: 'RBiH', name: 'General Staff', hq_mun: 'centar_sarajevo', kind: 'army_hq', available_from: 0 }
    ];

    const report = createOobFormations(state, corps, [], hq, sidToMun);
    assert.strictEqual(report.corps_created, 1);
    assert.strictEqual(state.military.formations!['arbih_general_staff']?.kind, 'army_hq');
});

test('createOobFormations uses faction-specific initial personnel defaults', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 's' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { s_rs: 'RS', s_rbih: 'RBiH', s_hrhb: 'HRHB' },
    municipalities: { prijedor: { control: 'consolidated' }, zenica: { control: 'consolidated' }, mostar: { control: 'consolidated' } }
  } as any,
        displacement: {} as any
    };
    const sidToMun = new Map([['s_rs', 'prijedor'], ['s_rbih', 'zenica'], ['s_hrhb', 'mostar']]);
    const hq: Record<string, string> = { prijedor: 's_rs', zenica: 's_rbih', mostar: 's_hrhb' };
    const brigades: OobBrigade[] = [
        makeBrigade({ id: 'vrs_1st', faction: 'RS', name: '1st Krajina', home_mun: 'prijedor', kind: 'brigade' }),
        makeBrigade({ id: 'arbih_7th', faction: 'RBiH', name: '7th', home_mun: 'zenica', kind: 'brigade' }),
        makeBrigade({ id: 'hvo_1st', faction: 'HRHB', name: '1st', home_mun: 'mostar', kind: 'brigade' })
    ];
    createOobFormations(state, [], brigades, hq, sidToMun);
    assert.strictEqual((state.military.formations!['vrs_1st'] as { personnel?: number }).personnel, 1200, 'RS brigade starts at 1200');
    assert.strictEqual((state.military.formations!['arbih_7th'] as { personnel?: number }).personnel, 500, 'RBiH brigade starts at 500');
    assert.strictEqual((state.military.formations!['hvo_1st'] as { personnel?: number }).personnel, 800, 'HRHB brigade starts at 800');
});

test('createOobFormations tags brigades with explicit home_osid as fixed placement', () => {
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 1, seed: 's' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: { s_rs: 'RS' },
    municipalities: { prijedor: { control: 'consolidated' } }
  } as any,
        displacement: {} as any
    };
    const sidToMun = new Map([['s_rs', 'prijedor']]);
    const hq: Record<string, string> = { prijedor: 's_rs' };
    const brigades: OobBrigade[] = [
        makeBrigade({
            id: 'vrs_fixed',
            faction: 'RS',
            name: 'Fixed Brigade',
            home_mun: 'prijedor',
            kind: 'brigade',
            home_osid: 'op:prijedor:prijedor_2'
        })
    ];

    createOobFormations(state, [], brigades, hq, sidToMun);
    assert.deepStrictEqual(
        state.military.formations?.vrs_fixed?.tags?.includes('placement:fixed_home_osid'),
        true,
    );
    assert.strictEqual(state.military.formations?.vrs_fixed?.location_osid, 'op:prijedor:prijedor_2');
});
