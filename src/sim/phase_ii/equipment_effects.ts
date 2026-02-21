/**
 * Stage 2B: Typed equipment effects on brigade pressure.
 *
 * Computes pressure multiplier from brigade composition (tanks, artillery).
 * RS starts heavy (JNA inheritance); ARBiH starts light.
 * Equipment degrades over time; can be captured in combat.
 *
 * Deterministic: no randomness.
 */

import type {
    BrigadeComposition,
    BrigadePosture,
    EquipmentCondition,
    FormationState
} from '../../state/game_state.js';

// --- Default compositions by faction ---

const DEFAULT_COMPOSITION: Record<string, Partial<BrigadeComposition>> = {
    RS: { infantry: 800, tanks: 40, artillery: 30, aa_systems: 5 },
    HRHB: { infantry: 850, tanks: 15, artillery: 15, aa_systems: 3 },
    RBiH: { infantry: 950, tanks: 3, artillery: 8, aa_systems: 1 }
};

const DEFAULT_CONDITION: EquipmentCondition = { operational: 0.9, degraded: 0.08, non_operational: 0.02 };

/** Full operational condition for newly created formations. */
const FULL_CONDITION: EquipmentCondition = { operational: 1, degraded: 0, non_operational: 0 };

/**
 * Return RS JNA-heavy composition (40 tanks, 30 artillery) for use when creating RS mechanized/motorized
 * formations from OOB. Single source of truth with DEFAULT_COMPOSITION.RS; used by recruitment_engine.
 */
export function getRsJnaHeavyComposition(): BrigadeComposition {
    const d = DEFAULT_COMPOSITION['RS']!;
    return {
        infantry: d.infantry ?? 800,
        tanks: d.tanks ?? 40,
        artillery: d.artillery ?? 30,
        aa_systems: d.aa_systems ?? 5,
        tank_condition: { ...FULL_CONDITION },
        artillery_condition: { ...FULL_CONDITION }
    };
}
const ARBIH_CONDITION: EquipmentCondition = { operational: 0.6, degraded: 0.25, non_operational: 0.15 };

/** Ensure formation has a composition; initialize from defaults if missing. */
export function ensureBrigadeComposition(formation: FormationState): BrigadeComposition {
    if (formation.composition) return formation.composition;
    const faction = formation.faction;
    const defaults = DEFAULT_COMPOSITION[faction] ?? DEFAULT_COMPOSITION['RBiH'];
    const condition = faction === 'RBiH' ? ARBIH_CONDITION : DEFAULT_CONDITION;

    const comp: BrigadeComposition = {
        infantry: defaults.infantry ?? 900,
        tanks: defaults.tanks ?? 5,
        artillery: defaults.artillery ?? 10,
        aa_systems: defaults.aa_systems ?? 2,
        tank_condition: { ...condition },
        artillery_condition: { ...condition }
    };
    formation.composition = comp;
    return comp;
}

/**
 * Compute equipment pressure multiplier for a brigade.
 * Tanks boost offensive pressure; artillery boosts both offense and defense.
 */
export function computeEquipmentMultiplier(
    formation: FormationState,
    posture?: BrigadePosture
): number {
    const comp = formation.composition ?? ensureBrigadeComposition(formation);
    const tankEff = comp.tanks * comp.tank_condition.operational;
    const artilleryEff = comp.artillery * comp.artillery_condition.operational;

    // Tanks primarily amplify attack; reduced effect on defense; consolidation = moderate
    const isOffensive = posture === 'attack' || posture === 'probe';
    const isConsolidation = posture === 'consolidation';
    const tankBonus = tankEff * (isOffensive ? 0.5 : isConsolidation ? 0.35 : 0.2);
    // Artillery amplifies both offense and defense
    const artilleryBonus = artilleryEff * 0.8;

    const infantry = Math.max(1, comp.infantry);
    return 1.0 + (tankBonus + artilleryBonus) / infantry;
}

/**
 * Degrade equipment for one turn based on operational tempo.
 * Attack posture degrades tanks faster; all postures degrade artillery slowly.
 */
export function degradeEquipment(
    formation: FormationState,
    posture: BrigadePosture | undefined,
    maintenanceCapacity: number // [0,1] from faction maintenance
): void {
    const comp = formation.composition;
    if (!comp) return;

    const tempoMult = posture === 'attack' ? 1.5 : posture === 'probe' ? 1.2 : posture === 'consolidation' ? 1.05 : 1.0;
    const baseDegradation = 0.02;

    // Tank degradation (faster under combat tempo)
    const tankDeg = baseDegradation * tempoMult * (1.5 - maintenanceCapacity * 0.5);
    applyConditionDegradation(comp.tank_condition, tankDeg);

    // Artillery degradation (slower, more resilient)
    const artDeg = baseDegradation * tempoMult * 0.7 * (1.5 - maintenanceCapacity * 0.5);
    applyConditionDegradation(comp.artillery_condition, artDeg);

    // Maintenance repairs
    const repairCapacity = maintenanceCapacity * 0.05;
    applyConditionRepair(comp.tank_condition, repairCapacity * 0.8);
    applyConditionRepair(comp.artillery_condition, repairCapacity);
}

function applyConditionDegradation(cond: EquipmentCondition, rate: number): void {
    const shift = Math.min(cond.operational, rate);
    cond.operational -= shift;
    cond.degraded += shift * 0.7;
    cond.non_operational += shift * 0.3;
    // Clamp
    cond.operational = Math.max(0, Math.min(1, cond.operational));
    cond.degraded = Math.max(0, Math.min(1, cond.degraded));
    cond.non_operational = Math.max(0, Math.min(1, cond.non_operational));
}

function applyConditionRepair(cond: EquipmentCondition, rate: number): void {
    // Repair: non_operational → degraded → operational
    const repairNonOp = Math.min(cond.non_operational, rate * 0.3);
    cond.non_operational -= repairNonOp;
    cond.degraded += repairNonOp;

    const repairDeg = Math.min(cond.degraded, rate * 0.7);
    cond.degraded -= repairDeg;
    cond.operational += repairDeg;

    cond.operational = Math.max(0, Math.min(1, cond.operational));
    cond.degraded = Math.max(0, Math.min(1, cond.degraded));
    cond.non_operational = Math.max(0, Math.min(1, cond.non_operational));
}

/**
 * Apply equipment capture when a settlement flips.
 * A fraction of the losing brigade's equipment is captured by the winning brigade.
 */
export function captureEquipment(
    loserBrigade: FormationState,
    winnerBrigade: FormationState,
    loserAoRSize: number
): void {
    const loserComp = loserBrigade.composition;
    const winnerComp = winnerBrigade.composition;
    if (!loserComp || !winnerComp) return;

    const captureRate = 0.05; // 5% per settlement
    const perSettlement = 1 / Math.max(1, loserAoRSize);

    const capturedTanks = Math.floor(loserComp.tanks * captureRate * perSettlement);
    const capturedArtillery = Math.floor(loserComp.artillery * captureRate * perSettlement);

    if (capturedTanks > 0) {
        loserComp.tanks -= capturedTanks;
        winnerComp.tanks += capturedTanks;
        // Captured equipment starts degraded
        const capturedFrac = capturedTanks / Math.max(1, winnerComp.tanks);
        winnerComp.tank_condition.degraded += capturedFrac * 0.5;
        winnerComp.tank_condition.operational = Math.max(0,
            winnerComp.tank_condition.operational - capturedFrac * 0.3);
    }

    if (capturedArtillery > 0) {
        loserComp.artillery -= capturedArtillery;
        winnerComp.artillery += capturedArtillery;
        const capturedFrac = capturedArtillery / Math.max(1, winnerComp.artillery);
        winnerComp.artillery_condition.degraded += capturedFrac * 0.5;
        winnerComp.artillery_condition.operational = Math.max(0,
            winnerComp.artillery_condition.operational - capturedFrac * 0.3);
    }
}
