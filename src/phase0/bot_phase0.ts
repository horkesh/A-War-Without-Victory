/**
 * Phase 0 Bot AI: automated capital allocation for non-player factions.
 *
 * Faction-specific investment strategies reflecting historical behavior:
 * - RS: paramilitaries and party (SDS network) first, aggressive spending
 * - RBiH: TO (Territorial Defense) and party (SDA), broad coverage
 * - HRHB: police and party (HDZ) in Herzegovina core
 *
 * Deterministic: no Math.random(), no Date.now(). Uses strictCompare for ordering.
 */

import type { FactionId, GameState, MunicipalityId, OrganizationalPenetration } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import { updateAllianceAfterInvestment } from './alliance.js';
import { getPrewarCapital, PHASE0_FACTION_ORDER } from './capital.js';
import type { InvestmentType } from './investment.js';
import { applyInvestment, INVESTMENT_COST, isToAllowedForFaction } from './investment.js';

// ═══════════════════════════════════════════════════════════════════════════
// Faction-Specific Phase 0 Strategies
// ═══════════════════════════════════════════════════════════════════════════

interface FactionPhase0Strategy {
    /** Investment type priority order (first unmet target wins). */
    priority_order: InvestmentType[];
    /** Target count for each investment type before moving to next priority. */
    target_counts: Partial<Record<InvestmentType, number>>;
    /** Fraction of capital to spend per turn. */
    budget_fraction: number;
    /** Maximum budget per turn. */
    budget_cap: number;
    /** Scoring bonuses: faction-specific municipality scoring weights. */
    scoring: {
        /** Bonus for municipalities where faction already has investment. */
        consolidation: number;
        /** Bonus for municipalities with low stability (contested areas). */
        contested: number;
        /** Bonus for municipalities where faction is the political controller. */
        own_controller: number;
        /** Penalty for municipalities where enemy is the controller. */
        enemy_controller: number;
    };
}

const FACTION_PHASE0_STRATEGIES: Record<FactionId, FactionPhase0Strategy> = {
    RS: {
        // RS historical: paramilitaries first (White Eagles, Arkan's Tigers, etc.),
        // then SDS party network, then police. TO is not available to RS.
        // Aggressive spending: 15% of capital, cap 10.
        priority_order: ['paramilitary', 'party', 'police'],
        target_counts: { paramilitary: 5, party: 6, police: 3 },
        budget_fraction: 0.15,
        budget_cap: 10,
        scoring: {
            consolidation: 40,  // RS prefers deepening hold in strongholds
            contested: 5,       // RS avoids contested areas early (picks easy wins)
            own_controller: 20,
            enemy_controller: -20,
        }
    },
    RBiH: {
        // RBiH historical: Territorial Defense is the main pre-war asset,
        // then SDA party penetration, then police, then Patriotska Liga (paramilitary).
        // Moderate spending: 12% of capital.
        priority_order: ['to', 'party', 'police', 'paramilitary'],
        target_counts: { to: 3, party: 5, police: 3, paramilitary: 2 },
        budget_fraction: 0.12,
        budget_cap: 8,
        scoring: {
            consolidation: 25,
            contested: 15,      // RBiH must contest mixed areas (survival)
            own_controller: 15,
            enemy_controller: -10,
        }
    },
    HRHB: {
        // HRHB historical: HDZ party apparatus and police in Herzegovina core,
        // then paramilitaries. TO is not available to HRHB.
        // Moderate spending: 12% of capital.
        priority_order: ['police', 'party', 'paramilitary'],
        target_counts: { police: 4, party: 5, paramilitary: 3 },
        budget_fraction: 0.12,
        budget_cap: 8,
        scoring: {
            consolidation: 35,
            contested: 8,
            own_controller: 20,
            enemy_controller: -15,
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// Scoring Constants (shared)
// ═══════════════════════════════════════════════════════════════════════════

const SCORE_DOMINANT_PEN = 20;   // Own penetration exceeds enemies
const SCORE_HOSTILE_MAJORITY = -50;  // Strong enemy presence penalty
const SCORE_HEAVY_PEN_50 = -40;  // Diminishing returns at 50% pen
const SCORE_HEAVY_PEN_80 = -60;  // Severe diminishing returns at 80%
const SCORE_MISSING_MUN = -200; // Municipality not found sentinel
const SCORE_HOSTILE_THRESHOLD = -100; // Skip municipalities below this
const ENEMY_PEN_THRESHOLD = 50;   // Enemy pen level considered "strong"
const STABILITY_CONTESTED_BELOW = 50;   // Stability below this = contested
const PEN_HEAVY_THRESHOLD = 50;   // Own pen at which diminishing returns kick in
const PEN_VERY_HEAVY_THRESHOLD = 80;   // Own pen at which severe penalty applies
const TIEBREAKER_MOD = 5;    // Modulus for deterministic tiebreaker
const MIN_INVESTMENT_BUDGET = 4;    // Minimum budget to attempt investment

/**
 * Simple deterministic hash for tie-breaking.
 */
function simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/**
 * Score a municipality for investment by a given faction.
 * Uses faction-specific scoring weights from FACTION_PHASE0_STRATEGIES.
 * Higher = more desirable.
 */
function scoreMunicipality(
    state: GameState,
    munId: MunicipalityId,
    factionId: FactionId,
    seed: string,
    strategy: FactionPhase0Strategy
): number {
    const mun = state.municipalities?.[munId];
    if (!mun) return SCORE_MISSING_MUN;

    const op = mun.organizational_penetration;
    let score = 0;

    const ownPen = getFactionPenetration(op, factionId);
    const [enemy1, enemy2] = getEnemies(factionId);
    const maxEnemyPen = Math.max(getFactionPenetration(op, enemy1), getFactionPenetration(op, enemy2));

    // Faction-specific scoring weights
    if (ownPen > 0) score += strategy.scoring.consolidation;
    if (ownPen > maxEnemyPen) score += SCORE_DOMINANT_PEN;
    if (maxEnemyPen > ENEMY_PEN_THRESHOLD) score += SCORE_HOSTILE_MAJORITY;

    const stability = mun.stability_score ?? 50;
    if (stability < STABILITY_CONTESTED_BELOW) score += strategy.scoring.contested;

    if (ownPen >= PEN_VERY_HEAVY_THRESHOLD) score += SCORE_HEAVY_PEN_80;
    else if (ownPen >= PEN_HEAVY_THRESHOLD) score += SCORE_HEAVY_PEN_50;

    const controller = state.political_controllers?.[munId];
    if (controller === factionId) score += strategy.scoring.own_controller;
    if (controller && controller !== factionId) score += strategy.scoring.enemy_controller;

    score += (simpleHash(seed + factionId + munId) % TIEBREAKER_MOD);

    return score;
}

function getFactionPenetration(
    op: OrganizationalPenetration | undefined,
    factionId: FactionId
): number {
    if (!op) return 0;
    switch (factionId) {
        case 'RS': return op.sds_penetration ?? 0;
        case 'RBiH': return op.sda_penetration ?? 0;
        case 'HRHB': return op.hdz_penetration ?? 0;
        default: return 0;
    }
}

/** Return the two enemy factions for a given faction. */
function getEnemies(factionId: FactionId): [FactionId, FactionId] {
    switch (factionId) {
        case 'RS': return ['RBiH', 'HRHB'];
        case 'RBiH': return ['RS', 'HRHB'];
        case 'HRHB': return ['RS', 'RBiH'];
        default: return ['RS', 'RBiH'];
    }
}

/**
 * Count municipalities where a faction has invested in a specific way.
 */
function countInvestedMunicipalities(
    state: GameState,
    factionId: FactionId,
    checkType: 'police' | 'to' | 'party' | 'paramilitary'
): number {
    if (!state.municipalities) return 0;
    let count = 0;
    const munIds = Object.keys(state.municipalities).sort(strictCompare);

    for (const munId of munIds) {
        const op = state.municipalities[munId]?.organizational_penetration;
        if (!op) continue;

        switch (checkType) {
            case 'police':
                if (op.police_loyalty === 'loyal' && state.political_controllers?.[munId] === factionId) count++;
                break;
            case 'to':
                if (op.to_control === 'controlled') count++;
                break;
            case 'party': {
                const pen = getFactionPenetration(op, factionId);
                if (pen > 0) count++;
                break;
            }
            case 'paramilitary': {
                const opAny = op as Record<string, unknown>;
                if (factionId === 'RS' && ((opAny.paramilitary_rs as number) ?? 0) > 0) count++;
                else if (factionId === 'RBiH' && ((opAny.patriotska_liga as number) ?? 0) > 0) count++;
                else if (factionId === 'HRHB' && ((opAny.paramilitary_hrhb as number) ?? 0) > 0) count++;
                break;
            }
        }
    }
    return count;
}

/**
 * Choose investment type for a faction using faction-specific priority order.
 * Iterates the priority list; returns the first type whose target count is unmet.
 */
function chooseInvestmentType(
    state: GameState,
    factionId: FactionId,
    strategy: FactionPhase0Strategy
): InvestmentType {
    for (const investType of strategy.priority_order) {
        // Skip TO if not allowed for this faction
        if (investType === 'to' && !isToAllowedForFaction(factionId)) continue;
        const target = strategy.target_counts[investType] ?? 999;
        const count = countInvestedMunicipalities(state, factionId, investType);
        if (count < target) return investType;
    }
    // All targets met — fall back to last item in priority (always available)
    return strategy.priority_order[strategy.priority_order.length - 1];
}

/**
 * Check if RBiH-HRHB coordinated investment is worthwhile.
 * Coordinated investments cost less (0.8× multiplier) and improve the alliance.
 * Only applicable when alliance is still positive (> 0.2).
 */
function shouldCoordinate(
    state: GameState,
    factionId: FactionId
): boolean {
    if (factionId !== 'RBiH' && factionId !== 'HRHB') return false;
    const rels = state.phase0_relationships;
    if (!rels) return false;
    return rels.rbih_hrhb > 0.2;
}

/**
 * Run Phase 0 bot investments for all non-player factions.
 *
 * Called before the Phase 0 engine pipeline each turn.
 * Iterates factions in PHASE0_FACTION_ORDER (deterministic).
 * Skips the player faction. Each bot invests 1-2 times per turn
 * using faction-specific strategy (priority order, budget, scoring).
 *
 * Alliance-aware: RBiH/HRHB bots prefer coordinated investments when
 * the alliance is still positive, which costs less and strengthens ties.
 *
 * Mutates state in place.
 */
export function runPhase0BotInvestments(
    state: GameState,
    playerFaction: FactionId | undefined,
    seed: string
): void {
    if (!state.municipalities) return;

    for (const factionId of PHASE0_FACTION_ORDER) {
        // Skip player faction
        if (factionId === playerFaction) continue;

        const strategy = FACTION_PHASE0_STRATEGIES[factionId];
        const capital = getPrewarCapital(state, factionId);
        const budget = Math.min(strategy.budget_cap, Math.floor(capital * strategy.budget_fraction));
        if (budget < MIN_INVESTMENT_BUDGET) continue;

        // Score and rank municipalities using faction-specific weights
        const munIds = Object.keys(state.municipalities).sort(strictCompare);
        const scored: Array<{ munId: MunicipalityId; score: number }> = [];

        for (const munId of munIds) {
            const score = scoreMunicipality(state, munId, factionId, seed, strategy);
            if (score > SCORE_HOSTILE_THRESHOLD) {
                scored.push({ munId, score });
            }
        }

        // Sort by score descending, ties by munId (deterministic)
        scored.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return strictCompare(a.munId, b.munId);
        });

        // Choose investment type using faction-specific priority
        const investType = chooseInvestmentType(state, factionId, strategy);
        const cost = INVESTMENT_COST[investType].municipality;
        const coordinated = shouldCoordinate(state, factionId);

        // First investment: top municipality
        if (scored.length > 0 && capital >= cost) {
            const target = scored[0];
            const result = applyInvestment(
                state,
                factionId,
                investType,
                { kind: 'municipality', mun_ids: [target.munId] },
                { coordinated }
            );
            // Update alliance tracking
            if (result.ok && state.phase0_relationships) {
                updateAllianceAfterInvestment(state.phase0_relationships, factionId, coordinated);
            }
        }

        // Second investment if budget allows — different type for breadth
        const remainingCapital = getPrewarCapital(state, factionId);
        if (scored.length > 1 && remainingCapital >= MIN_INVESTMENT_BUDGET) {
            // Pick a different investment type for the second investment
            let secondType = investType;
            for (const alt of strategy.priority_order) {
                if (alt === investType) continue;
                if (alt === 'to' && !isToAllowedForFaction(factionId)) continue;
                secondType = alt;
                break;
            }
            const secondCost = INVESTMENT_COST[secondType].municipality;
            if (remainingCapital >= secondCost) {
                const result = applyInvestment(
                    state,
                    factionId,
                    secondType,
                    { kind: 'municipality', mun_ids: [scored[1].munId] },
                    { coordinated }
                );
                if (result.ok && state.phase0_relationships) {
                    updateAllianceAfterInvestment(state.phase0_relationships, factionId, coordinated);
                }
            }
        }
    }
}
