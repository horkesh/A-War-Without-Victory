/**
 * Cold-front sector suppression tests.
 *
 * Verifies that `isSectorColdFront` correctly identifies sectors on RS↔HRHB
 * truce lines under the Graz Accords, which should be suppressed during
 * sector construction (single-OSID isolated pockets facing only the truce partner).
 */

import { describe, it, expect } from 'vitest';
import { isSectorColdFront } from '../src/sim/combat/sector_utils.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    GameState,
} from '../src/state/game_state.js';

// ── Fixture helpers ─────────────────────────────────────────────────────────

/** Minimal GameState with Graz Accords active (both RS and HRHB accepted). */
function makeGrazActiveState(overrides?: Partial<{
    turn: number;
    vienna_herzegovina_broken_by: FactionId | null;
    graz_east_herzegovina_active_turn: number | null;
}>): GameState {
    return {
        meta: { turn: overrides?.turn ?? 10, phase: 'war' },
        political: {
            vienna_declaration_turn: 4,
            vienna_accepted: {
                RS: true,
                HRHB: true,
            } as Record<FactionId, boolean>,
            vienna_herzegovina_broken_by: overrides?.vienna_herzegovina_broken_by ?? undefined,
            graz_east_herzegovina_active_turn: overrides?.graz_east_herzegovina_active_turn ?? undefined,
        },
    } as unknown as GameState;
}

/** Minimal GameState where Graz Accords have NOT been accepted. */
function makeGrazInactiveState(): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        political: {},
    } as unknown as GameState;
}

function makeSubSeg(
    id: string,
    friendlyOsids: string[],
    enemyOsids: string[],
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: [`edge_${id}_0`],
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: 1,
        primary_brigade_ids: [],
    };
}

function makeSector(overrides: {
    sectorId: string;
    corpsId: string;
    faction: FactionId;
    opposingFactions: FactionId[];
    subSegments: CorpsFrontSubSegment[];
    territoryOsids?: string[];
}): CorpsFrontSector {
    const allEdges = overrides.subSegments.flatMap(s => s.edge_ids);
    const allFriendly = [...new Set(overrides.subSegments.flatMap(s => s.friendly_osids))].sort();
    return {
        sector_id: overrides.sectorId,
        corps_id: overrides.corpsId,
        faction: overrides.faction,
        opposing_factions: overrides.opposingFactions,
        edge_ids: allEdges,
        sub_segments: overrides.subSegments,
        length_edges: allEdges.length,
        territory_osids: overrides.territoryOsids ?? allFriendly,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    } as CorpsFrontSector;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('isSectorColdFront', () => {
    it('HVO sector facing only RS under active Graz is cold front', () => {
        const state = makeGrazActiveState();
        const sector = makeSector({
            sectorId: 'HVO CB:3',
            corpsId: 'hvo_central_bosnia',
            faction: 'HRHB',
            opposingFactions: ['RS'],
            subSegments: [
                makeSubSeg('ss1', ['op:vares:gornja_borovica_2'], ['op:vares:vares_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(true);
    });

    it('mixed-opponent sector facing RS and RBiH is NOT cold front', () => {
        const state = makeGrazActiveState();
        const sector = makeSector({
            sectorId: 'HVO CB:mixed',
            corpsId: 'hvo_central_bosnia',
            faction: 'HRHB',
            opposingFactions: ['RS', 'RBiH'],
            subSegments: [
                makeSubSeg('ss1', ['op:kiseljak:kiseljak_2'], ['op:hadzici:misevici_2']),
                makeSubSeg('ss2', ['op:kiseljak:bilalovac_2'], ['op:visoko:bradve_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });

    it('cold front inactive when Graz not accepted', () => {
        const state = makeGrazInactiveState();
        const sector = makeSector({
            sectorId: 'HVO CB:3',
            corpsId: 'hvo_central_bosnia',
            faction: 'HRHB',
            opposingFactions: ['RS'],
            subSegments: [
                makeSubSeg('ss1', ['op:vares:gornja_borovica_2'], ['op:vares:vares_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });

    it('RS sector facing only HRHB under active Graz is cold front (symmetry)', () => {
        const state = makeGrazActiveState();
        const sector = makeSector({
            sectorId: 'VRS Herz:1',
            corpsId: 'vrs_herzegovina',
            faction: 'RS',
            opposingFactions: ['HRHB'],
            subSegments: [
                makeSubSeg('ss1', ['op:nevesinje:nevesinje_2'], ['op:mostar:mostar_2']),
            ],
        });

        // East Herzegovina pair — needs graz_east_herzegovina_active_turn set
        const stateWithEast = makeGrazActiveState({ graz_east_herzegovina_active_turn: 8 });
        expect(isSectorColdFront(stateWithEast, sector)).toBe(true);
    });

    it('Posavina exempt HRHB corps NOT suppressed even if all enemies are RS', () => {
        const state = makeGrazActiveState();
        const sector = makeSector({
            sectorId: 'HVO NW:1',
            corpsId: 'hvo_northwest_bosnia',
            faction: 'HRHB',
            opposingFactions: ['RS'],
            subSegments: [
                makeSubSeg('ss1', ['op:orasje:orasje_2'], ['op:brcko:brcko_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });

    it('Posavina exempt RS corps (1KK) NOT suppressed even if all enemies are HRHB', () => {
        const state = makeGrazActiveState();
        const sector = makeSector({
            sectorId: 'VRS 1KK:posavina',
            corpsId: 'vrs_1st_krajina',
            faction: 'RS',
            opposingFactions: ['HRHB'],
            subSegments: [
                makeSubSeg('ss1', ['op:brcko:brcko_2'], ['op:orasje:orasje_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });

    it('east Herzegovina pair NOT cold front before Op Jackal ends', () => {
        // graz_east_herzegovina_active_turn is null → east pair not yet frozen
        const state = makeGrazActiveState({ graz_east_herzegovina_active_turn: null });
        const sector = makeSector({
            sectorId: 'VRS Herz:east',
            corpsId: 'vrs_herzegovina',
            faction: 'RS',
            opposingFactions: ['HRHB'],
            subSegments: [
                makeSubSeg('ss1', ['op:nevesinje:nevesinje_2'], ['op:mostar:mostar_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });

    it('RBiH sector facing only RS is NOT cold front (no truce for RBiH)', () => {
        const state = makeGrazActiveState();
        const sector = makeSector({
            sectorId: 'ARBiH 2K:1',
            corpsId: 'arbih_2nd_corps',
            faction: 'RBiH',
            opposingFactions: ['RS'],
            subSegments: [
                makeSubSeg('ss1', ['op:tuzla:tuzla_2'], ['op:bijeljina:bijeljina_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });

    it('Herzegovina truce broken → not cold front', () => {
        const state = makeGrazActiveState({ vienna_herzegovina_broken_by: 'RS' });
        const sector = makeSector({
            sectorId: 'HVO Tom:1',
            corpsId: 'hvo_tomislavgrad',
            faction: 'HRHB',
            opposingFactions: ['RS'],
            subSegments: [
                makeSubSeg('ss1', ['op:tomislavgrad:turija'], ['op:kupres:kupres_2']),
            ],
        });

        expect(isSectorColdFront(state, sector)).toBe(false);
    });
});
