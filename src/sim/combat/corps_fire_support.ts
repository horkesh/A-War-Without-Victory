/**
 * corps_fire_support.ts — corps-level massed fire support (RF-AI2).
 *
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Read-only summary of the heavy weapons a corps can mass for one main effort
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   nothing on its own; a pure read used by the N1297 readiness gate
 *            (bot_corps_stance.ts) and the corps-stance diagnostic trace.
 * WRITES:    nothing.
 * READS:     active subordinate brigades' `composition` (artillery, tanks, condition).
 *
 * The firepower formula is the one combat already uses for corps-concentrated fire
 * (combat_math.ts getArtillerySuppression / getBombardmentCasualtyMult):
 *   artillery x operational fraction + 0.5 x tanks x operational fraction.
 * Captured guns raise it (battle_resolution capture path writes composition), losses
 * and wear lower it, so the term is emergent: no dates, no corps ids.
 *
 * Deterministic: sorted subordinate iteration (getCorpsSubordinates), no randomness.
 */

import type { FormationId, FormationState, GameState } from '../../state/game_state.js';
import { getCorpsSubordinates } from './bot_corps_helpers.js';

export interface CorpsFireSupportSummary {
    /** Effective artillery pieces (count x operational fraction). */
    readonly artillery: number;
    /** Effective tanks/APCs (count x operational fraction). */
    readonly tanks: number;
    /** artillery + 0.5 x tanks: the combat firepower unit. */
    readonly fire_support: number;
}

/** Same default as combat_math.ts when a condition record is absent. */
const DEFAULT_OPERATIONAL_FRACTION = 0.5;
const TANK_FIRE_SUPPORT_WEIGHT = 0.5;

export function summarizeBrigadesFireSupport(brigades: readonly FormationState[]): CorpsFireSupportSummary {
    let artillery = 0;
    let tanks = 0;
    for (const b of brigades) {
        const comp = b.composition;
        if (!comp) continue;
        artillery += (comp.artillery ?? 0) * (comp.artillery_condition?.operational ?? DEFAULT_OPERATIONAL_FRACTION);
        tanks += (comp.tanks ?? 0) * (comp.tank_condition?.operational ?? DEFAULT_OPERATIONAL_FRACTION);
    }
    return { artillery, tanks, fire_support: artillery + TANK_FIRE_SUPPORT_WEIGHT * tanks };
}

export function summarizeCorpsFireSupport(state: GameState, corpsId: FormationId): CorpsFireSupportSummary {
    return summarizeBrigadesFireSupport(getCorpsSubordinates(state, corpsId));
}
