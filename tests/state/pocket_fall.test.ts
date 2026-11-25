/**
 * A9 P0-A (SD13, 8-seat §6 ruling D1-D7, 2026-11-25; orchestrator ruling on the originals branch): the
 * pocket-fall step. Aggregates only; no score, no event log, no pool, no formation is touched.
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import { ENCLAVE_OVERRUN_KILL_FRACTION } from '../../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState, type HostileTakeoverTimerState } from '../../src/state/game_state.js';
import {
    ASSAULTED_POCKET_FALL_KILL_RATIO,
    POCKET_FALL_NEGOTIATED_FLAG,
    processPocketFalls,
} from '../../src/state/pocket_fall.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

type Disp = { original_population: number; displaced_out?: number; displaced_in?: number; lost_population?: number; by_faction?: Record<string, number> };

interface World {
    state: GameState;
    settlements: Map<string, SettlementRecord>;
    edges: EdgeRecord[];
    supplied: Map<string, ReadonlySet<string>>;
    census: MunicipalityPopulation1991Map;
}

/**
 * RBiH main body: tuzla (t1, t2) + kladanj (k1), supplied. A separate, supplied, smaller RBiH body: zivinice
 * (z1). Survivors may land only in tuzla/kladanj. Capacity (1.5 x original - current): tuzla 5,000,
 * kladanj 1,000, zivinice 5,000.
 */
function world(opts: {
    controllers: Record<string, string>;
    extraEdges?: EdgeRecord[];
    disp: Record<string, Disp>;
    timers?: Record<string, HostileTakeoverTimerState>;
    flags?: Record<string, boolean>;
    census?: MunicipalityPopulation1991Map;
    turn?: number;
}): World {
    const controllers: Record<string, string> = {
        'op:tuzla:t1': 'RBiH',
        'op:tuzla:t2': 'RBiH',
        'op:kladanj:k1': 'RBiH',
        'op:zivinice:z1': 'RBiH',
        'op:bratunac:r1': 'RS',
        ...opts.controllers,
    };
    const edges: EdgeRecord[] = [
        { a: 'op:tuzla:t1', b: 'op:tuzla:t2' },
        { a: 'op:tuzla:t2', b: 'op:kladanj:k1' },
        ...(opts.extraEdges ?? []),
    ];
    // Every pocket settlement touches only the RS ring unless a test links it.
    for (const sid of Object.keys(opts.controllers)) edges.push({ a: sid, b: 'op:bratunac:r1' });
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers).sort()) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const displacement_state: Record<string, unknown> = {};
    const allDisp: Record<string, Disp> = {
        tuzla: { original_population: 10000 },
        kladanj: { original_population: 2000 },
        zivinice: { original_population: 10000 },
        bratunac: { original_population: 30000 },
        ...opts.disp,
    };
    for (const [m, d] of Object.entries(allDisp)) {
        displacement_state[m] = {
            mun_id: m,
            original_population: d.original_population,
            displaced_out: d.displaced_out ?? 0,
            displaced_in: d.displaced_in ?? 0,
            lost_population: d.lost_population ?? 0,
            last_updated_turn: 0,
            ...(d.by_faction ? { displaced_in_by_faction: { ...d.by_faction } } : {}),
        };
    }
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: opts.turn ?? 170, seed: 'pocket-fall', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({ id, supply_sources: id === 'RBiH' ? ['S_home'] : [] })),
        military: {
            formations: {
                'arbih-28': { id: 'arbih-28', faction: 'RBiH', kind: 'brigade', status: 'active', personnel: 1200, location_osid: 'op:tuzla:t1' },
                'vrs-drina': { id: 'vrs-drina', faction: 'RS', kind: 'brigade', status: 'active', personnel: 2000, location_osid: 'op:bratunac:r1' },
            },
            militia_pools: {
                'srebrenica:RBiH': { mun_id: 'srebrenica', faction: 'RBiH', available: 500, committed: 0, exhausted: 0, updated_turn: 1 },
                'tuzla:RBiH': { mun_id: 'tuzla', faction: 'RBiH', available: 900, committed: 0, exhausted: 0, updated_turn: 1 },
                'bratunac:RS': { mun_id: 'bratunac', faction: 'RS', available: 700, committed: 0, exhausted: 0, updated_turn: 1 },
            },
            event_flags: { ...(opts.flags ?? {}) },
        },
        political: { political_controllers: controllers },
        displacement: {
            displacement_state,
            hostile_takeover_timers: opts.timers ?? {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            civilian_casualties: {},
        },
    } as unknown as GameState;
    const supplied = new Map<string, ReadonlySet<string>>([
        ['RBiH', new Set(['op:tuzla:t1', 'op:tuzla:t2', 'op:kladanj:k1', 'op:zivinice:z1'])],
        ['RS', new Set(['op:bratunac:r1'])],
        ['HRHB', new Set<string>()],
    ]);
    const census = opts.census ?? ({
        srebrenica: { total: 37000, bosniak: 27000, serb: 10000, croat: 0, other: 0 },
        rogatica: { total: 21800, bosniak: 13200, serb: 8400, croat: 0, other: 200 },
        gorazde: { total: 37500, bosniak: 26500, serb: 10000, croat: 0, other: 1000 },
        zenica: { total: 145000, bosniak: 80000, serb: 22000, croat: 22000, other: 21000 },
        vlasenica: { total: 33900, bosniak: 18700, serb: 14400, croat: 0, other: 800 },
    } as MunicipalityPopulation1991Map);
    return { state, settlements, edges, supplied, census };
}

function run(w: World) {
    return processPocketFalls(w.state, w.settlements, w.edges, w.supplied, w.census);
}

const ds = (w: World, m: string) => w.state.displacement.displacement_state[m]!;

/** A control writer this turn (the fixture always has a controllers record). */
function setController(w: World, sid: string, side: 'RBiH' | 'RS' | 'HRHB'): void {
    (w.state.political.political_controllers ??= {})[sid] = side;
}

/** RBiH census share of `remaining` in a municipality with no Croats (other goes to RBiH). */
function rbihShare(remaining: number, serb: number, total: number): number {
    return remaining - Math.floor((remaining * serb) / total);
}

function srebrenicaWorld(opts: { holdLast?: boolean; timers?: Record<string, HostileTakeoverTimerState>; turn?: number } = {}): World {
    return world({
        turn: opts.turn,
        controllers: {
            'op:srebrenica:srebrenica_2': 'RS',
            'op:srebrenica:suceska': opts.holdLast ? 'RBiH' : 'RS',
        },
        disp: {
            srebrenica: { original_population: 37000, displaced_out: 20000, lost_population: 1000, displaced_in: 9000, by_faction: { RBiH: 8000, RS: 1000 } },
        },
        timers: opts.timers,
    });
}

describe('P0-A: an enclave fall tests the link from the enclave, not the whole municipality', () => {
    // Measured on the 188w pair: Rogatica's RS-held cells touch the Goražde pocket, so the whole-municipality
    // link found a "destination" in another besieged pocket across RS ground and Žepa never fired.
    it('Žepa-shaped: an RS cell of the municipality touches another RBiH pocket; the fall still fires', () => {
        const w = world({
            turn: 173,
            controllers: { 'op:rogatica:zepa_2': 'RS', 'op:rogatica:r_rs': 'RS', 'op:gorazde:g1': 'RBiH' },
            extraEdges: [{ a: 'op:rogatica:r_rs', b: 'op:gorazde:g1' }],
            disp: {
                rogatica: { original_population: 21800, displaced_out: 9000, lost_population: 2000, displaced_in: 20000, by_faction: { RS: 20000 } },
                gorazde: { original_population: 37500 },
            },
        });
        const report = run(w);
        expect(report.same_body_moves).toHaveLength(0);
        expect(report.firings).toHaveLength(1);
        const f = report.firings[0];
        expect(f.mun_id).toBe('rogatica');
        expect(f.side).toBe('RBiH');
        expect(f.left).toBeGreaterThan(0);
        expect(ds(w, 'gorazde').displaced_in).toBe(0);
        expect(ds(w, 'rogatica').displaced_in_by_faction?.RS).toBe(20000);
    });
});

describe('P0-A: assaulted enclave fall (Srebrenica-shaped)', () => {
    it('the ratio is the single sourced constant, and the takeover overrun reads the same value', () => {
        expect(ASSAULTED_POCKET_FALL_KILL_RATIO).toBe(0.19);
        expect(ENCLAVE_OVERRUN_KILL_FRACTION).toBe(ASSAULTED_POCKET_FALL_KILL_RATIO);
    });

    it('does not fire while the side still holds a settlement in the municipality', () => {
        const w = srebrenicaWorld({ holdLast: true });
        const before = JSON.stringify(w.state);
        expect(run(w).firings).toEqual([]);
        expect(JSON.stringify(w.state)).toBe(before);
    });

    it('fires the turn the last settlement is lost; conservation, main body only, overflow abroad, nothing else touched', () => {
        const w = srebrenicaWorld({ holdLast: true });
        expect(run(w).firings).toEqual([]);
        // The same turn, a control writer takes the last RBiH settlement.
        setController(w, 'op:srebrenica:suceska', 'RS');
        const formationsBefore = structuredClone(w.state.military.formations);
        const poolsBefore = structuredClone(w.state.military.militia_pools);
        const untouched = (s: GameState) => JSON.stringify([
            s.displacement.displacement_event_log,
            s.displacement.displacement_humanitarian_aggregates,
            s.displacement.displacement_origin_dest_arrivals,
            s.displacement.civilian_casualties,
            s.displacement.hostile_takeover_timers,
            s.military.event_flags,
        ]);
        const untouchedBefore = untouched(w.state);

        const report = run(w);

        const sheltered = 8000;
        const originals = rbihShare(37000 - 20000 - 1000, 10000, 37000);
        const taken = sheltered + originals;
        const killed = Math.floor(taken * 0.19);
        const killedOriginals = Math.floor((killed * originals) / taken);
        expect(report.firings).toHaveLength(1);
        const rec = report.firings[0]!;
        expect(rec).toMatchObject({ turn: 170, mun_id: 'srebrenica', side: 'RBiH', captor: 'RS', killed, negotiated: false, reason: 'pocket_fall' });
        expect((rec.killed ?? 0) + rec.left).toBe(taken);
        expect(rec.left).toBe(rec.routed + rec.fled_abroad);
        // Main-body capacity is 5,000 (tuzla) + 1,000 (kladanj); the rest fled abroad.
        expect(rec.routed).toBe(6000);
        expect(rec.fled_abroad).toBe(taken - killed - 6000);
        expect(ds(w, 'tuzla').displaced_in_by_faction).toEqual({ RBiH: 5000 });
        expect(ds(w, 'kladanj').displaced_in_by_faction).toEqual({ RBiH: 1000 });
        expect(ds(w, 'zivinice').displaced_in).toBe(0);
        expect(ds(w, 'bratunac').displaced_in).toBe(0);

        const s = ds(w, 'srebrenica');
        expect(s.displaced_in).toBe(1000);
        expect(s.displaced_in_by_faction).toEqual({ RS: 1000 });
        expect(s.displaced_out).toBe(20000 + originals - killedOriginals);
        expect(s.lost_population).toBe(1000 + killedOriginals);
        expect(s.pocket_fall_originals_booked_by_side).toEqual({ RBiH: 170 });
        expect(w.state.displacement.pocket_fall_records).toEqual([rec]);

        expect(w.state.military.formations).toEqual(formationsBefore);
        expect(w.state.military.militia_pools).toEqual(poolsBefore);
        expect(untouched(w.state)).toBe(untouchedBefore);
        expect(w.state.displacement.moved_on_at_capture_by_people).toBeUndefined();
    });

    it('is idempotent: a second call (same or later turn) finds nothing and writes one record only', () => {
        const w = srebrenicaWorld();
        expect(run(w).firings).toHaveLength(1);
        const after = JSON.stringify(w.state);
        expect(run(w).firings).toEqual([]);
        w.state.meta.turn = 171;
        expect(run(w).firings).toEqual([]);
        w.state.meta.turn = 170;
        expect(JSON.stringify(w.state)).toBe(after);
        expect(w.state.displacement.pocket_fall_records).toHaveLength(1);
    });
});

describe('P0-A: negotiated fall (Žepa-shaped)', () => {
    function zepaWorld(flag: boolean): World {
        return world({
            controllers: { 'op:rogatica:zepa_2': 'RS', 'op:rogatica:rogatica_2': 'RS' },
            disp: { rogatica: { original_population: 21800, displaced_out: 12000, lost_population: 500, displaced_in: 23000, by_faction: { RS: 22903, RBiH: 97 } } },
            flags: flag ? { [POCKET_FALL_NEGOTIATED_FLAG]: true } : {},
        });
    }

    it('killed is not recorded (null), negotiated is true, nobody is killed, and the captor\'s sheltered stay', () => {
        const w = zepaWorld(true);
        const rec = run(w).firings[0]!;
        const originals = (21800 - 12000 - 500) - Math.floor(((21800 - 12000 - 500) * 8400) / 21800);
        expect(rec).toMatchObject({ mun_id: 'rogatica', side: 'RBiH', captor: 'RS', killed: null, negotiated: true });
        expect(rec.left).toBe(97 + originals);
        const r = ds(w, 'rogatica');
        expect(r.displaced_in_by_faction).toEqual({ RS: 22903 });
        expect(r.displaced_in).toBe(22903);
        expect(r.lost_population).toBe(500);
        expect(r.displaced_out).toBe(12000 + originals);
    });

    it('without the authored flag the same fall is assaulted', () => {
        const rec = run(zepaWorld(false)).firings[0]!;
        expect(rec.negotiated).toBe(false);
        expect(rec.killed).toBe(Math.floor((rec.left + (rec.killed ?? 0)) * 0.19));
        expect(rec.killed).toBeGreaterThan(0);
    });
});

describe('P0-A: outside an enclave', () => {
    it('a zero-ground municipality with a sheltered stock: killed 0, no originals, a record', () => {
        const w = world({
            controllers: { 'op:vlasenica:v1': 'RS', 'op:vlasenica:v2': 'RS' },
            disp: { vlasenica: { original_population: 33900, displaced_out: 15000, displaced_in: 500, by_faction: { RBiH: 500 } } },
        });
        const rec = run(w).firings[0]!;
        expect(rec).toMatchObject({ mun_id: 'vlasenica', side: 'RBiH', captor: 'RS', killed: 0, negotiated: false, routed: 500, fled_abroad: 0, left: 500 });
        expect(ds(w, 'vlasenica').displaced_out).toBe(15000);
        expect(ds(w, 'vlasenica').pocket_fall_originals_booked_by_side).toBeUndefined();
        expect(ds(w, 'vlasenica').displaced_in).toBe(0);
    });

    it('zenica|HRHB-shaped: zero ground, a census share, no timers, no HRHB enclave: no originals and no record', () => {
        const w = world({
            controllers: { 'op:zenica:zenica_2': 'RBiH', 'op:zenica:n2': 'RBiH' },
            disp: { zenica: { original_population: 145000, displaced_out: 10000 } },
        });
        const before = JSON.stringify(w.state);
        expect(run(w).firings).toEqual([]);
        expect(JSON.stringify(w.state)).toBe(before);
        expect(w.state.displacement.pocket_fall_records).toBeUndefined();
    });

    it('zenica|HRHB-shaped with a sheltered HRHB stock: the stock leaves, killed 0, originals untouched', () => {
        const w = world({
            controllers: { 'op:zenica:zenica_2': 'RBiH', 'op:zenica:n2': 'RBiH' },
            disp: { zenica: { original_population: 145000, displaced_out: 10000, displaced_in: 300, by_faction: { HRHB: 300 } } },
        });
        const rec = run(w).firings[0]!;
        // HRHB holds no ground anywhere in the fixture: no main body, so the stock fled abroad.
        expect(rec).toMatchObject({ mun_id: 'zenica', side: 'HRHB', captor: 'RBiH', killed: 0, routed: 0, fled_abroad: 300, left: 300 });
        expect(ds(w, 'zenica').displaced_out).toBe(10000);
        expect(ds(w, 'zenica').pocket_fall_originals_booked_by_side).toBeUndefined();
    });
});

describe('P0-A: the resolver gives a destination (D7)', () => {
    it('the sheltered stock moves within capacity, nobody is killed, no record, originals untouched', () => {
        const w = world({
            controllers: { 'op:kalesija:ka1': 'RS' },
            // Linked: a kalesija settlement touches the RBiH main body.
            extraEdges: [{ a: 'op:kalesija:ka1', b: 'op:tuzla:t2' }],
            disp: { kalesija: { original_population: 40000, displaced_out: 5000, displaced_in: 400, by_faction: { RBiH: 400 } } },
        });
        const report = run(w);
        expect(report.firings).toEqual([]);
        expect(report.same_body_moves.reduce((s, r) => s + r.amount, 0)).toBe(400);
        expect(w.state.displacement.pocket_fall_records).toBeUndefined();
        const k = ds(w, 'kalesija');
        expect(k.displaced_in).toBe(0);
        expect(k.displaced_in_by_faction).toEqual({});
        expect(k.displaced_out).toBe(5000);
        expect(k.lost_population).toBe(0);
        expect((ds(w, 'tuzla').displaced_in ?? 0) + (ds(w, 'kladanj').displaced_in ?? 0)).toBe(400);
    });
});

describe('P0-A: originals branch (takeover timers and the booked-once marker)', () => {
    const timer = (extra: Partial<HostileTakeoverTimerState>): Record<string, HostileTakeoverTimerState> => ({
        'op:srebrenica:srebrenica_2|RBiH': { mun_id: 'srebrenica', from_faction: 'RBiH', to_faction: 'RS', started_turn: 168, ...extra },
    });

    it('a pending timer stops the originals; only the sheltered stock is taken', () => {
        const w = srebrenicaWorld({ timers: timer({}) });
        const rec = run(w).firings[0]!;
        expect((rec.killed ?? 0) + rec.left).toBe(8000);
        expect(ds(w, 'srebrenica').displaced_out).toBe(20000);
        expect(ds(w, 'srebrenica').pocket_fall_originals_booked_by_side).toBeUndefined();
    });

    it('a dormant timer stops the originals', () => {
        const w = srebrenicaWorld({ timers: timer({ matured_turn: 150, dormant_since_turn: 160 }) });
        const rec = run(w).firings[0]!;
        expect((rec.killed ?? 0) + rec.left).toBe(8000);
        expect(ds(w, 'srebrenica').displaced_out).toBe(20000);
    });

    it('a matured timer does not block: the originals branch fires', () => {
        const w = srebrenicaWorld({ timers: timer({ matured_turn: 150 }) });
        const rec = run(w).firings[0]!;
        expect((rec.killed ?? 0) + rec.left).toBe(8000 + rbihShare(16000, 10000, 37000));
        expect(ds(w, 'srebrenica').pocket_fall_originals_booked_by_side).toEqual({ RBiH: 170 });
    });

    it('the marker blocks a second originals booking', () => {
        const w = srebrenicaWorld();
        ds(w, 'srebrenica').pocket_fall_originals_booked_by_side = { RBiH: 120 };
        const rec = run(w).firings[0]!;
        expect((rec.killed ?? 0) + rec.left).toBe(8000);
        expect(ds(w, 'srebrenica').displaced_out).toBe(20000);
        expect(ds(w, 'srebrenica').pocket_fall_originals_booked_by_side).toEqual({ RBiH: 120 });
    });

    it('two falls of the same side: Srebrenica at t, Žepa at t+2; each books its originals exactly once', () => {
        const w = world({
            turn: 170,
            controllers: {
                'op:srebrenica:srebrenica_2': 'RS',
                'op:rogatica:zepa_2': 'RBiH',
                'op:rogatica:rogatica_2': 'RS',
            },
            disp: {
                srebrenica: { original_population: 37000, displaced_out: 20000, lost_population: 1000 },
                rogatica: { original_population: 21800, displaced_out: 12000, lost_population: 500, displaced_in: 22903, by_faction: { RS: 22903 } },
            },
        });
        const first = run(w).firings;
        expect(first.map((r) => r.mun_id)).toEqual(['srebrenica']);
        expect(ds(w, 'srebrenica').pocket_fall_originals_booked_by_side).toEqual({ RBiH: 170 });
        expect(ds(w, 'rogatica').pocket_fall_originals_booked_by_side).toBeUndefined();

        w.state.meta.turn = 171;
        expect(run(w).firings).toEqual([]);

        w.state.meta.turn = 172;
        setController(w, 'op:rogatica:zepa_2', 'RS');
        const second = run(w).firings;
        expect(second.map((r) => r.mun_id)).toEqual(['rogatica']);
        const zepaOriginals = 9300 - Math.floor((9300 * 8400) / 21800);
        expect((second[0]!.killed ?? 0) + second[0]!.left).toBe(zepaOriginals);
        expect(ds(w, 'rogatica').pocket_fall_originals_booked_by_side).toEqual({ RBiH: 172 });
        expect(ds(w, 'srebrenica').pocket_fall_originals_booked_by_side).toEqual({ RBiH: 170 });

        w.state.meta.turn = 173;
        expect(run(w).firings).toEqual([]);
        expect(w.state.displacement.pocket_fall_records?.map((r) => [r.turn, r.mun_id])).toEqual([[170, 'srebrenica'], [172, 'rogatica']]);
    });

    it('a held enclave made to fall (Goražde-shaped): the originals branch fires and the kill applies', () => {
        const w = world({
            controllers: { 'op:gorazde:gorazde_2': 'RBiH', 'op:gorazde:kola': 'RS' },
            disp: { gorazde: { original_population: 37500, displaced_out: 5000, lost_population: 500 } },
        });
        expect(run(w).firings).toEqual([]);
        setController(w, 'op:gorazde:gorazde_2', 'RS');
        const rec = run(w).firings[0]!;
        const originals = rbihShare(32000, 10000, 37500);
        expect(rec).toMatchObject({ mun_id: 'gorazde', side: 'RBiH', captor: 'RS', negotiated: false, killed: Math.floor(originals * 0.19) });
        expect((rec.killed ?? 0) + rec.left).toBe(originals);
        expect(ds(w, 'gorazde').lost_population).toBe(500 + Math.floor(originals * 0.19));
        expect(ds(w, 'gorazde').pocket_fall_originals_booked_by_side).toEqual({ RBiH: 170 });
    });
});

describe('P0-A: war phase', () => {
    it('pocket-fall sits right after update-displacement and before update-sustainability', () => {
        const names = warPhases.map((p) => p.name);
        const i = names.indexOf('pocket-fall');
        expect(i).toBeGreaterThan(0);
        expect(names[i - 1]).toBe('update-displacement');
        expect(names[i + 1]).toBe('update-sustainability');
    });

    it('the phase builds OSID inputs and puts the firings on the turn report', async () => {
        const w = srebrenicaWorld();
        const step = warPhases.find((p) => p.name === 'pocket-fall')!;
        const context = {
            state: w.state,
            input: {
                settlementEdges: [{ a: 'S100013', b: 'S100056' }],
                operationalSettlementGraph: { settlements: w.settlements, edges: w.edges },
                operationalData: {
                    opData: {
                        canonicalToOperational: { S_home: 'op:tuzla:t1' } as Record<string, string>,
                        operationalToCanonical: new Map<string, string[]>([['op:tuzla:t1', ['S_home']]]),
                    },
                    edges: w.edges,
                    centroids: {},
                },
                municipalityPopulation1991: w.census,
            },
            report: {} as Record<string, any>,
        };
        await step.run(context as never);
        const firings = context.report.pocket_fall?.firings ?? [];
        expect(firings.map((r: { mun_id: string; side: string }) => `${r.mun_id}|${r.side}`)).toEqual(['srebrenica|RBiH']);
        // Supply comes from the operational graph: the main body (tuzla, kladanj) is reached from S_home.
        expect(firings[0].routed).toBe(6000);
    });
});
