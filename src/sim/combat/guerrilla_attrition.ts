/**
 * v0.9.0 Consequence System — guerrilla attrition reader.
 *
 * Brigades stationed in active guerrilla threat zones lose cohesion and morale
 * per turn, proportional to threat intensity. Models partisan resistance behind
 * faction lines (Chain 1 payload — "No Drina Cleansing → Partisan Rear").
 *
 * Pure reader: writes only to brigade morale/cohesion. Does not mutate any
 * guerrilla_threat entry. GC of expired threats is owned by
 * `cleanup-expired-event-modifiers` at turn start.
 *
 * Deterministic: sorted brigade iteration, no randomness, no timestamps.
 */

import type { GameState } from '../../state/game_state.js';
import { getActiveGuerrillaThreatIntensity } from '../events/active_modifiers.js';

/** Max cohesion decrement at intensity 1.0 per turn. */
const GUERRILLA_ATTRITION_COHESION_MAX = 3;
/** Max morale decrement at intensity 1.0 per turn. */
const GUERRILLA_ATTRITION_MORALE_MAX = 2;

export interface GuerrillaAttritionReport {
    brigades_affected: number;
    total_cohesion_loss: number;
    total_morale_loss: number;
}

/**
 * Apply guerrilla attrition to active brigades stationed in active threat
 * municipalities. Mutates brigade morale/cohesion in place. Returns a report
 * describing per-turn impact (zeros when no threats are active).
 */
export function applyGuerrillaAttrition(state: GameState): GuerrillaAttritionReport {
    const report: GuerrillaAttritionReport = {
        brigades_affected: 0,
        total_cohesion_loss: 0,
        total_morale_loss: 0,
    };
    const threats = state.military.guerrilla_threats;
    if (!threats || threats.length === 0) return report;
    const currentTurn = state.meta.turn ?? 0;
    // Early out when no threat is still live this turn.
    let anyActive = false;
    for (const t of threats) {
        if (t.expires_turn > currentTurn) { anyActive = true; break; }
    }
    if (!anyActive) return report;

    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort()) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade') continue;
        const mun = f.location_osid?.split(':')[1];
        if (!mun) continue;
        const intensity = getActiveGuerrillaThreatIntensity(state, f.faction, mun, currentTurn);
        if (intensity <= 0) continue;

        const cohLoss = Math.round(GUERRILLA_ATTRITION_COHESION_MAX * intensity);
        const morLoss = Math.round(GUERRILLA_ATTRITION_MORALE_MAX * intensity);
        if (f.cohesion != null && cohLoss > 0) {
            const newCoh = Math.max(0, f.cohesion - cohLoss);
            report.total_cohesion_loss += (f.cohesion - newCoh);
            f.cohesion = newCoh;
        }
        if (f.morale != null && morLoss > 0) {
            const newMor = Math.max(0, f.morale - morLoss);
            report.total_morale_loss += (f.morale - newMor);
            f.morale = newMor;
        }
        report.brigades_affected += 1;
    }
    return report;
}
