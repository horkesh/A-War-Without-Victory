/**
 * Phase C Step 6: Control strain initiation (Phase_I_Specification_v0_4_0.md §4.5).
 * Control strain is not supply or exhaustion; spec authorizes exhaustion coupling and authority penalty.
 */

import type { SettlementRecord } from '../../map/settlements.js';
import type { FactionId, GameState, MunicipalityId, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Phase I §4.5.3: Exhaustion rate += Faction_Total_Control_Strain × 0.0001 (every 10k strain = +1% exhaustion/turn). */
const EXHAUSTION_COUPLING_FACTOR = 0.0001;
/** Phase I §4.5.3: Faction_Authority -= Faction_Total_Control_Strain × 0.000005 (0-1 scale); state uses 0-100 so ×0.0005. */
const AUTHORITY_PENALTY_PER_STRAIN = 0.0005;

/** Phase I §4.5.1: Time factor cap. */
const TIME_FACTOR_CAP = 1.0;
/** Phase I §4.5.1: Time factor rate per turn since war start. */
const TIME_FACTOR_RATE = 0.05;
/** Phase I §4.5.1: Time factor base. */
const TIME_FACTOR_BASE = 0.5;

/** Stub: hostile population in thousands when no census. Deterministic. */
const HOSTILE_POP_STUB = 1;
/** Stub: demographic hostility factor when no census (significant minority band). */
const DEMO_FACTOR_STUB = 0.4;
/** Control method multiplier: militia control (Phase I §4.5.1). */
const CONTROL_METHOD_MILITIA = 1.0;

export interface ControlStrainReport {
    municipalities_updated: number;
    faction_totals: Array<{ faction_id: FactionId; total_strain: number; exhaustion_delta: number; authority_delta: number }>;
}

/**
 * Build municipality id -> settlement ids from graph. Uses mun1990_id ?? mun_code.
 */
export function buildSettlementsByMun(settlements: Map<string, SettlementRecord>): Map<MunicipalityId, SettlementId[]> {
    const byMun = new Map<MunicipalityId, SettlementId[]>();
    for (const [sid, rec] of settlements.entries()) {
        const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
        const list = byMun.get(munId) ?? [];
        list.push(sid);
        byMun.set(munId, list);
    }
    for (const list of byMun.values()) list.sort(strictCompare);
    return byMun;
}

/** Derive current controller of a municipality from political_controllers (majority of settlements). */
function getMunicipalityController(state: GameState, sids: SettlementId[]): FactionId | null {
    const counts: Record<string, number> = {};
    for (const sid of sids) {
        const c = state.political_controllers?.[sid] ?? null;
        const key = c ?? '_null_';
        counts[key] = (counts[key] ?? 0) + 1;
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(counts)) {
        if (count > bestCount) {
            bestCount = count;
            best = key === '_null_' ? null : key;
        }
    }
    return best as FactionId | null;
}

/** Authority multiplier (Phase I §4.5.1): (1.0 - Faction_Authority_Score). State authority is 0-100. */
function authorityMultiplier(authority0to100: number): number {
    const score = Math.max(0, Math.min(100, authority0to100)) / 100;
    return Math.max(0, 1 - score);
}

/** Phase I time factor: 0.50 + (Turn_Number_Since_War_Start × 0.05), cap 1.0. */
function phaseITimeFactor(turn: number, warStartTurn: number | null | undefined): number {
    if (warStartTurn == null || turn < warStartTurn) return TIME_FACTOR_BASE;
    const turnsSince = turn - warStartTurn;
    return Math.min(TIME_FACTOR_CAP, TIME_FACTOR_BASE + turnsSince * TIME_FACTOR_RATE);
}

/**
 * Run Phase I control strain accumulation and apply authorized effects (Phase I §4.5).
 * Strain accumulates per municipality; faction totals drive exhaustion coupling and authority degradation.
 * Does not alter supply; exhaustion change is per spec §4.5.3.
 */
export function runControlStrain(
    state: GameState,
    turn: number,
    settlementsByMun: Map<MunicipalityId, SettlementId[]>
): ControlStrainReport {
    const report: ControlStrainReport = { municipalities_updated: 0, faction_totals: [] };
    const municipalities = state.municipalities ?? {};
    const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);
    const warStartTurn = state.meta.war_start_turn ?? null;

    if (!state.phase_i_control_strain) {
        (state as GameState & { phase_i_control_strain: Record<string, number> }).phase_i_control_strain = {};
    }
    const strainByMun = state.phase_i_control_strain!;

    const factionTotals = new Map<FactionId, number>();

    for (const munId of munIds) {
        const sids = settlementsByMun.get(munId);
        const controller = sids ? getMunicipalityController(state, sids) : null;
        if (!controller) continue;

        const faction = state.factions?.find((f) => f.id === controller);
        const authority0to100 = faction?.profile?.authority ?? 50;
        const authMult = authorityMultiplier(authority0to100);
        const timeFactor = phaseITimeFactor(turn, warStartTurn);
        const increment =
            HOSTILE_POP_STUB * DEMO_FACTOR_STUB * authMult * CONTROL_METHOD_MILITIA * timeFactor;
        const current = strainByMun[munId] ?? 0;
        const next = Math.max(0, current + increment);
        strainByMun[munId] = Math.round(next * 100) / 100;
        factionTotals.set(controller, (factionTotals.get(controller) ?? 0) + increment);
    }

    report.municipalities_updated = munIds.length;

    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare) as FactionId[];
    for (const factionId of factionIds) {
        const total = factionTotals.get(factionId) ?? 0;
        const exhaustionDelta = total * EXHAUSTION_COUPLING_FACTOR;
        const authorityDelta = -(total * AUTHORITY_PENALTY_PER_STRAIN);
        report.faction_totals.push({
            faction_id: factionId,
            total_strain: Math.round(total * 100) / 100,
            exhaustion_delta: Math.round(exhaustionDelta * 1000) / 1000,
            authority_delta: Math.round(authorityDelta * 1000) / 1000
        });
        const f = state.factions?.find((x) => x.id === factionId);
        if (f) {
            f.profile.exhaustion = Math.max(0, (f.profile.exhaustion ?? 0) + exhaustionDelta);
            f.profile.authority = Math.max(0, Math.min(100, (f.profile.authority ?? 50) + authorityDelta));
        }
    }

    return report;
}

/**
 * Sum control strain for a faction (for use in militia emergence penalty).
 * Call with state and settlementsByMun; returns total strain for that faction this turn.
 */
export function getFactionTotalControlStrain(
    state: GameState,
    factionId: FactionId,
    settlementsByMun: Map<MunicipalityId, SettlementId[]>
): number {
    const strainByMun = state.phase_i_control_strain ?? {};
    const municipalities = state.municipalities ?? {};
    let total = 0;
    for (const munId of Object.keys(municipalities) as MunicipalityId[]) {
        const sids = settlementsByMun.get(munId);
        const controller = sids ? getMunicipalityController(state, sids) : null;
        if (controller === factionId) total += strainByMun[munId] ?? 0;
    }
    return total;
}
