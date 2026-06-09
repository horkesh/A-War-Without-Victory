/**
 * Passive frontline attrition: brigades assigned to a corps front sector lose
 * a small fraction of personnel per turn from sniping, shelling, disease, desertion.
 *
 * A brigade is "on the front" if it appears in any sector's assigned_brigade_ids
 * (i.e., its location_osid is in the sector's territory_osids). Reserve brigades
 * (not in any sector territory) are exempt.
 *
 * Modifiers:
 *   - Thin sectors (low density) → higher attrition (more exposed)
 *   - Dense sectors → lower attrition (mutual support)
 *   - Critical supply → doubled attrition (starvation, disease)
 *   - Strained supply → 30% increase
 *   - Entrenchment → reduced attrition (fortifications protect against sniping/shelling)
 *   - Bombardment exposure: brigades facing superior enemy heavy weapons
 *     take additional casualties from shelling (equipment deficit driven)
 *
 * Deterministic: sorted formation IDs, no randomness.
 */

import {
    initializeCasualtyLedger,
    recordBattleCasualties
} from '../../state/casualty_ledger.js';
import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import type {
    CorpsFrontSector,
    FormationState,
    GameState,
    MilitiaPoolState
} from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { strictCompare } from '../../state/validateGameState.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import { getMainCasualtySplit } from './casualty_realism_v2_gate.js';
import { deterministicRandom } from '../../state/deterministic_random.js';
import { recordBrigadeEngagement, ensureBrigadeHistory } from './brigade_history_recorder.js';
import {
    isGrazAccordsActive,
    isHerzegovinaTruceActive,
    isKiseljakExclusionActive,
    isEastHerzegovinaPair,
    GRAZ_KISELJAK_VRS_EXCLUSION,
    GRAZ_KISELJAK_HRHB_EXCLUSION,
    GRAZ_EXEMPT_RS_CORPS,
    GRAZ_EXEMPT_HRHB_CORPS,
} from '../local_truces.js';
import { getFormationCorpsId } from './corps_sector_partition.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Base weekly attrition rate for frontline brigades.
 * n159→0.003 (RS/HRHB running 2-3× historical). n303→0.005 (total casualties
 * too low at 97k/40w; first year was bloodiest with ~30k KIA target).
 * n553: reducing to 0.003 lowered KIA (23.8k→21.1k) while increasing destroyed
 * brigades (8→15). Reverted: attrition reduction cascades negatively.
 * Enclave brigades protected via local reinforcement + dissolution protection.
 * PR-1 v2 Path A retune: 0.004→0.0045 (partial restore from the PR-1 0.005→0.004
 * cut) so marginal late-war brigades thin out again at 188w while preserving the
 * killed-reduction realism (the regression only surfaces past turn 40).
 */
const BASE_ATTRITION_RATE = 0.0045;

/**
 * Bombardment exposure: additional attrition for brigades facing superior
 * enemy heavy weapons. Uses a ratio-based vulnerability model with log scaling:
 * brigades with very low own firepower facing high enemy firepower are
 * exponentially more vulnerable (no counter-battery fire, no suppression).
 *
 * The firepower RATIO (incoming/own) is what matters, not the absolute deficit.
 * ln(ratio) provides natural diminishing returns and better differentiation:
 *   - ARBiH (own FP ~1.8, incoming ~13) → ratio 7.2, ln=1.98 → near-full effect
 *   - HVO (own FP ~5, incoming ~13) → ratio 2.6, ln=0.96 → half effect
 *   - VRS (own FP ~17, incoming ~2) → ratio 0.13, ln<0 → zero effect
 */
/** Reduced 0.012→0.008 (n159 audit), then 0.008→0.006 (PR-1 casualty-model: background losses still inflate total military killed vs ~80-90k target), then 0.006→0.007 (PR-1 v2 Path A retune: partially restore so marginal late-war brigades thin out again — recovers 188w territory while keeping the killed-reduction realism). */
const BOMBARDMENT_EXPOSURE_RATE = 0.007;
/** ln(firepower ratio) divisor for full bombardment effect. ln(7)≈2.0 */
const BOMBARDMENT_RATIO_SCALE = 2.0;
/** Minimum own firepower floor (prevents division by zero). */
const MIN_COUNTERBATTERY_FP = 1.0;

/**
 * Entrenchment attrition reduction: well-dug-in units suffer less passive
 * attrition from sniping/shelling. Uses sqrt diminishing returns matching
 * combat_math.ts entrenchment model. Floor 0.4 (60% reduction at max).
 * At 6 turns: sqrt(6)*0.10 = 0.245 → mult 0.755 (24.5% reduction)
 * At 20 turns: sqrt(20)*0.10 = 0.447 → mult 0.553 (44.7% reduction)
 * At 52 turns: sqrt(52)*0.10 = 0.721 → mult 0.40 (floor, 60% reduction)
 */
const ENTRENCHMENT_ATTRITION_REDUCTION_PER_SQRT_TURN = 0.10;
const ENTRENCHMENT_ATTRITION_FLOOR = 0.40;

// Attrition casualty split (KIA 0.30 / WIA 0.55 / MIA 0.15 remainder) — canonical
// export from attack_casualty_distribution.ts (matches P9 value).

/** Probability that a frontline friction event is recorded as a skirmish engagement. */
const FRICTION_RECORD_CHANCE = 0.35;
/** Minimum casualties for a friction event to be eligible for recording. */
const FRICTION_CASUALTY_THRESHOLD = 15;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface FrontlineAttritionReport {
    brigades_affected: number;
    total_casualties: number;
    by_faction: Record<string, number>;
    /** Number of friction skirmish engagements recorded in brigade history this turn. */
    friction_engagements: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cold-front detection (Graz Accords truce)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns true if this brigade is on a cold front under the Graz Accords.
 * Cold fronts are ALL RS↔HRHB sectors (faction-level ceasefire) except:
 *   - Posavina exempt corps (active fighting)
 *   - East Herzegovina pair before Op Jackal ends
 * Also covers Kiseljak OSID exclusion zones.
 */
export function isColdFront(state: GameState, formation: FormationState, sector: CorpsFrontSector): boolean {
    if (!isGrazAccordsActive(state)) return false;

    // Only applies to sectors facing RS↔HRHB
    const fac = sector.faction;
    const opp = sector.opposing_factions;
    const hasRsHrhb =
        (fac === 'RS' && opp.includes('HRHB')) ||
        (fac === 'HRHB' && opp.includes('RS'));
    if (!hasRsHrhb) return false;

    // Faction-level RS↔HRHB ceasefire (Herzegovina truce component)
    if (isHerzegovinaTruceActive(state)) {
        const corpsId = getFormationCorpsId(formation);

        // Posavina corps are exempt (active fighting)
        if (corpsId && GRAZ_EXEMPT_RS_CORPS.has(corpsId)) return false;
        if (corpsId && GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) return false;

        // Op Jackal: east Herzegovina pair not yet frozen
        if (corpsId && isEastHerzegovinaPair(corpsId)
            && state.political.graz_east_herzegovina_active_turn == null) {
            return false;
        }

        // All other RS↔HRHB contact is cold
        return true;
    }

    // Kiseljak OSID exclusion: sector includes excluded OSIDs
    if (isKiseljakExclusionActive(state)) {
        for (const ss of sector.sub_segments) {
            for (const osid of ss.friendly_osids) {
                if (GRAZ_KISELJAK_VRS_EXCLUSION.has(osid) || GRAZ_KISELJAK_HRHB_EXCLUSION.has(osid)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Friction helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Infer the primary enemy faction from a sector's opposing forces.
 * Picks the first opposing faction in sorted order for determinism.
 */
function inferEnemyFaction(sector: CorpsFrontSector, ownFaction: string): string {
    const opponents = sector.opposing_factions
        .filter(f => f !== ownFaction)
        .sort(strictCompare);
    return opponents[0] ?? 'RS'; // fallback should never trigger
}

// ═══════════════════════════════════════════════════════════════════════════
// Main function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply passive attrition to all brigades assigned to corps front sectors.
 * A brigade is "on the front" if it appears in any sector's assigned_brigade_ids
 * (meaning its location_osid is within the sector's territory).
 * Mutates formation personnel and records casualties in ledger.
 * Also feeds casualties into pool.exhausted for demographic gating.
 */
export function applyFrontlineAttrition(
    state: GameState,
    supplyStateByOsid?: SupplyStateByOsidReport | null
): FrontlineAttritionReport {
    const report: FrontlineAttritionReport = {
        brigades_affected: 0,
        total_casualties: 0,
        by_faction: {},
        friction_engagements: 0,
    };

    // COHA ceasefire suspends frontline attrition (v0.7.0 Phase 4)
    if (state.military.event_flags?.coha_active === true) return report;

    const formations = state.military.formations;
    if (!formations) return report;

    const sectors = state.military.corps_front_sectors;
    if (!sectors) return report;

    if (!state.military.casualty_ledger) {
        const factionIds = (state.factions ?? []).map(f => f.id);
        state.military.casualty_ledger = initializeCasualtyLedger(factionIds);
    }

    const pools = (state.military.militia_pools ?? {}) as Record<string, MilitiaPoolState>;

    // Build brigade→sector lookup from assigned_brigade_ids.
    // A brigade takes frontline attrition only if it is physically on one of
    // that sector's frontline OSIDs.
    const brigadeSector = new Map<string, CorpsFrontSector>();
    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId]!;
        for (const bid of sector.assigned_brigade_ids) {
            brigadeSector.set(bid, sector);
        }
    }

    // Identify true frontline brigades for attrition
    const formationIds = Object.keys(formations).sort(strictCompare);
    const frontlineBrigades: Array<{ fid: string; formation: FormationState; sector: CorpsFrontSector }> = [];
    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const sector = brigadeSector.get(fid);
        if (!sector) continue;
        const loc = f.location_osid ?? '';
        if (!loc) continue;
        const frontSet = new Set<string>();
        for (const ss of sector.sub_segments ?? []) {
            for (const o of ss.friendly_osids ?? []) frontSet.add(o);
        }
        if (frontSet.size === 0 || !frontSet.has(loc)) continue;
        frontlineBrigades.push({ fid, formation: f, sector });
    }

    // Compute per-faction total heavy weapons firepower for frontline brigades.
    // Used to determine bombardment exposure: brigades facing superior enemy
    // firepower take additional passive casualties from persistent shelling.
    // Excludes brigades on cold (truce-covered) fronts — no shelling across truce lines.
    const factionFrontFP: Record<string, { totalFP: number; count: number }> = {};
    for (const { formation, sector } of frontlineBrigades) {
        if (isColdFront(state, formation, sector)) continue;
        const fac = formation.faction as string;
        if (!factionFrontFP[fac]) factionFrontFP[fac] = { totalFP: 0, count: 0 };
        const comp = formation.composition ?? ensureBrigadeComposition(formation);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        factionFrontFP[fac].totalFP += artEff + tankEff * 0.5;
        factionFrontFP[fac].count += 1;
    }

    const turn = state.meta?.turn ?? 0;
    const seed = state.meta?.seed ?? 'awwv';

    // B1 casualty-realism V2 gate (default OFF ⇒ KIA_FRACTION/WIA_FRACTION exactly).
    const split = getMainCasualtySplit();
    const kiaFrac = split.kia;
    const wiaFrac = split.wia;

    for (const { fid, formation, sector } of frontlineBrigades) {
        // Graz Accords: skip attrition on cold (truce-covered) fronts
        if (isColdFront(state, formation, sector)) continue;

        const personnel = formation.personnel ?? 0;
        if (personnel <= MIN_COMBAT_PERSONNEL) continue;

        // Density modifier from sector: thin sectors are more exposed
        let exposureMod = 1.0;
        const density = sector.assigned_brigade_ids.length / Math.max(1, sector.length_edges);
        if (density < 0.5) {
            exposureMod = 1.5; // thin sector — more exposed
        } else if (density > 1.0) {
            exposureMod = 0.7; // dense sector — mutual support
        }

        // Supply modifier
        let supplyMod = 1.0;
        const locationOsid = formation.location_osid;
        const factionId = formation.faction as string;
        if (supplyStateByOsid?.factions && locationOsid) {
            const facEntry = supplyStateByOsid.factions.find(f => f.faction_id === factionId);
            const entry = facEntry?.by_osid?.find(e => e.osid === locationOsid);
            if (entry) {
                let effectiveState = entry.state;
                if (state.meta.supply_reserves_enabled && state.military.general_supply_reserve) {
                    const reserveLevel = (state.military.general_supply_reserve as Record<string, number>)[factionId] ?? 100;
                    effectiveState = getEffectiveSupplyState(entry.state, reserveLevel);
                }
                if (effectiveState === 'critical') supplyMod = 2.0;
                else if (effectiveState === 'strained') supplyMod = 1.3;
            }
        }

        // Entrenchment modifier: dug-in units take less passive attrition
        const entrenchmentTurns = formation.entrenchment_turns ?? 0;
        const entrenchmentMod = Math.max(
            ENTRENCHMENT_ATTRITION_FLOOR,
            1.0 - Math.sqrt(entrenchmentTurns) * ENTRENCHMENT_ATTRITION_REDUCTION_PER_SQRT_TURN
        );

        // Base attrition (sniping, disease, desertion)
        const baseAttritionCas = Math.floor(personnel * BASE_ATTRITION_RATE * exposureMod * supplyMod * entrenchmentMod);

        // Bombardment exposure: ratio-based vulnerability model.
        // Brigades with low own firepower facing high enemy firepower take extra losses.
        // Uses ln(incoming/own) for natural diminishing returns and steep low-equipment penalty.
        const comp = formation.composition ?? ensureBrigadeComposition(formation);
        const ownArt = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const ownTank = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        const ownFP = Math.max(MIN_COUNTERBATTERY_FP, ownArt + ownTank * 0.5);
        const totalFrontBrigades = Object.values(factionFrontFP).reduce((s, d) => s + d.count, 0);
        let incomingFPPerBrigade = 0;
        for (const fac of Object.keys(factionFrontFP).sort(strictCompare)) {
            if (fac !== factionId) {
                const targetCount = totalFrontBrigades - factionFrontFP[fac].count;
                incomingFPPerBrigade += factionFrontFP[fac].totalFP / Math.max(1, targetCount);
            }
        }
        const firepowerRatio = incomingFPPerBrigade / ownFP;
        const logRatio = Math.max(0, Math.log(firepowerRatio));
        const bombardmentFraction = Math.min(1.0, logRatio / BOMBARDMENT_RATIO_SCALE);
        const bombardmentCas = Math.floor(personnel * BOMBARDMENT_EXPOSURE_RATE * bombardmentFraction * entrenchmentMod);

        const casualties = Math.min(
            personnel - MIN_COMBAT_PERSONNEL,
            Math.max(1, baseAttritionCas + bombardmentCas)
        );
        if (casualties <= 0) continue;

        // Apply personnel loss
        formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, personnel - casualties);

        // Record in casualty ledger (split via B1 gate; flag-OFF == KIA/WIA_FRACTION).
        const killed = Math.floor(casualties * kiaFrac);
        const wounded = Math.floor(casualties * wiaFrac);
        const mia = Math.max(0, casualties - killed - wounded);
        recordBattleCasualties(state.military.casualty_ledger!, factionId, fid, {
            killed, wounded, missing_captured: mia
        });

        // Feed into pool.exhausted for demographic gating (75% rate — matches applyCasualtyPoolExhaustion).
        const originMun = formation.origin_mun;
        if (originMun) {
            const poolKey = militiaPoolKey(originMun, factionId);
            const pool = pools[poolKey];
            if (pool) {
                const permanentLoss = killed + mia;
                pool.exhausted = (pool.exhausted ?? 0) + Math.round(permanentLoss * 0.75);
            }
        }

        // ── Probabilistic friction skirmish recording ──
        // Not every week: deterministic random keyed on turn + brigade ID.
        // ~35% chance when casualties exceed threshold — some weeks quiet, some notable.
        let frictionEngagementRecorded = false;
        if (casualties >= FRICTION_CASUALTY_THRESHOLD) {
            const frictionRoll = deterministicRandom(seed, `friction_${turn}_${fid}`);
            if (frictionRoll < FRICTION_RECORD_CHANCE) {
                const enemyFaction = inferEnemyFaction(sector, factionId);
                const frontSet = new Set<string>();
                for (const ss of sector.sub_segments ?? []) {
                    for (const o of ss.friendly_osids ?? []) frontSet.add(o);
                }
                const location = frontSet.has(formation.location_osid ?? '')
                    ? (formation.location_osid as string)
                    : (sector.sub_segments?.[0]?.friendly_osids?.[0] ?? 'unknown');
                recordBrigadeEngagement(formation, {
                    battle_id: `${turn}:${location}:friction:${fid}`,
                    turn,
                    osid: location,
                    role: 'defender',
                    outcome: 'stalemate',
                    casualties_taken: casualties,
                    casualties_inflicted: Math.floor(casualties * 0.3), // approximate reciprocal friction
                    enemy_faction: enemyFaction,
                    territory_flipped: false,
                    was_concentrated: false,
                });
                report.friction_engagements++;
                frictionEngagementRecorded = true;
            }
        }
        // Always update brigade history casualty tally for friction —
        // recordBrigadeEngagement already updates total_casualties_taken for the 35%,
        // so only add here for brigades that didn't get a full engagement recorded.
        if (!frictionEngagementRecorded) {
            const frictionHistory = ensureBrigadeHistory(formation);
            frictionHistory.total_casualties_taken += casualties;
        }

        report.brigades_affected += 1;
        report.total_casualties += casualties;
        report.by_faction[factionId] = (report.by_faction[factionId] ?? 0) + casualties;
    }

    return report;
}
