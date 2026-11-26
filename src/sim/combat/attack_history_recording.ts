/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: attack_history_recording.ts
 * DOMAIN:    Brigade history recording after combat resolution
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 7, 2026-04-13).
 * Pure recording — no strategic decisions, no state mutation beyond history.
 *
 * UPSTREAM:  attack_resolution_osid.ts (sole caller)
 * ═══════════════════════════════════════════════════════════════
 */

import {
    recordAttackerEngagements,
    recordDefenderEngagement,
} from './brigade_history_recorder.js';
import {
    buildAttackerEquipmentRecord,
    buildDefenderEquipmentRecord,
} from './attack_equipment_effects.js';
import { allocateIntegerByWeights } from './attack_retreat_displacement.js';
import { strictCompare } from '../../state/validateGameState.js';
import type {
    FormationState,
    FormationId,
    FactionId,
    GameState,
} from '../../state/game_state.js';
import type { CombatOutcome } from './combat_math.js';

/**
 * Record battle history for all attacker and defender formations after
 * a single OSID attack resolution.
 */
export function recordBattleHistory(params: {
    attackerFormations: FormationState[];
    defenderFormation: FormationState | null;
    sectorDefenseBrigades: FormationState[] | null;
    sectorBrigadeWeights: Map<FormationId, number> | null;
    currentTurn: number;
    targetOsid: string;
    outcome: CombatOutcome;
    attackerFaction: FactionId;
    controller: FactionId | null;
    flip: boolean;
    finalAttackerCas: number;
    /** Battle-record totals (applied loss, including the morale-absorption extras). */
    finalDefenderCas: number;
    /** CAS-REPORT-3: each attacker brigade's applied loss (share + absorption extra). */
    attackerAppliedById?: Map<FormationId, number>;
    /** Each defending brigade's applied loss (share; the primary also takes the extra). */
    defenderAppliedById?: Map<FormationId, number>;
    state: GameState;
    battleId: string;
    // Equipment loss accumulators
    battleEquipDefenderTanksLost: number;
    battleEquipDefenderArtLost: number;
    battleEquipAttackerTanksLost: number;
    battleEquipAttackerArtLost: number;
    battleEquipCapturedBy: string;
    battleEquipCapturedTanks: number;
    battleEquipCapturedArt: number;
}): void {
    const {
        attackerFormations,
        defenderFormation,
        sectorDefenseBrigades,
        sectorBrigadeWeights,
        currentTurn,
        targetOsid,
        outcome,
        attackerFaction,
        controller,
        flip,
        finalAttackerCas,
        finalDefenderCas,
        attackerAppliedById,
        defenderAppliedById,
        state,
        battleId,
        battleEquipDefenderTanksLost,
        battleEquipDefenderArtLost,
        battleEquipAttackerTanksLost,
        battleEquipAttackerArtLost,
        battleEquipCapturedBy,
        battleEquipCapturedTanks,
        battleEquipCapturedArt,
    } = params;

    const defFaction: FactionId = controller ?? attackerFaction;
    const isConcentrated = attackerFormations.length > 1;
    // Attacker: destroyed defender equipment, captured from defender
    const attackerEquipData = buildAttackerEquipmentRecord(
        battleEquipDefenderTanksLost, battleEquipDefenderArtLost,
        battleEquipCapturedBy, battleEquipCapturedTanks, battleEquipCapturedArt,
        attackerFaction,
    );
    recordAttackerEngagements(
        attackerFormations, currentTurn, targetOsid, outcome,
        defFaction, flip, finalAttackerCas, finalDefenderCas, isConcentrated, state,
        attackerEquipData, battleId, attackerAppliedById,
    );
    if (defenderFormation) {
        // CAS-REPORT-3: every brigade that actually lost men in this battle gets a row, even
        // one outside the engaged group (a zero-weight primary still takes the absorption
        // extra). Brigades already in the engaged group keep their row as before.
        const groupById = new Map<string, FormationState>();
        for (const b of (sectorDefenseBrigades && sectorDefenseBrigades.length > 1 ? sectorDefenseBrigades : [defenderFormation])) {
            groupById.set(b.id, b);
        }
        for (const [id, cas] of defenderAppliedById ?? []) {
            if (cas <= 0 || groupById.has(id)) continue;
            const f = id === defenderFormation.id ? defenderFormation : state.military.formations[id];
            if (f) groupById.set(id, f);
        }
        const defenderGroup = [...groupById.values()].sort((a, b) => strictCompare(a.id, b.id));
        if (defenderGroup.length > 1 && sectorBrigadeWeights) {
            const weightById = new Map<string, number>();
            for (const b of defenderGroup) weightById.set(b.id, sectorBrigadeWeights.get(b.id) ?? 0);
            const takenById = allocateIntegerByWeights(
                defenderGroup.map(b => b.id),
                finalDefenderCas,
                weightById
            );
            const inflictedById = allocateIntegerByWeights(
                defenderGroup.map(b => b.id),
                finalAttackerCas,
                weightById
            );
            for (const b of defenderGroup) {
                const defenderEquipData = {
                    destroyed: { tanks: 0, artillery: 0 },
                    captured: { tanks: 0, artillery: 0 },
                };
                recordDefenderEngagement(
                    b, currentTurn, targetOsid, outcome,
                    attackerFaction, flip, defenderAppliedById?.get(b.id) ?? takenById.get(b.id) ?? 0, inflictedById.get(b.id) ?? 0, isConcentrated, state,
                    defenderEquipData, battleId,
                );
            }
        } else {
            // Single/primary defender path keeps equipment accounting attached here.
            const defenderEquipData = buildDefenderEquipmentRecord(
                battleEquipAttackerTanksLost, battleEquipAttackerArtLost,
                battleEquipCapturedBy, battleEquipCapturedTanks, battleEquipCapturedArt,
                defenderFormation.faction as string,
            );
            recordDefenderEngagement(
                defenderFormation, currentTurn, targetOsid, outcome,
                attackerFaction, flip, defenderAppliedById?.get(defenderFormation.id) ?? finalDefenderCas,
                finalAttackerCas, isConcentrated, state,
                defenderEquipData, battleId,
            );
        }
    }
}
