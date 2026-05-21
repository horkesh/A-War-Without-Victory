import type { FactionId, FormationId, FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getActiveEquipmentQualityMultiplier } from '../events/active_modifiers.js';
import { computeCorpsOperationReadiness } from './corps_operation_readiness.js';

export interface DefenderTrajectoryWeaknessResult {
    readonly available: boolean;
    readonly green: boolean;
    readonly reason: string;
}

interface DefenderTrajectoryWeaknessOptions {
    readonly defenderCorpsId: FormationId;
    readonly defenderFaction: FactionId;
    readonly currentTurn: number;
    readonly weaknessFloor: number;
    readonly label: string;
}

function hasActiveSubordinateBrigade(state: GameState, corpsId: FormationId): boolean {
    const formations = state.military?.formations ?? {};
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[id] as FormationState | undefined;
        if (!formation) continue;
        if (formation.status !== 'active') continue;
        if (formation.kind !== 'brigade') continue;
        if (formation.corps_id === corpsId) return true;
    }
    return false;
}

export function evaluateDefenderTrajectoryWeakness(
    state: GameState,
    options: DefenderTrajectoryWeaknessOptions,
): DefenderTrajectoryWeaknessResult {
    if (!hasActiveSubordinateBrigade(state, options.defenderCorpsId)) {
        return {
            available: false,
            green: true,
            reason: `${options.label} defender-corps trajectory unavailable; using live objective posture only`,
        };
    }

    const traits = computeCorpsOperationReadiness(state, options.defenderCorpsId);
    const equipmentMultiplier = getActiveEquipmentQualityMultiplier(
        state,
        options.defenderFaction,
        options.currentTurn,
    );
    const equipmentWeakness = Math.max(0, 1 - equipmentMultiplier);
    const weakness = (0.50 * traits.collapse_susceptibility)
        + (0.30 * (1 - traits.operation_readiness))
        + (0.20 * equipmentWeakness);

    if (weakness < options.weaknessFloor) {
        return {
            available: true,
            green: false,
            reason: `${options.label} defender corps not yet degraded enough for exploitation`,
        };
    }

    return {
        available: true,
        green: true,
        reason: `${options.label} defender corps trajectory degraded; weakness window open`,
    };
}
