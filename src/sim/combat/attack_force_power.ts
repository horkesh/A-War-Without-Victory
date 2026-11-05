import type {FormationId, FormationState, GameState, TacticalGroup} from '../../state/game_state.js';
import type {SupplyStateByOsidReport} from '../../state/supply_state_derivation.js';
import {strictCompare} from '../../state/validateGameState.js';
import {computeAttackerPower, COORDINATION_PENALTY_2, COORDINATION_PENALTY_3PLUS, POSTURE_ATTACK, getConcentrationBonus, getWarExhaustionTempoMult} from './combat_math.js';
import {countAxisConcentrationSupport, findBrigadeOperationAnywhere, getBrigadeExecutionAttackPowerMult} from './corps_operation_helpers.js';
import {getBrigadeAxis} from './operation_approach_osids.js';
import {isSupportBrigadeOnActiveOp} from './sector_offensive_axis_helpers.js';
import {SUPPORT_POWER_MULT} from './bot_constants.js';
import {ENABLE_TG_COMBAT_SYNTHESIS} from './tactical_group_config.js';

export function findTgForAnchor(state: GameState, brigadeId: string): TacticalGroup | null {
    const tgs = state.military?.tactical_groups;
    if (!tgs) return null;
    for (const id of Object.keys(tgs).sort(strictCompare)) {
        const tg = tgs[id];
        if (tg && tg.anchor_brigade_id === brigadeId && tg.status !== 'dissolved') return tg;
    }
    return null;
}

/**
 * ADR-0005 v2.2c: aggregate donor combat power for all TG anchors in an attack,
 * using each donor's OWN stats (true per-donor power).
 *
 * For each donor of a TG anchored on an attacker, the contribution is the donor's
 * full-force power — `computeAttackerPower(donor, ...)`, which bakes in the donor's
 * equipment ratio (basePower), supply, disruption, fatigue, officer quality,
 * heavy-weapons-vs-target-terrain, home-distance (≈1.0 since donors stay home),
 * and morale — scaled by the donated fraction `personnel_lent / donor.personnel`.
 * The donated element fights at the ANCHOR's effective posture against the target's
 * terrain (it reinforces the anchor's assault), but is NOT a physical brigade, so it
 * does not receive the concentration multiplier (applied by the caller to physical
 * brigades only, per ADR-0005 §Battle resolution).
 *
 * This replaces the v2.2b proxy (which scaled the ANCHOR's per-personnel power by the
 * total donated fraction); v2.2c reflects donor-specific equipment/supply/cohesion so a
 * well-equipped donor lends more punch than a militia donor of equal headcount.
 *
 * Returned value is the SUM of donor contributions across all TG anchors in
 * `attackerFormations`. Caller multiplies by coordPenalty × seasonal × tempo.
 */
function computeTgDonorPower(
    state: GameState,
    attackerFormations: FormationState[],
    supplyStateByOsid: SupplyStateByOsidReport | null | undefined,
    targetTerrainMult: number,
    targetOsid: string,
    postureOverrides?: ReadonlyMap<string, string>,
): number {
    const formations = state.military?.formations ?? {};
    let total = 0;
    for (const a of attackerFormations) {
        const tg = findTgForAnchor(state, a.id);
        if (!tg) continue;
        const anchorPosture = postureOverrides?.get(a.id) ?? a.posture ?? 'defend';
        const atkMult = POSTURE_ATTACK[anchorPosture] ?? 0;
        const effectivePosture = atkMult > 0 ? anchorPosture : 'attack';
        for (const d of tg.donor_contributions) {
            const lent = d.personnel_lent;
            if (lent <= 0) continue;
            const donor = formations[d.brigade_id];
            if (!donor) continue;
            const donorPersonnel = donor.personnel ?? 0;
            if (donorPersonnel <= 0) continue;
            const donorRaw = computeAttackerPower(state, donor, supplyStateByOsid, effectivePosture, targetTerrainMult, targetOsid);
            // Cap the lent fraction at 1.0: donor.personnel can drop below personnel_lent
            // mid-op via the donor's own attrition; a donor never lends more than its current force.
            const lentFraction = Math.min(1, lent / donorPersonnel);
            total += donorRaw * lentFraction;
        }
    }
    return total;
}

/** Known friendly force arithmetic shared by forecast and execution.
 * Callers supply active, tactically adjacent, unique attackers in strict ID order.
 * Enemy-dependent firepower deficit remains an explicit resolver input; prediction
 * must not query hidden enemy equipment to manufacture exact knowledge.
 * No state mutation or enemy-intelligence lookup occurs here.
 */
export function computeAttackForcePower(
    state: GameState,
    attackerFormations: FormationState[],
    targetOsid: string,
    adjacency: Map<string, string[]>,
    targetTerrainMult: number,
    seasonalAttackMult: number,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    postureOverrides?: ReadonlyMap<string, string>,
    firepowerDeficitMult = 1,
): number {
    const firstAttacker = attackerFormations[0];
    if (!firstAttacker) return 0;
    const attackerFaction = firstAttacker.faction;
    const coordPenalty = attackerFormations.length >= 3 ? COORDINATION_PENALTY_3PLUS : attackerFormations.length === 2 ? COORDINATION_PENALTY_2 : 1.0;
    // R13b op-level concentration mirror: amplify the concentration bonus
    // when same-axis op-mates are within 2 hops of the target (theater
    // coordination). Capped at 4 effective via Math.min to stay within
    // the existing CONCENTRATION_BONUS_CAP=0.30. Same-axis (not whole op)
    // scope prevents cross-axis amplification on Sarajevo ring / Drina.
    let effectiveAttackerCount = attackerFormations.length;
    const opMatch = findBrigadeOperationAnywhere(state, firstAttacker.id);
    if (opMatch) {
        const axis = getBrigadeAxis(opMatch.op, firstAttacker.id);
        const sameAxisBrigades = axis?.assigned_brigades ?? opMatch.op.participating_brigades ?? [];
        const attackerIds = new Set<FormationId>(attackerFormations.map(a => a.id));
        effectiveAttackerCount += countAxisConcentrationSupport(
            state,
            sameAxisBrigades,
            attackerIds,
            adjacency,
            targetOsid,
        );
    }
    const concentrationBonus = getConcentrationBonus(Math.min(4, effectiveAttackerCount));
    // Formations with attack orders attack at their posture — but postures with
    // zero attack mult (defend, hold, dig_in) use 'attack' as minimum, since the
    // attack order itself implies attack intent. Preserves 'assault' (1.2×) bonus.
    const physicalPower = attackerFormations.reduce((s, a) => {
        const posture = postureOverrides?.get(a.id) ?? a.posture ?? 'defend';
        const atkMult = POSTURE_ATTACK[posture] ?? 0;
        const effectivePosture = atkMult > 0 ? posture : 'attack';
        const rawPower = computeAttackerPower(state, a, supplyStateByOsid, effectivePosture, targetTerrainMult, targetOsid);
        // Support brigades contribute reduced power — main brigade carries the assault
        const supportMult = isSupportBrigadeOnActiveOp(state, a.id, a.corps_id) ? SUPPORT_POWER_MULT : 1.0;
        const executionMult = getBrigadeExecutionAttackPowerMult(state, a.id);
        return s + rawPower * supportMult * executionMult;
    }, 0);
    const tempoMult = getWarExhaustionTempoMult(state, attackerFaction);
    let attackerPower = physicalPower * coordPenalty * seasonalAttackMult * concentrationBonus * tempoMult * firepowerDeficitMult;
    if (ENABLE_TG_COMBAT_SYNTHESIS) {
        const donorPower = computeTgDonorPower(state, attackerFormations, supplyStateByOsid, targetTerrainMult, targetOsid, postureOverrides);
        attackerPower += donorPower * coordPenalty * seasonalAttackMult * tempoMult;
    }
    return attackerPower;
}
