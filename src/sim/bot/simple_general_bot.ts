import type { GameState, FactionId } from '../../state/game_state.js';
import type { Bot, BotDecisions, BotDecisionContext } from './bot_interface.js';
import type { FrontEdge } from '../../map/front_edges.js';
import { getBotDifficultyTuning, resolveAggression } from './bot_strategy.js';
import { areRbihHrhbAllied, isRbihHrhbAtWar, getAlliancePhase } from '../phase_i/alliance_update.js';

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
        const decisions: BotDecisions = {
            posture_assignments: {},
            formation_assignments: {}
        };

        // Phase I §4.8: Alliance-aware edge filtering
        // When RBiH/HRHB are allied or ceasefire active, skip edges where the opponent is the allied faction
        const rbihHrhbAllied = areRbihHrhbAllied(state);
        const ceasefireActive = state.rbih_hrhb_state?.ceasefire_active === true;
        const washingtonSigned = state.rbih_hrhb_state?.washington_signed === true;
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
            .sort((a, b) => a.edge_id.localeCompare(b.edge_id));

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
        const scoredEdges = relevantEdges
            .map((edge) => {
                const pressureValue = state.front_pressure?.[edge.edge_id]?.value ?? 0;
                const sideSign = edge.side_a === this.factionId ? 1 : -1;
                const disadvantaged = sideSign * pressureValue < 0 ? 1 : 0;
                const objectiveBonus =
                    context.strategy.preferred_objective_sids.includes(edge.a) ||
                    context.strategy.preferred_objective_sids.includes(edge.b)
                        ? 2
                        : 0;
                const pressureMagnitude = Math.min(3, Math.floor(Math.abs(pressureValue) / 5));
                // Phase I §4.8: Post-Washington joint coordination bonus vs RS
                let jointBonus = 0;
                if (washingtonSigned && isRbihOrHrhb) {
                    const opponent = edge.side_a === this.factionId ? edge.side_b : edge.side_a;
                    if (opponent === 'RS') jointBonus = 2; // Prioritize RS fronts post-Washington
                }
                // Phase I §4.8: When at war with ally, prioritize confrontation edges
                let confrontationBonus = 0;
                if (isRbihOrHrhb && allyFaction && isRbihHrhbAtWar(state) && !ceasefireActive) {
                    const opponent = edge.side_a === this.factionId ? edge.side_b : edge.side_a;
                    if (opponent === allyFaction) confrontationBonus = 1;
                }
                const score = disadvantaged * 4 + objectiveBonus + pressureMagnitude + jointBonus + confrontationBonus;
                const isObjective =
                    context.strategy.preferred_objective_sids.includes(edge.a) ||
                    context.strategy.preferred_objective_sids.includes(edge.b);
                return { edge, score, isObjective };
            })
            .sort((x, y) => {
                if (x.isObjective !== y.isObjective) return x.isObjective ? -1 : 1;
                if (y.score !== x.score) return y.score - x.score;
                return x.edge.edge_id.localeCompare(y.edge.edge_id);
            });

        const pushCount = Math.min(
            scoredEdges.length,
            Math.max(1, Math.ceil(scoredEdges.length * tuning.push_share * broadAggression))
        );
        const pushSet = new Set(scoredEdges.slice(0, pushCount).map((x) => x.edge.edge_id));

        for (const item of scoredEdges) {
            const edgeId = item.edge.edge_id;
            if (pushSet.has(edgeId)) {
                decisions.posture_assignments![edgeId] = 'push';
            } else if (item.isObjective && item.score > 0 && plannedOpsAggression >= 0.45) {
                decisions.posture_assignments![edgeId] = 'probe';
            } else if (item.score > 0 && broadAggression >= 0.5) {
                decisions.posture_assignments![edgeId] = 'probe';
            } else {
                decisions.posture_assignments![edgeId] = 'hold';
            }
        }

        const rankedEdgeIds = scoredEdges.map((x) => x.edge.edge_id);
        if (state.formations) {
            const myFormations = Object.values(state.formations)
                .filter((f) => f.faction === this.factionId && f.status === 'active')
                .sort((a, b) => a.id.localeCompare(b.id));

            for (let i = 0; i < myFormations.length; i += 1) {
                const formation = myFormations[i]!;
                const currentAssignment = formation.assignment?.edge_id;
                const isAssignedValid = typeof currentAssignment === 'string' && rankedEdgeIds.includes(currentAssignment);
                const shouldReassign =
                    !isAssignedValid || context.rng() < tuning.reassign_bias * Math.max(0.45, broadAggression);

                if (shouldReassign && rankedEdgeIds.length > 0) {
                    const targetEdgeId = rankedEdgeIds[i % rankedEdgeIds.length];
                    decisions.formation_assignments![formation.id] = targetEdgeId;
                }
            }
        }

        return decisions;
    }
}

function computeActivePersonnel(state: GameState, factionId: FactionId): number {
    const formations = state.formations ?? {};
    const formationIds = Object.keys(formations).sort((a, b) => a.localeCompare(b));
    let total = 0;
    for (const id of formationIds) {
        const f = formations[id];
        if (!f || f.faction !== factionId || f.status !== 'active') continue;
        total += typeof f.personnel === 'number' && Number.isFinite(f.personnel) ? Math.max(0, f.personnel) : 0;
    }
    return total;
}

function computeAvailablePool(state: GameState, factionId: FactionId): number {
    const pools = state.militia_pools ?? {};
    const keys = Object.keys(pools).sort((a, b) => a.localeCompare(b));
    let total = 0;
    for (const key of keys) {
        const p = pools[key];
        if (!p || p.faction !== factionId) continue;
        total += typeof p.available === 'number' && Number.isFinite(p.available) ? Math.max(0, p.available) : 0;
    }
    return total;
}
