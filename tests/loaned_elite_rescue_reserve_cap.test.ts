/**
 * Regression tests for the reserve-cap guard in rescueUnassignedLoanedElitesInTerritory.
 *
 * The rescue pass runs after merge/seal and places unassigned loaned elites into
 * sectors. The guard ensures no sector exceeds MAX_RESERVES_PER_SECTOR (1).
 * If a sector already has a reserve, the rescued elite goes to assigned_brigade_ids.
 */
import { describe, it, expect } from 'vitest';
import {
    rescueUnassignedLoanedElitesInTerritory,
    MAX_RESERVES_PER_SECTOR,
} from '../src/sim/combat/corps_front_sectors.js';
import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';

function makeSector(overrides: Partial<CorpsFrontSector> = {}): CorpsFrontSector {
    return {
        sector_id: 'sector:vrs_drina:0',
        corps_id: 'vrs_drina' as FormationId,
        faction: 'RS' as FactionId,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: ['op:test:a__op:test:b'],
        sub_segments: [],
        length_edges: 1,
        territory_osids: ['op:test:a'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
        ...overrides,
    } as CorpsFrontSector;
}

function makeLoanedElite(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 2500,
        cohesion: 70,
        morale: 65,
        corps_id: 'vrs_main_staff',
        location_osid: 'op:test:a',
        elite_loan_state: {
            on_loan: true,
            loaned_to_corps: 'vrs_drina',
            loan_start_turn: 1,
        },
        ...overrides,
    } as FormationState;
}

describe('rescueUnassignedLoanedElitesInTerritory reserve cap', () => {
    it('rescue into sector with NO existing reserve -> reserve_brigade_ids', () => {
        const sector = makeSector({ reserve_brigade_ids: [] });
        const sectors: Record<string, CorpsFrontSector> = { [sector.sector_id]: sector };
        const elite = makeLoanedElite('elite_a');
        const formations: Record<FormationId, FormationState> = {
            ['elite_a' as FormationId]: elite,
        };

        rescueUnassignedLoanedElitesInTerritory(sectors, formations);

        expect(sector.reserve_brigade_ids).toContain('elite_a');
        expect(sector.reserve_brigade_ids).toHaveLength(1);
        expect(sector.assigned_brigade_ids).not.toContain('elite_a');
    });

    it('rescue into sector WITH existing reserve -> assigned_brigade_ids', () => {
        const sector = makeSector({
            reserve_brigade_ids: ['existing_reserve' as FormationId],
        });
        const sectors: Record<string, CorpsFrontSector> = { [sector.sector_id]: sector };
        const elite = makeLoanedElite('elite_b');
        const formations: Record<FormationId, FormationState> = {
            ['elite_b' as FormationId]: elite,
        };

        rescueUnassignedLoanedElitesInTerritory(sectors, formations);

        // Reserve stays at 1 — the existing reserve is untouched
        expect(sector.reserve_brigade_ids).toHaveLength(1);
        expect(sector.reserve_brigade_ids).toContain('existing_reserve');
        expect(sector.reserve_brigade_ids).not.toContain('elite_b');
        // Rescued elite goes to assigned instead
        expect(sector.assigned_brigade_ids).toContain('elite_b');
    });

    it('multiple loaned elites rescued into same sector -> only 1 in reserve', () => {
        const sector = makeSector({
            territory_osids: ['op:test:a'],
            reserve_brigade_ids: [],
        });
        const sectors: Record<string, CorpsFrontSector> = { [sector.sector_id]: sector };
        const eliteA = makeLoanedElite('elite_x');
        const eliteB = makeLoanedElite('elite_y');
        const formations: Record<FormationId, FormationState> = {
            ['elite_x' as FormationId]: eliteA,
            ['elite_y' as FormationId]: eliteB,
        };

        rescueUnassignedLoanedElitesInTerritory(sectors, formations);

        // Exactly one in reserve, the other in assigned
        expect(sector.reserve_brigade_ids).toHaveLength(1);
        const totalRescued = sector.reserve_brigade_ids.length +
            sector.assigned_brigade_ids.filter(id => id === 'elite_x' || id === 'elite_y').length;
        expect(totalRescued).toBe(2);
        // assigned_brigade_ids should be sorted (determinism)
        const assignedCopy = [...sector.assigned_brigade_ids];
        assignedCopy.sort();
        expect(sector.assigned_brigade_ids).toEqual(assignedCopy);
    });

    it('MAX_RESERVES_PER_SECTOR is 1', () => {
        expect(MAX_RESERVES_PER_SECTOR).toBe(1);
    });
});
