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
    HRHB: { infantry: 850, tanks: 10, artillery: 10, aa_systems: 2 },
    RBiH: { infantry: 950, tanks: 1, artillery: 3, aa_systems: 0 }
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

/**
 * Return RS mountain composition: JNA artillery inheritance (~15 artillery pieces per brigade —
 * reflecting mortar companies and howitzers from JNA TO units) even for mountain class.
 * Historical: VRS mountain brigades had ~8-15× more artillery than ARBiH equivalents.
 */
export function getRsMountainComposition(): BrigadeComposition {
    return {
        infantry: 800,
        tanks: 0,
        artillery: 15,
        aa_systems: 2,
        tank_condition: { ...FULL_CONDITION },
        artillery_condition: { ...FULL_CONDITION }
    };
}
const ARBIH_CONDITION: EquipmentCondition = { operational: 0.6, degraded: 0.25, non_operational: 0.15 };

/** Empty composition for non-brigade formations that should never have equipment. */
const EMPTY_COMPOSITION: BrigadeComposition = {
    infantry: 0, tanks: 0, artillery: 0, aa_systems: 0,
    tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
    artillery_condition: { operational: 1, degraded: 0, non_operational: 0 }
};

/** Ensure formation has a composition; initialize from defaults if missing.
 *  Non-brigade formations (corps_asset, army_hq, paramilitary) get an empty
 *  composition — they are command structures, not combat units with equipment. */
export function ensureBrigadeComposition(formation: FormationState): BrigadeComposition {
    if (formation.composition) return formation.composition;

    // Guard: only brigades and OGs get default equipment
    if (formation.kind !== 'brigade' && formation.kind !== 'og') {
        formation.composition = { ...EMPTY_COMPOSITION };
        return formation.composition;
    }

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

    // Tanks primarily amplify attack; reduced effect on defense.
    // Per-weapon coefficients (no infantry divisor):
    //   RS mechanized (40 tanks, 30 art, 0.9 cond, offensive) → ~25% bonus.
    //   RS mountain (15 art, 1.0 cond) → ~4.5% bonus.
    //   ARBiH light (1 tank, 3 art, 0.6 cond) → ~0.8% bonus.
    // Reflects historical VRS armor/artillery superiority.
    const isOffensive = posture === 'attack' || posture === 'assault' || posture === 'counterattack';
    const tankBonus = tankEff * (isOffensive ? 0.005 : 0.002);
    // Artillery amplifies both offense and defense
    const artilleryBonus = artilleryEff * 0.003;

    return 1.0 + tankBonus + artilleryBonus;
}

/**
 * Degrade equipment for one turn based on operational tempo.
 * Attack posture degrades tanks faster; all postures degrade artillery slowly.
 */
export function degradeEquipment(
    formation: FormationState,
    posture: BrigadePosture | undefined,
    maintenanceCapacity: number, // [0,1] from faction maintenance
    operationalFloor: number = 0
): void {
    const comp = formation.composition;
    if (!comp) return;
    const floor = Math.max(0, Math.min(1, operationalFloor));

    const tempoMult = posture === 'assault' ? 1.60
        : posture === 'attack' ? 1.50
        : posture === 'counterattack' ? 1.30
        : posture === 'dig_in' ? 0.80
        : 1.0;
    const baseDegradation = 0.02;

    // Tank degradation (faster under combat tempo)
    const tankDeg = baseDegradation * tempoMult * (1.5 - maintenanceCapacity * 0.5);
    applyConditionDegradation(comp.tank_condition, tankDeg, floor);

    // Artillery degradation (slower, more resilient)
    const artDeg = baseDegradation * tempoMult * 0.7 * (1.5 - maintenanceCapacity * 0.5);
    applyConditionDegradation(comp.artillery_condition, artDeg, floor);

    // Maintenance repairs
    const repairCapacity = maintenanceCapacity * 0.05;
    applyConditionRepair(comp.tank_condition, repairCapacity * 0.8);
    applyConditionRepair(comp.artillery_condition, repairCapacity);

    // Write off equipment that's beyond repair (>50% non-operational)
    writeOffNonOperational(comp, 'tanks');
    writeOffNonOperational(comp, 'artillery');
}

function applyConditionDegradation(
    cond: EquipmentCondition,
    rate: number,
    operationalFloor: number = 0
): void {
    const degradableOperational = Math.max(0, cond.operational - operationalFloor);
    const shift = Math.min(degradableOperational, Math.max(0, rate));
    cond.operational -= shift;
    cond.degraded += shift * 0.7;
    cond.non_operational += shift * 0.3;
    // Clamp
    cond.operational = Math.max(0, Math.min(1, cond.operational));
    cond.degraded = Math.max(0, Math.min(1, cond.degraded));
    cond.non_operational = Math.max(0, Math.min(1, cond.non_operational));
}

/**
 * Write off degraded and non-operational equipment that can't be maintained.
 * Equipment with poor condition is gradually scrapped — cannibalized for spare
 * parts, abandoned in the field, or stripped for other vehicles.
 *
 * Write-off rate scales with how bad the condition is:
 * - non_operational > 30%: scrap 1/turn (severe — beyond field repair)
 * - degraded + non_op > 50%: scrap 1/turn (too many broken vehicles to maintain)
 * - degraded + non_op > 70%: scrap 2/turn (formation equipment is collapsing)
 *
 * This primarily affects RS as maintenance capacity declines under sanctions.
 * ARBiH/HRHB have few heavy weapons so write-off impact is minimal.
 */
export function writeOffNonOperational(
    comp: BrigadeComposition,
    type: 'tanks' | 'artillery',
): number {
    const cond = type === 'tanks' ? comp.tank_condition : comp.artillery_condition;
    const count = comp[type];
    if (count <= 0) return 0;

    const nonFunctional = cond.degraded + cond.non_operational;

    let writeOff = 0;
    if (cond.non_operational > 0.30) writeOff = 2;
    else if (nonFunctional > 0.60) writeOff = 2;
    else if (nonFunctional > 0.40) writeOff = 1;

    if (writeOff <= 0) return 0;

    // Small formations maintain their few vehicles carefully — no write-off
    // below 10 units. Represents the difference between a mechanized brigade
    // with 40 tanks (can't maintain them all) vs a light brigade with 3
    // captured tanks (will keep those running at all costs).
    if (count <= 10) return 0;

    writeOff = Math.min(writeOff, count - 5); // never write off below 5
    if (writeOff <= 0) return 0;
    comp[type] = count - writeOff;
    return writeOff;
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
