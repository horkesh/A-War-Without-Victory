/**
 * OSID-native bot brigade AI — three faction-specific AIs.
 *
 * Replaces generateBotBrigadeOrdersOsid with three distinct faction AIs:
 *   - VRS (RS): "Strategic Dominance" — aggressive early, methodical always
 *   - ARBiH (RBiH): "Survival and Attrition" — cautious early, pinpricks mid-war
 *   - HVO (HRHB): "Opportunist and Survivor" — alliance-dependent, fragile
 *
 * Each AI uses formula omniscience (combat_predictor.ts) and strategic graph
 * analysis (osid_graph_analysis.ts) to make OSID-native decisions.
 *
 * All decisions operate in OSID space — no dependency on brigade_aor or
 * canonical settlement graphs.
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 * Canon: BOT_AI_DESIGN_SPEC.md §4–§6, §8.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    BrigadePosture,
    CorpsStance,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import {
    predictCombatOutcome,
    predictAllAdjacentTargets,
    buildTerrainCache,
    OUTCOME_SCORE,
    type CombatPrediction,
    type PredictedOutcome
} from './combat_predictor.js';
import {
    analyzeFactionGraph,
    type FactionGraphAnalysis,
    type OsidAnalysis
} from './osid_graph_analysis.js';
import {
    buildOsidAdjacency,
    computeEnemyZocOsidsForFaction,
    isBrigadeDeployed,
    isBrigadeInEnemyZoc,
    getValidRetreatDestinations,
    type Osid
} from './zoc.js';
import {
    getActiveStandingOrder,
    getActiveDoctrinePhase,
    FACTION_STRATEGIES,
    type FactionBotStrategy
} from './bot_strategy.js';
import { areRbihHrhbAllied } from '../phase_i/alliance_update.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface OsidBotOrdersResult {
    posture_orders: Array<{ brigade_id: FormationId; posture: BrigadePosture }>;
    attack_orders: Record<FormationId, Osid>;
    movement_orders: Record<FormationId, Osid>;
    /** Column march orders: brigade → distant destination OSID (multi-turn transit). */
    column_march_orders: Record<FormationId, Osid>;
}

interface BrigadeContext {
    formation: FormationState;
    loc: Osid;
    osidAnalysis: OsidAnalysis | null;
    corpsStance: CorpsStance | null;
    isZocLocked: boolean;
    adjacentEnemyOsids: Osid[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════════════════

function getCorpsStance(state: GameState, formation: FormationState): CorpsStance | null {
    if (!formation.corps_id || !state.corps_command) return null;
    const corps = state.corps_command[formation.corps_id];
    return corps?.stance ?? null;
}

function getFactionBrigades(state: GameState, faction: FactionId): FormationState[] {
    const formations = state.formations ?? {};
    const result: FormationState[] = [];
    for (const [, f] of Object.entries(formations)) {
        if (f.faction !== faction) continue;
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        // Skip brigades in column transit (they're redeploying; no new orders)
        if (!isBrigadeDeployed(state, f.id)) continue;
        result.push(f);
    }
    result.sort((a, b) => strictCompare(a.id, b.id));
    return result;
}

/** Return adjacent enemy-controlled OSIDs for a brigade location. */
function getAdjacentEnemyOsids(
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    const neighbors = adjacency.get(loc) ?? [];
    const result: Osid[] = [];
    for (const n of neighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c !== null && c !== faction) result.push(n);
    }
    return result.sort(strictCompare);
}

/** Check if OSID contains a string pattern (case-insensitive). */
function osidContains(osid: Osid, pattern: string): boolean {
    return osid.toLowerCase().includes(pattern.toLowerCase());
}

/** Check if any array of patterns match the OSID. */
function osidMatchesAny(osid: Osid, patterns: string[]): boolean {
    const lower = osid.toLowerCase();
    return patterns.some(p => lower.includes(p.toLowerCase()));
}

/** Find the nearest front OSID with a given classification for movement. */
function findNearestFrontOsid(
    state: GameState,
    faction: FactionId,
    loc: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis,
    targetClassifications: string[]
): Osid | null {
    // BFS from current location through friendly territory toward front
    const controllerCache = new Map<Osid, FactionId | null>();
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; firstStep: Osid | null }> = [{ osid: loc, firstStep: null }];

    while (queue.length > 0) {
        const { osid, firstStep } = queue.shift()!;
        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);

        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);

            let ctrl = controllerCache.get(n);
            if (ctrl === undefined) {
                ctrl = getPoliticalControllerOSID(state, n, reverseMap);
                controllerCache.set(n, ctrl);
            }
            if (ctrl !== faction) continue; // Only move through friendly territory

            const step = firstStep ?? n;
            const analysis = graphAnalysis.osid_analysis.get(n);
            if (analysis && targetClassifications.includes(analysis.classification)) {
                return step; // Return the FIRST step toward the target, not the target itself
            }
            queue.push({ osid: n, firstStep: step });
        }
    }
    return null;
}

/** Minimum distance (BFS hops) from front for a brigade to use column march instead of 1-hop. */
const COLUMN_MARCH_MIN_HOPS = 3;

/**
 * Compute BFS hop distance from a location to the nearest front OSID.
 * Returns the number of hops, or Infinity if no front is reachable.
 */
function computeHopsToFront(
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis
): number {
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; depth: number }> = [{ osid: loc, depth: 0 }];

    while (queue.length > 0) {
        const { osid, depth } = queue.shift()!;
        const analysis = graphAnalysis.osid_analysis.get(osid);
        // Front = any OSID with enemy neighbors (not 'interior' or 'quiet' deep)
        if (depth > 0 && analysis && analysis.enemy_neighbors.length > 0) {
            return depth;
        }

        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl !== faction) continue;
            queue.push({ osid: n, depth: depth + 1 });
        }
    }
    return Infinity;
}

/**
 * Find the actual front-line destination OSID for a column march.
 * Unlike findNearestFrontOsid (which returns the FIRST HOP), this returns
 * the actual front OSID itself — the endpoint for multi-turn column transit.
 *
 * Prefers: undefended > critical > threatened (so reinforcements fill gaps).
 * Deterministic: BFS with sorted expansion.
 */
function findFrontDestinationForColumnMarch(
    state: GameState,
    faction: FactionId,
    loc: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis
): Osid | null {
    // BFS outward through friendly territory, find closest front OSID
    // Priority: undefended first (needs reinforcement most), then critical, then threatened
    const visited = new Set<Osid>([loc]);
    const queue: Array<{ osid: Osid; depth: number }> = [{ osid: loc, depth: 0 }];

    let bestTarget: Osid | null = null;
    let bestPriority = Infinity; // lower = better
    let bestDepth = Infinity;

    const classificationPriority: Record<string, number> = {
        undefended: 0,
        critical: 1,
        threatened: 2,
        active: 3
    };

    while (queue.length > 0) {
        const { osid, depth } = queue.shift()!;

        // Early exit: if we've found a target and gone past it in BFS depth, stop
        if (bestTarget && depth > bestDepth) break;

        if (depth > 0) {
            const analysis = graphAnalysis.osid_analysis.get(osid);
            if (analysis && analysis.enemy_neighbors.length > 0) {
                const prio = classificationPriority[analysis.classification] ?? 10;
                if (prio < bestPriority || (prio === bestPriority && strictCompare(osid, bestTarget!) < 0)) {
                    bestTarget = osid;
                    bestPriority = prio;
                    bestDepth = depth;
                }
                continue; // Don't expand past front
            }
        }

        const neighbors = (adjacency.get(osid) ?? []).slice().sort(strictCompare);
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            visited.add(n);
            const ctrl = getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl !== faction) continue;
            queue.push({ osid: n, depth: depth + 1 });
        }
    }

    return bestTarget;
}

/**
 * Shared interior-brigade movement: column march if deep, 1-hop move if close to front.
 * Returns true if an order was issued (caller should `continue`), false if nothing was done.
 */
function issueInteriorMovement(
    brigade: FormationState,
    loc: Osid,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
    graphAnalysis: FactionGraphAnalysis,
    result: OsidBotOrdersResult,
    oneHopClassifications: string[]
): boolean {
    const hopsToFront = computeHopsToFront(loc, faction, adjacency, state, reverseMap, graphAnalysis);
    if (hopsToFront >= COLUMN_MARCH_MIN_HOPS) {
        const frontDest = findFrontDestinationForColumnMarch(state, faction, loc, adjacency, reverseMap, graphAnalysis);
        if (frontDest) {
            result.column_march_orders[brigade.id] = frontDest;
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }
    const dest = findNearestFrontOsid(state, faction, loc, adjacency, reverseMap, graphAnalysis, oneHopClassifications);
    if (dest) result.movement_orders[brigade.id] = dest;
    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// VRS Brigade AI — "Strategic Dominance"
// ═══════════════════════════════════════════════════════════════════════════

const VRS_CORRIDOR_PATTERNS = ['brcko', 'bijeljina', 'bosanski_samac', 'modrica', 'derventa', 'bosanska_gradiska', 'doboj', 'bosanski_brod'];
const VRS_DRINA_PATTERNS = ['zvornik', 'bratunac', 'srebrenica', 'vlasenica', 'sekovici', 'visegrad', 'foca', 'gorazde'];
const VRS_SARAJEVO_PATTERNS = ['pale', 'sokolac', 'ilidza', 'hadzici', 'vogosca', 'ilijas'];

function scoreTargetVRS(
    osid: Osid,
    prediction: CombatPrediction,
    turn: number,
    graphAnalysis: FactionGraphAnalysis
): number {
    let score = OUTCOME_SCORE[prediction.predicted_outcome] ?? 0;

    // Corridor bonus — existential
    if (osidMatchesAny(osid, VRS_CORRIDOR_PATTERNS)) score += 200;
    // Drina bonus (early war only)
    if (turn < 26 && osidMatchesAny(osid, VRS_DRINA_PATTERNS)) score += 150;
    // Sarajevo siege ring
    if (osidMatchesAny(osid, VRS_SARAJEVO_PATTERNS)) score += 120;
    // Undefended
    if (!prediction.defender_has_brigade) score += 100;
    // Counter-attack (entrenchment=0)
    if (prediction.is_counter_attack_opportunity) score += 180;
    // Weak defender
    if (prediction.defender_has_brigade && (prediction.defender_cohesion < 30 || prediction.defender_casualty_percent > 0.15)) score += 80;
    // Civilian weight from analysis
    const targetAnalysis = graphAnalysis.osid_analysis.get(osid);
    if (targetAnalysis) score += Math.floor(targetAnalysis.civilian_weight / 100);

    // Penalties
    if (prediction.overextension_risk >= 3) score -= 150;
    // Tuned: entrenchment penalty 15→5. Combat formula already accounts for entrenchment
    // in power ratio (defender gets entrenchment bonus). Score penalty was double-counting,
    // causing ALL attacks against entrenched positions to be rejected after week ~10.
    // Historical: VRS attacked entrenched positions throughout the war (Sarajevo, Gorazde, Bihac).
    score -= Math.floor(prediction.defender_entrenchment * 5);
    // Tuned: casualty tolerance 10%→20%, penalty 200→150 (VRS accepted heavy losses in early offensives)
    if (prediction.attacker_casualty_percent > 0.20) score -= 150;

    // Time-based personality modifier
    if (turn < 26) score = Math.floor(score * 1.3);
    else if (turn > 52) score = Math.floor(score * 0.7);

    return score;
}

function generateVRSOrders(
    state: GameState,
    brigades: FormationState[],
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainCache: Record<string, number>,
    enemyZoc: Set<Osid>,
    graphAnalysis: FactionGraphAnalysis,
    turn: number
): OsidBotOrdersResult {
    const result: OsidBotOrdersResult = { posture_orders: [], attack_orders: {}, movement_orders: {}, column_march_orders: {} };
    // Tuned: Map tracks count per target, allows up to 2 brigades per OSID (corps-level concentration).
    // Attack resolution already has coordination penalty (0.9 for 2 brigades).
    const chosenTargets = new Map<Osid, number>();
    const standingOrder = getActiveStandingOrder('RS', turn);
    const isOffensivePhase = standingOrder?.army_stance === 'general_offensive';
    const isDefensivePhase = standingOrder?.army_stance === 'general_defensive';

    for (const brigade of brigades) {
        const loc = brigade.location_osid!;
        const corpsStance = getCorpsStance(state, brigade);
        const isLocked = isBrigadeInEnemyZoc(state, brigade.id, enemyZoc);
        const adjEnemy = getAdjacentEnemyOsids(loc, 'RS', adjacency, state, reverseMap);
        const osidAnalysis = graphAnalysis.osid_analysis.get(loc) ?? null;

        // Rule 1: ZoC-locked → retreat or attack ZoC source
        if (isLocked) {
            const retreatDests = getValidRetreatDestinations(state, brigade.id, adjacency, reverseMap, enemyZoc);
            if (retreatDests.length > 0) {
                result.movement_orders[brigade.id] = retreatDests[0]!;
            } else if (adjEnemy.length > 0) {
                // Must attack ZoC source
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = adjEnemy[0]!;
            }
            continue;
        }

        // Rule 2: Corridor defense — DEFEND only if classification is critical or threatened.
        // Tuned: VRS corridor brigades still attacked (e.g., Corridor 92 operation).
        // Brigades on 'active' or 'quiet' corridor OSIDs should evaluate attacks.
        if (osidAnalysis?.is_chokepoint || osidMatchesAny(loc, VRS_CORRIDOR_PATTERNS)) {
            if (osidAnalysis && osidAnalysis.civilian_weight > 10000 &&
                (osidAnalysis.classification === 'critical' || osidAnalysis.classification === 'threatened')) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                continue;
            }
        }

        // Rule 5: Defensive phase → DEFEND
        if (isDefensivePhase || corpsStance === 'defensive' || corpsStance === 'reorganize') {
            // Exception: counter-attack if enemy entrenchment=0 nearby
            if (adjEnemy.length > 0) {
                const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack');
                const counterAttack = targets.find(t => t.prediction.is_counter_attack_opportunity && t.prediction.predicted_outcome !== 'repulsed' && t.prediction.predicted_outcome !== 'catastrophic');
                if (counterAttack && (chosenTargets.get(counterAttack.osid) ?? 0) < 2) {
                    result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                    result.attack_orders[brigade.id] = counterAttack.osid;
                    chosenTargets.set(counterAttack.osid, (chosenTargets.get(counterAttack.osid) ?? 0) + 1);
                    continue;
                }
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }

        // Rule 3/4: Offensive or balanced — evaluate attacks
        if (adjEnemy.length > 0) {
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack');
            const scored = targets.map(t => ({
                ...t,
                finalScore: scoreTargetVRS(t.osid, t.prediction, turn, graphAnalysis)
            })).sort((a, b) => {
                if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
                return strictCompare(a.osid, b.osid);
            });

            const isOffensiveCorps = corpsStance === 'offensive' || isOffensivePhase;
            // Tuned: stalemate for ALL stances. VRS attacked at unfavorable odds throughout the war
            // (Sarajevo siege, Gorazde, Bihac). The score function already penalizes bad decisions
            // (overextension, casualties, entrenchment). The combat formula handles casualty costs.
            // Outcome threshold just gates obvious suicide attacks (repulsed/catastrophic).
            const minOutcome: PredictedOutcome = 'stalemate';

            let bestTarget: typeof scored[0] | null = null;
            for (const s of scored) {
                if ((chosenTargets.get(s.osid) ?? 0) >= 2) continue;
                if (s.finalScore <= 0) continue;

                // Outcome threshold check
                const outcomeOk = isOutcomeSufficientForAttack(s.prediction.predicted_outcome, minOutcome);
                // Counter-attack exception: always allowed if >= costly_victory
                const isCounter = s.prediction.is_counter_attack_opportunity;

                if (outcomeOk || (isCounter && isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'costly_victory'))) {
                    // Entrenchment already penalized in score (-15 per level) and combat formula
                    // (defender power multiplied by entrenchment). No hard gate — let score filter.
                    // Historical: VRS attacked entrenched positions throughout the war (Sarajevo, Gorazde).
                    bestTarget = s;
                    break;
                }
            }

            if (bestTarget) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = bestTarget.osid;
                chosenTargets.set(bestTarget.osid, (chosenTargets.get(bestTarget.osid) ?? 0) + 1);
            } else {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            }
        } else {
            // No enemy adjacent → column march or 1-hop move toward front
            issueInteriorMovement(brigade, loc, 'RS', adjacency, state, reverseMap, graphAnalysis, result, ['critical', 'threatened', 'undefended']);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARBiH Brigade AI — "Survival and Attrition"
// ═══════════════════════════════════════════════════════════════════════════

const ARBIH_SARAJEVO_PATTERNS = ['centar_sarajevo', 'novo_sarajevo', 'stari_grad', 'novi_grad_sarajevo'];
const ARBIH_ENCLAVE_PATTERNS = ['gorazde', 'srebrenica', 'zepa', 'bihac', 'cazin', 'velika_kladusa'];

function scoreTargetARBiH(
    osid: Osid,
    prediction: CombatPrediction,
    turn: number,
    graphAnalysis: FactionGraphAnalysis
): number {
    let score = OUTCOME_SCORE[prediction.predicted_outcome] ?? 0;

    // Counter-attack — ARBiH's best opportunities
    if (prediction.is_counter_attack_opportunity) score += 200;
    // Weak defender
    if (prediction.defender_disrupted || prediction.defender_cohesion < 25) score += 120;
    // Enclave relief — connects to isolated friendly territory
    // (simplified: bonus for targets near enclaves)
    if (osidMatchesAny(osid, ARBIH_ENCLAVE_PATTERNS)) score += 180;
    // Corridor opening
    if (osidMatchesAny(osid, ['zenica', 'travnik', 'kakanj', 'visoko'])) score += 160;
    // Civilian weight (ARBiH weights 1.5×)
    const targetAnalysis = graphAnalysis.osid_analysis.get(osid);
    if (targetAnalysis) score += Math.floor(targetAnalysis.civilian_weight * 1.5 / 50);
    // Siege break (late war only)
    if (turn > 60 && osidMatchesAny(osid, ['ilidza', 'hadzici', 'vogosca', 'ilijas'])) score += 150;

    // Penalties — ARBiH is MORE casualty-averse
    if (prediction.predicted_outcome === 'repulsed' || prediction.predicted_outcome === 'catastrophic') score -= 250;
    if (prediction.overextension_risk >= 3) score -= 200;
    // Tuned: 8%→15%, penalty 300→200 (base attacker rate 4%, costly_victory → 7.2%; old threshold rejected nearly all)
    if (prediction.attacker_casualty_percent > 0.15) score -= 200;
    if (prediction.overextension_risk >= 2) score -= 100; // Avoid salients

    // Time-based personality
    // Tuned: ARBiH fought from day one (1st Corps defended Sarajevo, 2nd Corps around Tuzla).
    // 0.6× lets counter-attacks and high-value defenses through early war.
    // Historical: ARBiH was disorganized but actively fighting from April 1992.
    if (turn < 12) score = Math.floor(score * 0.6);
    else if (turn < 40) score = Math.floor(score * 0.9);
    else if (turn >= 40 && turn < 80) score = Math.floor(score * 1.2); // Stretch the front
    else score = Math.floor(score * 1.1);

    return score;
}

function generateARBiHOrders(
    state: GameState,
    brigades: FormationState[],
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainCache: Record<string, number>,
    enemyZoc: Set<Osid>,
    graphAnalysis: FactionGraphAnalysis,
    turn: number
): OsidBotOrdersResult {
    const result: OsidBotOrdersResult = { posture_orders: [], attack_orders: {}, movement_orders: {}, column_march_orders: {} };
    // Tuned: Map tracks count per target, allows up to 2 brigades per OSID.
    const chosenTargets = new Map<Osid, number>();
    const standingOrder = getActiveStandingOrder('RBiH', turn);
    const isStretchPhase = turn >= 40 && turn < 80;

    for (const brigade of brigades) {
        const loc = brigade.location_osid!;
        const corpsStance = getCorpsStance(state, brigade);
        const isLocked = isBrigadeInEnemyZoc(state, brigade.id, enemyZoc);
        const adjEnemy = getAdjacentEnemyOsids(loc, 'RBiH', adjacency, state, reverseMap);
        const osidAnalysis = graphAnalysis.osid_analysis.get(loc) ?? null;

        // Rule 1: ZoC-locked → prefer retreat (ARBiH preserves force)
        if (isLocked) {
            const retreatDests = getValidRetreatDestinations(state, brigade.id, adjacency, reverseMap, enemyZoc);
            if (retreatDests.length > 0) {
                result.movement_orders[brigade.id] = retreatDests[0]!;
            } else if (adjEnemy.length > 0) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = adjEnemy[0]!;
            }
            continue;
        }

        // Rule 2: Sarajevo core → DEFEND always
        if (osidMatchesAny(loc, ARBIH_SARAJEVO_PATTERNS)) {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }

        // Rule 3: Enclave → DEFEND
        if (osidMatchesAny(loc, ARBIH_ENCLAVE_PATTERNS)) {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }

        // Rule 4: Survival phase (week < 12) — no hard block.
        // Tuned: ARBiH fought from week 1. The 0.3× score multiplier in scoreTargetARBiH
        // ensures only high-value counter-attacks and desperate defenses get through.
        // Brigades proceed to attack evaluation below.

        // Rule 5: Corps defensive → DEFEND
        if (corpsStance === 'defensive' || corpsStance === 'reorganize') {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }

        // Rule 6: Stretch the Front (weeks 40–80) — probe everything
        if (isStretchPhase && adjEnemy.length > 0) {
            const personnel = brigade.personnel ?? 0;
            // Exception: critically understrength brigades still defend
            // Tuned: 400→200. ARBiH fought with severely understrength units throughout the war.
            if (personnel < 200) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                continue;
            }

            // Check if this is a defensive priority zone — don't probe from here
            if (osidAnalysis && (osidAnalysis.classification === 'critical' || osidAnalysis.is_chokepoint)) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                continue;
            }

            // Probe the best adjacent target
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'probe');
            const scored = targets.map(t => ({
                ...t,
                finalScore: scoreTargetARBiH(t.osid, t.prediction, turn, graphAnalysis)
            })).sort((a, b) => b.finalScore - a.finalScore || strictCompare(a.osid, b.osid));

            const best = scored.find(s => (chosenTargets.get(s.osid) ?? 0) < 2 && s.finalScore > 0);
            if (best) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'probe' });
                result.attack_orders[brigade.id] = best.osid;
                chosenTargets.set(best.osid, (chosenTargets.get(best.osid) ?? 0) + 1);
            } else {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            }
            continue;
        }

        // Rule 7: Balanced/offensive corps — selective attacks
        if (adjEnemy.length > 0 && (corpsStance === 'balanced' || corpsStance === 'offensive')) {
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack');
            const scored = targets.map(t => ({
                ...t,
                finalScore: scoreTargetARBiH(t.osid, t.prediction, turn, graphAnalysis)
            })).sort((a, b) => b.finalScore - a.finalScore || strictCompare(a.osid, b.osid));

            let bestTarget: typeof scored[0] | null = null;
            for (const s of scored) {
                if ((chosenTargets.get(s.osid) ?? 0) >= 2) continue;
                if (s.finalScore <= 0) continue;

                // Counter-attack: always if >= stalemate (ARBiH counter-attacked even at poor odds)
                if (s.prediction.is_counter_attack_opportunity && isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'stalemate')) {
                    bestTarget = s;
                    break;
                }
                // Regular attack: need 'stalemate' or better.
                // Tuned: costly_victory→stalemate. ARBiH launched attacks at unfavorable odds
                // (enclave breakouts, corridor operations, Sarajevo defense). Score function
                // already penalizes bad outcomes (-250 for repulsed/catastrophic). The combat
                // formula handles actual casualty costs.
                if (isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'stalemate')) {
                    bestTarget = s;
                    break;
                }
            }

            if (bestTarget) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = bestTarget.osid;
                chosenTargets.set(bestTarget.osid, (chosenTargets.get(bestTarget.osid) ?? 0) + 1);
            } else {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            }
        } else if (adjEnemy.length === 0) {
            // No enemy adjacent → column march or 1-hop move toward front
            issueInteriorMovement(brigade, loc, 'RBiH', adjacency, state, reverseMap, graphAnalysis, result, ['critical', 'undefended']);
        } else {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// HVO Brigade AI — "Opportunist and Survivor"
// ═══════════════════════════════════════════════════════════════════════════

const HVO_HERZEGOVINA_PATTERNS = ['mostar', 'siroki_brijeg', 'citluk', 'capljina', 'stolac', 'neum', 'ljubuski', 'grude', 'posusje', 'livno', 'tomislavgrad'];
const HVO_LASVA_PATTERNS = ['vitez', 'busovaca', 'kiseljak', 'novi_travnik', 'zepce', 'usora'];

function scoreTargetHVO(
    osid: Osid,
    prediction: CombatPrediction,
    turn: number,
    graphAnalysis: FactionGraphAnalysis,
    isBilateralWar: boolean
): number {
    let score = OUTCOME_SCORE[prediction.predicted_outcome] ?? 0;

    // Pocket connection — highest HVO priority
    // (simplified: bonus for Lasva targets during bilateral war)
    if (isBilateralWar && osidMatchesAny(osid, HVO_LASVA_PATTERNS)) score += 200;
    // Counter-attack
    if (prediction.is_counter_attack_opportunity) score += 150;
    // Mostar control (during bilateral war)
    if (isBilateralWar && osidContains(osid, 'mostar')) score += 180;
    // Civilian weight (×1.2 for HRHB)
    const targetAnalysis = graphAnalysis.osid_analysis.get(osid);
    if (targetAnalysis) score += Math.floor(targetAnalysis.civilian_weight * 1.2 / 80);

    // Penalties — HVO is MOST casualty-averse
    // Tuned: 8%→15%, penalty 350→200 (base attacker rate 4%, costly_victory → 7.2%)
    if (prediction.attacker_casualty_percent > 0.15) score -= 200;
    if (prediction.overextension_risk >= 3) score -= 250;
    if (prediction.overextension_risk >= 2) score -= 100;

    // Time-based personality
    if (turn < 12) score = Math.floor(score * 0.8);
    else if (turn >= 12 && turn < 26 && isBilateralWar) score = Math.floor(score * 1.4);
    // Tuned: 0.6→0.8. Post-Washington, HVO fought RS alongside RBiH. Standing order is now
    // balanced (not defensive), so 0.8× allows counter-attacks and opportunistic probes vs RS.
    else if (turn >= 26) score = Math.floor(score * 0.8); // Post-Washington

    return score;
}

function generateHVOOrders(
    state: GameState,
    brigades: FormationState[],
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainCache: Record<string, number>,
    enemyZoc: Set<Osid>,
    graphAnalysis: FactionGraphAnalysis,
    turn: number
): OsidBotOrdersResult {
    const result: OsidBotOrdersResult = { posture_orders: [], attack_orders: {}, movement_orders: {}, column_march_orders: {} };
    // Tuned: Map tracks count per target, allows up to 2 brigades per OSID.
    const chosenTargets = new Map<Osid, number>();
    const standingOrder = getActiveStandingOrder('HRHB', turn);
    const isDefensivePhase = standingOrder?.army_stance === 'general_defensive';

    // Alliance check: is HRHB at war with RBiH?
    const isAlliedWithRBiH = areRbihHrhbAllied(state);
    const isBilateralWar = !isAlliedWithRBiH;

    for (const brigade of brigades) {
        const loc = brigade.location_osid!;
        const corpsStance = getCorpsStance(state, brigade);
        const isLocked = isBrigadeInEnemyZoc(state, brigade.id, enemyZoc);
        const adjEnemy = getAdjacentEnemyOsids(loc, 'HRHB', adjacency, state, reverseMap);
        const osidAnalysis = graphAnalysis.osid_analysis.get(loc) ?? null;

        // Rule 1: ZoC-locked → retreat (HVO is too small to sacrifice)
        if (isLocked) {
            const retreatDests = getValidRetreatDestinations(state, brigade.id, adjacency, reverseMap, enemyZoc);
            if (retreatDests.length > 0) {
                result.movement_orders[brigade.id] = retreatDests[0]!;
            } else if (adjEnemy.length > 0) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = adjEnemy[0]!;
            }
            continue;
        }

        // Rule 2: Herzegovina core → DEFEND always
        if (osidMatchesAny(loc, HVO_HERZEGOVINA_PATTERNS)) {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }

        // Rule 3: Alliance respect — don't attack RBiH when allied
        if (isAlliedWithRBiH) {
            // Filter out RBiH-controlled targets
            const filteredEnemy = adjEnemy.filter(osid => {
                const c = getPoliticalControllerOSID(state, osid, reverseMap);
                return c !== 'RBiH';
            });
            if (filteredEnemy.length === 0 && adjEnemy.length > 0) {
                // Only RBiH neighbors — defend
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                continue;
            }
        }

        // Rule 7: Defensive corps/phase → DEFEND
        if (isDefensivePhase || corpsStance === 'defensive' || corpsStance === 'reorganize') {
            // Counter-attack exception
            if (adjEnemy.length > 0) {
                const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack');
                const counterAttack = targets.find(t => {
                    if (isAlliedWithRBiH) {
                        const c = getPoliticalControllerOSID(state, t.osid, reverseMap);
                        if (c === 'RBiH') return false;
                    }
                    return t.prediction.is_counter_attack_opportunity && isOutcomeSufficientForAttack(t.prediction.predicted_outcome, 'costly_victory');
                });
                if (counterAttack && (chosenTargets.get(counterAttack.osid) ?? 0) < 2) {
                    result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                    result.attack_orders[brigade.id] = counterAttack.osid;
                    chosenTargets.set(counterAttack.osid, (chosenTargets.get(counterAttack.osid) ?? 0) + 1);
                    continue;
                }
            }
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            continue;
        }

        // Rule 4/5: Bilateral war + offensive — Lasva Valley campaign
        if (isBilateralWar && turn >= 12 && turn < 26 && corpsStance === 'offensive' && adjEnemy.length > 0) {
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack');
            const scored = targets
                .filter(t => {
                    // Only attack RBiH during bilateral war
                    const c = getPoliticalControllerOSID(state, t.osid, reverseMap);
                    return c === 'RBiH' || c === 'RS';
                })
                .map(t => ({
                    ...t,
                    finalScore: scoreTargetHVO(t.osid, t.prediction, turn, graphAnalysis, isBilateralWar)
                }))
                .sort((a, b) => b.finalScore - a.finalScore || strictCompare(a.osid, b.osid));

            const best = scored.find(s => (chosenTargets.get(s.osid) ?? 0) < 2 && s.finalScore > 0 && isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'stalemate'));
            if (best) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = best.osid;
                chosenTargets.set(best.osid, (chosenTargets.get(best.osid) ?? 0) + 1);
            } else {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            }
            continue;
        }

        // Rule 5/6: Balanced — counter-attacks and opportunistic attacks
        if (adjEnemy.length > 0) {
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack');
            const scored = targets
                .filter(t => {
                    if (isAlliedWithRBiH) {
                        const c = getPoliticalControllerOSID(state, t.osid, reverseMap);
                        if (c === 'RBiH') return false;
                    }
                    return true;
                })
                .map(t => ({
                    ...t,
                    finalScore: scoreTargetHVO(t.osid, t.prediction, turn, graphAnalysis, isBilateralWar)
                }))
                .sort((a, b) => b.finalScore - a.finalScore || strictCompare(a.osid, b.osid));

            const best = scored.find(s => {
                if ((chosenTargets.get(s.osid) ?? 0) >= 2) return false;
                if (s.finalScore <= 0) return false;
                // Counter-attacks: stalemate minimum (HVO counter-attacked even at unfavorable odds)
                if (s.prediction.is_counter_attack_opportunity) return isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'stalemate');
                // Regular attacks: stalemate minimum. Score function penalizes bad decisions.
                return isOutcomeSufficientForAttack(s.prediction.predicted_outcome, 'stalemate');
            });

            if (best) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = best.osid;
                chosenTargets.set(best.osid, (chosenTargets.get(best.osid) ?? 0) + 1);
            } else {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            }
        } else {
            // No enemy adjacent → column march or 1-hop move toward front
            issueInteriorMovement(brigade, loc, 'HRHB', adjacency, state, reverseMap, graphAnalysis, result, ['critical', 'threatened', 'undefended']);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared utilities
// ═══════════════════════════════════════════════════════════════════════════

/** Outcome ranking for threshold comparison. */
const OUTCOME_RANK: Record<PredictedOutcome, number> = {
    decisive_victory: 6,
    victory: 5,
    costly_victory: 4,
    stalemate: 3,
    repulsed: 2,
    catastrophic: 1
};

function isOutcomeSufficientForAttack(actual: PredictedOutcome, minimum: PredictedOutcome): boolean {
    return (OUTCOME_RANK[actual] ?? 0) >= (OUTCOME_RANK[minimum] ?? 0);
}

function isPartOfNamedOperation(state: GameState, formation: FormationState): boolean {
    if (!formation.corps_id || !state.corps_command) return false;
    const op = state.corps_command[formation.corps_id]?.active_operation;
    if (!op) return false;
    return op.phase === 'execution' && op.participating_brigades.includes(formation.id);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main dispatcher
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Context needed for OSID bot decisions. Passed from the pipeline.
 */
export interface OsidBotContext {
    edges: EdgeRecord[];
    reverseMap: OperationalToCanonicalReverseMap;
    enemyZocByFaction: Map<FactionId, Set<Osid>>;
}

/**
 * Generate bot brigade orders for all bot factions using OSID-native faction AIs.
 *
 * Produces: posture orders, attack orders, movement orders.
 * Writes directly into state.brigade_posture_orders, state.brigade_attack_orders.
 *
 * Deterministic: faction processing in sorted order, brigades sorted by ID.
 */
export function generateAllBotOrdersOsid(
    state: GameState,
    botFactions: FactionId[],
    ctx: OsidBotContext
): void {
    const adjacency = buildOsidAdjacency(ctx.edges);
    const terrainCache = buildTerrainCache(ctx.reverseMap);
    const turn = state.meta?.turn ?? 0;
    const sortedFactions = [...botFactions].sort(strictCompare);

    const allAttackOrders: Record<FormationId, Osid> = {};
    const allPostureOrders: Array<{ brigade_id: FormationId; posture: BrigadePosture }> = [];
    const allMovementOrders: Record<FormationId, Osid> = {};
    const allColumnMarchOrders: Record<FormationId, Osid> = {};
    for (const faction of sortedFactions) {
        const brigades = getFactionBrigades(state, faction);
        if (brigades.length === 0) continue;

        const enemyZoc = ctx.enemyZocByFaction.get(faction) ?? new Set<Osid>();
        const graphAnalysis = analyzeFactionGraph(state, faction, adjacency, ctx.reverseMap);

        let orders: OsidBotOrdersResult;
        switch (faction) {
            case 'RS':
                orders = generateVRSOrders(state, brigades, adjacency, ctx.reverseMap, terrainCache, enemyZoc, graphAnalysis, turn);
                break;
            case 'RBiH':
                orders = generateARBiHOrders(state, brigades, adjacency, ctx.reverseMap, terrainCache, enemyZoc, graphAnalysis, turn);
                break;
            case 'HRHB':
                orders = generateHVOOrders(state, brigades, adjacency, ctx.reverseMap, terrainCache, enemyZoc, graphAnalysis, turn);
                break;
            default:
                continue;
        }

        allPostureOrders.push(...orders.posture_orders);
        for (const [bid, target] of Object.entries(orders.attack_orders)) {
            allAttackOrders[bid as FormationId] = target;
        }
        for (const [bid, dest] of Object.entries(orders.movement_orders)) {
            allMovementOrders[bid as FormationId] = dest;
        }
        for (const [bid, dest] of Object.entries(orders.column_march_orders)) {
            allColumnMarchOrders[bid as FormationId] = dest;
        }
    }

    // Write posture orders to state
    if (!state.brigade_posture_orders) state.brigade_posture_orders = [];
    state.brigade_posture_orders.push(...allPostureOrders);

    // Write attack orders to state (target = OSID for OSID attack resolution)
    if (Object.keys(allAttackOrders).length > 0) {
        if (!state.brigade_attack_orders) state.brigade_attack_orders = {};
        for (const [bid, target] of Object.entries(allAttackOrders)) {
            state.brigade_attack_orders[bid] = target;
        }
    }

    // Write movement orders to state.
    // In OSID regime, movement is one-hop-per-turn. Orders written here are consumed
    // by applyZocConstrainedMovement() on the NEXT turn (order → execute cycle).
    // That step validates adjacency, ZoC, and updates location_osid + entrenchment.
    if (Object.keys(allMovementOrders).length > 0) {
        if (!state.brigade_movement_orders) state.brigade_movement_orders = {};
        for (const [bid, dest] of Object.entries(allMovementOrders)) {
            const f = state.formations?.[bid];
            if (f) {
                (state.brigade_movement_orders as Record<string, { destination_sids: string[] }>)[bid] = {
                    destination_sids: [dest]
                };
            }
        }
    }

    // Write column march orders to state (multi-turn transit for deep interior brigades).
    // These have stance: 'column' and are consumed by processOsidColumnMovement() on the
    // NEXT turn. The column movement step computes Dijkstra path and sets in_transit state.
    if (Object.keys(allColumnMarchOrders).length > 0) {
        if (!state.brigade_movement_orders) state.brigade_movement_orders = {};
        for (const [bid, dest] of Object.entries(allColumnMarchOrders)) {
            const f = state.formations?.[bid];
            if (f) {
                (state.brigade_movement_orders as Record<string, { destination_sids: string[]; stance?: string }>)[bid] = {
                    destination_sids: [dest],
                    stance: 'column'
                };
            }
        }
    }
}
