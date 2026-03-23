/**
 * Bot negotiation AI for the Dayton negotiation.
 *
 * Evaluates proposals using threshold-based logic against the bot faction's
 * available negotiation capital and patron override authority.
 *
 * Deterministic: sorted iteration, no Math.random().
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    DaytonProposal,
    DaytonBotResponse,
    NegotiationBreakdown,
    PatronRelationship,
} from '../../state/negotiation_types.js';
import { computeNegotiatingCapital } from '../events/strategic_dimensions.js';
import type { DimensionStore } from '../events/strategic_dimensions.js';
import { getTerritorialPackageById } from './territorial_packages.js';
import { getInstitutionalPackageById, getInstitutionalCost } from './institutional_packages.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Patron override threshold at which the bot accepts almost anything. */
const PATRON_FORCE_ACCEPTANCE_THRESHOLD = 90;

/** Patron override threshold at which acceptable cost range widens significantly. */
const PATRON_STRONG_PRESSURE_THRESHOLD = 75;

/** Patron override threshold at which the bot becomes somewhat more flexible. */
const PATRON_MODERATE_PRESSURE_THRESHOLD = 50;

/** Fraction of available capital the bot is willing to spend (base willingness). */
const BASE_SPENDING_WILLINGNESS = 0.6;

// ═══════════════════════════════════════════════════════════════════════════
// Composite capital computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the composite (weighted) negotiation capital for a faction.
 * Uses DIMENSION_WEIGHTS from strategic_dimensions.ts.
 */
export function getCompositeCapital(_breakdown: NegotiationBreakdown, faction: string, dimensionStore?: DimensionStore): number {
    if (!dimensionStore) return 50; // TODO: require dimensionStore once all callers pass it
    return clamp(computeNegotiatingCapital(dimensionStore, faction), 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// Proposal cost computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the total capital cost of a proposal to a specific bot faction.
 *
 * Cost comes from:
 * - Territorial packages the bot must concede (packages it holds that the proposer demands)
 * - Territorial packages the bot demands (packages held by others)
 * - Institutional choices that cost this faction capital
 */
export function computeProposalCostToFaction(
    proposal: DaytonProposal,
    faction: string
): number {
    let totalCost = 0;

    // Territorial demands against this faction: if the proposer demands a package
    // whose default_holder is this bot faction, it costs the bot concession capital.
    for (const pkgId of [...proposal.territorial_demands].sort(strictCompare)) {
        const pkg = getTerritorialPackageById(pkgId);
        if (!pkg) continue;
        if (pkg.default_holder === faction) {
            totalCost += pkg.capital_cost_to_concede;
        }
    }

    // Institutional choices that cost this faction
    for (const pkgId of Object.keys(proposal.institutional_choices).sort(strictCompare)) {
        const choice = proposal.institutional_choices[pkgId];
        const pkg = getInstitutionalPackageById(pkgId);
        if (!pkg || !choice) continue;
        totalCost += getInstitutionalCost(pkg, choice, faction);
    }

    return totalCost;
}

// ═══════════════════════════════════════════════════════════════════════════
// Bot response evaluation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate a bot faction's response to a Dayton proposal.
 *
 * Decision logic (threshold-based):
 * 1. If patron override >= 90, accept almost anything (cost <= 95% of capital).
 * 2. If patron override >= 75, accept if cost <= 80% of capital.
 * 3. If patron override >= 50, accept if cost <= 70% of capital.
 * 4. Otherwise, accept if cost <= 60% of capital.
 * 5. If rejected, generate a counter-proposal by dropping the most expensive demands.
 */
export function evaluateBotResponse(
    state: GameState,
    faction: FactionId,
    proposal: DaytonProposal
): DaytonBotResponse {
    const neg = state.military.negotiation;
    if (!neg) {
        return {
            decision: 'reject',
            reason: 'No negotiation state available.',
            proposal_cost: 0,
            available_capital: 0,
        };
    }

    const capital = neg.capital[faction];
    const patronRel = neg.patron_relationships[faction];
    if (!capital) {
        return {
            decision: 'reject',
            reason: 'No capital data for faction.',
            proposal_cost: 0,
            available_capital: 0,
        };
    }

    const compositeCapital = getCompositeCapital(capital, faction, neg.strategic_dimensions);
    const proposalCost = computeProposalCostToFaction(proposal, faction);
    const overrideAuthority = patronRel?.override_authority ?? 0;

    // Determine spending willingness based on patron pressure
    let willingnessFraction = BASE_SPENDING_WILLINGNESS;
    if (overrideAuthority >= PATRON_FORCE_ACCEPTANCE_THRESHOLD) {
        willingnessFraction = 0.95;
    } else if (overrideAuthority >= PATRON_STRONG_PRESSURE_THRESHOLD) {
        willingnessFraction = 0.80;
    } else if (overrideAuthority >= PATRON_MODERATE_PRESSURE_THRESHOLD) {
        willingnessFraction = 0.70;
    }

    const maxAcceptableCost = compositeCapital * willingnessFraction;

    // Accept if cost is within acceptable range
    if (proposalCost <= maxAcceptableCost) {
        const reason = overrideAuthority >= PATRON_STRONG_PRESSURE_THRESHOLD
            ? `Accepted under patron pressure (override: ${overrideAuthority}).`
            : `Proposal cost (${proposalCost}) within acceptable range (${Math.floor(maxAcceptableCost)}).`;

        return {
            decision: 'accept',
            reason,
            proposal_cost: proposalCost,
            available_capital: compositeCapital,
        };
    }

    // Reject — generate counter-proposal
    const counter = generateCounterProposal(proposal, faction, compositeCapital, willingnessFraction);

    if (counter) {
        return {
            decision: 'counter',
            counter_proposal: counter,
            reason: `Proposal cost (${proposalCost}) exceeds acceptable range (${Math.floor(maxAcceptableCost)}). Counter-proposal offered.`,
            proposal_cost: proposalCost,
            available_capital: compositeCapital,
        };
    }

    return {
        decision: 'reject',
        reason: `Proposal cost (${proposalCost}) exceeds available capital (${Math.floor(compositeCapital)}). No viable counter-proposal.`,
        proposal_cost: proposalCost,
        available_capital: compositeCapital,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Counter-proposal generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a counter-proposal by dropping the most expensive demands
 * against this faction until the proposal falls within acceptable range.
 *
 * Strategy: remove territorial demands (most expensive first) that target
 * this faction's territory, then flip institutional choices if still over budget.
 */
function generateCounterProposal(
    originalProposal: DaytonProposal,
    faction: string,
    availableCapital: number,
    willingnessFraction: number
): DaytonProposal | undefined {
    const maxCost = availableCapital * willingnessFraction;

    // Build list of items costing this faction, sorted by cost descending
    const costItems: Array<{ type: 'territorial' | 'institutional'; id: string; cost: number }> = [];

    for (const pkgId of [...originalProposal.territorial_demands].sort(strictCompare)) {
        const pkg = getTerritorialPackageById(pkgId);
        if (!pkg) continue;
        if (pkg.default_holder === faction) {
            costItems.push({ type: 'territorial', id: pkgId, cost: pkg.capital_cost_to_concede });
        }
    }

    for (const pkgId of Object.keys(originalProposal.institutional_choices).sort(strictCompare)) {
        const choice = originalProposal.institutional_choices[pkgId];
        const pkg = getInstitutionalPackageById(pkgId);
        if (!pkg || !choice) continue;
        const cost = getInstitutionalCost(pkg, choice, faction);
        if (cost > 0) {
            costItems.push({ type: 'institutional', id: pkgId, cost });
        }
    }

    // Sort descending by cost (deterministic: break ties by ID)
    costItems.sort((a, b) => {
        if (b.cost !== a.cost) return b.cost - a.cost;
        return strictCompare(a.id, b.id);
    });

    // Progressively remove items until cost is acceptable
    const removedTerritorial = new Set<string>();
    const flippedInstitutional = new Set<string>();
    let currentCost = computeProposalCostToFaction(originalProposal, faction);

    for (const item of costItems) {
        if (currentCost <= maxCost) break;

        if (item.type === 'territorial') {
            removedTerritorial.add(item.id);
            currentCost -= item.cost;
        } else {
            flippedInstitutional.add(item.id);
            currentCost -= item.cost;
        }
    }

    // If we couldn't bring it under budget, no viable counter
    if (currentCost > maxCost) return undefined;

    // Build counter-proposal
    const counter: DaytonProposal = {
        territorial_demands: originalProposal.territorial_demands.filter(
            id => !removedTerritorial.has(id)
        ),
        territorial_concessions: [
            ...originalProposal.territorial_concessions,
        ],
        institutional_choices: { ...originalProposal.institutional_choices },
    };

    // Flip institutional choices that were removed
    for (const id of flippedInstitutional) {
        const current = counter.institutional_choices[id];
        if (current === 'centralized') {
            counter.institutional_choices[id] = 'decentralized';
        } else {
            counter.institutional_choices[id] = 'centralized';
        }
    }

    return counter;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
