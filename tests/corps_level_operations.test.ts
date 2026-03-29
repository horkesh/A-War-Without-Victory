/**
 * Tests for corps-level operation launch.
 *
 * Verifies:
 * - Contiguity seed from ALL corps sectors (not just one)
 * - Brigade selection across multiple sectors
 * - Non-contiguous targets rejected
 * - Primary sector ID passed through
 */
import { describe, it, expect } from 'vitest';
import { evaluateCorpsOffensiveLaunch } from '../src/sim/combat/sector_offensive.js';
import type { GameState, FactionId, FormationState, CorpsFrontSector, CorpsFrontSubSegment } from '../src/state/game_state.js';

function makeState(
    turn: number,
    formations: Record<string, Partial<FormationState>>,
    sectors: Record<string, Partial<CorpsFrontSector>>,
    frontEdges: Array<{ a: string; b: string }> = [],
): GameState {
    const fmts: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(formations)) {
        fmts[id] = {
            id, name: id, faction: 'RS' as FactionId, kind: 'brigade', status: 'active',
            personnel: 2000, location_osid: 'op:test:1',
            ...partial,
        } as FormationState;
    }
    const sectorMap: Record<string, CorpsFrontSector> = {};
    for (const [sid, partial] of Object.entries(sectors)) {
        sectorMap[sid] = {
            sector_id: sid,
            corps_id: 'corps_1',
            faction: 'RS' as FactionId,
            opposing_factions: ['RBiH' as FactionId],
            edge_ids: [],
            sub_segments: [],
            length_edges: 5,
            territory_osids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            density: 1.0,
            threat_ratio: 1.0,
            defensive_power: 1000,
            sector_stance: 'defend',
            stance_source: 'bot',
            ...partial,
        } as CorpsFrontSector;
    }
    return {
        meta: { turn, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        military: {
            formations: fmts,
            corps_command: {},
            corps_front_sectors: sectorMap,
            war_front_edges_osid: frontEdges,
        } as any,
        political: {
            political_controllers: (() => {
                const pc: Record<string, string> = {};
                // Friendly OSIDs from formations
                for (const f of Object.values(fmts)) {
                    if (f.location_osid) pc[f.location_osid] = 'RS';
                }
                // Friendly OSIDs from sector territory/sub_segments
                for (const sec of Object.values(sectorMap)) {
                    for (const ss of sec.sub_segments) {
                        for (const fo of ss.friendly_osids) pc[fo] = 'RS';
                    }
                }
                // Enemy OSIDs from front edges and sub_segments
                for (const e of frontEdges) {
                    if (!pc[e.a]) pc[e.a] = 'RBiH';
                    if (!pc[e.b]) pc[e.b] = 'RBiH';
                }
                for (const sec of Object.values(sectorMap)) {
                    for (const ss of sec.sub_segments) {
                        for (const eo of ss.enemy_osids) pc[eo] = 'RBiH';
                    }
                }
                return pc;
            })(),
        } as any,
    } as GameState;
}

function makeSub(friendlyOsids: string[], enemyOsids: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: `sub_${friendlyOsids[0]}`,
        edge_ids: [],
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: friendlyOsids.length,
        primary_brigade_ids: [],
    } as CorpsFrontSubSegment;
}

describe('Corps-Level Operation Launch', () => {
    it('seeds contiguity from ALL corps sectors', () => {
        // Two sectors in the same corps, each with different friendly OSIDs.
        // Target is adjacent to sector A's front but not sector B's.
        // 4 brigades → maxObjectives = floor(4 * 0.5) = 2
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:friendly1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:friendly2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:b:friendly1' },
            'b4': { corps_id: 'corps_1' as any, location_osid: 'op:b:friendly1' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:friendly1', 'op:a:friendly2'], ['op:e:target1'])],
            },
            'sector:corps_1:1': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:b:friendly1'], ['op:e:target2'])],
            },
        }, [
            // Front edges: target1 adjacent to friendly1, target2 adjacent to b:friendly1
            { a: 'op:a:friendly1', b: 'op:e:target1' },
            { a: 'op:a:friendly2', b: 'op:e:target1' },
            { a: 'op:b:friendly1', b: 'op:e:target2' },
            // Target1 connects to target2 (contiguous chain through enemy territory)
            { a: 'op:e:target1', b: 'op:e:target2' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3', 'b4'],
            ['op:e:target1', 'op:e:target2'],
            ['op:e:target1', 'op:e:target2'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        // Both targets should be in objectives (contiguous chain from corps front)
        expect(op!.objectives).toContain('op:e:target1');
        expect(op!.objectives).toContain('op:e:target2');
    });

    it('selects brigades from multiple sectors', () => {
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:f2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:b:f1' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1', 'op:a:f2'], ['op:e:t1'])],
            },
            'sector:corps_1:1': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:b:f1'], ['op:e:t2'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:t1' },
            { a: 'op:b:f1', b: 'op:e:t2' },
            { a: 'op:e:t1', b: 'op:e:t2' },
        ]);

        // Pass all 3 brigades from both sectors
        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:t1', 'op:e:t2'],
            ['op:e:t1', 'op:e:t2'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        // All 3 brigades should participate (from both sectors)
        expect(op!.participating_brigades).toContain('b1');
        expect(op!.participating_brigades).toContain('b2');
        expect(op!.participating_brigades).toContain('b3');
    });

    it('rejects non-contiguous targets', () => {
        // Target is NOT adjacent to any friendly OSID (no front edge connects them)
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:f2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:f3' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1', 'op:a:f2', 'op:a:f3'], ['op:e:near'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:near' },
            // op:e:far has NO edge to anything reachable
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:near', 'op:e:far'],
            ['op:e:near', 'op:e:far'], // Both are offensive targets
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        // Only the contiguous target should be in objectives
        expect(op!.objectives).toContain('op:e:near');
        expect(op!.objectives).not.toContain('op:e:far');
    });

    it('sets primarySectorId on the operation', () => {
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:f2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:f3' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1', 'op:a:f2', 'op:a:f3'], ['op:e:t1'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:t1' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:t1'],
            ['op:e:t1'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        expect(op!.sector_id).toBe('sector:corps_1:0');
    });

    it('launches without sector_id when primarySectorId omitted', () => {
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:f2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:f3' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1', 'op:a:f2', 'op:a:f3'], ['op:e:t1'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:t1' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:t1'],
            ['op:e:t1'],
            null, undefined, // No primarySectorId
        );

        expect(op).not.toBeNull();
        expect(op!.sector_id).toBeUndefined();
    });

    it('picks staging OSID nearest to first objective', () => {
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:far' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:near' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:mid' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:far', 'op:a:near', 'op:a:mid'], ['op:e:t1'])],
            },
        }, [
            // Only op:a:near is adjacent to the target
            { a: 'op:a:near', b: 'op:e:t1' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:t1'],
            ['op:e:t1'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        expect(op!.staging_osid).toBe('op:a:near');
    });

    it('ignores sectors from other corps when seeding contiguity', () => {
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:f2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:f3' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1', 'op:a:f2', 'op:a:f3'], ['op:e:t1'])],
            },
            // Different corps sector — should NOT contribute to contiguity seed
            'sector:corps_2:0': {
                corps_id: 'corps_2',
                sub_segments: [makeSub(['op:b:f1'], ['op:e:t2'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:t1' },
            // t2 is only reachable from corps_2's front
            { a: 'op:b:f1', b: 'op:e:t2' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:t1', 'op:e:t2'],
            ['op:e:t1', 'op:e:t2'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        // Only t1 reachable from corps_1's front; t2 is from corps_2's front
        expect(op!.objectives).toContain('op:e:t1');
        expect(op!.objectives).not.toContain('op:e:t2');
    });

    it('caps objectives by force size (1 per 2 brigades)', () => {
        // 3 brigades → maxObjectives = floor(3 * 0.5) = 1
        // Even though 3 targets are contiguous, only 1 should be selected
        const state = makeState(5, {
            'b1': { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' },
            'b2': { corps_id: 'corps_1' as any, location_osid: 'op:a:f2' },
            'b3': { corps_id: 'corps_1' as any, location_osid: 'op:a:f3' },
        }, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1', 'op:a:f2', 'op:a:f3'], ['op:e:t1', 'op:e:t2', 'op:e:t3'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:t1' },
            { a: 'op:e:t1', b: 'op:e:t2' },
            { a: 'op:e:t2', b: 'op:e:t3' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:e:t1', 'op:e:t2', 'op:e:t3'],
            ['op:e:t1', 'op:e:t2', 'op:e:t3'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        // 3 brigades → max 1 objective (floor(3 * 0.5) = 1)
        expect(op!.objectives!.length).toBe(1);
    });

    it('scales objectives up with more brigades', () => {
        // 12 brigades → maxObjectives = min(6, floor(12 * 0.5)) = 6
        const brigades: Record<string, Partial<FormationState>> = {};
        for (let i = 1; i <= 12; i++) {
            brigades[`b${i}`] = { corps_id: 'corps_1' as any, location_osid: 'op:a:f1' };
        }
        const state = makeState(5, brigades, {
            'sector:corps_1:0': {
                corps_id: 'corps_1',
                sub_segments: [makeSub(['op:a:f1'], ['op:e:t1', 'op:e:t2', 'op:e:t3', 'op:e:t4', 'op:e:t5', 'op:e:t6', 'op:e:t7', 'op:e:t8'])],
            },
        }, [
            { a: 'op:a:f1', b: 'op:e:t1' },
            { a: 'op:e:t1', b: 'op:e:t2' },
            { a: 'op:e:t2', b: 'op:e:t3' },
            { a: 'op:e:t3', b: 'op:e:t4' },
            { a: 'op:e:t4', b: 'op:e:t5' },
            { a: 'op:e:t5', b: 'op:e:t6' },
            { a: 'op:e:t6', b: 'op:e:t7' },
            { a: 'op:e:t7', b: 'op:e:t8' },
        ]);

        const op = evaluateCorpsOffensiveLaunch(
            state, 'corps_1', 'RS' as FactionId,
            Array.from({ length: 12 }, (_, i) => `b${i + 1}`),
            ['op:e:t1', 'op:e:t2', 'op:e:t3', 'op:e:t4', 'op:e:t5', 'op:e:t6', 'op:e:t7', 'op:e:t8'],
            ['op:e:t1', 'op:e:t2', 'op:e:t3', 'op:e:t4', 'op:e:t5', 'op:e:t6', 'op:e:t7', 'op:e:t8'],
            null, undefined, 'sector:corps_1:0',
        );

        expect(op).not.toBeNull();
        // 12 brigades → max 6 objectives (min(6, floor(12 * 0.5)))
        expect(op!.objectives!.length).toBe(6);
    });
});
