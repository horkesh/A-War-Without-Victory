import { describe, it, expect } from 'vitest';
import type { CorpsFrontSector, FormationState } from '../src/state/game_state.js';
import type { ArmyOperationPriority } from '../src/sim/combat/bot_strategy.js';
import {
    commanderReviewAssignment,
    type CommanderOverride,
    type CorpsCommanderProfile,
} from '../src/sim/combat/corps_front_sectors.js';

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
    const emptyAdj = new Map<string, string[]>();
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
            profile, emptyAdj, emptyComp,
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
            profile, emptyAdj, emptyComp,
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
            profile, emptyAdj, emptyComp,
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
                new Map(), componentOf,
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
                new Map(), new Map(),
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
                new Map(), new Map(),
            );
            expect(result.length).toBe(0);
        });
    });
});
