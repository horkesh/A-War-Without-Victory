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
): FormationState {
    return {
        id,
        location_osid: locationOsid,
        corps: corpsId,
        personnel: 2000,
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
});
