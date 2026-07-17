import { expect, test } from 'vitest';
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
    expect(factionHasPresenceInMun(state, 'RS', 'prijedor', sidToMun)).toBe(false);
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
    expect(factionHasPresenceInMun(state, 'RS', 'prijedor', sidToMun)).toBe(true);
    expect(factionHasPresenceInMun(state, 'RBiH', 'prijedor', sidToMun)).toBe(true);
    expect(factionHasPresenceInMun(state, 'HRHB', 'prijedor', sidToMun)).toBe(false);
});

test('buildSidToMunFromSettlements includes only entries with mun1990_id', () => {
    const settlements = new Map<string, { mun1990_id?: string }>([
        ['s1', { mun1990_id: 'prijedor' }],
        ['s2', {}],
        ['s3', { mun1990_id: 'banja_luka' }]
    ]);
    const out = buildSidToMunFromSettlements(settlements);
    expect(out.size).toBe(2);
    expect(out.get('s1')).toBe('prijedor');
    expect(out.get('s3')).toBe('banja_luka');
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
    expect(r1.corps_created).toBe(1);
    expect(r1.brigades_created).toBe(1);
    expect(state.military.formations!['arbih_3rd_corps']).toBeTruthy();
    expect(state.military.formations!['arbih_7th_muslim']).toBeTruthy();

    const r2 = createOobFormations(state, corps, brigades, hq, sidToMun);
    expect(r2.corps_created).toBe(0);
    expect(r2.brigades_created).toBe(0);
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
    expect(report.corps_created).toBe(1);
    expect(state.military.formations!['arbih_general_staff']?.kind).toBe('army_hq');
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
    expect((state.military.formations!['vrs_1st'] as { personnel?: number }).personnel).toBe(1200);
    expect((state.military.formations!['arbih_7th'] as { personnel?: number }).personnel).toBe(500);
    expect((state.military.formations!['hvo_1st'] as { personnel?: number }).personnel).toBe(800);
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
    political_controllers: {
      s_rs: 'RS',
      'op:prijedor:prijedor_2': 'RS'
    },
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
    expect(state.military.formations?.vrs_fixed?.tags?.includes('placement:fixed_home_osid')).toEqual(true);
    expect(state.military.formations?.vrs_fixed?.location_osid).toBe('op:prijedor:prijedor_2');
});

test('createOobFormations honors a controlled deployment_osid outside the home municipality', () => {
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
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {
                'op:kakanj:home': 'RBiH',
                'op:kalesija:deployment': 'RBiH',
            },
            municipalities: { kakanj: { control: 'consolidated' } },
        } as any,
        displacement: {} as any,
    };
    const sidToMun = new Map([['op:kakanj:home', 'kakanj']]);
    const brigades: OobBrigade[] = [
        makeBrigade({
            id: 'arbih_deployed',
            faction: 'RBiH',
            name: 'Deployed Brigade',
            home_mun: 'kakanj',
            kind: 'brigade',
            home_osid: 'op:kakanj:home',
            deployment_osid: 'op:kalesija:deployment',
        }),
    ];

    createOobFormations(state, [], brigades, { kakanj: 'op:kakanj:home' }, sidToMun);

    expect(state.military.formations?.arbih_deployed?.location_osid).toBe('op:kalesija:deployment');
    expect(state.military.formations?.arbih_deployed?.home_osid).toBe('op:kakanj:home');
    expect(state.military.formations?.arbih_deployed?.tags?.includes('placement:fixed_home_osid')).toBe(false);
});
