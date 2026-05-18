/**
 * Tests for v0.8.1 Phase 2 — Belief Layer.
 *
 * Covers:
 * 1. Belief creation from raw data (briefing intel -> ZoneBelief)
 * 2. Persistence across turns (blended updates)
 * 3. Divergence from raw truth (stale belief decay)
 * 4. Deterministic update behavior
 * 5. Decision consumption through belief (decide.ts integration)
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import type {
    FactionId,
    FormationId,
    FormationState,
    SectorIntelRecord,
    CorpsFrontSector,
} from '../../src/state/game_state.js';
import type {
    ZoneAssessment,
    ZoneId,
    ZonePosture,
    BrigadeEvaluation,
    ForceAssessment,
    OfficerPersonality,
    CommanderBriefing,
    CommanderState,
    CommanderBeliefState,
    ZoneBelief,
    ThreatAssessment,
    CommanderIntelData,
} from '../../src/sim/combat/commander/commander_state.js';
import { assembleBeliefState } from '../../src/sim/combat/commander/belief.js';
import { makeDecisions } from '../../src/sim/combat/commander/decide.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers — extracted to tests/_helpers/commander.ts (Phase 1 pattern).
// Aliased here for local readability. Per-file overrides supplied at call sites.
// ═══════════════════════════════════════════════════════════════════════════

import {
    makeCommanderBrigade as makeBrigade,
    makeCommanderZone as makeZone,
    makeCommanderEval as makeEval,
    makeCommanderForces as makeForces,
    makeCommanderMinimalSpatial as makeMinimalSpatial,
    makeCommanderMinimalBriefing as makeMinimalBriefing,
    makeCommanderMinimalState as makeMinimalState,
    DEFAULT_COMMANDER_PERSONALITY as defaultPersonality,
} from '../_helpers/commander.js';

/**
 * Build a realistic CorpsFrontSector mock. Real sectors need territory_osids
 * and assigned_brigade_ids for belief assembly and decide.ts to work.
 *
 * Local helper: shape unique to this test (no consolidation candidate).
 */
function makeSector(overrides: Partial<CorpsFrontSector> = {}): CorpsFrontSector {
    return {
        sector_id: 'sector_0',
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        opposing_factions: ['RS' as FactionId],
        edge_ids: [],
        sub_segments: [],
        length_edges: 5,
        territory_osids: ['op:test:test_1', 'op:test:test_2'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        ...overrides,
    } as CorpsFrontSector;
}

/** Helper: build a SectorIntelRecord with overrides. */
function makeIntelRecord(overrides: Partial<SectorIntelRecord> = {}): SectorIntelRecord {
    return {
        enemy_sector_id: 'enemy_sector_0',
        enemy_faction: 'RS' as FactionId,
        enemy_corps_id: 'enemy_corps' as FormationId,
        front_edge_count: 5,
        strength_category: 'moderate',
        posture_observed: 'static',
        offensive_signs: false,
        confidence: 0.5,
        turns_in_contact: 3,
        ...overrides,
    } as SectorIntelRecord;
}

/** Helper: build a ZoneBelief with overrides. */
function makeZoneBelief(overrides: Partial<ZoneBelief> = {}): ZoneBelief {
    return {
        zone_id: 'zone:test_corps:0' as ZoneId,
        estimated_enemy_strength: 1000,
        estimated_enemy_intent: 'hold',
        confidence: 0.5,
        last_confirmed_turn: 10,
        ...overrides,
    };
}

/** Helper: build a CommanderBeliefState with overrides. */
function makeBeliefState(overrides: Partial<CommanderBeliefState> = {}): CommanderBeliefState {
    return {
        zone_beliefs: [],
        supply_continuity_confidence: 1.0,
        subordinate_reliability: {},
        neighbor_support_confidence: {},
        ...overrides,
    };
}

/**
 * Helper: build a SupplyStateByOsidReport with the proper nested structure.
 * Maps osid -> state pairs into the factions[].by_osid[] format.
 */
function makeSupplyReport(
    faction: string,
    osidStates: Record<string, string>,
): { schema: 1; turn: number; factions: Array<{ faction_id: string; by_osid: Array<{ osid: string; state: string }> }> } {
    const byOsid = Object.entries(osidStates)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([osid, state]) => ({ osid, state }));
    return {
        schema: 1,
        turn: 10,
        factions: [{ faction_id: faction, by_osid: byOsid }],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Belief Creation from Raw Data
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 2 — belief creation from raw data', () => {
    it('fortress strength + offensive_signs produces high enemy strength and mass intent', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const intelData: CommanderIntelData = {
            sector_intel: {
                'sector_0': [
                    makeIntelRecord({
                        strength_category: 'fortress',
                        offensive_signs: true,
                        confidence: 0.9,
                        turns_in_contact: 8,
                    }),
                ],
            },
            opsec_active_sectors: [],
        };

        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: intelData,
            sectors: [makeSector({
                sector_id: 'sector_0',
                territory_osids: ['op:test:test_1', 'op:test:test_2'],
            })],
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, null, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        // fortress maps to 4000 in strengthCategoryToEstimate
        expect(zoneBelief!.estimated_enemy_strength).toBe(4000);
        expect(zoneBelief!.estimated_enemy_intent).toBe('mass');
    });

    it('bounds fresh strength estimates by blended per-OSID confidence when present', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const intelData: CommanderIntelData = {
            sector_intel: {
                'sector_0': [
                    makeIntelRecord({
                        strength_category: 'fortress',
                        confidence: 0.9,
                        osid_confidence: [
                            { osid: 'op:test:enemy_a', confidence: 0.25, sources: ['passive_contact'] },
                            { osid: 'op:test:enemy_b', confidence: 0.75, sources: ['passive_contact', 'scout'] },
                        ],
                    }),
                ],
            },
            opsec_active_sectors: [],
        };

        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: intelData,
            sectors: [makeSector({
                sector_id: 'sector_0',
                territory_osids: ['op:test:test_1'],
            })],
        });

        const zones = [makeZone({ zone_id: zoneId, osids: ['op:test:test_1'] })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, null, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        expect(zoneBelief!.estimated_enemy_strength).toBe(2000);
        expect(zoneBelief!.confidence).toBeCloseTo(0.5, 5);
    });

    it('no intel records produces baseline defaults (strength 500, unknown intent, 0.3 confidence)', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: null,
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, null, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        // No contact, no previous -> baseline 500, intent unknown
        expect(zoneBelief!.estimated_enemy_strength).toBe(500);
        expect(zoneBelief!.estimated_enemy_intent).toBe('unknown');
        expect(zoneBelief!.confidence).toBeCloseTo(0.3, 1);
    });

    it('supply continuity confidence reflects ratio of non-critical supply OSIDs', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const osids = ['op:test:test_1', 'op:test:test_2', 'op:test:test_3', 'op:test:test_4'];

        // 3 of 4 OSIDs are non-critical
        const briefing = makeMinimalBriefing({
            turn: 10,
            faction: 'RBiH' as FactionId,
            supply_by_osid: makeSupplyReport('RBiH', {
                'op:test:test_1': 'adequate',
                'op:test:test_2': 'adequate',
                'op:test:test_3': 'strained',
                'op:test:test_4': 'critical',
            }) as any,
        });

        const zones = [makeZone({ zone_id: zoneId, osids })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, null, 10);

        // 3 of 4 non-critical -> 0.75
        expect(result.supply_continuity_confidence).toBeCloseTo(0.75, 1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Persistence Across Turns
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 2 — belief persistence across turns', () => {
    it('blends previous enemy strength with fresh observation (0.7 current + 0.3 previous)', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousBeliefs = makeBeliefState({
            zone_beliefs: [makeZoneBelief({
                zone_id: zoneId,
                estimated_enemy_strength: 3000,
                last_confirmed_turn: 9,
            })],
        });

        // Fresh intel: moderate -> 2000 fresh strength
        const intelData: CommanderIntelData = {
            sector_intel: {
                'sector_0': [
                    makeIntelRecord({
                        strength_category: 'moderate',
                        confidence: 0.6,
                        turns_in_contact: 5,
                    }),
                ],
            },
            opsec_active_sectors: [],
        };

        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: intelData,
            sectors: [makeSector({
                sector_id: 'sector_0',
                territory_osids: ['op:test:test_1', 'op:test:test_2'],
            })],
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, previousBeliefs, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        // Blended: 0.7 * 2000 + 0.3 * 3000 = 1400 + 900 = 2300
        expect(zoneBelief!.estimated_enemy_strength).toBe(2300);
    });

    it('subordinate reliability blends 0.7 current + 0.3 previous', () => {
        const previousBeliefs = makeBeliefState({
            subordinate_reliability: { 'bde_alpha': 0.9 },
        });

        const briefing = makeMinimalBriefing({ turn: 11 });
        const zones = [makeZone()];
        const forces = makeForces([makeEval({ brigade_id: 'bde_alpha' as FormationId })]);

        const result = assembleBeliefState(briefing, zones, forces, previousBeliefs, 11);

        const alphaReliability = result.subordinate_reliability['bde_alpha'];
        expect(alphaReliability).toBeDefined();
        // current_score = (0.6 + 0.3 + 0.2) / 1.5 = 0.733...
        // blended: 0.7 * 0.733 + 0.3 * 0.9 = 0.513 + 0.27 = 0.783
        const expectedCurrent = (0.6 + 0.3 + 0.2) / 1.5;
        const expectedBlended = 0.7 * expectedCurrent + 0.3 * 0.9;
        expect(alphaReliability).toBeCloseTo(expectedBlended, 3);
    });

    it('neighbor support confidence blends 0.6 current + 0.4 previous', () => {
        const previousBeliefs = makeBeliefState({
            neighbor_support_confidence: { 'neighbor_corps': 0.8 },
        });

        const briefing = makeMinimalBriefing({
            turn: 11,
            adjacent_corps: [{
                corps_id: 'neighbor_corps' as FormationId,
                stance: 'balanced',
                active_operations: 1,
            }],
        });
        const zones = [makeZone()];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, previousBeliefs, 11);

        const neighborConf = result.neighbor_support_confidence['neighbor_corps'];
        expect(neighborConf).toBeDefined();
        // active_operations > 0 -> currentScore = 0.6
        // blended: 0.6 * 0.6 + 0.4 * 0.8 = 0.36 + 0.32 = 0.68
        expect(neighborConf).toBeCloseTo(0.68, 3);
    });

    it('zone belief for unchanged zone carries forward blended toward baseline', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousBeliefs = makeBeliefState({
            zone_beliefs: [makeZoneBelief({
                zone_id: zoneId,
                estimated_enemy_strength: 1500,
                estimated_enemy_intent: 'probe',
                confidence: 0.6,
                last_confirmed_turn: 9,
            })],
        });

        // No intel this turn -> decays toward baseline
        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: null,
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, previousBeliefs, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        // No contact decay: 0.9 * 1500 + 0.1 * 500 = 1350 + 50 = 1400
        expect(zoneBelief!.estimated_enemy_strength).toBe(1400);
        // 1 turn since confirmed (10 - 9) < STALENESS_THRESHOLD(3) -> carries forward
        expect(zoneBelief!.estimated_enemy_intent).toBe('probe');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Divergence from Raw Truth (Stale Beliefs)
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 2 — stale belief decay', () => {
    it('no fresh intel decays enemy strength toward baseline (0.9 * prev + 0.1 * 500)', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousBeliefs = makeBeliefState({
            zone_beliefs: [makeZoneBelief({
                zone_id: zoneId,
                estimated_enemy_strength: 3000,
                last_confirmed_turn: 7,
            })],
        });

        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: null,
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, previousBeliefs, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        // Decay: 0.9 * 3000 + 0.1 * 500 = 2700 + 50 = 2750
        expect(zoneBelief!.estimated_enemy_strength).toBe(2750);
    });

    it('mass intent degrades to unknown after 3+ turns without contact', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousBeliefs = makeBeliefState({
            zone_beliefs: [makeZoneBelief({
                zone_id: zoneId,
                estimated_enemy_intent: 'mass',
                last_confirmed_turn: 6,  // 4 turns stale at turn 10
            })],
        });

        const briefing = makeMinimalBriefing({
            turn: 10,
            intel_data: null,
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, previousBeliefs, 10);

        const zoneBelief = result.zone_beliefs.find(zb => zb.zone_id === zoneId);
        expect(zoneBelief).toBeDefined();
        // 10 - 6 = 4 >= STALENESS_THRESHOLD(3) -> degrades to unknown
        expect(zoneBelief!.estimated_enemy_intent).toBe('unknown');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Deterministic Update Behavior
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 2 — deterministic behavior', () => {
    it('same inputs produce identical outputs (idempotent)', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousBeliefs = makeBeliefState({
            zone_beliefs: [makeZoneBelief({ zone_id: zoneId, estimated_enemy_strength: 2000 })],
            subordinate_reliability: { 'bde_1': 0.7 },
            neighbor_support_confidence: { 'corps_2': 0.6 },
        });

        const intelData: CommanderIntelData = {
            sector_intel: {
                'sector_0': [makeIntelRecord({ strength_category: 'dense', confidence: 0.7 })],
            },
            opsec_active_sectors: [],
        };

        const briefing = makeMinimalBriefing({
            turn: 12,
            intel_data: intelData,
            adjacent_corps: [{ corps_id: 'corps_2' as FormationId, stance: 'defend', active_operations: 0 }],
            sectors: [makeSector({
                sector_id: 'sector_0',
                territory_osids: ['op:test:test_1', 'op:test:test_2'],
            })],
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const forces = makeForces([makeEval({ brigade_id: 'bde_1' as FormationId })]);

        const result1 = assembleBeliefState(briefing, zones, forces, previousBeliefs, 12);
        const result2 = assembleBeliefState(briefing, zones, forces, previousBeliefs, 12);

        expect(result1).toEqual(result2);
    });

    it('zone_beliefs are sorted by zone_id for deterministic ordering', () => {
        const zoneA = 'zone:test_corps:0' as ZoneId;
        const zoneB = 'zone:test_corps:1' as ZoneId;
        const zoneC = 'zone:test_corps:2' as ZoneId;

        const briefing = makeMinimalBriefing({ turn: 10, intel_data: null });

        // Provide zones in reverse order to test sorting
        const zones = [
            makeZone({ zone_id: zoneC, osids: ['op:test:c1'] }),
            makeZone({ zone_id: zoneA, osids: ['op:test:a1'] }),
            makeZone({ zone_id: zoneB, osids: ['op:test:b1'] }),
        ];
        const forces = makeForces([makeEval()]);

        const result = assembleBeliefState(briefing, zones, forces, null, 10);

        expect(result.zone_beliefs.length).toBe(3);
        // Sorted by zone_id via strictCompare
        expect(result.zone_beliefs[0]!.zone_id).toBe(zoneA);
        expect(result.zone_beliefs[1]!.zone_id).toBe(zoneB);
        expect(result.zone_beliefs[2]!.zone_id).toBe(zoneC);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Decision Consumption Through Belief
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 2 — decision consumption through belief', () => {
    it('zone with mass intent in beliefState triggers defensive stance change', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const beliefState = makeBeliefState({
            zone_beliefs: [makeZoneBelief({
                zone_id: zoneId,
                estimated_enemy_intent: 'mass',
                estimated_enemy_strength: 5000,
                confidence: 0.8,
                last_confirmed_turn: 10,
            })],
        });

        const previousState = makeMinimalState({
            belief_state: beliefState,
            intel_picture: {
                zone_confidence: {},
                offensive_signs: {},
                concentration_detected: {},
                last_updated_turn: 10,
            },
        });

        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'defending',
            front_edge_count: 15,
        })];

        const threats: ThreatAssessment = {
            threatened_zones: [{ zone_id: zoneId, threat_level: 'high' }],
            enemy_concentration_zones: [zoneId],
            recent_losses: [],
            overall_pressure: 'heavy',
        };

        const evals = [
            makeEval({ brigade_id: 'bde_1' as FormationId, current_zone: zoneId }),
            makeEval({ brigade_id: 'bde_2' as FormationId, current_zone: zoneId }),
        ];

        const briefing = makeMinimalBriefing({
            turn: 10,
            sectors: [makeSector({
                sector_id: 'sector_0',
                territory_osids: ['op:test:test_1', 'op:test:test_2'],
                sub_segments: [{ friendly_osids: ['op:test:test_1'], hostile_osids: ['op:test:enemy_1'] }] as any,
            })],
            previous_state: previousState,
        });

        const result = makeDecisions(briefing, zones, threats, evals, null, previousState);

        // With mass intent detected, any stance change should be defensive
        // (fortify, active_defense, defend), never screening
        for (const change of result.stance_changes) {
            expect(['fortify', 'active_defense', 'defend']).toContain(change.new_stance);
        }
    });

    it('null beliefState falls back to legacy behavior (raw concentration_detected)', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousState = makeMinimalState({
            intel_picture: {
                zone_confidence: {},
                offensive_signs: { 'sector_0': 3 },
                concentration_detected: { 'sector_0': true },
                last_updated_turn: 10,
            },
        });

        const zones = [makeZone({ zone_id: zoneId })];
        const threats: ThreatAssessment = {
            threatened_zones: [{ zone_id: zoneId, threat_level: 'high' }],
            enemy_concentration_zones: [zoneId],
            recent_losses: [],
            overall_pressure: 'heavy',
        };

        const evals = [makeEval({ brigade_id: 'bde_1' as FormationId, current_zone: zoneId })];

        const briefing = makeMinimalBriefing({
            turn: 10,
            sectors: [makeSector({
                sector_id: 'sector_0',
                territory_osids: ['op:test:test_1', 'op:test:test_2'],
                sub_segments: [{ friendly_osids: ['op:test:test_1'], hostile_osids: ['op:test:enemy_1'] }] as any,
            })],
            previous_state: previousState,
        });

        // Should not crash; should produce valid result using raw intel data
        const result = makeDecisions(briefing, zones, threats, evals, null, previousState);

        expect(result).toBeDefined();
        expect(result.intel_picture).toBeDefined();
        expect(result.activity_entries).toBeDefined();
    });

    it('reserve shifts prioritize zone with higher believed enemy strength', () => {
        const zoneHigh = 'zone:test_corps:0' as ZoneId;
        const zoneLow = 'zone:test_corps:1' as ZoneId;

        const beliefState = makeBeliefState({
            zone_beliefs: [
                makeZoneBelief({
                    zone_id: zoneHigh,
                    estimated_enemy_strength: 5000,
                    estimated_enemy_intent: 'attack',
                    confidence: 0.8,
                    last_confirmed_turn: 10,
                }),
                makeZoneBelief({
                    zone_id: zoneLow,
                    estimated_enemy_strength: 500,
                    estimated_enemy_intent: 'hold',
                    confidence: 0.7,
                    last_confirmed_turn: 10,
                }),
            ],
        });

        const previousState = makeMinimalState({
            belief_state: beliefState,
            intel_picture: {
                zone_confidence: {},
                offensive_signs: {},
                concentration_detected: {},
                last_updated_turn: 10,
            },
        });

        const zones = [
            makeZone({ zone_id: zoneHigh, osids: ['op:test:test_1'], posture: 'defending', deficit: 2, front_edge_count: 15 }),
            makeZone({ zone_id: zoneLow, osids: ['op:test:test_3'], posture: 'projecting', deficit: 0, surplus_brigades: ['bde_surplus' as FormationId], front_edge_count: 3 }),
        ];

        const threats: ThreatAssessment = {
            threatened_zones: [
                { zone_id: zoneHigh, threat_level: 'high' },
                { zone_id: zoneLow, threat_level: 'low' },
            ],
            enemy_concentration_zones: [zoneHigh],
            recent_losses: [],
            overall_pressure: 'moderate',
        };

        const evals = [
            makeEval({ brigade_id: 'bde_1' as FormationId, current_zone: zoneHigh }),
            makeEval({ brigade_id: 'bde_surplus' as FormationId, current_zone: zoneLow }),
        ];

        const briefing = makeMinimalBriefing({
            turn: 10,
            sectors: [
                makeSector({
                    sector_id: 'sector_high',
                    territory_osids: ['op:test:test_1'],
                    sub_segments: [{ friendly_osids: ['op:test:test_1'], hostile_osids: ['op:test:enemy_1'] }] as any,
                }),
                makeSector({
                    sector_id: 'sector_low',
                    territory_osids: ['op:test:test_3'],
                    sub_segments: [{ friendly_osids: ['op:test:test_3'], hostile_osids: ['op:test:enemy_2'] }] as any,
                }),
            ],
            previous_state: previousState,
        });

        const result = makeDecisions(briefing, zones, threats, evals, null, previousState);

        // If reserves are shifted, they should go toward the high-threat zone
        if (result.reserve_shifts.length > 0) {
            const shiftToHigh = result.reserve_shifts.filter(s => s.to_zone === zoneHigh);
            const shiftToLow = result.reserve_shifts.filter(s => s.to_zone === zoneLow);
            expect(shiftToHigh.length).toBeGreaterThanOrEqual(shiftToLow.length);
        }
    });
});
