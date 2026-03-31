/**
 * Tasks 3.1 & 3.2: Bot defensive posture during HRHB-RBiH mobilization.
 *
 * When isRbihHrhbMobilizing(state) is true, both HRHB and RBiH corps
 * that face the other faction's front edges adopt defensive stance.
 * RS corps are unaffected. After mobilization expires, stances revert
 * to normal doctrine.
 *
 * Deterministic: no randomness, no timestamps.
 */

import { describe, it, expect } from 'vitest';
import { generateCorpsStanceOrders } from '../src/sim/combat/bot_corps_stance.js';
import type { GameState, FactionId, CorpsFrontSector, CorpsCommandState, FormationState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

// ── Helpers ──

/** Minimal formation for corps subordinate lookup. */
function makeBrigade(id: string, corpsId: string, faction: FactionId): FormationState {
    return {
        id,
        faction,
        kind: 'brigade',
        status: 'active',
        corps: corpsId,
        corps_id: corpsId,
        personnel: 2000,
        max_personnel: 3000,
        cohesion: 60,
        morale: 60,
        fatigue: 0,
        entrenchment: 0,
        equipment: { tanks: 0, artillery: 0, apcs: 0, aa: 0 },
        location_osid: 'op:travnik:travnik_1',
        home_osid: 'op:travnik:travnik_1',
    } as unknown as FormationState;
}

/** Minimal corps command entry. */
function makeCorpsCommand(stance: string = 'balanced'): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 3,
        og_slots: 1,
        active_ogs: [],
        active_operations: [],
        corps_exhaustion: 0,
        stance: stance as any,
    } as CorpsCommandState;
}

/** Minimal CorpsFrontSector. */
function makeSector(
    corpsId: string,
    faction: FactionId,
    opposingFactions: FactionId[]
): CorpsFrontSector {
    return {
        sector_id: `sector:${corpsId}`,
        corps_id: corpsId,
        faction,
        opposing_factions: opposingFactions,
        edge_ids: ['edge_1'],
        sub_segments: [],
        length_edges: 1,
        territory_osids: ['op:travnik:travnik_1'],
        assigned_brigade_ids: ['brig_1'],
        reserve_brigade_ids: [],
        density: 1,
    } as unknown as CorpsFrontSector;
}

/** Build a GameState with mobilization active or expired. */
function makeState(overrides?: {
    turn?: number;
    allianceValue?: number;
    mobilizationStartedTurn?: number | null;
    warStartedTurn?: number | null;
    formations?: Record<string, any>;
    corpsCommand?: Record<string, CorpsCommandState>;
    corpsFrontSectors?: Record<string, CorpsFrontSector>;
}): GameState {
    const turn = overrides?.turn ?? 30;
    const allianceValue = overrides?.allianceValue ?? 0.10;
    const mobilizationStartedTurn = overrides?.mobilizationStartedTurn ?? 28;
    const warStartedTurn = overrides?.warStartedTurn ?? null;

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            seed: 'mob-stance-test',
            phase: 'war',
            referendum_held: true,
            war_start_turn: 1,
            rbih_hrhb_war_earliest_turn: 26,
        },
        factions: [
            {
                id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
                patron_state: { material_support_level: 0.5, diplomatic_isolation: 0.2, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 5 }
            }
        ],
        political: {
            war_alliance_rbih_hrhb: allianceValue,
            rbih_hrhb_state: {
                war_started_turn: warStartedTurn,
                mobilization_started_turn: mobilizationStartedTurn,
                ceasefire_active: false,
                ceasefire_since_turn: null,
                washington_signed: false,
                washington_turn: null,
                stalemate_turns: 0,
                bilateral_flips_this_turn: 0,
                total_bilateral_flips: 0,
                allied_mixed_municipalities: [],
            },
            political_controllers: {},
        },
        military: {
            formations: overrides?.formations ?? {},
            corps_command: overrides?.corpsCommand ?? {},
            corps_front_sectors: overrides?.corpsFrontSectors ?? {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
    } as unknown as GameState;
}

// ── Tests ──

describe('mobilization bot stance — HRHB corps facing RBiH', () => {
    it('HRHB corps facing RBiH gets defensive stance during mobilization', () => {
        const corpsId = 'hvo_central_bosnia';
        const state = makeState({
            turn: 30,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'HRHB', kind: 'corps', status: 'active', corps: null } as any,
                'hvo_brig_1': makeBrigade('hvo_brig_1', corpsId, 'HRHB'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('offensive'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'HRHB', ['RBiH']),
            },
        });

        generateCorpsStanceOrders(state, 'HRHB', [], new Map());

        expect(state.military.corps_command![corpsId].stance).toBe('defensive');
    });

    it('HRHB corps facing only RS is NOT affected by mobilization', () => {
        const corpsId = 'hvo_southeast_herzegovina';
        const state = makeState({
            turn: 30,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'HRHB', kind: 'corps', status: 'active', corps: null } as any,
                'hvo_brig_2': makeBrigade('hvo_brig_2', corpsId, 'HRHB'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('balanced'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'HRHB', ['RS']),
            },
        });

        generateCorpsStanceOrders(state, 'HRHB', [], new Map());

        // Should NOT be forced defensive — RS-facing sectors unaffected
        const stance = state.military.corps_command![corpsId].stance;
        expect(stance).not.toBe('defensive');
    });
});

describe('mobilization bot stance — RBiH corps facing HRHB', () => {
    it('RBiH corps facing HRHB gets defensive stance during mobilization', () => {
        const corpsId = 'arbih_3rd_corps';
        const state = makeState({
            turn: 30,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'RBiH', kind: 'corps', status: 'active', corps: null } as any,
                'arbih_brig_1': makeBrigade('arbih_brig_1', corpsId, 'RBiH'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('offensive'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'RBiH', ['HRHB', 'RS']),
            },
        });

        generateCorpsStanceOrders(state, 'RBiH', [], new Map());

        expect(state.military.corps_command![corpsId].stance).toBe('defensive');
    });

    it('RBiH corps facing only RS is NOT affected by mobilization', () => {
        const corpsId = 'arbih_2nd_corps';
        const state = makeState({
            turn: 30,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'RBiH', kind: 'corps', status: 'active', corps: null } as any,
                'arbih_brig_2': makeBrigade('arbih_brig_2', corpsId, 'RBiH'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('balanced'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'RBiH', ['RS']),
            },
        });

        generateCorpsStanceOrders(state, 'RBiH', [], new Map());

        const stance = state.military.corps_command![corpsId].stance;
        expect(stance).not.toBe('defensive');
    });
});

describe('mobilization bot stance — RS unaffected', () => {
    it('RS corps is never affected by HRHB-RBiH mobilization', () => {
        const corpsId = 'vrs_drina';
        const state = makeState({
            turn: 30,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'RS', kind: 'corps', status: 'active', corps: null } as any,
                'vrs_brig_1': makeBrigade('vrs_brig_1', corpsId, 'RS'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('offensive'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'RS', ['RBiH']),
            },
        });

        generateCorpsStanceOrders(state, 'RS', [], new Map());

        // RS should keep its computed stance — mobilization doesn't apply
        const stance = state.military.corps_command![corpsId].stance;
        expect(stance).not.toBe('defensive');
    });
});

describe('mobilization bot stance — reversion after mobilization expires', () => {
    it('after mobilization expires, HRHB corps reverts to normal doctrine', () => {
        // Use hvo_southeast_herzegovina — hvo_central_bosnia has an E3 gate that forces
        // defensive until the RBiH-HRHB war starts, independent of mobilization state.
        const corpsId = 'hvo_southeast_herzegovina';
        const state = makeState({
            // 4 turns after mobilization started = expired
            turn: 32,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'HRHB', kind: 'corps', status: 'active', corps: null } as any,
                'hvo_brig_1': makeBrigade('hvo_brig_1', corpsId, 'HRHB'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('offensive'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'HRHB', ['RBiH']),
            },
        });

        generateCorpsStanceOrders(state, 'HRHB', [], new Map());

        // Mobilization expired — should NOT be forced defensive
        const stance = state.military.corps_command![corpsId].stance;
        expect(stance).not.toBe('defensive');
    });

    it('after mobilization expires, RBiH corps reverts to normal doctrine', () => {
        const corpsId = 'arbih_3rd_corps';
        const state = makeState({
            turn: 32,
            allianceValue: 0.10,
            mobilizationStartedTurn: 28,
            formations: {
                [corpsId]: { id: corpsId, faction: 'RBiH', kind: 'corps', status: 'active', corps: null } as any,
                'arbih_brig_1': makeBrigade('arbih_brig_1', corpsId, 'RBiH'),
            },
            corpsCommand: {
                [corpsId]: makeCorpsCommand('offensive'),
            },
            corpsFrontSectors: {
                [`sector:${corpsId}`]: makeSector(corpsId, 'RBiH', ['HRHB']),
            },
        });

        generateCorpsStanceOrders(state, 'RBiH', [], new Map());

        const stance = state.military.corps_command![corpsId].stance;
        expect(stance).not.toBe('defensive');
    });
});
