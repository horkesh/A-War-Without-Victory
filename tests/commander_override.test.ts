import { describe, it, expect } from 'vitest';
import type { ArmyHQOverride, CorpsFrontSector, FormationState } from '../src/state/game_state.js';
import type { ArmyOperationPriority } from '../src/sim/combat/bot_strategy.js';
import {
    commanderReviewAssignment,
    type CommanderOverride,
    type CorpsCommanderProfile,
} from '../src/sim/combat/corps_front_sectors.js';
import { computeSupplyAwareOpSize } from '../src/sim/combat/bot_corps_directives.js';

// ── Factories ───────────────────────────────────────────────────────────────

function makeSector(
    id: string,
    corpsId: string,
    assignedIds: string[],
    edges: number,
    threatRatio: number,
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: Array.from({ length: edges }, (_, i) => `edge_${id}_${i}`),
        sub_segments: [],
        length_edges: edges,
        territory_osids: [],
        assigned_brigade_ids: [...assignedIds],
        reserve_brigade_ids: [],
        density: assignedIds.length / Math.max(edges, 1),
        threat_ratio: threatRatio,
        defensive_power: 1000,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeFormation(
    id: string,
    locationOsid: string,
    corpsId: string,
    personnel = 2000,
): FormationState {
    return {
        id,
        location_osid: locationOsid,
        corps: corpsId,
        personnel,
        cohesion: 80,
        morale: 70,
        fatigue: 0,
        entrenchment: 0,
        posture: 'defend',
        home_osid: locationOsid,
        faction: 'RS',
    } as unknown as FormationState;
}

function makeProfile(competence: number): CorpsCommanderProfile {
    return {
        competence,
        aggressiveness: 0.5,
        prioritySectorId: undefined,
        preStagingSectorWeights: new Map(),
    };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('commanderReviewAssignment', () => {
    const emptyPriorities: ArmyOperationPriority[] = [];
    const emptyComp = new Map<string, number>();

    it('skips review for low-competence commanders', () => {
        const sectors = [
            makeSector('s1', 'vrs_1k', ['bde_1'], 6, 1.0),
            makeSector('s2', 'vrs_1k', ['bde_2'], 6, 1.0),
        ];
        const formations: Record<string, FormationState> = {
            bde_1: makeFormation('bde_1', 'op:banja_luka:bl_1', 'vrs_1k'),
            bde_2: makeFormation('bde_2', 'op:banja_luka:bl_2', 'vrs_1k'),
        };
        const profile = makeProfile(0.2); // below 0.35 threshold

        const overrides = commanderReviewAssignment(
            'vrs_1k', sectors, formations, emptyPriorities,
            profile, emptyComp,
        );

        expect(overrides).toEqual([]);
    });

    it('skips review when corps has fewer than 2 sectors', () => {
        const sectors = [
            makeSector('s1', 'vrs_1k', ['bde_1', 'bde_2'], 8, 1.0),
        ];
        const formations: Record<string, FormationState> = {
            bde_1: makeFormation('bde_1', 'op:banja_luka:bl_1', 'vrs_1k'),
            bde_2: makeFormation('bde_2', 'op:banja_luka:bl_2', 'vrs_1k'),
        };
        const profile = makeProfile(0.6); // above threshold

        const overrides = commanderReviewAssignment(
            'vrs_1k', sectors, formations, emptyPriorities,
            profile, emptyComp,
        );

        expect(overrides).toEqual([]);
    });

    it('passes competence gate for capable commanders', () => {
        const sectors = [
            makeSector('s1', 'vrs_1k', ['bde_1'], 6, 1.0),
            makeSector('s2', 'vrs_1k', ['bde_2'], 6, 1.0),
        ];
        const formations: Record<string, FormationState> = {
            bde_1: makeFormation('bde_1', 'op:banja_luka:bl_1', 'vrs_1k'),
            bde_2: makeFormation('bde_2', 'op:banja_luka:bl_2', 'vrs_1k'),
        };
        const profile = makeProfile(0.6); // above threshold, stubs do nothing

        const overrides = commanderReviewAssignment(
            'vrs_1k', sectors, formations, emptyPriorities,
            profile, emptyComp,
        );

        // Stubs produce no overrides, but function should execute without error
        expect(overrides).toEqual([]);
    });

    describe('defensive coherence', () => {
        it('moves brigade from low-threat surplus to high-threat deficit', () => {
            // s1: 8 edges, threat 3.0, 1 brigade (budget=2, deficit=1)
            // s2: 4 edges, threat 0.3, 3 brigades (budget=1, surplus=2)
            const sectors = [
                makeSector('s1', 'vrs_srk', ['b1'], 8, 3.0),
                makeSector('s2', 'vrs_srk', ['b2', 'b3', 'b4'], 4, 0.3),
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'osid_s1_f1', 'vrs_srk'),
                b2: makeFormation('b2', 'osid_s2_f1', 'vrs_srk', 800),
                b3: makeFormation('b3', 'osid_s2_f1', 'vrs_srk', 600),
                b4: makeFormation('b4', 'osid_s2_f1', 'vrs_srk', 500),
            };
            const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
            const componentOf = new Map<string, number>();
            const result = commanderReviewAssignment(
                'vrs_srk', sectors, formations, [], profile,
                componentOf,
            );
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].reason).toBe('defensive_critical');
            expect(result[0].to_sector_id).toBe('s1');
            expect(result[0].from_sector_id).toBe('s2');
            // After override application, s1 should have 2 brigades
            expect(sectors[0].assigned_brigade_ids.length).toBe(2);
        });

        it('does not strip donor below MIN_DONOR_BRIGADES', () => {
            // s1: 12 edges, threat 5.0, 1 brigade (budget=2, deficit=1)
            // s2: 4 edges, threat 0.2, 1 brigade (budget=1, at minimum)
            const sectors = [
                makeSector('s1', 'vrs_srk', ['b1'], 12, 5.0),
                makeSector('s2', 'vrs_srk', ['b2'], 4, 0.2),
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'osid_s1_f1', 'vrs_srk'),
                b2: makeFormation('b2', 'osid_s2_f1', 'vrs_srk'),
            };
            const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
            const result = commanderReviewAssignment(
                'vrs_srk', sectors, formations, [], profile,
                new Map(),
            );
            // No transfer — s2 can't go below 1
            expect(result.length).toBe(0);
            expect(sectors[1].assigned_brigade_ids.length).toBe(1);
        });

        it('skips sectors below threat threshold', () => {
            // Both sectors below DEFENSIVE_CRITICAL_THREAT (2.0)
            const sectors = [
                makeSector('s1', 'vrs_srk', ['b1'], 8, 1.5),
                makeSector('s2', 'vrs_srk', ['b2', 'b3', 'b4'], 4, 0.5),
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'osid_s1_f1', 'vrs_srk'),
                b2: makeFormation('b2', 'osid_s2_f1', 'vrs_srk'),
                b3: makeFormation('b3', 'osid_s2_f1', 'vrs_srk'),
                b4: makeFormation('b4', 'osid_s2_f1', 'vrs_srk'),
            };
            const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
            const result = commanderReviewAssignment(
                'vrs_srk', sectors, formations, [], profile,
                new Map(),
            );
            expect(result.length).toBe(0);
        });
    });

    describe('mission compliance', () => {
        it('concentrates brigades at mission-relevant sector', () => {
            const sectors: any[] = [
                { ...makeSector('s1', 'vrs_2kk', ['b1'], 8, 1.0),
                  sub_segments: [{ friendly_osids: ['op:bihac:f1'], enemy_osids: ['op:bihac:h1'] }] },
                { ...makeSector('s2', 'vrs_2kk', ['b2', 'b3', 'b4'], 4, 0.3),
                  sub_segments: [{ friendly_osids: ['op:livno:f1'], enemy_osids: ['op:livno:h1'] }] },
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'op:bihac:f1', 'vrs_2kk', 800),
                b2: makeFormation('b2', 'op:livno:f1', 'vrs_2kk', 700),
                b3: makeFormation('b3', 'op:livno:f1', 'vrs_2kk', 600),
                b4: makeFormation('b4', 'op:livno:f1', 'vrs_2kk', 500),
            };
            const priorities = [{
                name: 'Bihac Pocket', corps_id: 'vrs_2kk',
                target_municipalities: ['bihac'],
                start_week: 0, end_week: 52, weight: 10,
                min_outcome: 'stalemate' as const,
            }];
            const profile = { competence: 0.6, aggressiveness: 0.6, preStagingSectorWeights: new Map() };
            const result = commanderReviewAssignment(
                'vrs_2kk', sectors, formations, priorities, profile, new Map(),
            );
            expect(result.some(o => o.to_sector_id === 's1' && o.reason === 'mission_priority')).toBe(true);
            expect(sectors[0].assigned_brigade_ids.length).toBeGreaterThan(1);
        });

        it('does not move when no army priorities exist', () => {
            const sectors = [
                makeSector('s1', 'vrs_2kk', ['b1'], 8, 1.0),
                makeSector('s2', 'vrs_2kk', ['b2', 'b3'], 4, 0.3),
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'osid_s1_f1', 'vrs_2kk'),
                b2: makeFormation('b2', 'osid_s2_f1', 'vrs_2kk'),
                b3: makeFormation('b3', 'osid_s2_f1', 'vrs_2kk'),
            };
            const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
            const result = commanderReviewAssignment(
                'vrs_2kk', sectors, formations, [], profile, new Map(),
            );
            expect(result.filter(o => o.reason === 'mission_priority').length).toBe(0);
        });
    });

    describe('non-priority excess', () => {
        it('releases excess from non-priority sector', () => {
            const sectors: any[] = [
                { ...makeSector('s1', 'vrs_2kk', ['b1'], 8, 1.5),
                  sub_segments: [{ friendly_osids: ['op:bihac:f1'], enemy_osids: ['op:bihac:h1'] }] },
                { ...makeSector('s2', 'vrs_2kk', ['b2', 'b3', 'b4'], 4, 0.3),
                  sub_segments: [{ friendly_osids: ['op:prozor:f1'], enemy_osids: ['op:prozor:h1'] }] },
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'op:bihac:f1', 'vrs_2kk', 800),
                b2: makeFormation('b2', 'op:prozor:f1', 'vrs_2kk', 700),
                b3: makeFormation('b3', 'op:prozor:f1', 'vrs_2kk', 600),
                b4: makeFormation('b4', 'op:prozor:f1', 'vrs_2kk', 500),
            };
            const priorities = [{
                name: 'Bihac', corps_id: 'vrs_2kk',
                target_municipalities: ['bihac'],
                start_week: 0, end_week: 52, weight: 10,
                min_outcome: 'stalemate' as const,
            }];
            const profile = { competence: 0.5, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
            const result = commanderReviewAssignment(
                'vrs_2kk', sectors, formations, priorities, profile, new Map(),
            );
            expect(result.some(o => o.from_sector_id === 's2' && o.reason === 'non_priority_excess')).toBe(true);
        });
    });

    describe('offensive staging', () => {
        it('concentrates at staging sector', () => {
            const sectors = [
                makeSector('s1', 'vrs_drina', ['b1'], 6, 1.0),
                makeSector('s2', 'vrs_drina', ['b2', 'b3', 'b4'], 4, 0.4),
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'osid_s1_f1', 'vrs_drina', 800),
                b2: makeFormation('b2', 'osid_s2_f1', 'vrs_drina', 700),
                b3: makeFormation('b3', 'osid_s2_f1', 'vrs_drina', 600),
                b4: makeFormation('b4', 'osid_s2_f1', 'vrs_drina', 500),
            };
            const profile = {
                competence: 0.6, aggressiveness: 0.7,
                preStagingSectorWeights: new Map([['s1', 3.0]]),
            };
            const result = commanderReviewAssignment(
                'vrs_drina', sectors, formations, [], profile, new Map(),
            );
            expect(result.some(o => o.to_sector_id === 's1' && o.reason === 'offensive_staging')).toBe(true);
        });

        it('does not pull from high-threat sector for staging', () => {
            const sectors = [
                makeSector('s1', 'vrs_drina', ['b1'], 6, 0.5),
                makeSector('s2', 'vrs_drina', ['b2', 'b3'], 4, 3.0), // high threat
            ];
            const formations: Record<string, any> = {
                b1: makeFormation('b1', 'osid_s1_f1', 'vrs_drina'),
                b2: makeFormation('b2', 'osid_s2_f1', 'vrs_drina'),
                b3: makeFormation('b3', 'osid_s2_f1', 'vrs_drina'),
            };
            const profile = {
                competence: 0.6, aggressiveness: 0.8,
                preStagingSectorWeights: new Map([['s1', 3.0]]),
            };
            const result = commanderReviewAssignment(
                'vrs_drina', sectors, formations, [], profile, new Map(),
            );
            // Should NOT pull from s2 (threat 3.0 >= DEFENSIVE_CRITICAL_THREAT)
            expect(result.filter(o => o.from_sector_id === 's2').length).toBe(0);
        });
    });
});

describe('supply-aware operation sizing', () => {
    it('blocks operations when critical supply', () => {
        expect(computeSupplyAwareOpSize(
            { critical_fraction: 0.6, adequate_fraction: 0.1 }, 5, 12
        )).toBe(0);
    });

    it('allows full operations when adequate supply', () => {
        expect(computeSupplyAwareOpSize(
            { critical_fraction: 0.1, adequate_fraction: 0.8 }, 5, 12
        )).toBe(12);
    });

    it('limits to surplus when strained supply', () => {
        expect(computeSupplyAwareOpSize(
            { critical_fraction: 0.3, adequate_fraction: 0.4 }, 3, 12
        )).toBe(3);
    });

    it('caps at max even when surplus exceeds it', () => {
        expect(computeSupplyAwareOpSize(
            { critical_fraction: 0.3, adequate_fraction: 0.4 }, 20, 12
        )).toBe(12);
    });
});

describe('ArmyHQOverride type', () => {
    it('is assignable with all required fields', () => {
        const override: ArmyHQOverride = {
            corps_id: 'vrs_drina',
            operation_name: 'Srebrenica Push',
            min_brigades: 4,
            target_osids: ['op:srebrenica:srebrenica_2'],
            reason: 'Take Srebrenica at all costs',
            issued_turn: 20,
            type: 'offensive',
        };
        expect(override.corps_id).toBe('vrs_drina');
        expect(override.type).toBe('offensive');
    });

    it('supports probe type with max_brigades', () => {
        const probe: ArmyHQOverride = {
            corps_id: 'arbih_2nd_corps',
            operation_name: 'Brčko Probe',
            min_brigades: 1,
            target_osids: ['op:brcko:brka_2'],
            reason: 'Test VRS defenses',
            issued_turn: 15,
            type: 'probe',
            max_brigades: 2,
        };
        expect(probe.type).toBe('probe');
        expect(probe.max_brigades).toBe(2);
    });
});
