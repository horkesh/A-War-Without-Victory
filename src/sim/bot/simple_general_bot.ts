import type { FrontEdge } from '../../map/front_edges.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { scoreConsolidationTarget } from '../consolidation_scoring.js';
import { areRbihHrhbAllied, isRbihHrhbAtWar } from '../early_war/alliance_update.js';
import type { Bot, BotDecisionContext, BotDecisions } from './bot_interface.js';
import { getBotDifficultyTuning, resolveAggression } from './bot_strategy.js';

export class SimpleGeneralBot implements Bot {
    id: string;
    factionId: FactionId;
    aggression: number;

    constructor(id: string, factionId: FactionId, aggression: number) {
        this.id = id;
        this.factionId = factionId;
        this.aggression = aggression;
    }

    makeDecisions(state: GameState, frontEdges: FrontEdge[], context: BotDecisionContext): BotDecisions {
        const postureAssignments: Record<string, 'push' | 'hold' | 'probe'> = {};
        const formationAssignments: Record<string, string> = {};
        const decisions: BotDecisions = {
            posture_assignments: postureAssignments,
            formation_assignments: formationAssignments
        };

        // Peace-phase §4.8: Alliance-aware edge filtering
        // When RBiH/HRHB are allied or ceasefire active, skip edges where the opponent is the allied faction
        const rbihHrhbAllied = areRbihHrhbAllied(state);
        const ceasefireActive = state.political.rbih_hrhb_state?.ceasefire_active === true;
        const washingtonSigned = state.political.rbih_hrhb_state?.washington_signed === true;
        const isRbihOrHrhb = this.factionId === 'RBiH' || this.factionId === 'HRHB';
        const allyFaction = this.factionId === 'RBiH' ? 'HRHB' : this.factionId === 'HRHB' ? 'RBiH' : null;

        const relevantEdges = frontEdges
            .filter((e) => {
                if (e.side_a !== this.factionId && e.side_b !== this.factionId) return false;
                // Skip allied faction edges when allied or ceasefire/Washington
                if (isRbihOrHrhb && allyFaction) {
                    const opponent = e.side_a === this.factionId ? e.side_b : e.side_a;
                    if (opponent === allyFaction && (rbihHrhbAllied || ceasefireActive)) {
                        return false; // Don't target ally
                    }
                }
                return true;
            })
            .sort((a, b) => strictCompare(a.edge_id, b.edge_id));

        const aggression = resolveAggression(context.strategy, state.meta.phase, context.timeContext, state);
        const tuning = getBotDifficultyTuning(context.difficulty);
        const activePersonnel = computeActivePersonnel(state, this.factionId);
        const availablePool = computeAvailablePool(state, this.factionId);
        const manpowerScore = activePersonnel + availablePool;
        const frontLength = relevantEdges.length;
        const frontLengthPenalty = Math.min(
            0.35,
            frontLength / 80 * context.strategy.front_length_penalty_strength
        );
        const manpowerPenalty = manpowerScore <= 0
            ? context.strategy.manpower_sensitivity
            : Math.max(0, Math.min(0.3, (1 - Math.min(1, manpowerScore / 30000)) * context.strategy.manpower_sensitivity));
        const broadAggression = Math.max(
            0.05,
            Math.min(1, ((aggression.broad_aggression + this.aggression) / 2) - frontLengthPenalty - manpowerPenalty)
        );
        const plannedOpsAggression = Math.max(
            broadAggression,
            Math.min(1, aggression.planned_ops_aggression - frontLengthPenalty * 0.25)
        );
        const cc = context.consolidationContext;
        const consolidationWeight = context.strategy.consolidation_priority_weight ?? 0;

        const scoredEdges = relevantEdges
            .map((edge) => {
                const pressureValue = state.military.front_pressure?.[edge.edge_id]?.value ?? 0;
                const sideSign = edge.side_a === this.factionId ? 1 : -1;
                const disadvantaged = sideSign * pressureValue < 0 ? 1 : 0;
                const objectiveBonus =
                    context.strategy.preferred_objective_sids.includes(edge.a) ||
                        context.strategy.preferred_objective_sids.includes(edge.b)
                        ? 2
                        : 0;
                const pressureMagnitude = Math.min(3, Math.floor(Math.abs(pressureValue) / 5));
                // Peace-phase §4.8: Post-Washington joint coordination bonus vs RS
                let jointBonus = 0;
                if (washingtonSigned && isRbihOrHrhb) {
                    const opponent = edge.side_a === this.factionId ? edge.side_b : edge.side_a;
                    if (opponent === 'RS') jointBonus = 2; // Prioritize RS fronts post-Washington
                }
                // Peace-phase §4.8: When at war with ally, prioritize confrontation edges
                let confrontationBonus = 0;
                if (isRbihOrHrhb && allyFaction && isRbihHrhbAtWar(state) && !ceasefireActive) {
                    const opponent = edge.side_a === this.factionId ? edge.side_b : edge.side_a;
                    if (opponent === allyFaction) confrontationBonus = 1;
                }
                // Consolidation: prioritize edges where enemy sid is a rear-cleanup or breakthrough target
                let consolidationBonus = 0;
                if (cc && consolidationWeight > 0) {
                    const enemySid = edge.side_a === this.factionId ? edge.b : edge.a;
                    const rawConsolidation = scoreConsolidationTarget({
                        state,
                        targetSid: enemySid,
                        attackerFaction: this.factionId,
                        edges: cc.edges,
                        sidToMun: cc.sidToMun,
                        settlementsByMun: cc.settlementsByMun
                    });
                    consolidationBonus = Math.floor(rawConsolidation * consolidationWeight / 25);
                }
                const score = disadvantaged * 4 + objectiveBonus + pressureMagnitude + jointBonus + confrontationBonus + consolidationBonus;
                const isObjective =
                    context.strategy.preferred_objective_sids.includes(edge.a) ||
                    context.strategy.preferred_objective_sids.includes(edge.b);
                return { edge, score, isObjective };
            })
            .sort((x, y) => {
                if (x.isObjective !== y.isObjective) return x.isObjective ? -1 : 1;
                if (y.score !== x.score) return y.score - x.score;
                return strictCompare(x.edge.edge_id, y.edge.edge_id);
            });

        const pushCount = Math.min(
            scoredEdges.length,
            Math.max(1, Math.ceil(scoredEdges.length * tuning.push_share * broadAggression))
        );
        const pushSet = new Set(scoredEdges.slice(0, pushCount).map((x) => x.edge.edge_id));

        for (const item of scoredEdges) {
            const edgeId = item.edge.edge_id;
            if (pushSet.has(edgeId)) {
                postureAssignments[edgeId] = 'push';
            } else if (item.isObjective && item.score > 0 && plannedOpsAggression >= 0.45) {
                postureAssignments[edgeId] = 'probe';
            } else if (item.score > 0 && broadAggression >= 0.5) {
                postureAssignments[edgeId] = 'probe';
            } else {
                postureAssignments[edgeId] = 'hold';
            }
        }

        const rankedEdgeIds = scoredEdges.map((x) => x.edge.edge_id);
        if (state.military.formations) {
            const myFormations = Object.values(state.military.formations)
                .filter((f) => f.faction === this.factionId && f.status === 'active')
                .sort((a, b) => strictCompare(a.id, b.id));

            const reassignmentCandidates = myFormations
                .map((formation, index) => {
                    const targetEdgeId = rankedEdgeIds[index % Math.max(1, rankedEdgeIds.length)];
                    const currentEdgeId = formation.assignment?.edge_id;
                    const currentRank = typeof currentEdgeId === 'string' ? rankedEdgeIds.indexOf(currentEdgeId) : -1;
                    const targetRank = targetEdgeId == null ? -1 : rankedEdgeIds.indexOf(targetEdgeId);
                    return {
                        formation,
                        targetEdgeId,
                        invalid: currentRank < 0,
                        rankDistance: currentRank < 0 || targetRank < 0 ? Number.MAX_SAFE_INTEGER : Math.abs(currentRank - targetRank),
                    };
                })
                .filter((candidate) => candidate.targetEdgeId != null && candidate.formation.assignment?.edge_id !== candidate.targetEdgeId)
                .sort((a, b) => {
                    if (a.invalid !== b.invalid) return a.invalid ? -1 : 1;
                    if (b.rankDistance !== a.rankDistance) return b.rankDistance - a.rankDistance;
                    return strictCompare(a.formation.id, b.formation.id);
                });
            const invalidCount = reassignmentCandidates.filter((candidate) => candidate.invalid).length;
            const scoredBudget = Math.ceil(
                myFormations.length * tuning.reassign_bias * Math.max(0.45, broadAggression)
            );
            const reassignmentCount = Math.min(
                reassignmentCandidates.length,
                Math.max(invalidCount, scoredBudget)
            );
            for (const candidate of reassignmentCandidates.slice(0, reassignmentCount)) {
                formationAssignments[candidate.formation.id] = candidate.targetEdgeId!;
            }
        }

        return decisions;
    }
}

function computeActivePersonnel(state: GameState, factionId: FactionId): number {
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);
    let total = 0;
    for (const id of formationIds) {
        const f = formations[id];
        if (!f || f.faction !== factionId || f.status !== 'active') continue;
        total += typeof f.personnel === 'number' && Number.isFinite(f.personnel) ? Math.max(0, f.personnel) : 0;
    }
    return total;
}

function computeAvailablePool(state: GameState, factionId: FactionId): number {
    const pools = state.military.militia_pools ?? {};
    const keys = Object.keys(pools).sort(strictCompare);
    let total = 0;
    for (const key of keys) {
        const p = pools[key];
        if (!p || p.faction !== factionId) continue;
        total += typeof p.available === 'number' && Number.isFinite(p.available) ? Math.max(0, p.available) : 0;
    }
    return total;
}
