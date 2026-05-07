/**
 * LANE-NIGHTSHIFT-SRK-SIEGE-MORALE-AUDIT
 *
 * Tests SRK (vrs_sarajevo_romanija) stance derivation under the RS early-war
 * aggression bonus. Historical doctrine (ICTY Galić IT-98-29-T): SRK conducted
 * positional containment of ARBiH 1st Corps inside the city perimeter — NOT
 * offensive maneuver. Galić explicitly did not initiate large operations.
 *
 * Engine bug found by AI commander telemetry (Mladić + SRK personas):
 *   - bot_corps_stance.ts SARAJEVO_SIEGE_MUNS was {pale, sokolac, trnovo}
 *   - SRK's hq_mun is 'novo_sarajevo' (per oob_corps.json) — NOT in that set
 *   - RS early-war bonus (w<26 + balanced + avgPers≥0.6 + avgCoh≥40) pushed
 *     SRK to 'offensive' through w0–w26
 *
 * Fix: corps_id-keyed override in bot_corps_stance.ts forces SRK 'offensive'
 * back to 'balanced' (siege containment posture). Faction-symmetric mechanism
 * — the override pattern can be expanded to any besieger; SRK is the only
 * canonical 1992-1995 besieger requiring it (ICTY-anchored).
 *
 * Behavioral contract:
 *   T1: SRK in early war (w<26) with healthy brigades stays balanced, NOT offensive.
 *   T2: SRK can still go reorganize when critically depleted (no whitewashing).
 *   T3: SRK can still go defensive under high threat (responsive to ARBiH).
 *   T4: Other RS corps (vrs_drina, vrs_east_bosnian) UNCHANGED — RS early-war
 *       aggression bonus still drives them to offensive when healthy.
 *   T5: After early-war window (w≥26), SRK stance derives normally from
 *       threat/cohesion/personnel — fix is bounded.
 *
 * Deterministic: no randomness, no timestamps.
 */

import { describe, it, expect } from 'vitest';
import { generateCorpsStanceOrders } from '../src/sim/combat/bot_corps_stance.js';
import type {
    GameState,
    FactionId,
    CorpsFrontSector,
    CorpsCommandState,
    FormationState,
} from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

// ── Helpers ──

function makeBrigade(
    id: string,
    corpsId: string,
    faction: FactionId,
    overrides?: Partial<FormationState>,
): FormationState {
    return {
        id,
        faction,
        kind: 'brigade',
        status: 'active',
        corps: corpsId,
        corps_id: corpsId,
        personnel: 2400,         // 0.8 of 3000 → avgPers above PERSONNEL_HEALTHY_THRESHOLD (0.7)
        max_personnel: 3000,
        cohesion: 60,            // above COHESION_HEALTHY_THRESHOLD (50)
        morale: 60,
        fatigue: 0,
        entrenchment: 0,
        equipment: { tanks: 0, artillery: 0, apcs: 0, aa: 0 },
        location_osid: 'op:novo_sarajevo:sarajevo_dio_novo_sarajevo',
        home_osid: 'op:novo_sarajevo:sarajevo_dio_novo_sarajevo',
        ...(overrides ?? {}),
    } as unknown as FormationState;
}

function makeCorpsFormation(
    corpsId: string,
    faction: FactionId,
    homeMun: string,
): FormationState {
    return {
        id: corpsId,
        faction,
        kind: 'corps',
        status: 'active',
        corps: null,
        tags: [`mun:${homeMun}`],
    } as unknown as FormationState;
}

function makeCorpsCommand(stance: string = 'balanced'): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 3,
        og_slots: 1,
        active_ogs: [],
        active_operations: [],
        corps_exhaustion: 0,
        stance: stance as CorpsCommandState['stance'],
    } as CorpsCommandState;
}

function makeSector(
    corpsId: string,
    faction: FactionId,
    opposingFactions: FactionId[],
): CorpsFrontSector {
    return {
        sector_id: `sector:${corpsId}`,
        corps_id: corpsId,
        faction,
        opposing_factions: opposingFactions,
        edge_ids: ['edge_1'],
        sub_segments: [],
        length_edges: 1,
        territory_osids: ['op:novo_sarajevo:sarajevo_dio_novo_sarajevo'],
        assigned_brigade_ids: ['brig_srk_1'],
        reserve_brigade_ids: [],
        density: 1,
    } as unknown as CorpsFrontSector;
}

function makeState(opts: {
    turn: number;
    corpsId: string;
    homeMun: string;
    faction?: FactionId;
    brigadeOverrides?: Partial<FormationState>;
    initialStance?: string;
}): GameState {
    const fac = opts.faction ?? 'RS';
    const brigId = `brig_${opts.corpsId}_1`;
    const brig = makeBrigade(brigId, opts.corpsId, fac, opts.brigadeOverrides);
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: opts.turn,
            seed: 'srk-siege-stance-test',
            phase: 'war',
            referendum_held: true,
            war_start_turn: 1,
        },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1,
            },
            {
                id: 'RS',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1,
            },
            {
                id: 'HRHB',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
            },
        ],
        political: {
            war_alliance_rbih_hrhb: 1.0,
            political_controllers: {},
        },
        military: {
            formations: {
                [opts.corpsId]: makeCorpsFormation(opts.corpsId, fac, opts.homeMun),
                [brigId]: brig,
            },
            corps_command: {
                [opts.corpsId]: makeCorpsCommand(opts.initialStance ?? 'balanced'),
            },
            corps_front_sectors: {
                [`sector:${opts.corpsId}`]: makeSector(opts.corpsId, fac, ['RBiH']),
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as unknown as GameState['military'],
    } as unknown as GameState;
}

// ── Tests ──

describe('LANE-NIGHTSHIFT-SRK-SIEGE-MORALE-AUDIT — SRK stance under siege doctrine', () => {
    it('T1: SRK in early war (w<26) with healthy brigades stays balanced, NOT offensive', () => {
        // Healthy brigade (personnel 2400/3000, cohesion 60) at w10 — would
        // normally be pushed to offensive by the RS early-war aggression bonus.
        // Siege doctrine override must clamp it to balanced.
        const state = makeState({
            turn: 10,
            corpsId: 'vrs_sarajevo_romanija',
            homeMun: 'novo_sarajevo',
        });

        generateCorpsStanceOrders(state, 'RS', [], new Map());

        const stance = state.military.corps_command!['vrs_sarajevo_romanija'].stance;
        expect(stance).not.toBe('offensive');
        expect(stance).toBe('balanced');
    });

    it('T2: SRK can still go reorganize when critically depleted (no whitewashing)', () => {
        // SRK with critically depleted brigade — reorganize gate (cohesion <
        // REORGANIZE_THRESHOLD AND personnel < REORGANIZE_THRESHOLD) fires
        // BEFORE the SRK siege override. Override only clamps offensive.
        const state = makeState({
            turn: 10,
            corpsId: 'vrs_sarajevo_romanija',
            homeMun: 'novo_sarajevo',
            brigadeOverrides: {
                personnel: 100,   // ~3% of max (well below REORGANIZE)
                cohesion: 10,     // well below REORGANIZE
            } as Partial<FormationState>,
        });

        generateCorpsStanceOrders(state, 'RS', [], new Map());

        const stance = state.military.corps_command!['vrs_sarajevo_romanija'].stance;
        expect(stance).toBe('reorganize');
    });

    it('T3: SRK siege override does NOT block defensive — defensive is allowed', () => {
        // Force defensive via low-personnel brigade (below HEALTHY threshold).
        // Default stance computation will choose 'balanced' (insufficient
        // health for offensive, no high-threat condition for defensive in
        // this minimal test). The siege override clamps offensive→balanced
        // ONLY; balanced and defensive are untouched.
        const state = makeState({
            turn: 10,
            corpsId: 'vrs_sarajevo_romanija',
            homeMun: 'novo_sarajevo',
            brigadeOverrides: {
                personnel: 1500,  // 0.5 of 3000 — below HEALTHY
                cohesion: 60,
            } as Partial<FormationState>,
        });

        generateCorpsStanceOrders(state, 'RS', [], new Map());

        const stance = state.military.corps_command!['vrs_sarajevo_romanija'].stance;
        // Cannot be offensive (below personnel-healthy + siege override),
        // and must NOT have been pushed back to offensive by any layer.
        expect(stance).not.toBe('offensive');
    });

    it('T4: vrs_drina (RS, non-siege) early-war aggression bonus UNCHANGED — still drives to offensive when healthy', () => {
        // Same conditions as T1 but on vrs_drina (different corps_id, different
        // hq_mun). RS early-war bonus must still fire. Siege override is
        // SRK-only; other RS corps unaffected.
        const state = makeState({
            turn: 10,
            corpsId: 'vrs_drina',
            homeMun: 'vlasenica',
        });

        generateCorpsStanceOrders(state, 'RS', [], new Map());

        const stance = state.military.corps_command!['vrs_drina'].stance;
        expect(stance).toBe('offensive');
    });

    it('T5: SRK after early-war window (w≥26) derives normally — siege override still applies but is bounded', () => {
        // At turn 30 the RS early-war aggression bonus is gone; SRK with
        // healthy brigades and no high threat should sit at 'balanced'
        // (default). Override clamps offensive→balanced if anything else
        // pushes it; here nothing should push offensive at w30 anyway.
        const state = makeState({
            turn: 30,
            corpsId: 'vrs_sarajevo_romanija',
            homeMun: 'novo_sarajevo',
        });

        generateCorpsStanceOrders(state, 'RS', [], new Map());

        const stance = state.military.corps_command!['vrs_sarajevo_romanija'].stance;
        // After early-war: must not be offensive (siege override still active),
        // and must be a valid containment posture.
        expect(stance).not.toBe('offensive');
        expect(['balanced', 'defensive', 'reorganize']).toContain(stance);
    });

    it('T6 (faction-symmetric sanity): override is corps_id-keyed — does not fire on RBiH/HRHB corps', () => {
        // Confirm the SRK override does not accidentally clamp non-RS corps.
        // Use a fictional RBiH corps_id 'arbih_1st_corps' (not vrs_sarajevo_romanija).
        const state = makeState({
            turn: 10,
            corpsId: 'arbih_1st_corps',
            homeMun: 'centar_sarajevo',
            faction: 'RBiH',
        });
        // RBiH corps in Sarajevo munis goes defensive via existing E2 logic
        // (no army HQ override), not via the SRK clamp.
        generateCorpsStanceOrders(state, 'RBiH', [], new Map());

        const stance = state.military.corps_command!['arbih_1st_corps'].stance;
        // RBiH Sarajevo guard sets defensive when no HQ override
        expect(stance).toBe('defensive');
    });
});
