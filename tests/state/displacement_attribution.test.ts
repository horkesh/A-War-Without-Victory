/**
 * Displacement attribution lane (SC1-SC3, 2026-11-13).
 *
 * The pressure path in `updateDisplacement` never fires in a real campaign (it is fed
 * legacy-id edges while control is OSID-keyed), so these synthetic fixtures are the only
 * place its attribution is exercised. Panel record:
 * docs/40_reports/implemented/20261113_DISPLACEMENT_ATTRIBUTION_PANEL.md.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import type { SettlementRecord } from '../../src/map/settlements.js';
import {
    resetDisplacementPressureCache,
    applyDisplacementFromFlips,
    CENSUS_FALLBACK_NATIONAL_REASON,
    NATIONAL_POPULATION_1991_SUMS,
    resolvePressingFactions,
    splitAmountByCauser,
    updateDisplacement,
} from '../../src/state/displacement.js';
import { appendDisplacementEvent, UNKNOWN_CAUSER_BUCKET } from '../../src/state/displacement_event_log.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';

type Edge = { a: string; b: string; side_a: string | null; side_b: string | null };

function stateWith(controllers: Record<string, string>, extra: Partial<GameState['political']> = {}, turn = 10): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'attribution' },
        factions: [],
        military: { formations: {}, front_segments: {}, militia_pools: {} },
        political: { political_controllers: controllers, ...extra },
        displacement: {},
    } as unknown as GameState;
}

const POCKET = new Set(['op:pocket:a', 'op:pocket:b']);

describe('resolvePressingFactions (SC1)', () => {
    it('keys the holder on who controls the municipality, not on the pool', () => {
        const state = stateWith({ 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH', 'op:ring:c': 'RS' });
        const edges: Edge[] = [{ a: 'op:pocket:a', b: 'op:ring:c', side_a: 'RBiH', side_b: 'RS' }];
        for (const pool of ['RBiH', 'RS', 'HRHB']) {
            const r = resolvePressingFactions(state, 'pocket', pool, POCKET, edges);
            expect(r.holder).toBe('RBiH');
            expect(r.causers).toEqual([{ faction: 'RS', weight: 1 }]);
        }
    });

    it('shares the cause pro rata between two enemies pressing one pocket', () => {
        const state = stateWith(
            { 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH', 'op:w:x': 'HRHB', 'op:e:y': 'RS' },
            { war_alliance_rbih_hrhb: -1 } as Partial<GameState['political']>,
            60
        );
        const edges: Edge[] = [
            { a: 'op:e:y', b: 'op:pocket:a', side_a: 'RS', side_b: 'RBiH' },
            { a: 'op:pocket:a', b: 'op:w:x', side_a: 'RBiH', side_b: 'HRHB' },
            { a: 'op:pocket:b', b: 'op:w:x', side_a: 'RBiH', side_b: 'HRHB' },
        ];
        const r = resolvePressingFactions(state, 'pocket', 'RBiH', POCKET, edges);
        expect(r.causers).toEqual([
            { faction: 'RS', weight: 1 },
            { faction: 'HRHB', weight: 2 },
        ]);
        expect(splitAmountByCauser(301, r.causers)).toEqual([
            { faction: 'RS', amount: 100 },
            { faction: 'HRHB', amount: 201 },
        ]);
    });

    it('does not blame an ally (RBiH-HRHB before their war)', () => {
        const state = stateWith({ 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH', 'op:w:x': 'HRHB' }, {}, 10);
        const edges: Edge[] = [{ a: 'op:pocket:a', b: 'op:w:x', side_a: 'RBiH', side_b: 'HRHB' }];
        const r = resolvePressingFactions(state, 'pocket', 'RBiH', POCKET, edges);
        expect(r.causers).toEqual([{ faction: UNKNOWN_CAUSER_BUCKET, weight: 1 }]);
    });

    it('falls back to enemies inside the municipality, then to "not recorded", never the holder', () => {
        const split = stateWith({ 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RS' });
        const r1 = resolvePressingFactions(split, 'pocket', 'RBiH', POCKET, []);
        expect(r1.causers).toEqual([{ faction: 'RS', weight: 1 }]);

        const alone = stateWith({ 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH', 'op:far:z': 'RS' });
        const r2 = resolvePressingFactions(alone, 'pocket', 'RBiH', POCKET, []);
        expect(r2.causers).toEqual([{ faction: UNKNOWN_CAUSER_BUCKET, weight: 1 }]);
        expect(r2.causers.every((c) => c.faction !== 'RBiH')).toBe(true);
    });

    it('ignores legacy-id edges that do not match the OSID settlement ids', () => {
        const state = stateWith({ 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH' });
        const legacy: Edge[] = [{ a: 'S100013', b: 'S100056', side_a: 'RBiH', side_b: 'RS' }];
        const r = resolvePressingFactions(state, 'pocket', 'RBiH', POCKET, legacy);
        expect(r.causers).toEqual([{ faction: UNKNOWN_CAUSER_BUCKET, weight: 1 }]);
    });
});

describe('appendDisplacementEvent with an unrecorded causer', () => {
    it('books to the unknown bucket instead of the origin controller', () => {
        const state = stateWith({ 'op:pocket:a': 'RBiH' });
        appendDisplacementEvent(
            state,
            { turn: 1, origin_mun: 'pocket', origin_osid: 'op:pocket:a', dest_mun: 'pocket', ethnicity: 'RBiH', displaced: 10, killed: 2, fled_abroad: 0, settled: 0 },
            { causerUnrecorded: true }
        );
        const agg = state.displacement.displacement_humanitarian_aggregates ?? {};
        expect(agg[UNKNOWN_CAUSER_BUCKET]?.RBiH?.civilian_casualties_caused).toBe(2);
        expect(agg.RBiH).toBeUndefined();
    });
});

/** An RBiH pocket that is the faction's only municipality (so "encircled" fires), ringed by RS. */
function encircledPocketFixture() {
    const controllers = { 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH', 'op:ring:c': 'RS', 'op:ring:d': 'RS' };
    const state = stateWith(controllers);
    (state.military as unknown as Record<string, unknown>).front_segments = {
        'op:pocket:a__op:ring:c': { edge_id: 'op:pocket:a__op:ring:c', active: true },
    };
    (state.military as unknown as Record<string, unknown>).front_pressure = {};
    state.military.militia_pools = {
        'pocket:RBiH': { mun_id: 'pocket', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 9 },
        'pocket:RS': { mun_id: 'pocket', faction: 'RS', available: 0, committed: 0, exhausted: 0, updated_turn: 9 },
    } as unknown as GameState['military']['militia_pools'];
    state.displacement.displacement_state = {
        pocket: { mun_id: 'pocket', original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 },
    };
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const edges = [{ a: 'op:pocket:a', b: 'op:ring:c' }];
    const census: MunicipalityPopulation1991Map = {
        pocket: { total: 10000, bosniak: 6000, serb: 3000, croat: 1000, other: 0 },
        ring: { total: 10000, bosniak: 0, serb: 10000, croat: 0, other: 0 },
    } as MunicipalityPopulation1991Map;
    return { state, settlements, edges, census };
}

describe('updateDisplacement pressure path (SC1 end to end)', () => {
    beforeEach(() => resetDisplacementPressureCache());

    it('books an encircled pocket\'s losses to the besieger, for every people in it', () => {
        const { state, settlements, edges, census } = encircledPocketFixture();
        updateDisplacement(state, settlements, edges, census);
        const agg = state.displacement.displacement_humanitarian_aggregates ?? {};
        const causers = Object.keys(agg).filter((c) =>
            Object.values(agg[c] ?? {}).some((s) => s.refugees_created > 0 || s.civilian_casualties_caused > 0)
        );
        expect(causers).toEqual(['RS']);
        // P1a: Bosniaks displaced by RS use the RS-displacing-Bosniaks rate (4%).
        // 10% of 10,000 encircled = 1,000 displaced; 60% Bosniak = 600; 4% killed = 24.
        expect(state.displacement.civilian_casualties?.RBiH?.killed).toBe(24);
    });
});

describe('no-census fallback (SC2)', () => {
    it('pins the national 1991 sums to the census file', async () => {
        const { readFileSync } = await import('node:fs');
        const census = JSON.parse(readFileSync('data/derived/municipality_population_1991.json', 'utf8')) as {
            by_mun1990_id: Record<string, { breakdown?: Record<string, number> } & Record<string, unknown>>;
        };
        const sums = { total: 0, bosniak: 0, serb: 0, croat: 0, other: 0 };
        for (const id of Object.keys(census.by_mun1990_id).sort()) {
            const e = (census.by_mun1990_id[id].breakdown ?? census.by_mun1990_id[id]) as Record<string, number>;
            for (const k of Object.keys(sums) as Array<keyof typeof sums>) sums[k] += e[k] ?? 0;
        }
        expect(sums).toEqual({ ...NATIONAL_POPULATION_1991_SUMS });
    });

    it('every OSID municipality slug resolves to a census entry (hanpijesak is the one known miss)', async () => {
        const { readFileSync } = await import('node:fs');
        const pc = JSON.parse(readFileSync('data/derived/operational/operational_political_control.json', 'utf8')) as {
            by_settlement_id: Record<string, unknown>;
        };
        const census = JSON.parse(readFileSync('data/derived/municipality_population_1991.json', 'utf8')) as {
            by_mun1990_id: Record<string, unknown>;
        };
        const slugs = new Set(Object.keys(pc.by_settlement_id).filter((k) => k.startsWith('op:')).map((k) => k.split(':')[1]));
        const missing = [...slugs].filter((s) => !(s in census.by_mun1990_id)).sort();
        // `hanpijesak` (OSID slug) vs `han_pijesak` (census key): its fix is its own measured change.
        expect(missing).toEqual(['hanpijesak']);
    });

    it('splits a pocket without a census entry by the national sums, tags it, and books no extra killed Bosniaks', () => {
        resetDisplacementPressureCache();
        const { state, settlements, edges } = encircledPocketFixture();
        const report = updateDisplacement(state, settlements, edges, {} as MunicipalityPopulation1991Map);
        const rec = report.by_municipality.find((r) => r.mun_id === 'pocket');
        expect(rec?.reason).toContain(CENSUS_FALLBACK_NATIONAL_REASON);
        // 1,000 displaced split nationally: Serbs floor(1000*1366013/4360093)=313,
        // Croats floor(1000*760847/4360093)=174, Bosniaks+others 513. Caused by RS:
        // killed Bosniaks 4% = 20, Serbs 2% = 6, Croats 1% = 1.
        const cc = state.displacement.civilian_casualties ?? {};
        expect(cc.RBiH?.killed).toBe(20);
        expect(cc.RS?.killed).toBe(6);
        expect(cc.HRHB?.killed).toBe(1);
    });
});

describe('early-war flips path (SC2/P3)', () => {
    it('books the loss to the losing side\'s people only, caused by the capturer', () => {
        const state = stateWith({ 'op:town:a': 'RS', 'op:town:b': 'RS', 'op:home:c': 'RBiH' }, {}, 3);
        state.displacement.displacement_state = {
            town: { mun_id: 'town', original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 2 },
        };
        const settlements = new Map<string, SettlementRecord>();
        for (const sid of ['op:town:a', 'op:town:b', 'op:home:c']) {
            const mun = sid.split(':')[1];
            settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
        }
        const census = { town: { total: 10000, bosniak: 5000, serb: 4000, croat: 1000, other: 0 } } as MunicipalityPopulation1991Map;
        applyDisplacementFromFlips(
            state, 3,
            [{ mun_id: 'town', from_faction: 'RBiH', to_faction: 'RS' }],
            [{ mun_id: 'town', initiated_turn: 3 }],
            settlements, {}, census
        );
        const agg = state.displacement.displacement_humanitarian_aggregates ?? {};
        expect(Object.keys(agg.RS ?? {})).toEqual(['RBiH']);
        expect(state.displacement.civilian_casualties?.RS).toBeUndefined();
        expect(state.displacement.civilian_casualties?.HRHB).toBeUndefined();
    });
});

/** For each people: civilian_casualties[people].killed vs killed summed into the aggregates. */
function killedBothWays(state: GameState): { casualties: Record<string, number>; aggregates: Record<string, number> } {
    const casualties: Record<string, number> = {};
    for (const [p, v] of Object.entries(state.displacement.civilian_casualties ?? {})) casualties[p] = v.killed;
    const aggregates: Record<string, number> = {};
    for (const byPeople of Object.values(state.displacement.displacement_humanitarian_aggregates ?? {})) {
        for (const [p, slot] of Object.entries(byPeople)) {
            if (slot.civilian_casualties_caused > 0) aggregates[p] = (aggregates[p] ?? 0) + slot.civilian_casualties_caused;
        }
    }
    return { casualties, aggregates };
}

describe('the two ledger "Killed" figures agree by construction (SC3 invariant)', () => {
    beforeEach(() => resetDisplacementPressureCache());

    it('pressure path, census split across three peoples with different flee-abroad rates', () => {
        const { state, settlements, edges, census } = encircledPocketFixture();
        updateDisplacement(state, settlements, edges, census);
        const { casualties, aggregates } = killedBothWays(state);
        expect(aggregates).toEqual(casualties);
        // Refugees created per people equal that people's displaced total (600 / 300 / 100).
        const rs = state.displacement.displacement_humanitarian_aggregates?.RS ?? {};
        expect([rs.RBiH?.refugees_created, rs.RS?.refugees_created, rs.HRHB?.refugees_created]).toEqual([600, 300, 100]);
    });

    it('pressure path, national fallback and two causers', () => {
        const { state, settlements, census } = encircledPocketFixture();
        state.political.political_controllers!['op:pocket:b'] = 'HRHB';
        (state.political as unknown as Record<string, unknown>).war_alliance_rbih_hrhb = -1;
        state.meta.turn = 60;
        const edges = [{ a: 'op:pocket:a', b: 'op:ring:c' }, { a: 'op:pocket:a', b: 'op:pocket:b' }];
        (state.military as unknown as Record<string, Record<string, unknown>>).front_segments['op:pocket:a__op:pocket:b'] =
            { edge_id: 'op:pocket:a__op:pocket:b', active: true };
        delete (census as Record<string, unknown>).pocket;
        updateDisplacement(state, settlements, edges, census);
        const { casualties, aggregates } = killedBothWays(state);
        expect(aggregates).toEqual(casualties);
    });
});
