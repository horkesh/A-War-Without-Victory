/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: attack_equipment_effects.ts
 * DOMAIN:    Equipment battle effects — loss, scavenging, capture, abandonment
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 2, 2026-04-13).
 * Pure helpers — no strategic decisions, no state ownership.
 *
 * UPSTREAM:  attack_resolution_osid.ts (sole caller)
 * ═══════════════════════════════════════════════════════════════
 */

import type { EquipmentCondition, FormationState } from '../../state/game_state.js';
import type { CasualtyLedger } from '../../state/casualty_ledger.js';
import type { CombatOutcome } from './combat_math.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import { recordEquipmentLoss } from '../../state/casualty_ledger.js';
import type { OsidPopulationMap } from '../../data/operational_data_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

// Equipment loss rates per battle (same as legacy path in battle_resolution.ts)
export const TANK_LOSS_RATE = 0.08;
export const ARTILLERY_LOSS_RATE = 0.04;

function normalizedCondition(condition: EquipmentCondition): EquipmentCondition {
    const operational = Math.max(0, condition.operational);
    const degraded = Math.max(0, condition.degraded);
    const nonOperational = Math.max(0, condition.non_operational);
    const total = operational + degraded + nonOperational;
    if (total <= 0) {
        return { operational: 1, degraded: 0, non_operational: 0 };
    }
    return {
        operational: operational / total,
        degraded: degraded / total,
        non_operational: nonOperational / total,
    };
}

function mixAddedEquipmentCondition(
    condition: EquipmentCondition,
    totalAfterTransfer: number,
    addedCount: number,
    addedCondition: EquipmentCondition,
): void {
    const total = Math.max(0, totalAfterTransfer);
    const added = Math.min(Math.max(0, addedCount), total);
    const oldCount = total - added;
    const oldMix = normalizedCondition(condition);
    const newMix = normalizedCondition(addedCondition);
    if (total <= 0) {
        Object.assign(condition, oldMix);
        return;
    }
    condition.operational = (oldMix.operational * oldCount + newMix.operational * added) / total;
    condition.degraded = (oldMix.degraded * oldCount + newMix.degraded * added) / total;
    condition.non_operational = (oldMix.non_operational * oldCount + newMix.non_operational * added) / total;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-formation equipment loss
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute and apply equipment losses for a single formation in combat.
 *
 * Attacker tanks: >=10 → max(1, round(tanks * 0.08)); <10 → round(tanks * 0.08 * 0.5)
 * Attacker art:   max(1, round(art * 0.04))
 * Defender tanks:  >=10 → max(1, round(tanks * 0.08 * 0.5)); <10 → round(tanks * 0.08 * 0.25)
 * Defender art:    max(1, round(art * 0.04 * 0.5))
 *
 * Mutates formation.composition in place and records to casualty ledger.
 */
export function computeFormationEquipmentLoss(
    formation: FormationState,
    role: 'attacker' | 'defender',
    casualtyLedger: CasualtyLedger,
): { tanksLost: number; artLost: number } {
    const comp = formation.composition ?? ensureBrigadeComposition(formation);

    let tanksLost: number;
    let artLost: number;

    if (role === 'attacker') {
        // Scarce tank protection: brigades with <10 tanks preserve them more carefully
        // (hull-down positions, indirect fire, not leading assaults). No minimum-1 loss.
        // VRS with 40 tanks loses 3+ per battle; ARBiH with 3 tanks loses 0-1.
        tanksLost = comp.tanks > 0
            ? (comp.tanks >= 10
                ? Math.max(1, Math.round(comp.tanks * TANK_LOSS_RATE))
                : Math.round(comp.tanks * TANK_LOSS_RATE * 0.5))
            : 0;
        artLost = comp.artillery > 0 ? Math.max(1, Math.round(comp.artillery * ARTILLERY_LOSS_RATE)) : 0;
    } else {
        // Defender tank losses: half rate, and scarce tank protection (no min-1 below 10)
        tanksLost = comp.tanks > 0
            ? (comp.tanks >= 10
                ? Math.max(1, Math.round(comp.tanks * TANK_LOSS_RATE * 0.5))
                : Math.round(comp.tanks * TANK_LOSS_RATE * 0.25))
            : 0;
        artLost = comp.artillery > 0 ? Math.max(1, Math.round(comp.artillery * ARTILLERY_LOSS_RATE * 0.5)) : 0;
    }

    if (tanksLost > 0 || artLost > 0) {
        comp.tanks = Math.max(0, comp.tanks - tanksLost);
        comp.artillery = Math.max(0, comp.artillery - artLost);
        recordEquipmentLoss(casualtyLedger, formation.faction, { tanks: tanksLost, artillery: artLost });
    }

    return { tanksLost, artLost };
}

// ═══════════════════════════════════════════════════════════════════════════
// Scavenge accumulator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Accumulate fractional scavenge amounts. When >=1.0 whole unit, grant it
 * and debit the accumulator. Returns whole units to grant.
 */
export function accumulateScavenge(
    formation: FormationState,
    fracTanks: number,
    fracArt: number,
): { tanks: number; art: number } {
    if (!formation.scavenge_accumulator) formation.scavenge_accumulator = { tanks: 0, artillery: 0 };
    const acc = formation.scavenge_accumulator;
    acc.tanks += fracTanks;
    acc.artillery += fracArt;
    const grantTanks = Math.floor(acc.tanks);
    const grantArt = Math.floor(acc.artillery);
    acc.tanks -= grantTanks;
    acc.artillery -= grantArt;
    return { tanks: grantTanks, art: grantArt };
}

// ═══════════════════════════════════════════════════════════════════════════
// Equipment transfers (scavenging + capture + abandoned)
// ═══════════════════════════════════════════════════════════════════════════

export interface EquipmentTransferResult {
    scavengedTanks: number;
    scavengedArt: number;
    scavengedBy: string;
    capturedTanks: number;
    capturedArt: number;
    capturedBy: string;
}

/**
 * Process all post-battle equipment transfers: scavenging from destroyed equipment,
 * capture from retreating forces, and abandoned equipment pickup.
 *
 * Mutates formation compositions in place. Returns tracking data for battle report.
 */
export function processEquipmentTransfers(params: {
    outcome: CombatOutcome;
    firstAttacker: FormationState;
    defenderFormation: FormationState | null;
    attackerFaction: string;
    controller: string | null;
    targetOsid: string;
    totalATanksLost: number;
    totalAArtLost: number;
    totalDTanksLost: number;
    totalDArtLost: number;
    osidPopulationMap?: OsidPopulationMap | null;
}): EquipmentTransferResult {
    const {
        outcome, firstAttacker, defenderFormation, attackerFaction,
        controller, targetOsid,
        totalATanksLost, totalAArtLost, totalDTanksLost, totalDArtLost,
        osidPopulationMap,
    } = params;

    let scavengedTanks = 0;
    let scavengedArt = 0;
    let scavengedBy = '';
    let capturedTanks = 0;
    let capturedArt = 0;
    let capturedBy = '';

    const attackerLost = outcome === 'repulsed' || outcome === 'catastrophic';
    const attackerWon = outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory';

    // ── Scavenging helper ──────────────────────────────────────────────
    // Both sides scavenge from the other's destroyed equipment.
    // Winner gets higher rate; loser still recovers some (the battlefield is
    // contested — knocked-out vehicles left on the field are recovered by field
    // repair teams from both sides). Historically critical: ARBiH recovered disabled
    // VRS tanks even from lost engagements.
    // Note: scavenging is from DESTROYED equipment (already removed from composition
    // above). It does NOT further reduce the loser's count — it's partial recovery
    // of equipment that would otherwise be total write-off.
    const applyScavenge = (
        recipient: FormationState,
        enemyTanksLost: number, enemyArtLost: number,
        rate: number, faction: string,
    ) => {
        const comp = recipient.composition;
        if (!comp) return;
        const fracTanks = enemyTanksLost * rate;
        const fracArt = enemyArtLost * rate;
        const { tanks: scavTanks, art: scavArt } = accumulateScavenge(recipient, fracTanks, fracArt);
        if (scavTanks > 0) {
            comp.tanks += scavTanks;
            mixAddedEquipmentCondition(
                comp.tank_condition,
                comp.tanks,
                scavTanks,
                { operational: 0.3, degraded: 0.7, non_operational: 0 },
            );
        }
        if (scavArt > 0) {
            comp.artillery += scavArt;
            mixAddedEquipmentCondition(
                comp.artillery_condition,
                comp.artillery,
                scavArt,
                { operational: 0.3, degraded: 0.7, non_operational: 0 },
            );
        }
        scavengedTanks += scavTanks;
        scavengedArt += scavArt;
        if (scavTanks > 0 || scavArt > 0) scavengedBy = faction;
    };

    if (attackerWon) {
        // Winner (attacker) scavenges from defender's destroyed equipment at high rate
        const winRate = outcome === 'decisive_victory' ? 0.20
            : outcome === 'victory' ? 0.15 : 0.10;
        applyScavenge(firstAttacker, totalDTanksLost, totalDArtLost, winRate, attackerFaction);
        // Loser (defender) recovers disabled enemy vehicles from the battlefield.
        // Rate is meaningful (15%) because the defender is on home ground — they
        // stay on the position (even if pushed back) and have time to recover
        // knocked-out tanks. Historically: ARBiH field repair teams recovered
        // disabled VRS T-55s and M-84s after every major VRS assault.
        if (defenderFormation) {
            const loseRate = 0.15;
            applyScavenge(defenderFormation, totalATanksLost, totalAArtLost, loseRate, defenderFormation.faction as string);
        }
    } else if (attackerLost) {
        // Winner (defender) scavenges from attacker's destroyed equipment at high rate
        // Defender held the field — they get everything the attacker left behind.
        if (defenderFormation) {
            const winRate = outcome === 'catastrophic' ? 0.25 : 0.15;
            applyScavenge(defenderFormation, totalATanksLost, totalAArtLost, winRate, defenderFormation.faction as string);
        }
        // Loser (attacker) retreats — minimal recovery from defender losses
        const loseRate = 0.05;
        applyScavenge(firstAttacker, totalDTanksLost, totalDArtLost, loseRate, attackerFaction);
    } else {
        // Stalemate: both sides recover from each other's losses at moderate rate
        applyScavenge(firstAttacker, totalDTanksLost, totalDArtLost, 0.08, attackerFaction);
        if (defenderFormation) {
            applyScavenge(defenderFormation, totalATanksLost, totalAArtLost, 0.08, defenderFormation.faction as string);
        }
    }

    // ── Equipment capture (from retreating/routed forces) ────────────────
    // Separate from scavenging (destroyed equipment). When one side wins,
    // the loser retreats and abandons some intact equipment on the field.
    // Capture transfers equipment from loser to winner (not destroyed — moved).
    // Decisive outcomes cause more abandonment (rout). Captured gear starts degraded.
    if (attackerWon && defenderFormation?.composition && firstAttacker.composition) {
        const captureRate = outcome === 'decisive_victory' ? 0.08
            : outcome === 'victory' ? 0.05 : 0.02;
        const dComp3 = defenderFormation.composition;
        const aComp3 = firstAttacker.composition;
        const capTanks = Math.floor(dComp3.tanks * captureRate);
        const capArt = Math.floor(dComp3.artillery * captureRate);
        if (capTanks > 0) {
            dComp3.tanks -= capTanks;
            aComp3.tanks += capTanks;
            mixAddedEquipmentCondition(
                aComp3.tank_condition,
                aComp3.tanks,
                capTanks,
                { operational: 0.5, degraded: 0.5, non_operational: 0 },
            );
        }
        if (capArt > 0) {
            dComp3.artillery -= capArt;
            aComp3.artillery += capArt;
            mixAddedEquipmentCondition(
                aComp3.artillery_condition,
                aComp3.artillery,
                capArt,
                { operational: 0.5, degraded: 0.5, non_operational: 0 },
            );
        }
        capturedTanks = capTanks;
        capturedArt = capArt;
        capturedBy = attackerFaction;
    } else if (attackerLost && defenderFormation?.composition && firstAttacker.composition) {
        // Defender captures from retreating/routed attacker — ARBiH repulsing
        // a VRS assault recovers abandoned tanks and artillery from the field.
        // Minimum 1 tank captured if attacker had 10+ tanks (disabled vehicle left
        // on the battlefield — historically common when VRS attacked ARBiH positions).
        // Zero-sum: captured equipment is removed from the attacker's composition.
        const captureRate = outcome === 'catastrophic' ? 0.12 : 0.05;
        const aComp3 = firstAttacker.composition;
        const dComp3 = defenderFormation.composition;
        const DEFENSIVE_CAPTURE_MIN_TANKS = 10; // attacker needs 10+ tanks for guaranteed capture
        const DEFENSIVE_CAPTURE_MIN_ART = 15;   // attacker needs 15+ artillery for guaranteed capture
        const rawCapTanks = aComp3.tanks * captureRate;
        const rawCapArt = aComp3.artillery * captureRate;
        const capTanks = rawCapTanks >= 1 ? Math.floor(rawCapTanks)
            : (aComp3.tanks >= DEFENSIVE_CAPTURE_MIN_TANKS ? 1 : 0);
        const capArt = rawCapArt >= 1 ? Math.floor(rawCapArt)
            : (aComp3.artillery >= DEFENSIVE_CAPTURE_MIN_ART ? 1 : 0);
        if (capTanks > 0) {
            aComp3.tanks -= capTanks;
            dComp3.tanks += capTanks;
            mixAddedEquipmentCondition(
                dComp3.tank_condition,
                dComp3.tanks,
                capTanks,
                { operational: 0.5, degraded: 0.5, non_operational: 0 },
            );
        }
        if (capArt > 0) {
            aComp3.artillery -= capArt;
            dComp3.artillery += capArt;
            mixAddedEquipmentCondition(
                dComp3.artillery_condition,
                dComp3.artillery,
                capArt,
                { operational: 0.5, degraded: 0.5, non_operational: 0 },
            );
        }
        capturedTanks = capTanks;
        capturedArt = capArt;
        capturedBy = defenderFormation.faction as string;
    }

    // ── Abandoned equipment after an undefended operation capture ─────
    // When an authorized operation captures a vacated enemy OSID, it recovers equipment
    // left behind by the retreating garrison. Historically critical for ARBiH:
    // much of their early heavy equipment came from overrunning JNA barracks
    // and abandoned VRS positions. Amount based on OSID population (proxy for
    // garrison size) and the occupying faction's equipment scarcity.
    if (!defenderFormation && firstAttacker.composition) {
        const pop = osidPopulationMap?.get(targetOsid) ?? 0;
        const defenderFaction = (controller ?? '') as string;
        // Only RS positions leave significant abandoned equipment (JNA inheritance)
        if (defenderFaction === 'RS' && pop > 500) {
            const ABANDONED_TANK_RATE = 0.0004;  // ~1 tank per 2500 pop
            const ABANDONED_ART_RATE = 0.0006;   // ~1.5 artillery per 2500 pop
            const abandonedTanks = Math.floor(pop * ABANDONED_TANK_RATE);
            const abandonedArt = Math.floor(pop * ABANDONED_ART_RATE);
            if (abandonedTanks > 0 || abandonedArt > 0) {
                const aComp4 = firstAttacker.composition;
                if (abandonedTanks > 0) {
                    aComp4.tanks += abandonedTanks;
                    mixAddedEquipmentCondition(
                        aComp4.tank_condition,
                        aComp4.tanks,
                        abandonedTanks,
                        { operational: 0.4, degraded: 0.6, non_operational: 0 },
                    );
                }
                if (abandonedArt > 0) {
                    aComp4.artillery += abandonedArt;
                    mixAddedEquipmentCondition(
                        aComp4.artillery_condition,
                        aComp4.artillery,
                        abandonedArt,
                        { operational: 0.4, degraded: 0.6, non_operational: 0 },
                    );
                }
                capturedTanks = abandonedTanks;
                capturedArt = abandonedArt;
                capturedBy = attackerFaction;
            }
        }
    }

    return { scavengedTanks, scavengedArt, scavengedBy, capturedTanks, capturedArt, capturedBy };
}

// ═══════════════════════════════════════════════════════════════════════════
// Battle equipment report builder
// ═══════════════════════════════════════════════════════════════════════════

export interface BattleEquipmentData {
    attacker_tanks_lost: number;
    attacker_artillery_lost: number;
    defender_tanks_lost: number;
    defender_artillery_lost: number;
    scavenged_tanks: number;
    scavenged_artillery: number;
    scavenged_by?: string;
    captured_tanks: number;
    captured_artillery: number;
    captured_by?: string;
}

export function buildBattleEquipmentReport(
    attackerTanksLost: number,
    attackerArtLost: number,
    defenderTanksLost: number,
    defenderArtLost: number,
    transfers: EquipmentTransferResult,
): BattleEquipmentData {
    return {
        attacker_tanks_lost: attackerTanksLost,
        attacker_artillery_lost: attackerArtLost,
        defender_tanks_lost: defenderTanksLost,
        defender_artillery_lost: defenderArtLost,
        scavenged_tanks: transfers.scavengedTanks,
        scavenged_artillery: transfers.scavengedArt,
        scavenged_by: transfers.scavengedBy || undefined,
        captured_tanks: transfers.capturedTanks,
        captured_artillery: transfers.capturedArt,
        captured_by: transfers.capturedBy || undefined,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Brigade equipment record builders (for brigade history)
// ═══════════════════════════════════════════════════════════════════════════

export interface BrigadeEquipmentRecord {
    destroyed: { tanks: number; artillery: number };
    captured: { tanks: number; artillery: number };
}

export function buildAttackerEquipmentRecord(
    defenderTanksLost: number,
    defenderArtLost: number,
    capturedBy: string,
    capturedTanks: number,
    capturedArt: number,
    attackerFaction: string,
): BrigadeEquipmentRecord {
    return {
        destroyed: { tanks: defenderTanksLost, artillery: defenderArtLost },
        captured: {
            tanks: capturedBy === attackerFaction ? capturedTanks : 0,
            artillery: capturedBy === attackerFaction ? capturedArt : 0,
        },
    };
}

export function buildDefenderEquipmentRecord(
    attackerTanksLost: number,
    attackerArtLost: number,
    capturedBy: string,
    capturedTanks: number,
    capturedArt: number,
    defenderFaction: string,
): BrigadeEquipmentRecord {
    return {
        destroyed: { tanks: attackerTanksLost, artillery: attackerArtLost },
        captured: {
            tanks: capturedBy === defenderFaction ? capturedTanks : 0,
            artillery: capturedBy === defenderFaction ? capturedArt : 0,
        },
    };
}
