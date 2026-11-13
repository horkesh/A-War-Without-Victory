/**
 * S1: OG stances survive the twice-a-turn sector rebuild (matched on stableSectorKey), and the
 * corps commander never overwrites a player-set OG stance.
 */
import { describe, expect, it } from 'vitest';
import type { CorpsFrontSector } from '../src/state/game_state.js';
import { carrySectorStances } from '../src/sim/combat/sector_stance_carry.js';

function sector(id: string, corps: string, edges: string[], stance: CorpsFrontSector['sector_stance'] = 'defend', source: CorpsFrontSector['stance_source'] = 'bot'): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corps,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: edges,
        sub_segments: [],
        length_edges: edges.length,
        territory_osids: [],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: stance,
        stance_source: source,
    } as CorpsFrontSector;
}

describe('OG stance carry-over across sector rebuilds', () => {
    it('a renumbered sector keeps its stance and source by content', () => {
        const previous = {
            'sector:c1:0': sector('sector:c1:0', 'c1', ['e2', 'e5'], 'active_defense', 'bot'),
            'sector:c1:1': sector('sector:c1:1', 'c1', ['e1', 'e9'], 'fortify', 'player'),
        };
        // Rebuilt and renumbered: the e1 sector is now index 0, and it grew an edge.
        const next = {
            'sector:c1:0': sector('sector:c1:0', 'c1', ['e1', 'e9', 'e10']),
            'sector:c1:1': sector('sector:c1:1', 'c1', ['e5', 'e2']),
        };
        carrySectorStances(previous, next);
        expect(next['sector:c1:0']).toMatchObject({ sector_stance: 'fortify', stance_source: 'player' });
        expect(next['sector:c1:1']).toMatchObject({ sector_stance: 'active_defense', stance_source: 'bot' });
    });

    it('a sector with no previous match keeps the builder default', () => {
        const next = { 'sector:c1:0': sector('sector:c1:0', 'c1', ['e7']) };
        carrySectorStances({ 'sector:c1:0': sector('sector:c1:0', 'c1', ['e1'], 'screening') }, next);
        expect(next['sector:c1:0'].sector_stance).toBe('defend');
    });

    it('does not match across corps', () => {
        const next = { 'sector:c2:0': sector('sector:c2:0', 'c2', ['e1']) };
        carrySectorStances({ 'sector:c1:0': sector('sector:c1:0', 'c1', ['e1'], 'fortify') }, next);
        expect(next['sector:c2:0'].sector_stance).toBe('defend');
    });

    it('is a no-op without previous sectors', () => {
        const next = { 'sector:c1:0': sector('sector:c1:0', 'c1', ['e1']) };
        carrySectorStances(undefined, next);
        expect(next['sector:c1:0'].sector_stance).toBe('defend');
    });
});
