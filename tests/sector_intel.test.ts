/**
 * Tests for sector-facing intelligence system (sector_intel.ts).
 * T1-T13 from SECTOR_INTEL_IMPLEMENTATION_PLAN.md.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { deriveSectorIntel, updateSectorIntelFromCombat } from '../src/sim/combat/sector_intel.js';
import {
    FACTION_RECON_PROFILES,
    FACTION_INITIAL_INTEL_CONFIDENCE,
    CONFIDENCE_ROUGH_STRENGTH,
    CONFIDENCE_FRONT_BRIGADES,
    CONFIDENCE_FULL_STRENGTH,
    CONFIDENCE_DEEP_INTEL,
} from '../src/sim/combat/sector_intel_constants.js';
import type { CorpsFrontSector, GameState, SectorIntelRecord } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: string,
    edgeIds: string[],
    friendlyOsids: string[],
    enemyOsids: string[],
    density: number = 1.0,
    assignedBrigadeIds: string[] = [],
    reserveBrigadeIds: string[] = []
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId as any,
        faction: faction as any,
        opposing_factions: [],
        edge_ids: edgeIds,
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: edgeIds,
            friendly_osids: friendlyOsids,
            enemy_osids: enemyOsids,
            primary_brigade_ids: [],
            length_edges: edgeIds.length,
        }],
        length_edges: edgeIds.length,
        territory_osids: friendlyOsids,
        assigned_brigade_ids: assignedBrigadeIds as any[],
        reserve_brigade_ids: reserveBrigadeIds as any[],
        density,
        threat_ratio: 1.0,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

function makeMinimalState(sectors: Record<string, CorpsFrontSector>): GameState {
    return {
  meta: { turn: 1, phase: 'war', scenario_id: 'test', week: 1, year: 1992 },
  military: {
    formations: {},
    corps_front_sectors: sectors,
    sector_intel: {}
  } as any,
  political: {
    political_controllers: {}
  } as any,
} as unknown as GameState;
}

// ---------------------------------------------------------------------------
// T1: Passive buildup — first contact establishes record at passive_buildup rate
// ---------------------------------------------------------------------------
describe('T1: first contact passive buildup', () => {
    it('creates a record with confidence = passive_buildup_per_turn on first contact', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1', 'e2'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1', 'e2'], ['oB'], ['oA']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        state.military.sector_intel = {};
        deriveSectorIntel(state, 1);
        const records = state.military.sector_intel!['sector:corps-A:0'] ?? [];
        expect(records.length).toBe(1);
        const rec = records[0]!;
        expect(rec.enemy_sector_id).toBe('sector:corps-B:0');
        // initial 0.05 + passive 0.06 - decay 0.10 = 0.01
        expect(rec.confidence).toBeCloseTo(
            FACTION_INITIAL_INTEL_CONFIDENCE['RBiH'] + FACTION_RECON_PROFILES['RBiH'].passive_buildup_per_turn - FACTION_RECON_PROFILES['RBiH'].confidence_decay_per_turn,
            5
        );
        expect(rec.turns_in_contact).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// T2: Confidence accumulates each turn (capped at 1.0)
// ---------------------------------------------------------------------------
describe('T2: intel staleness — in-contact confidence decays to floor', () => {
    it('confidence converges to 0 when decay exceeds passive buildup', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RS', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RBiH', ['e1'], ['oB'], ['oA']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        state.military.sector_intel = {};
        // RS: net = passive(0.08) - decay(0.12) = -0.04/turn
        // From initial 0.30, drops to 0 after ~8 turns
        for (let t = 1; t <= 10; t++) {
            deriveSectorIntel(state, t);
        }
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.confidence).toBe(0);
        expect(rec.turns_in_contact).toBe(10);
    });
});

// ---------------------------------------------------------------------------
// T3: No-contact decay
// ---------------------------------------------------------------------------
describe('T3: no-contact decay', () => {
    it('decays record confidence when sectors no longer share edges', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        state.military.sector_intel = {};
        // First turn: build contact
        deriveSectorIntel(state, 1);
        const confAfterContact = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!.confidence;
        // Remove shared edge — no longer in contact
        sectorA.edge_ids = [];
        sectorA.sub_segments[0]!.edge_ids = [];
        deriveSectorIntel(state, 2);
        const records = state.military.sector_intel!['sector:corps-A:0'] ?? [];
        // Record should have decayed confidence
        const decayedConf = confAfterContact - FACTION_RECON_PROFILES['RBiH'].confidence_decay_per_turn;
        if (decayedConf > 0) {
            expect(records.length).toBe(1);
            expect(records[0]!.confidence).toBeCloseTo(decayedConf, 5);
        } else {
            // Fully decayed: record dropped
            expect(records.length).toBe(0);
        }
    });
});

// ---------------------------------------------------------------------------
// T4: strength_category below CONFIDENCE_ROUGH_STRENGTH is 'unknown'
// ---------------------------------------------------------------------------
describe('T4: strength_category thresholds', () => {
    it('returns unknown below CONFIDENCE_ROUGH_STRENGTH', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RS', ['e1'], ['oA'], ['oB'], 0.3, ['brig-1']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RBiH', ['e1'], ['oB'], ['oA'], 0.3, ['brig-2']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        // Pre-seed confidence low enough that after one turn it stays below CONFIDENCE_ROUGH_STRENGTH (0.2)
        // RS: net = 0.05 - 0.12 = -0.07/turn → 0.15 - 0.07 = 0.08 < 0.20
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RBiH',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'unknown',
                posture_observed: 'unknown',
                offensive_signs: false,
                confidence: CONFIDENCE_ROUGH_STRENGTH - 0.05,
                turns_in_contact: 1,
                visible_brigade_ids: [],
                last_updated_turn: 0,
            }],
        };
        deriveSectorIntel(state, 2);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        // 0.15 + 0.05 - 0.12 = 0.08 < 0.20 → unknown
        expect(rec.strength_category).toBe('unknown');
    });
});

// ---------------------------------------------------------------------------
// T5: strength_category correctly bins enemy sector density
// ---------------------------------------------------------------------------
describe('T5: strength_category density bins', () => {
    const testCases: Array<{ density: number; expected: string }> = [
        { density: 0.3, expected: 'thin' },
        { density: 0.7, expected: 'moderate' },
        { density: 1.5, expected: 'dense' },
        { density: 2.5, expected: 'fortress' },
    ];

    for (const { density, expected } of testCases) {
        it(`density ${density} -> ${expected}`, () => {
            const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
            const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA'], density, ['b1', 'b2']);
            const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
            // Pre-seed confidence high enough that after one turn it stays >= CONFIDENCE_ROUGH_STRENGTH (0.2)
            // RBiH: net = 0.06 - 0.10 = -0.04/turn → need pre-seed >= 0.24
            state.military.sector_intel = {
                'sector:corps-A:0': [{
                    enemy_sector_id: 'sector:corps-B:0',
                    enemy_faction: 'RS',
                    enemy_corps_id: 'corps-B' as any,
                    front_edge_count: 1,
                    strength_category: 'unknown',
                    posture_observed: 'unknown',
                    offensive_signs: false,
                    confidence: 0.30,
                    turns_in_contact: 3,
                    visible_brigade_ids: [],
                    last_updated_turn: 0,
                }],
            };
            deriveSectorIntel(state, 4);
            const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
            expect(rec.strength_category).toBe(expected);
        });
    }
});

// ---------------------------------------------------------------------------
// T6: visible_brigade_ids empty below CONFIDENCE_FRONT_BRIGADES
// ---------------------------------------------------------------------------
describe('T6: visible_brigade_ids below threshold', () => {
    it('no brigades visible when confidence < CONFIDENCE_FRONT_BRIGADES', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA'], 1.0, ['brig-X', 'brig-Y']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        // One turn passive: RBiH = 0.30 = exactly CONFIDENCE_FRONT_BRIGADES
        // To test below threshold, pre-seed below
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RS',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'unknown',
                posture_observed: 'unknown',
                offensive_signs: false,
                confidence: CONFIDENCE_FRONT_BRIGADES - 0.15,
                turns_in_contact: 1,
                visible_brigade_ids: [],
                last_updated_turn: 0,
            }],
        };
        // Pre-seed RS intel to a low value that after one passive turn stays below CONFIDENCE_FRONT_BRIGADES.
        // RS passive_buildup = 0.20, initial floor = 0.40. Pre-seeding bypasses initial floor.
        // Use pre-seeded confidence = 0.05 → after passive buildup: 0.05 + 0.20 = 0.25 < 0.30
        const sectorC = makeSector('sector:corps-C:0', 'corps-C', 'RS', ['e2'], ['oC'], ['oD']);
        const sectorD = makeSector('sector:corps-D:0', 'corps-D', 'RBiH', ['e2'], ['oD'], ['oC'], 1.0, ['brig-Z']);
        const state2 = makeMinimalState({ 'sector:corps-C:0': sectorC, 'sector:corps-D:0': sectorD });
        state2.military.sector_intel = {
            'sector:corps-C:0': [{
                enemy_sector_id: 'sector:corps-D:0',
                enemy_faction: 'RBiH',
                enemy_corps_id: 'corps-D' as any,
                front_edge_count: 1,
                strength_category: 'unknown',
                posture_observed: 'unknown',
                offensive_signs: false,
                confidence: 0.04,
                turns_in_contact: 1,
                visible_brigade_ids: [],
                last_updated_turn: 0,
            }],
        };
        deriveSectorIntel(state2, 2);
        const rec = (state2.military.sector_intel!['sector:corps-C:0'] ?? [])[0]!;
        // Pre-seeded 0.04 + RS passive 0.08 - RS decay 0.12 = 0.00 → clamped to 0
        expect(rec.confidence).toBeCloseTo(0, 5);
        expect(rec.visible_brigade_ids.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// T7: visible_brigade_ids expands at CONFIDENCE_FULL_STRENGTH
// ---------------------------------------------------------------------------
describe('T7: all assigned brigades visible at CONFIDENCE_FULL_STRENGTH', () => {
    it('all assigned brigades visible when confidence >= CONFIDENCE_FULL_STRENGTH', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA'], 1.0, ['brig-1', 'brig-2', 'brig-3']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        // Pre-seed high enough that after one turn (RBiH net -0.04) result >= CONFIDENCE_FULL_STRENGTH (0.5)
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RS',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'moderate',
                posture_observed: 'unknown',
                offensive_signs: false,
                confidence: CONFIDENCE_FULL_STRENGTH + 0.05,
                turns_in_contact: 5,
                visible_brigade_ids: [],
                last_updated_turn: 1,
            }],
        };
        deriveSectorIntel(state, 6);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.visible_brigade_ids).toEqual(['brig-1', 'brig-2', 'brig-3'].sort());
    });
});

// ---------------------------------------------------------------------------
// T8: recon_range >= 2 expands to reserve brigades at CONFIDENCE_DEEP_INTEL
// ---------------------------------------------------------------------------
describe('T8: reserve brigades visible with range>=2 at deep intel confidence', () => {
    it('RBiH (range=2) sees reserve brigades at confidence >= CONFIDENCE_DEEP_INTEL', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA'], 1.0, ['brig-1'], ['reserve-1']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        // Pre-seed high enough that after one turn (RBiH net -0.04) result >= CONFIDENCE_DEEP_INTEL (0.8)
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RS',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'moderate',
                posture_observed: 'defensive',
                offensive_signs: false,
                confidence: CONFIDENCE_DEEP_INTEL + 0.05,
                turns_in_contact: 10,
                visible_brigade_ids: ['brig-1'],
                last_updated_turn: 1,
            }],
        };
        deriveSectorIntel(state, 11);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.visible_brigade_ids).toContain('reserve-1');
        expect(rec.visible_brigade_ids).toContain('brig-1');
    });
    it('RS (range=1) does NOT see reserve brigades at confidence >= CONFIDENCE_DEEP_INTEL', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RS', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RBiH', ['e1'], ['oB'], ['oA'], 1.0, ['brig-1'], ['reserve-1']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RBiH',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'moderate',
                posture_observed: 'defensive',
                offensive_signs: false,
                confidence: CONFIDENCE_DEEP_INTEL,
                turns_in_contact: 10,
                visible_brigade_ids: ['brig-1'],
                last_updated_turn: 1,
            }],
        };
        deriveSectorIntel(state, 11);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.visible_brigade_ids).not.toContain('reserve-1');
    });
});

// ---------------------------------------------------------------------------
// T9: posture_observed = 'unknown' below CONFIDENCE_FULL_STRENGTH
// ---------------------------------------------------------------------------
describe('T9: posture_observed below full-strength threshold', () => {
    it('posture is unknown below CONFIDENCE_FULL_STRENGTH', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA'], 1.0);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        state.military.sector_intel = {};
        // RBiH after 1 turn: 0.30 < 0.50 threshold
        deriveSectorIntel(state, 1);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.posture_observed).toBe('unknown');
    });
});

// ---------------------------------------------------------------------------
// T10: updateSectorIntelFromCombat sets confidence = 1.0
// ---------------------------------------------------------------------------
describe('T10: recon-by-force sets confidence to 1.0', () => {
    it('updateSectorIntelFromCombat raises confidence to 1.0 for the engaged sector pair', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RS', ['e1'], ['oB'], ['oA'], 0.4, ['brig-X']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        // Pre-seed with low confidence
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RS',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'unknown',
                posture_observed: 'unknown',
                offensive_signs: false,
                confidence: 0.1,
                turns_in_contact: 1,
                visible_brigade_ids: [],
                last_updated_turn: 1,
            }],
        };
        // Attack from oA (in sectorA) into oB (in sectorB)
        updateSectorIntelFromCombat(state, 'oA', 'oB', 2);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.confidence).toBe(1.0);
        expect(rec.strength_category).toBe('thin'); // density=0.4 < 0.5
        expect(rec.last_updated_turn).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// T11: updateSectorIntelFromCombat no-ops for same-faction sectors
// ---------------------------------------------------------------------------
describe('T11: recon-by-force no-op for same-faction sectors', () => {
    it('does not modify intel when attacker and defender are in same faction sectors', () => {
        const sectorA = makeSector('sector:corps-A:0', 'corps-A', 'RBiH', ['e1'], ['oA'], ['oB']);
        const sectorB = makeSector('sector:corps-B:0', 'corps-B', 'RBiH', ['e1'], ['oB'], ['oA']);
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });
        state.military.sector_intel = {
            'sector:corps-A:0': [{
                enemy_sector_id: 'sector:corps-B:0',
                enemy_faction: 'RBiH',
                enemy_corps_id: 'corps-B' as any,
                front_edge_count: 1,
                strength_category: 'unknown',
                posture_observed: 'unknown',
                offensive_signs: false,
                confidence: 0.2,
                turns_in_contact: 2,
                visible_brigade_ids: [],
                last_updated_turn: 1,
            }],
        };
        updateSectorIntelFromCombat(state, 'oA', 'oB', 2);
        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.confidence).toBe(0.2); // unchanged
    });
});

// ---------------------------------------------------------------------------
// T12: Faction profile constants
// ---------------------------------------------------------------------------
describe('T12: faction recon profiles', () => {
    it('RBiH has higher passive_buildup and longer recon_range than RS and HRHB', () => {
        const rbih = FACTION_RECON_PROFILES['RBiH'];
        const rs = FACTION_RECON_PROFILES['RS'];
        const hrhb = FACTION_RECON_PROFILES['HRHB'];
        expect(rbih.passive_buildup_per_turn).toBeGreaterThan(rs.passive_buildup_per_turn);
        expect(rbih.passive_buildup_per_turn).toBeGreaterThan(hrhb.passive_buildup_per_turn);
        expect(rbih.recon_range).toBeGreaterThan(rs.recon_range);
        expect(rbih.recon_range).toBeGreaterThan(hrhb.recon_range);
        expect(rbih.confidence_decay_per_turn).toBeLessThan(rs.confidence_decay_per_turn);
    });
});

// ---------------------------------------------------------------------------
// T13: Confidence threshold ordering
// ---------------------------------------------------------------------------
describe('T13: confidence threshold ordering', () => {
    it('ROUGH_STRENGTH < FRONT_BRIGADES < FULL_STRENGTH < DEEP_INTEL', () => {
        expect(CONFIDENCE_ROUGH_STRENGTH).toBeLessThan(CONFIDENCE_FRONT_BRIGADES);
        expect(CONFIDENCE_FRONT_BRIGADES).toBeLessThan(CONFIDENCE_FULL_STRENGTH);
        expect(CONFIDENCE_FULL_STRENGTH).toBeLessThan(CONFIDENCE_DEEP_INTEL);
    });
});

describe('Batch 10: per-OSID intel confidence and source blending', () => {
    it('emits JSON-safe OSID confidence entries sorted by OSID', () => {
        const sectorA = makeSector(
            'sector:corps-A:0',
            'corps-A',
            'RS',
            ['e1', 'e2'],
            ['oA'],
            ['op:zeta', 'op:alpha', 'op:middle'],
        );
        const sectorB = makeSector(
            'sector:corps-B:0',
            'corps-B',
            'RBiH',
            ['e1', 'e2'],
            ['op:middle', 'op:zeta', 'op:alpha'],
            ['oA'],
        );
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });

        deriveSectorIntel(state, 1);

        const rec = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!;
        expect(rec.osid_confidence).toEqual([
            { osid: 'op:alpha', confidence: rec.confidence, sources: ['passive_contact'] },
            { osid: 'op:middle', confidence: rec.confidence, sources: ['passive_contact'] },
            { osid: 'op:zeta', confidence: rec.confidence, sources: ['passive_contact'] },
        ]);
        expect(JSON.parse(JSON.stringify(rec.osid_confidence))).toEqual(rec.osid_confidence);
    });

    it('blends passive contact, patrol, scout, and combat sources deterministically', () => {
        const sectorA = makeSector(
            'sector:corps-A:0',
            'corps-A',
            'RBiH',
            ['e1'],
            ['oA'],
            ['op:target'],
        );
        sectorA.sector_stance = 'screening';
        const sectorB = makeSector(
            'sector:corps-B:0',
            'corps-B',
            'RS',
            ['e1'],
            ['op:target'],
            ['oA'],
        );
        const state = makeMinimalState({ 'sector:corps-A:0': sectorA, 'sector:corps-B:0': sectorB });

        deriveSectorIntel(state, 1);

        const passivePatrolScout = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!.osid_confidence![0]!;
        expect(passivePatrolScout.sources).toEqual(['passive_contact', 'patrol', 'scout']);
        expect(passivePatrolScout.confidence).toBeGreaterThan(
            (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!.confidence,
        );

        updateSectorIntelFromCombat(state, 'oA', 'op:target', 2);

        const combat = (state.military.sector_intel!['sector:corps-A:0'] ?? [])[0]!.osid_confidence![0]!;
        expect(combat).toEqual({
            osid: 'op:target',
            confidence: 1,
            sources: ['combat'],
        });
    });
});
