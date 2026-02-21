/**
 * Phase I §4.8: Allied mixed municipality tracking + allied defense bonus vs RS.
 *
 * When RS attacks a mixed mun and the alliance is above ALLIED_THRESHOLD,
 * the allied faction's militia contributes to defense:
 *   effective_defense = controller_militia + (ally_militia * ALLIED_COORDINATION_FACTOR)
 *
 * ALLIED_COORDINATION_FACTOR = 0.6 (imperfect coordination; historical: joint Jajce defense still failed).
 *
 * Canon: Phase_I_Specification_v0_4_0.md §4.8.
 */

import type { FactionId, GameState, MunicipalityId } from '../../state/game_state.js';
import { ALLIED_THRESHOLD, STRONG_ALLIANCE_THRESHOLD } from './alliance_update.js';

/** Allied coordination factor for joint defense (0.6 = imperfect coordination). */
export const ALLIED_COORDINATION_FACTOR = 0.6;

/**
 * Get the allied faction for a given RBiH/HRHB faction.
 */
export function getAlliedFaction(faction: FactionId): FactionId | null {
    if (faction === 'RBiH') return 'HRHB';
    if (faction === 'HRHB') return 'RBiH';
    return null;
}

/**
 * Check if a municipality is in the mixed municipalities list.
 */
export function isMixedMunicipality(state: GameState, munId: MunicipalityId): boolean {
    const rhs = state.rbih_hrhb_state;
    if (!rhs) return false;
    return rhs.allied_mixed_municipalities.includes(munId);
}

/**
 * Compute effective defense for a municipality being attacked by RS.
 * Includes allied militia contribution when alliance is above threshold.
 *
 * @returns effective defense value (controller militia + scaled ally militia)
 */
export function computeAlliedDefense(
    state: GameState,
    munId: MunicipalityId,
    controllerFaction: FactionId,
    controllerMilitia: number
): number {
    const allianceValue = state.phase_i_alliance_rbih_hrhb;
    if (allianceValue === undefined || allianceValue === null) {
        // Absent = allied; apply coordination bonus
        return controllerMilitia;
    }

    // Only applies for RBiH/HRHB controller vs RS attack
    const ally = getAlliedFaction(controllerFaction);
    if (!ally) return controllerMilitia;

    // Must be a mixed municipality
    if (!isMixedMunicipality(state, munId)) return controllerMilitia;

    // Must be allied
    if (allianceValue <= ALLIED_THRESHOLD) return controllerMilitia;

    // Get ally militia in this mun
    const strengthByMun = state.phase_i_militia_strength ?? {};
    const byFaction = strengthByMun[munId] ?? {};
    const allyMilitia = byFaction[ally] ?? 0;

    if (allyMilitia <= 0) return controllerMilitia;

    // Full coordination factor above strong alliance threshold,
    // reduced when fragile
    const factor = allianceValue > STRONG_ALLIANCE_THRESHOLD
        ? ALLIED_COORDINATION_FACTOR
        : ALLIED_COORDINATION_FACTOR * 0.5; // halved when fragile

    return controllerMilitia + (allyMilitia * factor);
}

/**
 * Update allied_mixed_municipalities dynamically based on current formation/pool presence.
 * Called during alliance update to keep the list in sync with actual deployment.
 */
export function updateMixedMunicipalitiesList(state: GameState): void {
    const rhs = state.rbih_hrhb_state;
    if (!rhs) return;

    const strengthByMun = state.phase_i_militia_strength ?? {};
    const mixedSet = new Set<string>(rhs.allied_mixed_municipalities);

    // Check all muns in militia_strength for dual RBiH+HRHB presence
    for (const munId of Object.keys(strengthByMun)) {
        const byFaction = strengthByMun[munId];
        const rbihPresence = (byFaction['RBiH'] ?? 0) > 0;
        const hrhbPresence = (byFaction['HRHB'] ?? 0) > 0;
        if (rbihPresence && hrhbPresence) {
            mixedSet.add(munId);
        }
    }

    // Also check formations
    const formations = state.formations ?? {};
    const munFactionPresence = new Map<string, Set<string>>();
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (f.status !== 'active') continue;
        if (f.faction !== 'RBiH' && f.faction !== 'HRHB') continue;
        const munTag = f.tags?.find((t) => t.startsWith('mun:'));
        if (!munTag) continue;
        const munId = munTag.slice(4);
        let set = munFactionPresence.get(munId);
        if (!set) {
            set = new Set();
            munFactionPresence.set(munId, set);
        }
        set.add(f.faction);
    }
    for (const [munId, factions] of munFactionPresence) {
        if (factions.has('RBiH') && factions.has('HRHB')) {
            mixedSet.add(munId);
        }
    }

    // Sort deterministically
    rhs.allied_mixed_municipalities = [...mixedSet].sort();
}
