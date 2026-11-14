/**
 * F1 (legacy S-id consumer sweep, 2026-11-14): sustainability and militia fatigue on the OSID
 * id space the campaign actually uses.
 */
import { describe, expect, test } from 'vitest';

import type { FrontEdge } from '../src/map/front_edges.js';
import type { SettlementRecord } from '../src/map/settlements.js';
import { CURRENT_SCHEMA_VERSION, type GameState, type MilitiaPoolState } from '../src/state/game_state.js';
import { updateMilitiaFatigue } from '../src/state/militia_fatigue.js';
import { updateSustainability, type SustainabilityOsidInputs } from '../src/state/sustainability.js';

function pool(mun: string, faction: string): MilitiaPoolState {
    return { mun_id: mun, faction, available: 100, committed: 0, exhausted: 0, updated_turn: 10 } as MilitiaPoolState;
}

/**
 * Two municipalities: "pocket" (op:p1, op:p2) and "main" (op:m1, op:m2).
 * Controllers are set per test. Every municipality has a pool for all three factions,
 * as in the campaign (324 pools over 110 municipalities).
 */
function makeState(controllers: Record<string, string>): GameState {
    const pools: Record<string, MilitiaPoolState> = {};
    for (const mun of ['main', 'pocket']) {
        for (const f of ['HRHB', 'RBiH', 'RS']) pools[`${mun}:${f}`] = pool(mun, f);
    }
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'f1' },
        factions: [
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: { formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: pools },
        political: { political_controllers: controllers },
        displacement: {},
    } as unknown as GameState;
}

function makeSettlements(): Map<string, SettlementRecord> {
    const m = new Map<string, SettlementRecord>();
    for (const [sid, mun] of [['op:m1', 'main'], ['op:m2', 'main'], ['op:p1', 'pocket'], ['op:p2', 'pocket']] as const) {
        m.set(sid, { sid, source_id: sid, mun_code: mun, mun1990_id: mun, mun } as SettlementRecord);
    }
    return m;
}

function inputs(supplied: Record<string, string[]>, frontEdges: FrontEdge[] = []): SustainabilityOsidInputs {
    return { frontEdges, suppliedByFaction: new Map(Object.entries(supplied).map(([f, s]) => [f, new Set(s)])) };
}

describe('F1 sustainability OSID path', () => {
    test('reproduces the bug: legacy S-id edges against OSID settlements mark a supplied municipality surrounded', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RS', 'op:p2': 'RS' });
        // Legacy edges use S… ids that match no settlement key: no BFS neighbour, nothing reachable.
        const legacyEdges = [{ a: 'S100001', b: 'S100002' }];
        const report = updateSustainability(state, makeSettlements(), legacyEdges);
        expect(report.by_municipality.every((r) => r.is_surrounded)).toBe(true);
    });

    test('a supplied holder is not surrounded and does not degrade', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        const report = updateSustainability(state, makeSettlements(), [], inputs({ RBiH: ['op:m1', 'op:m2', 'op:p1', 'op:p2'] }));
        expect(report.by_municipality.map((r) => [r.mun_id, r.is_surrounded, r.degradation_this_turn])).toEqual([
            ['main', false, 0],
            ['pocket', false, 0],
        ]);
        expect(report.negotiation_pressure_increment).toBe(0);
    });

    test('a cut-off holder is surrounded, and the municipality degrades once per turn, not once per pool', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        const report = updateSustainability(state, makeSettlements(), [], inputs({ RBiH: ['op:m1', 'op:m2'] }));
        const pocket = report.by_municipality.find((r) => r.mun_id === 'pocket')!;
        expect(pocket.is_surrounded).toBe(true);
        expect(pocket.faction_id).toBe('RBiH');
        expect(pocket.degradation_this_turn).toBe(5); // base only: three pools, one evaluation
        expect(state.displacement.sustainability_state.pocket.sustainability_score).toBe(95);
        expect(report.by_municipality.filter((r) => r.mun_id === 'pocket')).toHaveLength(1);
    });

    test('a cut-off minority holder outranks a supplied majority holder (Srebrenica/Žepa case)', () => {
        // RS holds 1 of 2 pocket OSIDs... make RS the majority with a third OSID.
        const settlements = makeSettlements();
        settlements.set('op:p3', { sid: 'op:p3', source_id: 'op:p3', mun_code: 'pocket', mun1990_id: 'pocket', mun: 'pocket' } as SettlementRecord);
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RS', 'op:p3': 'RS' });
        const report = updateSustainability(state, settlements, [], inputs({ RBiH: ['op:m1', 'op:m2'], RS: ['op:p2', 'op:p3'] }));
        const pocket = report.by_municipality.find((r) => r.mun_id === 'pocket')!;
        expect(pocket.faction_id).toBe('RBiH');
        expect(pocket.is_surrounded).toBe(true);
    });

    test('unsupplied acceleration needs consecutive turns and collapse adds negotiation pressure', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        const settlements = makeSettlements();
        const cut = inputs({ RBiH: ['op:m1', 'op:m2'] });
        let last = updateSustainability(state, settlements, [], cut);
        for (let t = 11; t <= 25 && !state.displacement.sustainability_state.pocket.collapsed; t++) {
            state.meta.turn = t;
            last = updateSustainability(state, settlements, [], cut);
        }
        // 5 (t10) + 10 per turn from t11 (unsupplied >= 2): 100 -> 0 at t20.
        expect(state.meta.turn).toBe(20);
        expect(state.displacement.sustainability_state.pocket.collapsed).toBe(true);
        expect(last.negotiation_pressure_increment).toBe(1);
        expect(state.displacement.sustainability_state.main.sustainability_score).toBe(100);
    });

    test('a faction with no supply entry is not judged cut off; an empty entry is', () => {
        const absent = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        const r1 = updateSustainability(absent, makeSettlements(), [], inputs({}));
        expect(r1.by_municipality.every((r) => !r.is_surrounded)).toBe(true);
        const empty = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        const r2 = updateSustainability(empty, makeSettlements(), [], inputs({ RBiH: [] }));
        expect(r2.by_municipality.every((r) => r.is_surrounded)).toBe(true);
    });

    test('ties between equally sized supplied holders go to CANONICAL_FACTIONS order', () => {
        const state = makeState({ 'op:m1': 'RS', 'op:m2': 'HRHB', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        const report = updateSustainability(state, makeSettlements(), [], inputs({ RS: ['op:m1'], HRHB: ['op:m2'], RBiH: ['op:p1'] }));
        expect(report.by_municipality.find((r) => r.mun_id === 'main')!.faction_id).toBe('RS');
    });

    test('collapse is permanent and its pressure goes to the current controller (canon rule)', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RBiH' });
        state.displacement.sustainability_state = {
            pocket: { mun_id: 'pocket', is_surrounded: true, unsupplied_turns: 10, sustainability_score: 0, collapsed: true, last_updated_turn: 9 },
        } as GameState['displacement']['sustainability_state'];
        state.political.political_controllers!['op:p1'] = 'RS';
        state.political.political_controllers!['op:p2'] = 'RS';
        const report = updateSustainability(state, makeSettlements(), [], inputs({ RBiH: ['op:m1', 'op:m2'], RS: ['op:p1', 'op:p2'] }));
        const pocket = report.by_municipality.find((r) => r.mun_id === 'pocket')!;
        expect(pocket).toMatchObject({ faction_id: 'RS', is_surrounded: false, collapsed: true });
        expect(report.negotiation_pressure_increment).toBe(1);
    });

    test('a municipality no faction holds produces no record', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH' });
        const report = updateSustainability(state, makeSettlements(), [], inputs({ RBiH: ['op:m1', 'op:m2'] }));
        expect(report.by_municipality.map((r) => r.mun_id)).toEqual(['main']);
    });

    test('deterministic: same inputs give byte-identical reports and state', () => {
        const run = () => {
            const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RS', 'op:p1': 'HRHB', 'op:p2': 'RBiH' });
            const report = updateSustainability(state, makeSettlements(), [], inputs({ RBiH: ['op:m1'], RS: ['op:m2'] }));
            return JSON.stringify([report, state.displacement.sustainability_state]);
        };
        expect(run()).toBe(run());
    });
});

describe('F1 militia fatigue OSID path', () => {
    test('legacy S-id edges leave every pool unsupplied (the bug)', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RS', 'op:p2': 'RS' });
        const report = updateMilitiaFatigue(state, makeSettlements(), [{ a: 'S1', b: 'S2' }], new Map());
        expect(report.by_municipality.every((r) => !r.supplied)).toBe(true);
    });

    test('only a pool whose faction holds cut-off ground is unsupplied; pools in unheld municipalities are not isolated', () => {
        const state = makeState({ 'op:m1': 'RBiH', 'op:m2': 'RBiH', 'op:p1': 'RBiH', 'op:p2': 'RS' });
        const supplied = new Map<string, ReadonlySet<string>>([
            ['RBiH', new Set(['op:m1', 'op:m2'])],
            ['RS', new Set(['op:p2'])],
        ]);
        const report = updateMilitiaFatigue(state, makeSettlements(), [], new Map(), supplied);
        const unsupplied = report.by_municipality.filter((r) => !r.supplied).map((r) => `${r.mun_id}:${r.faction_id}`);
        expect(unsupplied).toEqual(['pocket:RBiH']);
        const totals = Object.fromEntries(report.by_faction.map((f) => [f.faction_id, f.pools_unsupplied]));
        expect(totals).toEqual({ HRHB: 0, RBiH: 1, RS: 0 });
        expect((state.military.militia_pools['pocket:RBiH'] as MilitiaPoolState).fatigue).toBe(1);
        expect((state.military.militia_pools['main:HRHB'] as MilitiaPoolState).fatigue).toBe(0);
    });
});
