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
import {
    finalCompetencyCost,
    finalConstitutionalCost,
    finalReturnJusticeCost,
    getDialDeclarationCost,
} from './dayton_dial_cost.js';
import {
    adjustedCost,
    dialPrefDelta,
    competencyPrefDelta,
    competencyIdealOwner,
    constitutionalPrefDelta,
    constitutionalIdealOption,
    counterDialTowardIdeal,
} from './bot_preferences.js';
import {
    getConstitutionalChoiceById,
    CONSTITUTIONAL_CHOICES,
    RETURN_JUSTICE_CHOICES,
} from './constitutional_packages.js';
import type { CompetencyOwner } from './competency_packages.js';
import { strictCompare } from '../../state/validateGameState.js';

/** The dial actually declared on a proposal (absent ⇒ historical baseline). */
function proposalDial(proposal: DaytonProposal): import('../../state/negotiation_types.js').EntityAutonomySetting {
    return proposal.entity_autonomy ?? 'dayton-historical';
}

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

    // Institutional choices that cost this faction (legacy 6 toggles — unchanged
    // raw cost; preserved for byte-identity of the legacy resolution path).
    for (const pkgId of Object.keys(proposal.institutional_choices).sort(strictCompare)) {
        const choice = proposal.institutional_choices[pkgId];
        const pkg = getInstitutionalPackageById(pkgId);
        if (!pkg || !choice) continue;
        totalCost += getInstitutionalCost(pkg, choice, faction);
    }

    // ── Institutional-architecture expansion (Phase 2) — Dim 2/3/4/5 ──────────
    // All branches below are no-ops at the historical default (absent fields ⇒ no
    // iteration; dial dayton-historical ⇒ 0 declaration + 1.0× multipliers ⇒ base
    // cost; base cost 0 at every default), so the all-default proposal is BYTE-
    // IDENTICAL. The bot's IDEOLOGICAL adjustment (preference-weighted + objection
    // floor) is layered on top so a bot objects to anathema choices even when the
    // asymmetric model bills it nothing.
    const dial = proposalDial(proposal);

    // DIMENSION 2 — one-time dial declaration cost, ideologically adjusted.
    if (dial !== 'dayton-historical') {
        const declBase = getDialDeclarationCost(dial, faction);
        totalCost += adjustedCost(declBase, dialPrefDelta(faction, dial));
    }

    // DIMENSION 3 — competency allocation (post-dial base × ideological adjustment).
    const comp = proposal.competency_allocation;
    if (comp) {
        for (const compId of Object.keys(comp).sort(strictCompare)) {
            const owner = comp[compId] as CompetencyOwner;
            if (!owner) continue;
            const base = finalCompetencyCost(compId, owner, faction, dial);
            totalCost += adjustedCost(base, competencyPrefDelta(faction, compId, owner));
        }
    }

    // DIMENSION 4 — constitutional choices.
    const cc = proposal.constitutional_choices;
    if (cc) {
        for (const slotId of Object.keys(cc).sort(strictCompare)) {
            const optionId = cc[slotId];
            if (!optionId) continue;
            const base = finalConstitutionalCost(slotId, optionId, faction, dial);
            const order = getConstitutionalChoiceById(slotId)?.options.map(o => o.id) ?? [];
            totalCost += adjustedCost(base, constitutionalPrefDelta(faction, slotId, optionId, order));
        }
    }

    // DIMENSION 5 — return/justice choices.
    const rj = proposal.return_justice;
    if (rj) {
        for (const slotId of Object.keys(rj).sort(strictCompare)) {
            const optionId = rj[slotId];
            if (!optionId) continue;
            const base = finalReturnJusticeCost(slotId, optionId, faction, dial);
            const order = getConstitutionalChoiceById(slotId)?.options.map(o => o.id) ?? [];
            totalCost += adjustedCost(base, constitutionalPrefDelta(faction, slotId, optionId, order));
        }
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
    const countered = generateCounterProposal(proposal, faction, compositeCapital, willingnessFraction);

    if (countered) {
        return {
            decision: 'counter',
            counter_proposal: countered.counter,
            reason: `Proposal cost (${proposalCost}) exceeds acceptable range (${Math.floor(maxAcceptableCost)}). Counter-proposal offered. ${countered.citation}`,
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

/** A real 1994-95 negotiating stance cited per faction on a counter-offer. */
const COUNTER_CITATION: Readonly<Record<string, string>> = Object.freeze({
    RS: 'RS: Pale rejected the Contact-Group plan (3 Aug 1994) — entity sovereignty, no central state.',
    RBiH: 'RBiH: Sarajevo held to a unitary, citizen-based state through the 1995 talks.',
    HRHB: 'HRHB: Washington Agreement (Mar 1994) — Croat constituent-people status inside the Federation.',
});

/**
 * Generate an ideologically-driven counter-proposal (Phase 2).
 *
 * Strategy:
 *  1. Drop the territorial demands and flip the legacy institutional choices that
 *     cost this faction most (existing behavior), AND drop/flip the most
 *     ideologically-painful Dim-3/4/5 cross-grain choices toward the bot's ideal.
 *  2. Emit an explicit ONE-STEP counter-dial toward the bot's ideal
 *     (unitary→federalized→dayton-historical→confederation), never jumping more
 *     than one notch (chain-depth ≤2 honored by the caller; the dial moves at most
 *     one step per round).
 *  3. Cite a real 1994-95 stance.
 *
 * The counter is returned with its citation. Pure & deterministic (sorted, no RNG).
 */
function generateCounterProposal(
    originalProposal: DaytonProposal,
    faction: string,
    availableCapital: number,
    willingnessFraction: number
): { counter: DaytonProposal; citation: string } | undefined {
    const maxCost = availableCapital * willingnessFraction;
    const dial = proposalDial(originalProposal);

    // Build list of items costing this faction, sorted by cost descending. New-dim
    // items use the bot's IDEOLOGICAL (adjusted) cost so the most-painful cross-grain
    // choices are dropped first.
    type ItemType = 'territorial' | 'institutional' | 'competency' | 'constitutional' | 'return_justice';
    const costItems: Array<{ type: ItemType; id: string; cost: number }> = [];

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
        if (cost > 0) costItems.push({ type: 'institutional', id: pkgId, cost });
    }

    // DIMENSION 3 — competency allocations (adjusted cost).
    const comp = originalProposal.competency_allocation;
    if (comp) {
        for (const compId of Object.keys(comp).sort(strictCompare)) {
            const owner = comp[compId] as CompetencyOwner;
            if (!owner) continue;
            const base = finalCompetencyCost(compId, owner, faction, dial);
            const cost = adjustedCost(base, competencyPrefDelta(faction, compId, owner));
            if (cost > 0) costItems.push({ type: 'competency', id: compId, cost });
        }
    }

    // DIMENSION 4/5 — constitutional + return-justice (adjusted cost).
    const collectSlotItems = (
        map: Record<string, string> | undefined,
        type: 'constitutional' | 'return_justice',
        costFn: (slotId: string, optionId: string) => number,
    ) => {
        if (!map) return;
        for (const slotId of Object.keys(map).sort(strictCompare)) {
            const optionId = map[slotId];
            if (!optionId) continue;
            const base = costFn(slotId, optionId);
            const order = getConstitutionalChoiceById(slotId)?.options.map(o => o.id) ?? [];
            const cost = adjustedCost(base, constitutionalPrefDelta(faction, slotId, optionId, order));
            if (cost > 0) costItems.push({ type, id: slotId, cost });
        }
    };
    collectSlotItems(originalProposal.constitutional_choices, 'constitutional',
        (s, o) => finalConstitutionalCost(s, o, faction, dial));
    collectSlotItems(originalProposal.return_justice, 'return_justice',
        (s, o) => finalReturnJusticeCost(s, o, faction, dial));

    // Sort descending by (ideological) cost — most painful first. Tie-break by id.
    costItems.sort((a, b) => (b.cost !== a.cost ? b.cost - a.cost : strictCompare(a.id, b.id)));

    // Progressively remove/flip items until the cost is acceptable.
    const removedTerritorial = new Set<string>();
    const flippedInstitutional = new Set<string>();
    const flippedCompetency = new Set<string>();
    const flippedConstitutional = new Set<string>();
    const flippedReturnJustice = new Set<string>();
    let currentCost = computeProposalCostToFaction(originalProposal, faction);

    // One-step counter-dial toward the bot's ideal (always offered when the declared
    // dial is not already the bot's ideal). The cost relief is the difference between
    // the original proposal cost and the cost with the counter-dial applied.
    const counterDial = counterDialTowardIdeal(faction, dial);

    for (const item of costItems) {
        if (currentCost <= maxCost) break;
        currentCost -= item.cost;
        switch (item.type) {
            case 'territorial': removedTerritorial.add(item.id); break;
            case 'institutional': flippedInstitutional.add(item.id); break;
            case 'competency': flippedCompetency.add(item.id); break;
            case 'constitutional': flippedConstitutional.add(item.id); break;
            case 'return_justice': flippedReturnJustice.add(item.id); break;
        }
    }

    // Build counter-proposal (chain depth honored by the caller; the dial moves ≤1).
    const counter: DaytonProposal = {
        territorial_demands: originalProposal.territorial_demands.filter(id => !removedTerritorial.has(id)),
        territorial_concessions: [...originalProposal.territorial_concessions],
        institutional_choices: { ...originalProposal.institutional_choices },
    };
    if (counterDial !== dial) counter.entity_autonomy = counterDial;

    // Flip legacy institutional choices that were removed.
    for (const id of flippedInstitutional) {
        counter.institutional_choices[id] =
            counter.institutional_choices[id] === 'centralized' ? 'decentralized' : 'centralized';
    }

    // DIMENSION 3 — flip the painful competencies toward the bot's ideal owner.
    if (comp) {
        const out: Record<string, CompetencyOwner> = { ...(comp as Record<string, CompetencyOwner>) };
        for (const compId of flippedCompetency) out[compId] = competencyIdealOwner(faction, compId);
        counter.competency_allocation = out;
    }

    // DIMENSION 4/5 — flip the painful slots toward the bot's ideal option (drop the
    // slot to its default when the bot has no listed ideal for it).
    if (originalProposal.constitutional_choices) {
        const out: Record<string, string> = { ...originalProposal.constitutional_choices };
        for (const slotId of flippedConstitutional) {
            const ideal = constitutionalIdealOption(faction, slotId)
                ?? getConstitutionalChoiceById(slotId)?.options.find(o => o.is_default)?.id;
            if (ideal) out[slotId] = ideal;
        }
        counter.constitutional_choices = out;
    }
    if (originalProposal.return_justice) {
        const out: Record<string, string> = { ...originalProposal.return_justice };
        for (const slotId of flippedReturnJustice) {
            const ideal = constitutionalIdealOption(faction, slotId)
                ?? getConstitutionalChoiceById(slotId)?.options.find(o => o.is_default)?.id;
            if (ideal) out[slotId] = ideal;
        }
        counter.return_justice = out;
    }

    // Recompute the counter's cost (it now carries the counter-dial + ideological
    // flips). If still over budget after the full ideological retreat, no viable
    // counter — the bot rejects outright.
    const counterCost = computeProposalCostToFaction(counter, faction);
    if (counterCost > maxCost) return undefined;

    return { counter, citation: COUNTER_CITATION[faction] ?? '' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
