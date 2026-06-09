/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Morale absorption evaluation + homeland-determination extra casualties
 * DOMAIN:    Post-battle retreat resistance & extra casualty application
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 5a).
 * Pure extraction — no behavior change.
 *
 * UPSTREAM:  attack_resolution_osid.ts (sole caller)
 * ═══════════════════════════════════════════════════════════════
 */

import type { FormationState, FormationId, FactionId } from '../../state/game_state.js';
import type { CasualtyLedger } from '../../state/casualty_ledger.js';
import type { CombatOutcome } from './combat_math.js';
import type { AttackResolutionOsidReport, AttackResolutionOsidSnapEvent } from './attack_resolution_types.js';
import type { Osid } from './osid_adjacency.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';

import { getMoraleResistFloor } from './combat_math.js';
import { getCoEthnicShare } from './ethnic_defense.js';
import { isEnclaveCapital } from './enclave_resilience.js';
import { applyPersonnelLoss } from './attack_retreat_displacement.js';
import { recordBattleCasualties } from '../../state/casualty_ledger.js';
import { splitKiaWiaMia } from './attack_casualty_distribution.js';
import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import { pushSnapEvent } from './attack_resolution_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Homeland determination casualty multiplier.
 * When morale absorption triggers (defender stays after costly_victory),
 * BOTH sides take additional casualties. This is the primary driver of
 * "defending harder, taking more casualties, not yielding ground" behavior.
 * High multiplier = bloodier stalemates (historically accurate for Bosnian War).
 */
export const MORALE_ABSORPTION_CAS_MULT = 1.6;

// ═══════════════════════════════════════════════════════════════════════════
// Interface
// ═══════════════════════════════════════════════════════════════════════════

export interface MoraleAbsorptionResult {
    moraleAbsorbed: boolean;
    flip: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate morale-based retreat resistance and apply extra homeland-determination
 * casualties when absorption triggers.
 *
 * Mutates: defenderFormation.morale, attacker/defender personnel (via applyPersonnelLoss),
 * casualtyLedger, report.casualty_attacker/casualty_defender, battleSnapEvents, report.snap_events.
 */
export function evaluateAndApplyMoraleAbsorption(params: {
    defenderFormation: FormationState | null;
    attackerFormations: FormationState[];
    targetOsid: Osid;
    outcome: CombatOutcome;
    flip: boolean;
    ethnicComposition: OsidEthnicComposition | null | undefined;
    personnelAttacker: number;
    finalAttackerCas: number;
    finalDefenderCas: number;
    casualtyLedger: CasualtyLedger;
    report: AttackResolutionOsidReport;
    firstAttackerId: FormationId;
    battleSnapEvents: AttackResolutionOsidSnapEvent[];
}): MoraleAbsorptionResult {
    const {
        defenderFormation,
        attackerFormations,
        targetOsid,
        outcome,
        ethnicComposition,
        personnelAttacker,
        finalAttackerCas,
        finalDefenderCas,
        casualtyLedger,
        report,
        firstAttackerId,
        battleSnapEvents,
    } = params;

    let flip = params.flip;

    // === MORALE-BASED RETREAT RESISTANCE ===
    let moraleAbsorbed = false;
    const defenderFaction = defenderFormation?.faction as string ?? '';
    if (defenderFormation) {
        const defMorale = defenderFormation.morale ?? 60;
        const resistFloor = getMoraleResistFloor(defenderFaction);
        const coEthnicShare = getCoEthnicShare(targetOsid, defenderFaction, ethnicComposition);
        // Enclave capital last stand: defenders at the capital absorb ALL outcomes
        // except decisive_victory. BB2 p.479: "hung on at Gradina — the key to ARBiH defenses."
        const capitalLastStand = isEnclaveCapital(targetOsid);
        // ARBiH homeland defense: fighters refuse to retreat even under heavy losses.
        // n536: In co-ethnic homeland (≥50%), absorb victory + costly_victory at any morale.
        // ARBiH didn't retreat from their villages — they stood and died, and VRS paid in
        // blood for every meter. Both sides bleed (MORALE_ABSORPTION_CAS_MULT applies).
        // n1240 (EI §9.6 + SM §7.4): decisive_victory ALWAYS flips — no exception.
        // homelandAbsorbDecisive (n536–n539) removed: absorbing decisive_victory at any
        // power ratio violates Engine Invariants §9.6. A 23× ratio attack on a displaced
        // Brčko brigade defending Ilijas was being absorbed, preventing OSID transfer.
        const homelandLastStand = defenderFaction === 'RBiH' && coEthnicShare >= 0.50;
        // All factions: any defender absorbs costly_victory at morale ≥ floor.
        // n536: RS/HRHB also absorb 'victory' at high morale — professional forces
        // don't retreat from a single costly engagement.
        const professionalResilience = defMorale >= resistFloor
            && (outcome === 'costly_victory' || outcome === 'victory');
        const absorb = capitalLastStand
            ? (outcome !== 'decisive_victory')
            : homelandLastStand
                ? (outcome === 'costly_victory' || outcome === 'victory')
                : professionalResilience;
        if (absorb && flip) {
            flip = false;
            moraleAbsorbed = true;
            defenderFormation.morale = Math.max(0, defMorale - 5);
            const ev: AttackResolutionOsidSnapEvent = {
                snap_type: 'morale_absorption',
                trigger_phase: 'post_battle',
                attacker_brigade: firstAttackerId,
                target_osid: targetOsid,
                affected_formation: defenderFormation.id,
                description: capitalLastStand
                    ? 'Enclave capital last stand — defenders fight to the last.'
                    : homelandLastStand
                        ? 'ARBiH homeland last stand — absorbed defeat without retreating.'
                        : 'Defender morale held — absorbed attack without retreating.',
                effects: { flip_prevented: true, morale_drain: -5 },
            };
            battleSnapEvents.push(ev);
            pushSnapEvent(report, ev);
        }
    }

    // === HOMELAND DETERMINATION: Extra casualties when morale absorption triggers ===
    if (moraleAbsorbed && defenderFormation) {
        const extraMult = MORALE_ABSORPTION_CAS_MULT - 1.0;
        const extraAttackerTotal = Math.round(finalAttackerCas * extraMult);
        if (extraAttackerTotal > 0) {
            for (const a of attackerFormations) {
                const frac = (a.personnel ?? 0) / Math.max(1, personnelAttacker);
                const extraCas = Math.min(Math.max(0, (a.personnel ?? 0) - MIN_COMBAT_PERSONNEL), Math.round(extraAttackerTotal * frac));
                if (extraCas > 0) {
                    applyPersonnelLoss(a, extraCas);
                    report.casualty_attacker += extraCas;
                    recordBattleCasualties(casualtyLedger, a.faction, a.id, splitKiaWiaMia(extraCas));
                }
            }
        }
        const extraDefenderTotal = Math.min(
            Math.max(0, (defenderFormation.personnel ?? 0) - MIN_COMBAT_PERSONNEL),
            Math.round(finalDefenderCas * extraMult)
        );
        if (extraDefenderTotal > 0) {
            applyPersonnelLoss(defenderFormation, extraDefenderTotal);
            report.casualty_defender += extraDefenderTotal;
            recordBattleCasualties(casualtyLedger, defenderFormation.faction, defenderFormation.id, splitKiaWiaMia(extraDefenderTotal));
        }
    }

    return { moraleAbsorbed, flip };
}
