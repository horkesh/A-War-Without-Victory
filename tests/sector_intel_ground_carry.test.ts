/**
 * SE9 v2 (2026-11-24): sector intel follows its ground across a re-partition.
 *
 * A sector's stable key is corps|lowest edge id. When the front moves and a lower edge id joins
 * the sector, the key changes although the sector is the same ground. SE9 v1 then dropped the
 * record, and the sector restarted at the faction floor (measured on C2: Farz's own Ozren record,
 * confidence 1.00 at t179, read 0.00 at t180 and climbed 0.02 a week). The re-key now moves such a
 * record to the same-corps sector that still holds the old key's edge, confidence unchanged.
 */
import { describe, expect, it } from 'vitest';

import { getOperationIntelConfidence } from '../src/sim/combat/operation_preparation.js';
import { deriveSectorIntel, rekeySectorIntelToCurrentSectors, stableSectorKey } from '../src/sim/combat/sector_intel.js';
import type { CorpsFrontSector, CorpsOperation, GameState, SectorIntelRecord } from '../src/state/game_state.js';

function sector(sectorId: string, corpsId: string, faction: string, edgeIds: string[]): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId as never,
        faction: faction as never,
        opposing_factions: [],
        edge_ids: edgeIds,
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: edgeIds,
            friendly_osids: [`o:${sectorId}`],
            enemy_osids: [],
            primary_brigade_ids: [],
            length_edges: edgeIds.length,
        }],
        length_edges: edgeIds.length,
        territory_osids: [`o:${sectorId}`],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    } as CorpsFrontSector;
}

function stateWith(sectors: Record<string, CorpsFrontSector>): GameState {
    return {
        meta: { turn: 10, phase: 'war', scenario_id: 'test' },
        military: { formations: {}, corps_front_sectors: sectors, sector_intel: {} },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

function bySector(list: CorpsFrontSector[]): Record<string, CorpsFrontSector> {
    return Object.fromEntries(list.map((s) => [s.sector_id, s]));
}

/** Last turn: RBiH sector a:0 (edges e3,e4) faces RS sector b:0 on the same edges, with intel built up. */
function lastTurnState(confidence = 1): GameState {
    const state = stateWith(bySector([
        sector('sector:a:0', 'a', 'RBiH', ['e3', 'e4']),
        sector('sector:b:0', 'b', 'RS', ['e3', 'e4']),
    ]));
    for (let t = 1; t <= 6; t += 1) deriveSectorIntel(state, t);
    state.military.sector_intel!['sector:a:0']![0]!.confidence = confidence;
    return state;
}

function onlyRecord(state: GameState, sectorId: string): SectorIntelRecord {
    const recs = state.military.sector_intel![sectorId] ?? [];
    expect(recs).toHaveLength(1);
    return recs[0]!;
}

describe('SE9 v2: sector intel follows its ground across a re-partition', () => {
    it('moves a record when a lower edge joins the sector (key changes, old edge still held by the same corps)', () => {
        const state = lastTurnState(1);
        const before = onlyRecord(state, 'sector:a:0');
        // This turn: edge e1 joins both sectors (a settlement changed hands), so both keys change.
        const a = sector('sector:a:2', 'a', 'RBiH', ['e1', 'e3', 'e4']);
        const b = sector('sector:b:1', 'b', 'RS', ['e1', 'e3', 'e4']);
        state.military.corps_front_sectors = bySector([a, b]);
        expect(stableSectorKey(a)).not.toBe(before.own_stable_key);

        rekeySectorIntelToCurrentSectors(state);

        const moved = onlyRecord(state, 'sector:a:2');
        expect(moved.confidence).toBe(1);
        expect(moved.turns_in_contact).toBe(before.turns_in_contact);
        expect(moved.enemy_sector_id).toBe('sector:b:1');
        // Keys follow the ground, so stable-key readers (prep gate, end-of-turn derive) find it.
        expect(moved.own_stable_key).toBe(stableSectorKey(a));
        expect(moved.enemy_stable_key).toBe(stableSectorKey(b));
    });

    it('drops a record when no sector of the same corps still holds the old edge', () => {
        const state = lastTurnState(1);
        state.military.corps_front_sectors = bySector([
            sector('sector:a:0', 'a', 'RBiH', ['e7', 'e8']),
            sector('sector:b:0', 'b', 'RS', ['e7', 'e8']),
        ]);
        rekeySectorIntelToCurrentSectors(state);
        expect(state.military.sector_intel!['sector:a:0']).toBeUndefined();
    });

    it('does not move a record to another corps that now holds the old edge', () => {
        const state = lastTurnState(1);
        state.military.corps_front_sectors = bySector([
            sector('sector:c:0', 'c', 'RBiH', ['e1', 'e3', 'e4']),
            sector('sector:b:0', 'b', 'RS', ['e1', 'e3', 'e4']),
        ]);
        rekeySectorIntelToCurrentSectors(state);
        expect(state.military.sector_intel).toEqual({});
    });

    it('on a collision keeps the exact-key record, then the higher confidence; input order does not matter', () => {
        const build = (order: 'ab' | 'ba'): GameState => {
            const state = lastTurnState(0.4);
            const exact = onlyRecord(state, 'sector:a:0');
            // A second, stale record from a sector whose key no longer exists but whose edge e4 is
            // now inside a:0's ground: it would map onto the same (own, enemy) pair.
            const stale: SectorIntelRecord = { ...exact, confidence: 0.9, own_stable_key: 'a|e4', enemy_sector_id: 'sector:b:7' };
            state.military.sector_intel = order === 'ab'
                ? { 'sector:a:0': [exact], 'sector:a:5': [stale] }
                : { 'sector:a:5': [stale], 'sector:a:0': [exact] };
            return state;
        };
        const first = build('ab');
        const second = build('ba');
        rekeySectorIntelToCurrentSectors(first);
        rekeySectorIntelToCurrentSectors(second);
        expect(onlyRecord(first, 'sector:a:0').confidence).toBe(0.4); // exact key wins over higher confidence
        expect(JSON.stringify(first.military.sector_intel)).toBe(JSON.stringify(second.military.sector_intel));
    });

    it('between two moved records for the same pair, the higher confidence wins', () => {
        const state = lastTurnState(0.4);
        const base = onlyRecord(state, 'sector:a:0');
        const other: SectorIntelRecord = { ...base, confidence: 0.8, own_stable_key: 'a|e4' };
        state.military.sector_intel = { 'sector:a:0': [base], 'sector:a:5': [other] };
        state.military.corps_front_sectors = bySector([
            sector('sector:a:1', 'a', 'RBiH', ['e1', 'e3', 'e4']),
            sector('sector:b:1', 'b', 'RS', ['e1', 'e3', 'e4']),
        ]);
        rekeySectorIntelToCurrentSectors(state);
        expect(onlyRecord(state, 'sector:a:1').confidence).toBe(0.8);
    });

    it('re-key then end-of-turn derive carries the confidence instead of restarting at the floor', () => {
        const state = lastTurnState(1);
        state.military.corps_front_sectors = bySector([
            sector('sector:a:2', 'a', 'RBiH', ['e1', 'e3', 'e4']),
            sector('sector:b:1', 'b', 'RS', ['e1', 'e3', 'e4']),
        ]);
        rekeySectorIntelToCurrentSectors(state);
        deriveSectorIntel(state, 7);
        // Carried 1.0, passive tick applied on top; a restart would sit at the RBiH floor (well below 0.5).
        expect(onlyRecord(state, 'sector:a:2').confidence).toBeGreaterThan(0.85);
    });

    it('keeps legacy records without stable keys at their positional id, as before', () => {
        const a = sector('sector:a:0', 'a', 'RBiH', ['e1']);
        const state = stateWith({ [a.sector_id]: a });
        const legacy = { enemy_sector_id: 'sector:b:0', confidence: 0.3, turns_in_contact: 4 } as SectorIntelRecord;
        state.military.sector_intel = { 'sector:a:0': [legacy], 'sector:a:9': [{ ...legacy }] };
        rekeySectorIntelToCurrentSectors(state);
        expect(state.military.sector_intel).toEqual({ 'sector:a:0': [legacy] });
    });

    it('the preparation intel read finds the carried record on the re-keyed sector', () => {
        const op = { sector_id: 'sector:a:2', objectives: [], axes: [] } as unknown as CorpsOperation;
        const carried = lastTurnState(1);
        const fresh = lastTurnState(1);
        const sectors = (): Record<string, CorpsFrontSector> => bySector([
            sector('sector:a:2', 'a', 'RBiH', ['e1', 'e3', 'e4']),
            sector('sector:b:1', 'b', 'RS', ['e1', 'e3', 'e4']),
        ]);
        carried.military.corps_front_sectors = sectors();
        rekeySectorIntelToCurrentSectors(carried);
        expect(getOperationIntelConfidence(carried, op)).toBe(1);

        // Without a prior record on that ground the op still reads nothing (it has to probe).
        fresh.military.corps_front_sectors = sectors();
        fresh.military.sector_intel = {};
        rekeySectorIntelToCurrentSectors(fresh);
        expect(getOperationIntelConfidence(fresh, op)).toBe(0);
    });
});
