/**
 * SE9 (2026-11-15): sector intel is re-keyed to this turn's sector ids right after the partition.
 * Before, mid-turn readers looked up this turn's positional ids in last turn's map and read
 * another sector's intel.
 */
import { describe, expect, it } from 'vitest';

import { deriveSectorIntel, rekeySectorIntelToCurrentSectors, stableSectorKey } from '../src/sim/combat/sector_intel.js';
import type { CorpsFrontSector, GameState, SectorIntelRecord } from '../src/state/game_state.js';

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

/** Last turn: RBiH sector A (edges e1,e2) faces RS sector B (same edges); ids A:0 and B:0. */
function lastTurnState(): GameState {
    const a = sector('sector:a:0', 'a', 'RBiH', ['e1', 'e2']);
    const b = sector('sector:b:0', 'b', 'RS', ['e1', 'e2']);
    const state = stateWith({ [a.sector_id]: a, [b.sector_id]: b });
    for (let t = 1; t <= 6; t += 1) deriveSectorIntel(state, t); // build up some contact history
    return state;
}

/** This turn's partition: the same two sectors renumbered (A:1, B:3), and a NEW RBiH sector at A:0. */
function renumberedSectors(): Record<string, CorpsFrontSector> {
    const a = sector('sector:a:1', 'a', 'RBiH', ['e1', 'e2']);
    const b = sector('sector:b:3', 'b', 'RS', ['e1', 'e2']);
    const fresh = sector('sector:a:0', 'a', 'RBiH', ['e7', 'e8']);
    const freshEnemy = sector('sector:b:0', 'b', 'RS', ['e7', 'e8']);
    return { [a.sector_id]: a, [b.sector_id]: b, [fresh.sector_id]: fresh, [freshEnemy.sector_id]: freshEnemy };
}

describe('SE9: rekey-sector-intel', () => {
    it('moves a record to its sector\'s new id on both sides; the new sector at the old id gets nothing', () => {
        const state = lastTurnState();
        const before = state.military.sector_intel!['sector:a:0']![0]!;
        expect(before.turns_in_contact).toBe(6);

        state.military.corps_front_sectors = renumberedSectors();
        rekeySectorIntelToCurrentSectors(state);

        const intel = state.military.sector_intel!;
        const moved = intel['sector:a:1']!.find((r) => r.enemy_sector_id === 'sector:b:3')!;
        expect(moved).toBeDefined();
        // Same record, new ids: confidence, contact count and stable keys untouched.
        expect(moved.confidence).toBe(before.confidence);
        expect(moved.turns_in_contact).toBe(6);
        expect(moved.own_stable_key).toBe(before.own_stable_key);
        expect(moved.enemy_stable_key).toBe(before.enemy_stable_key);
        // Before the fix a reader of the new sector:a:0 got A's six-week record. Now it gets none.
        expect(intel['sector:a:0']).toBeUndefined();
    });

    it('leaves the end-of-turn derivation unchanged (only mid-turn readers see a difference)', () => {
        const withRekey = lastTurnState();
        const without = lastTurnState();
        withRekey.military.corps_front_sectors = renumberedSectors();
        without.military.corps_front_sectors = renumberedSectors();

        rekeySectorIntelToCurrentSectors(withRekey);
        deriveSectorIntel(withRekey, 7);
        deriveSectorIntel(without, 7);

        expect(withRekey.military.sector_intel).toEqual(without.military.sector_intel);
    });

    it('drops a record whose enemy sector no longer exists', () => {
        const state = lastTurnState();
        const a = sector('sector:a:0', 'a', 'RBiH', ['e1', 'e2']);
        state.military.corps_front_sectors = { [a.sector_id]: a }; // B is gone
        rekeySectorIntelToCurrentSectors(state);
        expect(state.military.sector_intel!['sector:a:0']).toBeUndefined();
    });

    it('keeps a legacy record (no stable keys) at its positional id while that sector exists', () => {
        const a = sector('sector:a:0', 'a', 'RBiH', ['e1']);
        const state = stateWith({ [a.sector_id]: a });
        const legacy = { enemy_sector_id: 'sector:b:0', confidence: 0.3, turns_in_contact: 4 } as SectorIntelRecord;
        state.military.sector_intel = { 'sector:a:0': [legacy], 'sector:a:9': [{ ...legacy }] };
        rekeySectorIntelToCurrentSectors(state);
        expect(state.military.sector_intel).toEqual({ 'sector:a:0': [legacy] });
    });

    it('is a no-op when nothing was renumbered', () => {
        const state = lastTurnState();
        const snapshot = structuredClone(state.military.sector_intel);
        rekeySectorIntelToCurrentSectors(state);
        expect(state.military.sector_intel).toEqual(snapshot);
        // The stable key it matches on is the one the record was built with.
        const a = state.military.corps_front_sectors!['sector:a:0']!;
        expect(state.military.sector_intel!['sector:a:0']![0]!.own_stable_key).toBe(stableSectorKey(a));
    });
});
