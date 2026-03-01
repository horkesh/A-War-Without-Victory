/**
 * Bot AI for corps-level decisions: stance selection, named operations,
 * operational group activation, and corridor breach detection.
 *
 * Sits above bot_brigade_ai_osid.ts in the decision hierarchy.
 * Corps stance flows down to modulate brigade posture decisions.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import type {
    CorpsOperation,
    CorpsStance,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    OGActivationOrder,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    FACTION_ARMY_PRIORITIES,
    FACTION_STRATEGIES,
    getActiveDoctrinePhase,
    getActiveStandingOrder,
    getCorpsArmyPriorities,
    isCorridorMunicipality,
} from './bot_strategy.js';
import {
    BRIGADE_LOSS_THRESHOLD,
    COHESION_HEALTHY_THRESHOLD,
    COHESION_REORGANIZE_THRESHOLD,
    CORRIDOR_BREACH_MAX_STRIP_WIDTH,
    EMERGENCY_THREAT_THRESHOLD,
    EXECUTION_MAX_DURATION,
    MAX_EXHAUSTION_FOR_OPERATION,
    MIN_BRIGADES_FOR_OPERATION,
    OG_DEFAULT_DURATION,
    OG_MAX_CONTRIBUTION_PER_DONOR,
    OG_MIN_DONOR_RESIDUAL,
    PERSONNEL_HEALTHY_THRESHOLD,
    PERSONNEL_REORGANIZE_THRESHOLD,
    PLANNING_DURATION,
    PROGRESS_FAILURE_THRESHOLD,
    PROGRESS_SUCCESS_THRESHOLD,
    RECOVERY_DURATION,
    RS_EARLY_WAR_END_WEEK,
    THREAT_DEFENSIVE_THRESHOLD,
    THREAT_OFFENSIVE_THRESHOLD,
} from './bot_constants.js';
import { buildAdjacencyFromEdges } from './phase_ii_adjacency.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { analyzeFactionGraph, type FactionGraphAnalysis } from './osid_graph_analysis.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { CorpsDirective } from '../../state/game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import { evaluateSectorOffensiveLaunch } from './sector_offensive.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Assess supply health of a corps by checking supply state of subordinate brigades. */
function assessCorpsSupplyHealth(
    subordinates: FormationState[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null
): { adequate_fraction: number; strained_fraction: number; critical_fraction: number } {
    if (!supplyByOsid?.factions || subordinates.length === 0) {
        return { adequate_fraction: 1, strained_fraction: 0, critical_fraction: 0 };
    }
    const fac = supplyByOsid.factions.find(f => f.faction_id === faction);
    if (!fac?.by_osid) return { adequate_fraction: 1, strained_fraction: 0, critical_fraction: 0 };

    const osidState = new Map<string, SupplyStateLevel>();
    for (const e of fac.by_osid) osidState.set(e.osid, e.state);

    let adequate = 0, strained = 0, critical = 0;
    for (const b of subordinates) {
        const st = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
        switch (st) {
            case 'adequate': adequate++; break;
            case 'strained': strained++; break;
            case 'critical': critical++; break;
        }
    }
    const total = subordinates.length;
    return {
        adequate_fraction: adequate / total,
        strained_fraction: strained / total,
        critical_fraction: critical / total,
    };
}

/** Get all active corps for a faction, sorted by ID.
 *  Checks both state.formations (for corps with kind==='corps') AND
 *  state.corps_command keys (for corps that only exist as references
 *  from brigade corps_id — common when corps formations aren't loaded).
 */
function getFactionCorps(state: GameState, faction: FactionId): FormationState[] {
    const formations = state.formations ?? {};
    const result: FormationState[] = [];
    const seenIds = new Set<string>();

    // 1. Real corps formations in state.formations
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'corps') continue;
        result.push(f);
        seenIds.add(id);
    }

    // 2. Corps that exist only in corps_command (discovered from brigade corps_id refs)
    if (state.corps_command) {
        for (const cid of Object.keys(state.corps_command).sort(strictCompare)) {
            if (seenIds.has(cid)) continue;

            // Determine faction from subordinate brigades
            const subs = getCorpsSubordinates(state, cid);
            if (subs.length === 0) continue;
            if (subs[0].faction !== faction) continue;

            // Derive home municipality tag from most common subordinate location
            const munCounts = new Map<string, number>();
            for (const b of subs) {
                const osid = b.location_osid;
                if (!osid) continue;
                // Extract municipality from OSID: "op:municipality:slug" -> "municipality"
                const parts = osid.split(':');
                if (parts.length >= 2) {
                    const mun = parts[1];
                    munCounts.set(mun, (munCounts.get(mun) ?? 0) + 1);
                }
            }
            let homeMun: string | null = null;
            let maxCount = 0;
            for (const [mun, count] of [...munCounts.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
                if (count > maxCount) { maxCount = count; homeMun = mun; }
            }

            const tags: string[] = [];
            if (homeMun) tags.push(`mun:${homeMun}`);

            // Synthesize a minimal FormationState
            result.push({
                id: cid,
                faction,
                kind: 'corps',
                status: 'active',
                tags,
            } as FormationState);
            seenIds.add(cid);
        }
    }

    return result;
}

/** Get active brigades subordinate to a given corps. */
function getCorpsSubordinates(state: GameState, corpsId: FormationId): FormationState[] {
    const formations = state.formations ?? {};
    const result: FormationState[] = [];
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.status !== 'active') continue;
        if ((f.kind ?? 'brigade') !== 'brigade') continue;
        if (f.corps_id !== corpsId) continue;
        result.push(f);
    }
    return result;
}

/** Compute average personnel fraction for a set of brigades. */
function averagePersonnelFraction(brigades: FormationState[]): number {
    if (brigades.length === 0) return 0;
    let sum = 0;
    for (const b of brigades) sum += (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
    return sum / brigades.length;
}

/** Compute average cohesion for a set of brigades. */
function averageCohesion(brigades: FormationState[]): number {
    if (brigades.length === 0) return 0;
    let sum = 0;
    for (const b of brigades) sum += b.cohesion ?? 60;
    return sum / brigades.length;
}

/** Count how many brigades are "healthy" (personnel > 70%, cohesion > 50). */
function countHealthyBrigades(brigades: FormationState[]): number {
    let count = 0;
    for (const b of brigades) {
        const persFrac = (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
        const coh = b.cohesion ?? 60;
        if (persFrac >= PERSONNEL_HEALTHY_THRESHOLD && coh >= COHESION_HEALTHY_THRESHOLD) count++;
    }
    return count;
}

/** Sort brigades by personnel descending, then by ID for deterministic tie-breaking. */
function sortByPersonnelDesc(brigades: FormationState[]): FormationState[] {
    return [...brigades].sort((a, b) => {
        const pDiff = (b.personnel ?? 0) - (a.personnel ?? 0);
        if (pDiff !== 0) return pDiff;
        return strictCompare(a.id, b.id);
    });
}

/** Get the home municipality of a corps (from tags or home_mun). */
function getCorpsHomeMun(corps: FormationState): string | null {
    if (!corps.tags) return null;
    for (const tag of corps.tags) {
        if (tag.startsWith('mun:')) return tag.slice(4);
    }
    return null;
}

/** Compute a simple sector threat ratio for a corps' area.
 *  Uses OSID-based brigade locations instead of legacy AoR.
 *  Counts enemies at corps positions AND adjacent OSIDs (the actual threat). */
function computeSectorThreat(
    state: GameState,
    subordinates: FormationState[],
    edges: EdgeRecord[]
): number {
    if (subordinates.length === 0) return 1.0;
    const faction = subordinates[0]?.faction;
    if (!faction) return 1.0;

    // Collect OSIDs where this corps' brigades are stationed
    const corpsOsids = new Set<string>();
    for (const b of subordinates) {
        if (b.location_osid) corpsOsids.add(b.location_osid);
    }
    if (corpsOsids.size === 0) return 1.0;

    // Expand to include adjacent OSIDs — enemies there are the actual threat
    const adjacency = buildOsidAdjacency(edges);
    const threatZone = new Set<string>(corpsOsids);
    for (const osid of corpsOsids) {
        const neighbors = adjacency.get(osid);
        if (neighbors) {
            for (const n of neighbors) threatZone.add(n);
        }
    }

    // Count friendly vs enemy personnel
    // Friendly: only at corps positions. Enemy: anywhere in threat zone.
    const formations = state.formations ?? {};
    let ourPersonnel = 0;
    let enemyPersonnel = 0;
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (f.status !== 'active' || !f.location_osid) continue;
        if (f.faction === faction) {
            if (corpsOsids.has(f.location_osid)) {
                ourPersonnel += f.personnel ?? 0;
            }
        } else {
            if (threatZone.has(f.location_osid)) {
                enemyPersonnel += f.personnel ?? 0;
            }
        }
    }

    if (ourPersonnel <= 0) return enemyPersonnel > 0 ? 2.0 : 1.0;
    return enemyPersonnel / ourPersonnel;
}

// ═══════════════════════════════════════════════════════════════════════════
// Corps Stance Selection (B1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate corps stance orders for a faction.
 * Writes stance directly to state.corps_command.
 * Deterministic: sorted corps iteration, no randomness.
 */
export function generateCorpsStanceOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const strategy = FACTION_STRATEGIES[faction];

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length === 0) continue;

        const avgPers = averagePersonnelFraction(subordinates);
        const avgCoh = averageCohesion(subordinates);
        const sectorThreat = computeSectorThreat(state, subordinates, edges);
        const corpsHomeMun = getCorpsHomeMun(corps);

        let stance: CorpsStance = 'balanced';

        // Decision matrix
        // Reorganize only when BOTH cohesion and personnel are critically low.
        // Low personnel alone doesn't trigger reorganize — many brigades have
        // designed strengths well below MAX_BRIGADE_PERSONNEL (e.g. light infantry 1000/3000).
        if (avgCoh < COHESION_REORGANIZE_THRESHOLD && avgPers < PERSONNEL_REORGANIZE_THRESHOLD) {
            stance = 'reorganize';
        } else if (sectorThreat > THREAT_DEFENSIVE_THRESHOLD) {
            stance = 'defensive';
        } else if (
            sectorThreat < THREAT_OFFENSIVE_THRESHOLD &&
            avgCoh >= COHESION_HEALTHY_THRESHOLD &&
            avgPers >= PERSONNEL_HEALTHY_THRESHOLD
        ) {
            stance = 'offensive';
        }

        // --- Doctrine phase influence (D3) ---
        const doctrinePhase = getActiveDoctrinePhase(faction, turn);
        if (doctrinePhase && stance === 'balanced') {
            // Doctrine provides a default bias when the situation is ambiguous
            stance = doctrinePhase.default_corps_stance;
        }

        // --- Faction-specific overrides (E1-E3 personality) ---

        if (faction === 'RS') {
            // E1: RS corridor corps: never below balanced (corridor is existential)
            if (isCorridorMunicipality(corpsHomeMun, 'RS') && (stance === 'reorganize' || stance === 'defensive')) {
                stance = 'balanced';
            }
            // E1: RS early-war aggression: prefer offensive in weeks 0–26 (PRIORITY_B handoff)
            if (turn < RS_EARLY_WAR_END_WEEK && stance === 'balanced' && avgPers >= 0.6 && avgCoh >= 40) {
                stance = 'offensive';
            }
            // E1: Sarajevo siege corps: maintain pressure but never assault core
            const SARAJEVO_SIEGE_MUNS = new Set(['pale', 'sokolac', 'trnovo']);
            if (corpsHomeMun && SARAJEVO_SIEGE_MUNS.has(corpsHomeMun)) {
                if (stance === 'reorganize') stance = 'balanced'; // Maintain siege pressure
            }
        } else if (faction === 'RBiH') {
            // E2: RBiH Sarajevo corps: always defensive
            const SARAJEVO_MUNS = new Set(['centar_sarajevo', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo']);
            if (corpsHomeMun && SARAJEVO_MUNS.has(corpsHomeMun)) {
                stance = 'defensive';
            }
            // E2: RBiH survival mode weeks 0-12: no offensive
            if (turn < 12 && stance === 'offensive') {
                stance = 'balanced';
            }
            // E2: RBiH late-war counteroffensive eligibility (week 40+)
            if (turn >= 40 && stance === 'balanced' && avgPers >= 0.6 && avgCoh >= 50) {
                // Check if faction controls enough territory for counteroffensive
                const pc = state.political_controllers ?? {};
                const totalSids = Object.keys(pc).length;
                const ownedSids = Object.values(pc).filter(f => f === 'RBiH').length;
                if (totalSids > 0 && ownedSids / totalSids >= 0.25) {
                    stance = 'offensive';
                }
            }
            // E2: RBiH bilateral war awareness
            const rhsRBiH = state.rbih_hrhb_state;
            if (rhsRBiH && !rhsRBiH.washington_signed) {
                const allianceVal = state.war_alliance_rbih_hrhb ?? 1.0;
                if (allianceVal < 0.0) {
                    // Open war with HRHB: central Bosnia corps balanced (defend mixed municipalities)
                    const CENTRAL_BOSNIA_MUNS = new Set(['travnik', 'bugojno', 'vitez', 'novi_travnik', 'busovaca', 'kiseljak', 'zenica']);
                    if (corpsHomeMun && CENTRAL_BOSNIA_MUNS.has(corpsHomeMun)) {
                        if (stance !== 'reorganize') stance = 'balanced';
                    }
                }
            }
        } else if (faction === 'HRHB') {
            // E3: HRHB Herzegovina corps: defensive (never give up heartland)
            const HERZEGOVINA_MUNS = new Set(strategy.corridor_municipalities);
            if (corpsHomeMun && HERZEGOVINA_MUNS.has(corpsHomeMun)) {
                if (stance === 'offensive' || stance === 'balanced') {
                    stance = 'defensive';
                }
            }
            // E3: Lasva Offensive window (weeks 12–26): non-Herzegovina corps at least balanced for more attack activity (NEXT_BOT_PRIORITY Candidate B)
            if (turn >= 12 && turn < 26 && !HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
                if ((stance === 'defensive' || stance === 'reorganize') && avgPers >= 0.4) {
                    stance = 'balanced';
                }
            }
            // E3: Alliance-sensitive — check RBiH-HRHB war state
            const rhs = state.rbih_hrhb_state;
            if (rhs && !rhs.washington_signed) {
                const allianceValue = state.war_alliance_rbih_hrhb ?? 1.0;
                if (allianceValue < 0.0) {
                    // Open war: central Bosnia corps go offensive, Herzegovina stays defensive
                    if (!HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
                        if (avgPers >= 0.5 && avgCoh >= 40) stance = 'offensive';
                    }
                } else if (allianceValue < 0.2) {
                    // Strained: central Bosnia corps at least balanced
                    if (!HERZEGOVINA_MUNS.has(corpsHomeMun ?? '')) {
                        if (stance === 'defensive' || stance === 'reorganize') {
                            if (avgPers >= 0.5) stance = 'balanced';
                        }
                    }
                }
            }
        }

        // --- Army stance ceiling ---
        // Army-level stance constrains corps: general_defensive → all corps at most defensive.
        // Prevents corps from independently going offensive/balanced when army says "hold everywhere."
        const armyStance = getActiveStandingOrder(faction, turn)?.army_stance ?? 'balanced';
        if (armyStance === 'general_defensive' && stance !== 'reorganize') {
            stance = 'defensive';
        }
        // general_offensive floor: don't let corps go reorganize (maintain offensive tempo)
        if (armyStance === 'general_offensive' && stance === 'reorganize' && avgCoh >= 20) {
            stance = 'defensive'; // at least defend, don't sit out the offensive
        }

        cmd.stance = stance;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Named Operations (B3)
// ═══════════════════════════════════════════════════════════════════════════

/** Faction-specific named operation catalog. */
interface OperationTemplate {
    name: string;
    type: CorpsOperation['type'];
    target_municipalities: string[];
}

function getOperationCatalog(faction: FactionId, state: GameState): OperationTemplate[] {
    switch (faction) {
        case 'RS': return [
            { name: 'Operation Corridor', type: 'sector_attack', target_municipalities: ['brcko', 'bosanski_samac', 'modrica', 'derventa'] },
            { name: 'Drina Sweep', type: 'general_offensive', target_municipalities: ['zvornik', 'bratunac', 'srebrenica', 'vlasenica'] },
            { name: 'Sarajevo Tightening', type: 'strategic_defense', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
            { name: 'Bihac Containment', type: 'sector_attack', target_municipalities: ['bihac', 'cazin', 'bosanska_krupa', 'bosanski_petrovac'] },
            { name: 'Krajina Consolidation', type: 'strategic_defense', target_municipalities: ['prijedor', 'banja_luka', 'sanski_most', 'kljuc'] },
        ];
        case 'RBiH': {
            const ops: OperationTemplate[] = [
                { name: 'Enclave Relief', type: 'sector_attack', target_municipalities: ['gorazde', 'srebrenica', 'zepa'] },
                { name: 'Sarajevo Breakout', type: 'general_offensive', target_municipalities: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
                { name: 'Central Corridor', type: 'sector_attack', target_municipalities: ['zenica', 'travnik', 'kakanj', 'visoko'] },
                { name: 'Tuzla Widening', type: 'sector_attack', target_municipalities: ['tuzla', 'kalesija', 'lukavac', 'zivinice'] },
                { name: 'Bihac Pocket Defense', type: 'strategic_defense', target_municipalities: ['bihac', 'cazin', 'velika_kladusa'] },
            ];
            const allianceValue = state.war_alliance_rbih_hrhb ?? 1.0;
            if (allianceValue < 0.0) {
                ops.push({ name: 'Central Bosnia Defense', type: 'strategic_defense', target_municipalities: ['travnik', 'bugojno', 'vitez', 'novi_travnik'] });
            }
            if (allianceValue < -0.30) {
                ops.push({ name: 'Mostar Counter', type: 'sector_attack', target_municipalities: ['mostar', 'stolac', 'capljina'] });
            }
            return ops;
        }
        case 'HRHB': {
            const ops: OperationTemplate[] = [
                { name: 'Lasva Valley', type: 'sector_attack', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik'] },
                { name: 'Mostar Consolidation', type: 'sector_attack', target_municipalities: ['mostar', 'stolac', 'capljina'] },
                { name: 'Herzegovina Shield', type: 'strategic_defense', target_municipalities: ['siroki_brijeg', 'citluk', 'ljubuski', 'grude'] },
                { name: 'Usora Pocket', type: 'sector_attack', target_municipalities: ['zepce', 'usora', 'maglaj'] },
                { name: 'Posavina Defense', type: 'strategic_defense', target_municipalities: ['orasje', 'odzak', 'bosanski_brod'] },
            ];
            // Bilateral operations only when at war with RBiH
            const allianceValue = state.war_alliance_rbih_hrhb ?? 1.0;
            if (allianceValue < 0.0) {
                ops.push({ name: 'Lasva Valley Offensive', type: 'sector_attack', target_municipalities: ['vitez', 'busovaca', 'kiseljak', 'novi_travnik'] });
                ops.push({ name: 'Mostar Division', type: 'sector_attack', target_municipalities: ['mostar', 'jablanica', 'konjic'] });
            }
            return ops;
        }
        default: return [];
    }
}

/**
 * Generate named operations for bot-controlled corps.
 * Only launches when: corps is offensive/balanced, no active op, enough healthy brigades.
 */
export function generateCorpsOperationOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political_controllers ?? {};
    const catalog = getOperationCatalog(faction, state);

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        // Skip if already has an active operation
        if (cmd.active_operation) continue;

        // Must be offensive or balanced
        if (cmd.stance !== 'offensive' && cmd.stance !== 'balanced') continue;

        // Must have low exhaustion
        if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        const healthyCount = countHealthyBrigades(subordinates);
        if (healthyCount < MIN_BRIGADES_FOR_OPERATION) continue;

        // Find best matching operation from catalog
        let bestTemplate: OperationTemplate | null = null;
        let bestRelevance = 0;

        for (const template of catalog) {
            // Relevance: how many target municipalities are adjacent to our AoR but enemy-controlled?
            let relevance = 0;
            for (const mun of template.target_municipalities) {
                // Count enemy-held settlements in this municipality
                const sids = Object.keys(pc).filter(sid => {
                    const m = sidToMun.get(sid);
                    return m === mun && pc[sid] !== faction;
                });
                relevance += sids.length;
            }
            if (relevance > bestRelevance) {
                bestRelevance = relevance;
                bestTemplate = template;
            }
        }

        if (!bestTemplate || bestRelevance === 0) continue;

        // Collect target settlements
        const targetSettlements: SettlementId[] = [];
        for (const mun of bestTemplate.target_municipalities) {
            for (const sid of Object.keys(pc).sort(strictCompare)) {
                const m = sidToMun.get(sid);
                if (m === mun && pc[sid] !== faction) {
                    targetSettlements.push(sid);
                }
            }
        }

        // Select participating brigades: top N healthy brigades by personnel
        const healthySorted = sortByPersonnelDesc(
            subordinates.filter(b => {
                const persFrac = (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL;
                const coh = b.cohesion ?? 60;
                return persFrac >= PERSONNEL_HEALTHY_THRESHOLD && coh >= COHESION_HEALTHY_THRESHOLD;
            })
        ).slice(0, 5);

        const operation: CorpsOperation = {
            name: bestTemplate.name,
            type: bestTemplate.type,
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            target_settlements: targetSettlements,
            participating_brigades: healthySorted.map(b => b.id)
        };

        cmd.active_operation = operation;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Operation Progress Evaluation (C3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate progress of active operations and advance/abort them.
 * Called each turn for active operations.
 */
export function evaluateOperationProgress(
    state: GameState,
    faction: FactionId
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political_controllers ?? {};
    const formations = state.formations ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;

        const turnsInPhase = turn - op.phase_started_turn;

        if (op.phase === 'planning') {
            // Advance to execution after planning duration
            if (turnsInPhase >= PLANNING_DURATION) {
                op.phase = 'execution';
                op.phase_started_turn = turn;
            }
        } else if (op.phase === 'execution') {
            // Check progress
            const targets = op.target_settlements ?? [];
            if (targets.length > 0) {
                const captured = targets.filter(sid => pc[sid] === faction).length;
                const captureRate = captured / targets.length;

                // Abort if failing after 2 turns
                if (turnsInPhase >= 2 && captureRate < PROGRESS_FAILURE_THRESHOLD) {
                    op.phase = 'recovery';
                    op.phase_started_turn = turn;
                    continue;
                }

                // Success or max duration reached
                if (captureRate >= PROGRESS_SUCCESS_THRESHOLD || turnsInPhase >= EXECUTION_MAX_DURATION) {
                    op.phase = 'recovery';
                    op.phase_started_turn = turn;
                    continue;
                }
            } else if (turnsInPhase >= EXECUTION_MAX_DURATION) {
                op.phase = 'recovery';
                op.phase_started_turn = turn;
                continue;
            }

            // Replace heavily damaged brigades
            const updatedParticipants: FormationId[] = [];
            for (const brigId of op.participating_brigades) {
                const brig = formations[brigId];
                if (!brig) continue;
                const startPersonnel = MAX_BRIGADE_PERSONNEL; // approximate
                const currentPersonnel = brig.personnel ?? 0;
                const lossRate = 1 - (currentPersonnel / startPersonnel);
                if (lossRate > BRIGADE_LOSS_THRESHOLD) {
                    // Try to find a replacement from the same corps
                    const subordinates = getCorpsSubordinates(state, corps.id);
                    const replacement = subordinates.find(s =>
                        !op.participating_brigades.includes(s.id) &&
                        (s.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= PERSONNEL_HEALTHY_THRESHOLD &&
                        (s.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD
                    );
                    if (replacement) {
                        updatedParticipants.push(replacement.id);
                        continue;
                    }
                }
                updatedParticipants.push(brigId);
            }
            op.participating_brigades = updatedParticipants;
        } else if (op.phase === 'recovery') {
            // Clear operation after recovery duration
            if (turnsInPhase >= RECOVERY_DURATION) {
                cmd.active_operation = null;
                // Add exhaustion from the operation
                cmd.corps_exhaustion = Math.min(100, cmd.corps_exhaustion + 15);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Operational Group Activation (C1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate OG activation orders for active operations in execution phase.
 * Appends to state.og_orders.
 */
export function generateOGActivationOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[]
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const formations = state.formations ?? {};

    if (!state.og_orders) state.og_orders = [];

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;

        // Only activate OGs during execution phase (all operation types except reorganization)
        if (op.phase !== 'execution') continue;

        // Check if OG slot is available
        if (cmd.active_ogs.length >= cmd.og_slots) continue;

        // Select donor brigades from operation participants
        const donors: OGActivationOrder['donors'] = [];
        const participantsSorted = sortByPersonnelDesc(
            op.participating_brigades
                .map(bid => formations[bid])
                .filter((b): b is FormationState => b != null && b.status === 'active')
        );

        // Corridor breach and HRHB: lower threshold (2 donors)
        const isCorridorBreachOp = op.name.startsWith('Corridor Breach');
        const minDonors = (faction === 'HRHB' || isCorridorBreachOp) ? 2 : 3;
        const maxDonors = 4;

        for (const brigade of participantsSorted) {
            if (donors.length >= maxDonors) break;
            const personnel = brigade.personnel ?? 0;
            const residual = personnel - OG_MIN_DONOR_RESIDUAL;
            if (residual <= 0) continue;
            const contribution = Math.min(OG_MAX_CONTRIBUTION_PER_DONOR, residual);
            if (contribution < 100) continue;
            donors.push({
                brigade_id: brigade.id,
                personnel_contribution: contribution
            });
        }

        if (donors.length < minDonors) continue;

        const ogOrder: OGActivationOrder = {
            corps_id: corps.id,
            donors,
            focus_settlements: op.target_settlements ?? [],
            posture: op.type === 'strategic_defense' ? 'defend' : 'attack',
            max_duration: OG_DEFAULT_DURATION
        };

        state.og_orders.push(ogOrder);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Corridor Breach Detection (C2)
// ═══════════════════════════════════════════════════════════════════════════

export interface CorridorTarget {
    breachSettlements: SettlementId[];
    friendlyClusterA: SettlementId[];
    friendlyClusterB: SettlementId[];
    narrowestWidth: number;
}

/**
 * Detect corridor breach opportunities: narrow enemy-held strips between
 * two friendly clusters.
 *
 * Returns sorted list of corridor targets for a faction.
 */
export function detectCorridorBreachOpportunities(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): CorridorTarget[] {
    const pc = state.political_controllers ?? {};
    const adj = buildAdjacencyFromEdges(edges);
    const strategy = FACTION_STRATEGIES[faction];

    // Focus on corridor municipalities for this faction
    const corridorMuns = new Set(strategy.corridor_municipalities);
    if (corridorMuns.size === 0) return [];

    // Find enemy-held settlements in corridor municipalities
    const enemyCorridorSids: SettlementId[] = [];
    for (const sid of Object.keys(pc).sort(strictCompare)) {
        const mun = sidToMun.get(sid);
        if (!mun || !corridorMuns.has(mun)) continue;
        if (pc[sid] !== faction) {
            enemyCorridorSids.push(sid);
        }
    }

    if (enemyCorridorSids.length === 0 || enemyCorridorSids.length > CORRIDOR_BREACH_MAX_STRIP_WIDTH * 3) {
        return []; // No corridor threat or too wide to breach
    }

    // Simple check: if there are enemy settlements that separate two groups of friendly settlements
    // Find friendly settlements adjacent to enemy corridor settlements
    const friendlyBorderSids = new Set<SettlementId>();
    for (const enemySid of enemyCorridorSids) {
        const neighbors = adj.get(enemySid);
        if (!neighbors) continue;
        for (const nSid of neighbors) {
            if (pc[nSid] === faction) {
                friendlyBorderSids.add(nSid);
            }
        }
    }

    if (friendlyBorderSids.size < 2) return [];

    // If we have enemy corridor settlements <= CORRIDOR_BREACH_MAX_STRIP_WIDTH,
    // this is a potential breach point
    if (enemyCorridorSids.length <= CORRIDOR_BREACH_MAX_STRIP_WIDTH) {
        const target: CorridorTarget = {
            breachSettlements: enemyCorridorSids,
            friendlyClusterA: [...friendlyBorderSids].sort(strictCompare).slice(0, Math.ceil(friendlyBorderSids.size / 2)),
            friendlyClusterB: [...friendlyBorderSids].sort(strictCompare).slice(Math.ceil(friendlyBorderSids.size / 2)),
            narrowestWidth: enemyCorridorSids.length
        };
        return [target];
    }

    return [];
}

/**
 * If a corridor breach opportunity exists and no operation is active,
 * launch a corridor breach operation for the nearest corps.
 */
export function attemptCorridorBreach(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const targets = detectCorridorBreachOpportunities(state, faction, edges, sidToMun);
    if (targets.length === 0) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;

    for (const target of targets) {
        // Find a corps without active operation that can reach the breach
        for (const corps of corpsList) {
            const cmd = corpsCommand[corps.id];
            if (!cmd || cmd.active_operation) continue;
            if (cmd.stance === 'reorganize') continue;
            if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) continue;

            const subordinates = getCorpsSubordinates(state, corps.id);
            const healthyCount = countHealthyBrigades(subordinates);
            if (healthyCount < 2) continue; // Lower threshold for corridor ops

            // Select participating brigades
            const participants = sortByPersonnelDesc(
                subordinates.filter(b => (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= 0.6 && (b.cohesion ?? 60) >= 40)
            ).slice(0, 4);

            if (participants.length < 2) continue;

            const operation: CorpsOperation = {
                name: `Corridor Breach (${faction})`,
                type: 'sector_attack',
                phase: 'planning',
                started_turn: turn,
                phase_started_turn: turn,
                target_settlements: target.breachSettlements,
                participating_brigades: participants.map(b => b.id)
            };

            cmd.active_operation = operation;
            // Force offensive stance for this corps during breach
            cmd.stance = 'offensive';
            return; // Only one breach operation at a time
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Army-Wide Standing Orders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set army stance based on the active standing order for this faction and turn.
 * Standing orders represent historical army-level strategic directives.
 * The army stance flows down through getEffectiveCorpsStance() in corps_command.ts
 * and getCorpsStance() in battle_resolution.ts, overriding corps-level decisions
 * when non-balanced.
 *
 * HRHB special case: the 'Lasva Offensive' standing order (weeks 12-26) only
 * activates general_offensive when actually at war with RBiH (alliance < 0.2).
 * Otherwise falls back to balanced.
 *
 * Deterministic: depends only on faction, turn, and alliance state.
 */
export function setArmyStandingOrder(
    state: GameState,
    faction: FactionId
): void {
    const turn = state.meta?.turn ?? 0;
    const order = getActiveStandingOrder(faction, turn);
    if (!order) return;

    let stance = order.army_stance;

    // HRHB: Lasva Offensive only applies when at war with RBiH
    if (faction === 'HRHB' && order.name === 'Lasva Offensive') {
        const allianceValue = state.war_alliance_rbih_hrhb ?? 1.0;
        if (allianceValue >= 0.2) {
            stance = 'balanced'; // Not at war — no army-wide offensive
        }
    }

    if (!state.army_stance) state.army_stance = {};
    state.army_stance[faction] = stance;
}

// ═══════════════════════════════════════════════════════════════════════════
// Emergency Defensive Operations (D1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Launch emergency defensive operations for corps facing extreme sector threat.
 * Enables defensive OGs to form when a corps is in defensive stance with no active
 * operation but facing overwhelming pressure (sectorThreat > 2.0).
 *
 * Only fires for defensive corps — offensive/balanced corps already get operations
 * through the standard generateCorpsOperationOrders path.
 */
export function generateEmergencyDefensiveOperations(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const pc = state.political_controllers ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;
        if (cmd.active_operation) continue;
        // Only for defensive corps facing extreme threat
        if (cmd.stance !== 'defensive') continue;
        // Allow slightly higher exhaustion for emergencies (+10 above normal cap)
        if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION + 10) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length < 2) continue;

        const sectorThreat = computeSectorThreat(state, subordinates, edges);
        if (sectorThreat < EMERGENCY_THREAT_THRESHOLD) continue;

        const healthyCount = countHealthyBrigades(subordinates);
        if (healthyCount < 2) continue;

        // Build target: enemy OSIDs adjacent to corps brigades' locations
        const targetSettlements: SettlementId[] = [];
        const brigadeOsids = new Set(subordinates.map(b => b.location_osid).filter(Boolean) as string[]);
        const osidAdj = buildOsidAdjacency(edges);
        for (const osid of brigadeOsids) {
            const neighbors = osidAdj.get(osid) ?? [];
            for (const n of neighbors) {
                const nCtrl = pc[n]; // OSIDs may be in political_controllers if using OSID-based control
                if (nCtrl && nCtrl !== faction) {
                    targetSettlements.push(n);
                }
            }
        }

        // Deduplicate and sort
        const uniqueTargets = [...new Set(targetSettlements)].sort(strictCompare);
        if (uniqueTargets.length === 0) continue;

        // Select participants: brigades with at least 50% personnel and cohesion >= 30
        const participants = sortByPersonnelDesc(
            subordinates.filter(b => (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= 0.5 && (b.cohesion ?? 60) >= 30)
        ).slice(0, 4);

        if (participants.length < 2) continue;

        const operation: CorpsOperation = {
            name: `Emergency Defense (${corps.id})`,
            type: 'strategic_defense',
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            target_settlements: uniqueTargets.slice(0, 20), // Cap target list
            participating_brigades: participants.map(b => b.id)
        };

        cmd.active_operation = operation;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Army-Level Multi-Corps Coordination (D2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * During general_offensive standing orders, identify the 2 most capable corps
 * and set them to offensive stance, concentrating combat power instead of
 * spreading it evenly across all corps.
 *
 * Prevents dilution where every corps independently chooses balanced and no
 * concentrated offensive develops.
 *
 * Must run AFTER setArmyStandingOrder and BEFORE generateCorpsStanceOrders
 * so that per-corps stance logic can override with local conditions.
 */
export function coordinateMultiCorpsOffensive(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[]
): void {
    const armyStance = state.army_stance?.[faction];
    if (armyStance !== 'general_offensive') return;

    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    if (corpsList.length < 3) return; // No coordination needed for 1-2 corps

    // Score each corps by offensive potential
    const scored = corpsList.map(corps => {
        const cmd = corpsCommand[corps.id];
        if (!cmd) return { corpsId: corps.id, score: -999 };
        const subs = getCorpsSubordinates(state, corps.id);
        const healthy = countHealthyBrigades(subs);
        const exhaustionPenalty = cmd.corps_exhaustion / 10;
        const avgPers = averagePersonnelFraction(subs);
        return {
            corpsId: corps.id,
            score: healthy * 10 + avgPers * 5 - exhaustionPenalty
        };
    }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return strictCompare(a.corpsId, b.corpsId);
    });

    // Top 2 corps get pre-set to offensive — per-corps logic can still override
    for (let i = 0; i < scored.length && i < 2; i++) {
        const cmd = corpsCommand[scored[i].corpsId];
        if (!cmd) continue;
        if (scored[i].score > 0 && cmd.stance !== 'reorganize') {
            cmd.stance = 'offensive';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Corps Directive Generation (Phase 1: HoI-style command hierarchy)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derive which front segments a corps covers, based on where its brigades are.
 * A corps "covers" a front segment if any of its brigades are at an OSID that
 * is an endpoint of one of the segment's hostile boundary edges.
 *
 * Returns Record<corpsId, frontId[]> (sorted).
 * Deterministic: sorted iteration throughout.
 */
function deriveCorpsFrontMapping(
    state: GameState,
    faction: FactionId
): Map<FormationId, string[]> {
    const result = new Map<FormationId, string[]>();
    const segments = state.assignable_front_segments ?? [];
    const formations = state.formations ?? {};

    // Build brigade_osid → corps_id mapping
    const osidToCorps = new Map<string, Set<string>>();
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !f.corps_id) continue;
        let set = osidToCorps.get(f.location_osid);
        if (!set) { set = new Set(); osidToCorps.set(f.location_osid, set); }
        set.add(f.corps_id);
    }

    // For each front segment, find which corps have brigades at its edge endpoints
    for (const seg of segments) {
        if (seg.side_a !== faction && seg.side_b !== faction) continue;
        // Extract OSIDs from edge_ids (format: "osidA__osidB")
        const segOsids = new Set<string>();
        for (const eid of seg.edge_ids) {
            const parts = eid.split('__');
            if (parts.length === 2) {
                segOsids.add(parts[0]!);
                segOsids.add(parts[1]!);
            }
        }
        // Find corps with brigades at or adjacent to segment OSIDs
        for (const osid of segOsids) {
            const corpsSet = osidToCorps.get(osid);
            if (corpsSet) {
                for (const corpsId of corpsSet) {
                    let list = result.get(corpsId);
                    if (!list) { list = []; result.set(corpsId, list); }
                    if (!list.includes(seg.front_id)) list.push(seg.front_id);
                }
            }
        }
    }

    // Sort each corps's front list
    for (const list of result.values()) list.sort(strictCompare);
    return result;
}

/**
 * Find OSIDs matching municipality patterns that are enemy-controlled and adjacent to friendly territory.
 * These become offensive targets in the corps directive.
 *
 * Deterministic: sorted output.
 */
function findTargetOsidsFromMunicipalities(
    state: GameState,
    faction: FactionId,
    targetMunicipalities: string[],
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    if (targetMunicipalities.length === 0) return [];
    const targetSet = new Set(targetMunicipalities);
    const result: Osid[] = [];

    // Iterate over all known OSIDs (from reverseMap keys, not political_controllers)
    const allOsids = [...reverseMap.keys()].sort(strictCompare);
    for (const osid of allOsids) {
        // Check if OSID matches target municipality (OSID format: op:municipality:slug)
        const munMatch = osid.match(/^op:([^:]+):/);
        if (!munMatch) continue;
        const mun = munMatch[1]!;
        if (!targetSet.has(mun)) continue;

        // Must be enemy-controlled
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
        if (ctrl === faction || ctrl === null) continue;

        // No adjacency filter — brigade AI handles reachability via BFS march (Rule 5b)
        // and only attacks adjacent enemies (Rule 5a). Corps lists strategic objectives.
        result.push(osid);
    }
    return result.sort(strictCompare);
}

/**
 * Find OSIDs matching municipality patterns that are friendly-controlled.
 * These become avoid_osids or hold_osids in the corps directive.
 *
 * Deterministic: sorted output.
 */
function findFriendlyOsidsFromMunicipalities(
    state: GameState,
    faction: FactionId,
    municipalities: string[],
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    if (municipalities.length === 0) return [];
    const munSet = new Set(municipalities);
    const result: Osid[] = [];
    for (const osid of [...reverseMap.keys()].sort(strictCompare)) {
        const munMatch = osid.match(/^op:([^:]+):/);
        if (!munMatch) continue;
        if (!munSet.has(munMatch[1]!)) continue;
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
        if (ctrl === faction) result.push(osid);
    }
    return result;
}

/**
 * Generate CorpsDirective for each corps of a faction.
 *
 * The directive tells subordinate brigades:
 * - Which front segments to cover
 * - Which OSIDs to attack (from army priorities + named operations)
 * - Which OSIDs to hold (chokepoints, corridors, enclaves)
 * - Which OSIDs to avoid
 * - Reserve policy and attack thresholds
 *
 * Called after stance selection and operation management.
 * Deterministic: sorted iteration, no randomness.
 */
export function generateCorpsDirectives(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid?: SupplyStateByOsidReport | null
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;
    if (!reverseMap) return; // Need operational data for OSID targeting

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const corpsFrontMapping = deriveCorpsFrontMapping(state, faction);
    const sectorLookup = state.corps_front_sectors ?? {};
    const adjacency = buildOsidAdjacency(edges);
    const strategy = FACTION_STRATEGIES[faction];
    const doctrinePhase = getActiveDoctrinePhase(faction, turn);

    // Army stance modulation: adjusts reserve fractions and aggression
    const armyStance = state.army_stance?.[faction] ?? 'balanced';
    const armyAggressionBonus = armyStance === 'general_offensive' ? 0.25
        : armyStance === 'general_defensive' ? -0.1
        : 0;
    const armyReserveModifier = armyStance === 'general_offensive' ? -0.05
        : armyStance === 'general_defensive' ? 0.1
        : 0;

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length === 0) {
            cmd.directive = null;
            continue;
        }

        // Front segments this corps covers — always use front_id-based mapping so downstream
        // consumers (front_assignment.ts, brigade AI) can match against assignable_front_segments.
        // Sector sub_segment IDs are a separate organizational layer for target filtering only.
        const corpsSectors = Object.values(sectorLookup)
            .filter(s => s.corps_id === corps.id)
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
        const assignedFrontIds = corpsFrontMapping.get(corps.id) ?? [];

        // Army-level priorities for this corps
        const armyPriorities = getCorpsArmyPriorities(faction, corps.id, turn);

        // Collect offensive targets from army priorities
        const offensiveTargets: Osid[] = [];
        let bestMinOutcome: CorpsDirective['min_attack_outcome'] = 'stalemate';
        const avoidOsids: Osid[] = [...(state.meta.avoided_osids_by_faction?.[faction] ?? [])];

        for (const priority of armyPriorities) {
            const targets = findTargetOsidsFromMunicipalities(
                state, faction, priority.target_municipalities, reverseMap
            );
            for (const t of targets) {
                if (!offensiveTargets.includes(t)) offensiveTargets.push(t);
            }
            // Use the most permissive min_outcome from active priorities
            const outcomeRank: Record<string, number> = { decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1 };
            if ((outcomeRank[priority.min_outcome] ?? 2) < (outcomeRank[bestMinOutcome] ?? 2)) {
                bestMinOutcome = priority.min_outcome;
            }
            // avoid_municipalities removed — bipolar co-ethnic scoring handles deterrence emergently
        }

        // P3: Collect priority municipality slugs for opportunistic target filtering.
        // Opportunistic targets outside these municipalities are filtered to prevent
        // corps spreading into non-priority areas (e.g. 1KK sprawling into Central Corridor).
        const priorityMunicipalities = new Set<string>();
        for (const p of armyPriorities) {
            for (const m of p.target_municipalities) priorityMunicipalities.add(m);
        }

        // Rear-area cleanup: weeks 0-12, target undefended faction-controlled OSIDs
        // behind the front line that have hostile-majority population. All factions
        // historically secured their rear before pushing forward (BB1 pp496-501).
        const REAR_CLEANUP_END_WEEK = 12;
        if (turn < REAR_CLEANUP_END_WEEK && graphAnalysis) {
            const pc = state.political_controllers ?? {};
            for (const sub of subordinates) {
                const subOsid = sub.location_osid;
                if (!subOsid) continue;
                const neighbors = adjacency.get(subOsid) ?? [];
                for (const neighborOsid of neighbors) {
                    const controller = pc[neighborOsid];
                    if (controller !== faction) continue; // Must be own-controlled
                    // Skip if already a target
                    if (offensiveTargets.includes(neighborOsid)) continue;
                    // Must have no enemy neighbors (behind front)
                    const neighborNeighbors = adjacency.get(neighborOsid) ?? [];
                    const hasEnemyNeighbor = neighborNeighbors.some(nn => {
                        const nnController = pc[nn];
                        return nnController && nnController !== faction;
                    });
                    if (hasEnemyNeighbor) continue;
                    // Must have enemy formation present (uncleared pocket/holdout)
                    const hasEnemyFormation = Object.values(state.formations ?? {}).some(f =>
                        f && f.status === 'active' && f.faction !== faction && f.location_osid === neighborOsid
                    );
                    if (!hasEnemyFormation) continue;
                    offensiveTargets.push(neighborOsid);
                }
            }
        }

        // Add targets from active named operation
        if (cmd.active_operation?.phase === 'execution' && cmd.active_operation.target_settlements) {
            for (const sid of cmd.active_operation.target_settlements) {
                const pc = state.political_controllers ?? {};
                if (pc[sid] !== faction && !offensiveTargets.includes(sid)) {
                    offensiveTargets.push(sid);
                }
            }
        }

        // Opportunistic targets: add weak/undefended enemy OSIDs adjacent to brigades.
        // When army is general_offensive OR corps is offensive: ALWAYS add, ensuring
        // front-line brigades have authorized targets even when army-priority municipalities
        // are far away or already captured. Otherwise: only when no priority targets exist.
        // Bipolar co-ethnic scoring naturally deters non-coethnic targets at brigade level.
        const addOpportunistic = armyStance === 'general_offensive'
            || cmd.stance === 'offensive'
            || (offensiveTargets.length === 0);
        if (addOpportunistic && graphAnalysis) {
            for (const osid of graphAnalysis.undefended_front) {
                if (offensiveTargets.includes(osid)) continue;
                // P3: Filter opportunistic targets to priority municipalities
                if (priorityMunicipalities.size > 0) {
                    const osidMun = osid.split(':')[1];
                    if (!priorityMunicipalities.has(osidMun)) continue;
                }
                const neighbors = adjacency.get(osid) ?? [];
                const hasAdjacentBrigade = subordinates.some(b =>
                    b.location_osid && neighbors.includes(b.location_osid)
                );
                if (hasAdjacentBrigade) offensiveTargets.push(osid);
            }
            for (const entry of graphAnalysis.weak_enemy_osids) {
                if (offensiveTargets.includes(entry.osid)) continue;
                // P3: Filter opportunistic targets to priority municipalities
                if (priorityMunicipalities.size > 0) {
                    const osidMun = entry.osid.split(':')[1];
                    if (!priorityMunicipalities.has(osidMun)) continue;
                }
                const neighbors = adjacency.get(entry.osid) ?? [];
                const hasAdjacentBrigade = subordinates.some(b =>
                    b.location_osid && neighbors.includes(b.location_osid)
                );
                if (hasAdjacentBrigade) offensiveTargets.push(entry.osid);
            }
        }

        // Pocket targets: enemy OSIDs completely surrounded by faction territory — always attack these
        if (graphAnalysis?.enemy_pockets.length) {
            for (const pocketOsid of graphAnalysis.enemy_pockets) {
                const neighbors = adjacency.get(pocketOsid) ?? [];
                const hasAdjacentBrigade = subordinates.some(b =>
                    b.location_osid && neighbors.includes(b.location_osid)
                );
                if (hasAdjacentBrigade && !offensiveTargets.includes(pocketOsid)) {
                    offensiveTargets.push(pocketOsid);
                }
            }
        }

        // Hold OSIDs: chokepoints + friendly OSIDs in defensive priority municipalities
        const holdOsids: Osid[] = [];
        // Add chokepoints from graph analysis
        if (graphAnalysis) {
            for (const cp of graphAnalysis.chokepoints) {
                // Only hold if a subordinate brigade is near
                const hasBrigade = subordinates.some(b => b.location_osid === cp);
                if (hasBrigade) holdOsids.push(cp);
            }
        }
        // Add friendly OSIDs in corridor/defensive priority municipalities — but only for
        // non-offensive corps. Offensive corps should be free to attack from defensive-priority
        // positions, not locked into defending. Chokepoints (above) still hold for all stances.
        if (cmd.stance !== 'offensive') {
            const defPriorityOsids = findFriendlyOsidsFromMunicipalities(state, faction, strategy.defensive_priorities, reverseMap);
            for (const osid of defPriorityOsids) {
                // Only relevant if on the front (has enemy neighbors)
                if (graphAnalysis) {
                    const analysis = graphAnalysis.osid_analysis.get(osid);
                    if (analysis && analysis.enemy_neighbors.length > 0 && !holdOsids.includes(osid)) {
                        holdOsids.push(osid);
                    }
                }
            }
        }

        // Reserve fraction: corps stance base + army stance modifier
        let reserveFraction: number;
        switch (cmd.stance) {
            case 'offensive': reserveFraction = 0.1; break;
            case 'balanced': reserveFraction = 0.2; break;
            case 'defensive': reserveFraction = 0.3; break;
            case 'reorganize': reserveFraction = 0.0; break;
            default: reserveFraction = 0.2;
        }
        reserveFraction = Math.max(0, Math.min(0.5, reserveFraction + armyReserveModifier));

        // Max attackers: offensive/balanced allow concentration, defensive is more cautious
        let maxAttackersPerTarget = cmd.stance === 'defensive' || cmd.stance === 'reorganize' ? 2 : 3;
        if (armyStance === 'general_offensive' && cmd.stance !== 'reorganize') {
            maxAttackersPerTarget = Math.max(maxAttackersPerTarget, 4);
        }

        // Aggression modifier: doctrine phase + army stance bonus + seasonal adjustment
        const seasonalAdj = getSeasonalModifiers(
            state.meta?.turn ?? 0, state.meta?.scenario_start_date
        ).aggression_adj;
        const aggressionModifier = (doctrinePhase?.aggression_modifier ?? 0) + armyAggressionBonus + seasonalAdj;

        // Army offensive stance: accept riskier attacks to maintain offensive tempo.
        // Concentration joining only needs 'repulsed' instead of 'stalemate', enabling
        // multiple light brigades to coordinate against entrenched defenders.
        if (armyStance === 'general_offensive' && cmd.stance !== 'defensive' && cmd.stance !== 'reorganize') {
            bestMinOutcome = 'repulsed';
        }

        // Army defensive stance: no offensive targets — corps only hold and counter-attack
        if (armyStance === 'general_defensive') {
            offensiveTargets.length = 0;
            bestMinOutcome = 'costly_victory'; // Only attack when clearly favorable
        }

        // Supply health gating: critical majority → strip offensive targets
        const supplyHealth = assessCorpsSupplyHealth(subordinates, faction, supplyByOsid);
        if (supplyHealth.critical_fraction > 0.5) {
            offensiveTargets.length = 0;
        }
        // Low adequate supply → upgrade minimum outcome to victory
        if (supplyHealth.adequate_fraction < 0.3) {
            const outcomeRank: Record<string, number> = { decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1 };
            if ((outcomeRank[bestMinOutcome] ?? 2) < (outcomeRank['victory'] ?? 4)) {
                bestMinOutcome = 'victory';
            }
        }

        // Sector-aware target filtering: restrict to OSIDs adjacent to corps' sectors
        if (corpsSectors.length > 0 && offensiveTargets.length > 0) {
            const allSectorEnemyOsids = new Set<string>();
            for (const sec of corpsSectors) {
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) allSectorEnemyOsids.add(eo);
                }
            }
            const filtered = offensiveTargets.filter(t => allSectorEnemyOsids.has(t));
            // Keep all if filter removes everything (corps needs SOMETHING to aim at)
            if (filtered.length > 0) {
                offensiveTargets.length = 0;
                offensiveTargets.push(...filtered);
            }
        }

        // Multi-sector: populate per-sector offensive targets
        const sectorTargets: Record<string, string[]> = {};
        if (corpsSectors.length > 1 && offensiveTargets.length > 0) {
            for (const sec of corpsSectors) {
                const secEnemyOsids = new Set<string>();
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) secEnemyOsids.add(eo);
                }
                const secTargets = offensiveTargets.filter(t => secEnemyOsids.has(t));
                if (secTargets.length > 0) {
                    sectorTargets[sec.sector_id] = secTargets.sort(strictCompare);
                }
            }
        }

        // Sort all arrays for determinism
        offensiveTargets.sort(strictCompare);
        holdOsids.sort(strictCompare);
        avoidOsids.sort(strictCompare);

        const directive: CorpsDirective = {
            assigned_front_ids: assignedFrontIds,
            offensive_targets: offensiveTargets,
            hold_osids: holdOsids,
            avoid_osids: avoidOsids,
            max_attackers_per_target: maxAttackersPerTarget,
            reserve_fraction: reserveFraction,
            min_attack_outcome: bestMinOutcome,
            aggression_modifier: aggressionModifier,
            sector_targets: Object.keys(sectorTargets).length > 0 ? sectorTargets : undefined,
        };

        cmd.directive = directive;

        // Sector offensive launch evaluation:
        // Launch if offensive/balanced, no active SECTOR operation, and multi-sector corps.
        // Sector offensives replace general_offensive/strategic_defense with targeted multi-OSID push.
        const existingOp = cmd.active_operation;
        const canLaunchSectorOp = !existingOp || existingOp.type !== 'sector_attack';
        if (canLaunchSectorOp &&
            (cmd.stance === 'offensive' || cmd.stance === 'balanced') &&
            corpsSectors.length > 0 && offensiveTargets.length > 0) {

            for (const sec of corpsSectors) {
                const secEnemyOsids: string[] = [];
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) {
                        if (!secEnemyOsids.includes(eo)) secEnemyOsids.push(eo);
                    }
                }
                secEnemyOsids.sort(strictCompare);

                // Brigades in this sector
                const secBrigadeIds = subordinates
                    .filter(b => {
                        if (!b.location_osid) return false;
                        return sec.sub_segments.some(ss => ss.friendly_osids.includes(b.location_osid!));
                    })
                    .map(b => b.id)
                    .sort(strictCompare);

                const op = evaluateSectorOffensiveLaunch(
                    state, corps.id, sec.sector_id, faction,
                    secBrigadeIds, secEnemyOsids, offensiveTargets, supplyByOsid
                );
                if (op) {
                    cmd.active_operation = op;
                    break; // One offensive at a time per corps
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Report types
// ═══════════════════════════════════════════════════════════════════════════

/** Per-corps AI report entry for observability. */
export interface CorpsAiReportEntry {
    corps_id: string;
    faction: string;
    stance: string;
    active_operation: string | null;
    offensive_target_count: number;
    offensive_target_municipalities: string[];
    hold_osid_count: number;
    aggression_modifier: number;
    subordinate_count: number;
}

/**
 * Extract a report from current corps_command state after generateAllCorpsOrders.
 * Deterministic: corps sorted by strictCompare.
 */
export function extractCorpsAiReport(state: GameState, faction: FactionId): CorpsAiReportEntry[] {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return [];

    const entries: CorpsAiReportEntry[] = [];
    const corpsList = getFactionCorps(state, faction);

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const directive = cmd.directive;
        const offensiveTargets = directive?.offensive_targets ?? [];

        // Deduplicate municipality names from OSID targets (format: op:municipality:slug)
        const munSet = new Set<string>();
        for (const osid of offensiveTargets) {
            const match = osid.match(/^op:([^:]+):/);
            if (match) munSet.add(match[1]);
        }
        const municipalities = [...munSet].sort(strictCompare);

        const opName = cmd.active_operation
            ? `${cmd.active_operation.type}:${cmd.active_operation.phase}`
            : null;

        entries.push({
            corps_id: corps.id,
            faction,
            stance: cmd.stance ?? 'balanced',
            active_operation: opName,
            offensive_target_count: offensiveTargets.length,
            offensive_target_municipalities: municipalities,
            hold_osid_count: directive?.hold_osids?.length ?? 0,
            aggression_modifier: directive?.aggression_modifier ?? 0,
            subordinate_count: cmd.subordinate_count ?? 0,
        });
    }

    return entries;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all corps-level AI decisions for a faction.
 * Call before generate-bot-brigade-orders in the pipeline.
 *
 * Order:
 * 0. Set army stance from historical standing orders
 * 0b. Multi-corps coordination (concentrate force for general_offensive)
 * 1. Evaluate progress of existing operations (advance/abort)
 * 2. Set corps stances
 * 3. Launch new named operations
 * 3b. Emergency defensive operations (high-threat corps without active ops)
 * 4. Attempt corridor breach if opportunity exists
 * 5. Generate OG activation orders
 * 6. Generate corps directives for brigade AI
 */
export function generateAllCorpsOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
    osidEdges?: EdgeRecord[],
    supplyByOsid?: SupplyStateByOsidReport | null
): void {
    // 0. Set army stance from standing orders
    setArmyStandingOrder(state, faction);

    // 0b. Multi-corps coordination: concentrate offensive force
    coordinateMultiCorpsOffensive(state, faction, edges);

    // 1. Evaluate existing operations
    evaluateOperationProgress(state, faction);

    // 2. Corps stance selection
    generateCorpsStanceOrders(state, faction, edges, sidToMun);

    // 3. Launch new named operations
    generateCorpsOperationOrders(state, faction, edges, sidToMun);

    // 3b. Emergency defensive operations for high-threat defensive corps
    generateEmergencyDefensiveOperations(state, faction, edges, sidToMun);

    // 4. Attempt corridor breach
    attemptCorridorBreach(state, faction, edges, sidToMun);

    // 5. OG activation
    generateOGActivationOrders(state, faction, edges);

    // 6. Generate corps directives (new: HoI-style command hierarchy)
    // Use OSID edges for adjacency (not canonical SID edges)
    const effectiveOsidEdges = osidEdges ?? edges;
    let graphAnalysis: FactionGraphAnalysis | null = null;
    if (reverseMap) {
        const adjacency = buildOsidAdjacency(effectiveOsidEdges);
        graphAnalysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);
    }
    generateCorpsDirectives(state, faction, effectiveOsidEdges, reverseMap ?? null, graphAnalysis, supplyByOsid);
}

