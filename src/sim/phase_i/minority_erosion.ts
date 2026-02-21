/**
 * Phase I §4.8: Minority militia erosion in mixed municipalities.
 *
 * When alliance < HOSTILE_THRESHOLD (0.0), minority faction militia in mixed
 * municipalities erodes at MINORITY_EROSION_RATE_PER_TURN (0.10).
 * Formations in enemy-controlled muns lose supply, cannot reinforce, and are
 * displaced when minority militia drops below MINORITY_VIABLE_THRESHOLD (50).
 *
 * Halted when ceasefire is active.
 *
 * Canon: Phase_I_Specification_v0_4_0.md §4.8.
 */

import type { FactionId, GameState, MunicipalityId, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { HOSTILE_THRESHOLD } from './alliance_update.js';

/** Fraction of minority militia lost per turn during open war. */
export const MINORITY_EROSION_RATE_PER_TURN = 0.10;
/** Minimum viable minority militia; below this, formations are displaced. */
export const MINORITY_VIABLE_THRESHOLD = 50;

export interface MinorityErosionReport {
    municipalities_affected: number;
    total_militia_eroded: number;
    formations_displaced: number;
    by_mun: Array<{
        mun_id: MunicipalityId;
        minority_faction: FactionId;
        militia_before: number;
        militia_after: number;
        eroded: number;
        displaced_formations: string[];
    }>;
}

/**
 * Determine the controller of a municipality from political_controllers (majority of settlements).
 */
function getMunController(
    state: GameState,
    munId: MunicipalityId,
    settlementsByMun?: Map<MunicipalityId, SettlementId[]>
): FactionId | null {
    if (!settlementsByMun) return null;
    const sids = settlementsByMun.get(munId);
    if (!sids?.length) return null;
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

/**
 * Run minority erosion step. Deterministic; no randomness.
 * Must run AFTER control flip + bilateral flip count.
 */
export function runMinorityErosion(
    state: GameState,
    settlementsByMun?: Map<MunicipalityId, SettlementId[]>
): MinorityErosionReport {
    const report: MinorityErosionReport = {
        municipalities_affected: 0,
        total_militia_eroded: 0,
        formations_displaced: 0,
        by_mun: []
    };

    const rhs = state.rbih_hrhb_state;
    if (!rhs) return report;

    // No erosion during ceasefire or post-Washington
    if (rhs.ceasefire_active || rhs.washington_signed) return report;

    const allianceValue = state.phase_i_alliance_rbih_hrhb ?? 1;
    if (allianceValue > HOSTILE_THRESHOLD) return report;

    const mixedMuns = rhs.allied_mixed_municipalities;
    if (!mixedMuns?.length) return report;

    const strengthByMun = state.phase_i_militia_strength ?? {};
    const formations = state.formations ?? {};

    for (const munId of mixedMuns) {
        const controller = settlementsByMun
            ? getMunController(state, munId, settlementsByMun)
            : null;

        // Determine minority faction
        let minorityFaction: FactionId | null = null;
        if (controller === 'RBiH') {
            minorityFaction = 'HRHB';
        } else if (controller === 'HRHB') {
            minorityFaction = 'RBiH';
        } else {
            // Controller is RS or null — no RBiH/HRHB minority erosion logic applies
            continue;
        }

        const byFaction = strengthByMun[munId];
        if (!byFaction) continue;

        const militiaBefore = byFaction[minorityFaction] ?? 0;
        if (militiaBefore <= 0) continue;

        // Apply erosion
        const eroded = Math.floor(militiaBefore * MINORITY_EROSION_RATE_PER_TURN);
        const militiaAfter = Math.max(0, militiaBefore - eroded);
        if (!state.phase_i_militia_strength) {
            (state as any).phase_i_militia_strength = {};
        }
        if (!state.phase_i_militia_strength![munId]) {
            state.phase_i_militia_strength![munId] = {};
        }
        state.phase_i_militia_strength![munId][minorityFaction] = militiaAfter;

        // Displace formations if militia below threshold
        const displacedFormations: string[] = [];
        if (militiaAfter < MINORITY_VIABLE_THRESHOLD) {
            const formationIds = Object.keys(formations).sort(strictCompare);
            for (const fid of formationIds) {
                const f = formations[fid];
                if (f.faction !== minorityFaction || f.status !== 'active') continue;
                // Check if formation is in this municipality (by tag mun:X)
                const munTag = f.tags?.find((t) => t.startsWith('mun:'));
                if (!munTag) continue;
                const formationMun = munTag.slice(4);
                if (formationMun !== munId) continue;
                // Displace: set status to inactive
                f.status = 'inactive';
                displacedFormations.push(fid);
            }
        }

        if (eroded > 0 || displacedFormations.length > 0) {
            report.municipalities_affected++;
            report.total_militia_eroded += eroded;
            report.formations_displaced += displacedFormations.length;
            report.by_mun.push({
                mun_id: munId,
                minority_faction: minorityFaction,
                militia_before: militiaBefore,
                militia_after: militiaAfter,
                eroded,
                displaced_formations: displacedFormations
            });
        }
    }

    return report;
}
