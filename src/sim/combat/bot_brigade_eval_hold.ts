import type { BrigadeEvaluationContext } from './bot_brigade_eval_types.js';
import { getFormationTier, MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { predictAllAdjacentTargets } from './combat_predictor.js';
import { isOutcomeSufficientForAttack } from './bot_brigade_targeting.js';

export function evaluateGarrisonAndDetachments(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, result } = ctx;

    // Garrison units (e.g. VRS 65th Protection) only defend home — never attack.
    if (brigade.garrison === true) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    // Detachments (militia kind, < 500 personnel) only garrison — never attack.
    if (brigade.kind === 'militia' && getFormationTier(brigade) === 'detachment') {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    // Combat-ineffective brigades: below MIN_ATTACK_PERSONNEL, can only defend.
    // A sub-200-man unit lacks the mass to assault positions — prevents death-spiral
    // attacks where depleted brigades throw 100-200 men at fortified positions repeatedly.
    if ((brigade.personnel ?? 0) < MIN_ATTACK_PERSONNEL) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
        return true;
    }

    return false;
}

export function evaluateReserve(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, corpsId, directive, adjEnemy, corpsReserve, graphAnalysis, loc, adjacency, result } = ctx;

    // --- Reserve check: should this brigade be in reserve? ---
    if (directive && corpsId) {
        const reserveInfo = corpsReserve.get(corpsId);
        if (reserveInfo) {
            const maxReserve = Math.floor(reserveInfo.total * directive.reserve_fraction);
            // Interior brigades (no enemy adjacent) become reserve first
            if (reserveInfo.reserved < maxReserve && adjEnemy.length === 0) {
                const osidAnalysis = graphAnalysis.osid_analysis.get(loc);
                if (!osidAnalysis || osidAnalysis.enemy_neighbors.length === 0) {
                    // Only hold as reserve if within 1 hop of the front.
                    // Deep-rear brigades (2+ hops) should march toward the front
                    // instead of sitting idle — fall through to interior movement.
                    const neighbors = adjacency.get(loc as import('./osid_adjacency.js').Osid) ?? [];
                    const nearFront = neighbors.some(n => {
                        const nAnalysis = graphAnalysis.osid_analysis.get(n as import('./osid_adjacency.js').Osid);
                        return nAnalysis != null && nAnalysis.enemy_neighbors.length > 0;
                    });
                    if (!nearFront) return false; // deep rear — let interior movement handle it
                    reserveInfo.reserved++;
                    result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
                    return true;
                }
            }
        }
    }
    return false;
}

export function evaluateHold(ctx: BrigadeEvaluationContext): boolean {
    const { brigade, directive, loc, counterAttackTarget, adjEnemy, state, reverseMap, terrainCache, supplyStateByOsid, osidPopulationMap, ethnicMap, chosenTargets, corpsStance, result, adjacency } = ctx;

    // --- Rule 2: Hold OSID — defend by default, but offensive corps can attack from hold ---
    // Chokepoints are important to hold, but during a corps offensive the brigade should
    // still evaluate attacks against adjacent targets. If the attack succeeds and the brigade
    // advances, the chokepoint becomes interior (front moves forward). If no viable attack,
    // the brigade defends the chokepoint as before.
    if (directive && directive.hold_osids.includes(loc)) {
        // Counter-attack exception: if THIS brigade retreated from an adjacent OSID last turn, counter-attack
        if (counterAttackTarget && adjEnemy.includes(counterAttackTarget)) {
            const targets = predictAllAdjacentTargets(state, brigade.id, adjacency, reverseMap, terrainCache, 'attack', supplyStateByOsid, osidPopulationMap, undefined, ethnicMap);
            const counter = targets.find(t => t.osid === counterAttackTarget &&
                isOutcomeSufficientForAttack(t.prediction.predicted_outcome, 'costly_victory'));
            if (counter && (chosenTargets.get(counter.osid) ?? 0) < (directive.max_attackers_per_target)) {
                result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
                result.attack_orders[brigade.id] = counter.osid;
                result.attack_scores[brigade.id] = 1000; // Counter-attack: high priority
                chosenTargets.set(counter.osid, (chosenTargets.get(counter.osid) ?? 0) + 1);
                return true;
            }
        }
        if (corpsStance === 'offensive' && adjEnemy.length > 0) {
            // Offensive corps: fall through to attack evaluation (Rule 5).
            // If no viable attack found, the isHoldBrigade flag ensures we defend.
            ctx.isHoldBrigade = true;
            return false; // don't return true, let it fall through
        } else {
            result.posture_orders.push({ brigade_id: brigade.id, posture: 'defend' });
            return true;
        }
    }
    return false;
}
