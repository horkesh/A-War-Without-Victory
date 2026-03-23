/**
 * Core Dayton negotiation logic.
 *
 * Handles initiation and resolution of the Dayton Agreement negotiation.
 * Called when the game reaches week 188 (November 1995) or when forced
 * by patron pressure exceeding the override threshold.
 *
 * Deterministic: sorted iteration, no Math.random().
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    DaytonProposal,
    DaytonResult,
    DaytonBotResponse,
    NegotiationState,
} from '../../state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import { getAllTerritorialPackages, getTerritorialPackageById } from './territorial_packages.js';
import { getAllInstitutionalPackages } from './institutional_packages.js';
import { evaluateBotResponse, getCompositeCapital, computeProposalCostToFaction } from './bot_negotiation.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

/** Week (from April 1992 start) when Dayton fires: ~188 weeks = November 1995. */
export const DAYTON_TRIGGER_WEEK = 188;

/** Patron override level at which Dayton is forced even before week 188. */
const FORCED_DAYTON_OVERRIDE_THRESHOLD = 95;

/** Historical territory split baseline: Federation 51%, RS 49%. */
const HISTORICAL_FEDERATION_PCT = 51;
const HISTORICAL_RS_PCT = 49;

// ═══════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check whether the Dayton negotiation should initiate.
 *
 * Triggers when:
 * 1. War week >= DAYTON_TRIGGER_WEEK (188), OR
 * 2. ALL factions have patron override >= FORCED_DAYTON_OVERRIDE_THRESHOLD
 *
 * Returns true if Dayton should begin.
 */
export function shouldInitiateDayton(state: GameState): boolean {
    if (state.meta.phase !== 'war') return false;
    if (state.meta.game_over) return false;

    // Already resolved
    if (state.military.negotiation?.dayton_result) return false;

    const warStart = state.meta.war_start_turn ?? 0;
    const warWeek = state.meta.turn - warStart;

    // Trigger 1: reached the Dayton date
    if (warWeek >= DAYTON_TRIGGER_WEEK) return true;

    // Trigger 2: all patrons forcing acceptance
    const neg = state.military.negotiation;
    if (neg) {
        const allForced = CANONICAL_FACTIONS.every(faction => {
            const pr = neg.patron_relationships[faction];
            return pr && pr.override_authority >= FORCED_DAYTON_OVERRIDE_THRESHOLD;
        });
        if (allForced) return true;
    }

    return false;
}

/**
 * Initiate the Dayton negotiation. Sets up the negotiation state
 * and returns a summary of available packages and faction positions.
 *
 * Does NOT resolve the negotiation — that requires player input
 * via resolveDaytonNegotiation().
 */
export function initiateDaytonNegotiation(state: GameState): {
    territorial_packages: Array<{ id: string; name: string; default_holder: string; demand_cost: number; concede_cost: number }>;
    institutional_packages: Array<{ id: string; name: string; centralized_cost: number; decentralized_cost: number }>;
    faction_capital: Record<string, number>;
    patron_override: Record<string, number>;
} {
    ensureNegotiationState(state);

    const neg = state.military.negotiation!;

    // Compute composite capital per faction
    const factionCapital: Record<string, number> = {};
    const patronOverride: Record<string, number> = {};

    for (const faction of CANONICAL_FACTIONS) {
        const cap = neg.capital[faction];
        factionCapital[faction] = cap ? getCompositeCapital(cap, faction, neg.strategic_dimensions) : 50;
        patronOverride[faction] = neg.patron_relationships[faction]?.override_authority ?? 0;
    }

    return {
        territorial_packages: getAllTerritorialPackages().map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            default_holder: pkg.default_holder,
            demand_cost: pkg.capital_cost_to_demand,
            concede_cost: pkg.capital_cost_to_concede,
        })),
        institutional_packages: getAllInstitutionalPackages().map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            centralized_cost: pkg.centralized_cost,
            decentralized_cost: pkg.decentralized_cost,
        })),
        faction_capital: factionCapital,
        patron_override: patronOverride,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the Dayton negotiation given the player's proposal.
 *
 * Steps:
 * 1. Validate the player's proposal (costs within capital budget).
 * 2. Evaluate bot responses for each non-player faction.
 * 3. For rejected/countered items, apply patron overrides.
 * 4. Build final DaytonResult and store in state.
 *
 * @param state - Current game state
 * @param playerProposal - Player's selected territorial demands, concessions, and institutional choices
 * @returns The final DaytonResult
 */
export function resolveDaytonNegotiation(
    state: GameState,
    playerProposal: DaytonProposal
): DaytonResult {
    ensureNegotiationState(state);

    const neg = state.military.negotiation!;
    const playerFaction = state.meta.player_faction ?? 'RBiH';
    const botFactions = CANONICAL_FACTIONS.filter(f => f !== playerFaction).sort(strictCompare);

    // Collect bot responses
    const botResponses: Record<string, DaytonBotResponse> = {};
    for (const faction of botFactions) {
        botResponses[faction] = evaluateBotResponse(state, faction, playerProposal);
    }

    // Build the final agreement by resolving each package
    const acceptedTerritorial: string[] = [];
    const rejectedTerritorial: string[] = [];
    const patronOverrides: string[] = [];

    // Process territorial demands
    const allTerritorialIds = getAllTerritorialPackages().map(p => p.id).sort(strictCompare);

    for (const pkgId of allTerritorialIds) {
        const isDemanded = playerProposal.territorial_demands.includes(pkgId);
        const isConceded = playerProposal.territorial_concessions.includes(pkgId);

        if (!isDemanded && !isConceded) {
            // Not part of the negotiation — stays with default holder
            rejectedTerritorial.push(pkgId);
            continue;
        }

        if (isConceded) {
            // Player conceded this — accepted by definition
            acceptedTerritorial.push(pkgId);
            continue;
        }

        // Player demanded this — check if bots accept
        const pkg = getTerritorialPackageById(pkgId);
        if (!pkg) {
            rejectedTerritorial.push(pkgId);
            continue;
        }

        // The faction that holds this package must accept the demand
        const holderFaction = pkg.default_holder;

        if (holderFaction === playerFaction) {
            // Player already holds it — auto-accepted
            acceptedTerritorial.push(pkgId);
            continue;
        }

        const holderResponse = botResponses[holderFaction];

        if (holderResponse && holderResponse.decision === 'accept') {
            acceptedTerritorial.push(pkgId);
        } else {
            // Check patron override for the holding faction
            const holderPatron = neg.patron_relationships[holderFaction];
            if (holderPatron && holderPatron.override_authority >= 75) {
                // Patron forces acceptance of this specific demand
                acceptedTerritorial.push(pkgId);
                patronOverrides.push(`territorial:${pkgId}:${holderFaction}`);
            } else {
                rejectedTerritorial.push(pkgId);
            }
        }
    }

    // Process institutional choices
    const finalInstitutional: Record<string, 'centralized' | 'decentralized'> = {};
    const allInstitutionalIds = getAllInstitutionalPackages().map(p => p.id).sort(strictCompare);

    for (const pkgId of allInstitutionalIds) {
        const playerChoice = playerProposal.institutional_choices[pkgId];

        if (!playerChoice) {
            // No choice made — default to historical (decentralized)
            finalInstitutional[pkgId] = 'decentralized';
            continue;
        }

        // Check if any bot faction objects
        let objected = false;
        for (const botFaction of botFactions) {
            const botResp = botResponses[botFaction];
            if (botResp && botResp.decision !== 'accept') {
                // Bot objected overall — check if this specific institutional choice is viable
                const costToBotFaction = computeProposalCostToFaction(
                    { territorial_demands: [], territorial_concessions: [], institutional_choices: { [pkgId]: playerChoice } },
                    botFaction
                );
                const botCapital = neg.capital[botFaction]
                    ? getCompositeCapital(neg.capital[botFaction], botFaction, neg.strategic_dimensions)
                    : 0;

                if (costToBotFaction > botCapital * 0.3) {
                    objected = true;

                    // Check patron override
                    const botPatron = neg.patron_relationships[botFaction];
                    if (botPatron && botPatron.override_authority >= 75) {
                        objected = false;
                        patronOverrides.push(`institutional:${pkgId}:${botFaction}`);
                    }
                }
            }
        }

        finalInstitutional[pkgId] = objected ? flipChoice(playerChoice) : playerChoice;
    }

    // Compute approximate final territory split
    const territorySplit = computeTerritorySplit(state, acceptedTerritorial, rejectedTerritorial);

    const result: DaytonResult = {
        territorial_packages_accepted: acceptedTerritorial.sort(strictCompare),
        territorial_packages_rejected: rejectedTerritorial.sort(strictCompare),
        institutional_choices: finalInstitutional,
        final_territory_split: territorySplit,
        patron_overrides_applied: patronOverrides.sort(strictCompare),
    };

    // Store result on state
    neg.dayton_result = result;

    // Mark game as over
    state.meta.game_over = true;
    state.meta.outcome = 'dayton';

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Territory split estimation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estimate the final territory split based on accepted/rejected packages.
 *
 * Starts from the current front-line territory percentages and adjusts
 * based on package transfers. This is an approximation — the actual
 * OSID-level resolution would require full map computation.
 */
function computeTerritorySplit(
    state: GameState,
    acceptedPackages: string[],
    _rejectedPackages: string[]
): Record<string, number> {
    // Start from current territory control
    const controllers = state.political?.political_controllers;
    const split: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };

    if (controllers) {
        const osids = Object.keys(controllers).sort(strictCompare);
        const total = osids.length || 1;

        for (const osid of osids) {
            const faction = controllers[osid];
            if (faction && split[faction] !== undefined) {
                split[faction]++;
            }
        }

        // Convert to percentages
        for (const faction of CANONICAL_FACTIONS) {
            split[faction] = Math.round((split[faction] / total) * 100 * 10) / 10;
        }
    } else {
        // Fallback: historical baseline
        split.RBiH = 25;
        split.RS = HISTORICAL_RS_PCT;
        split.HRHB = 100 - 25 - HISTORICAL_RS_PCT;
    }

    // Adjust for accepted territorial transfers
    // Each accepted package that transfers territory adjusts the split
    for (const pkgId of acceptedPackages) {
        const pkg = getTerritorialPackageById(pkgId);
        if (!pkg) continue;

        // Estimate territory shift (rough: each package is worth ~2-5% of total)
        const shiftPct = estimatePackageTerritoryPct(pkgId);
        const holder = pkg.default_holder;

        // The demand was accepted, so territory moves FROM holder TO the demanding faction
        // We don't know who demanded it here, but accepted packages mean the transfer happened
        // For simplicity, if the holder is RS, territory shifts to Federation (RBiH+HRHB)
        if (holder === 'RS') {
            split.RS = Math.max(0, split.RS - shiftPct);
            split.RBiH += shiftPct; // simplified: goes to RBiH
        } else if (holder === 'HRHB') {
            split.HRHB = Math.max(0, split.HRHB - shiftPct);
            split.RBiH += shiftPct;
        } else if (holder === 'RBiH') {
            split.RBiH = Math.max(0, split.RBiH - shiftPct);
            split.RS += shiftPct;
        }
    }

    // Normalize to 100%
    const total = split.RBiH + split.RS + split.HRHB;
    if (total > 0 && Math.abs(total - 100) > 0.1) {
        for (const faction of CANONICAL_FACTIONS) {
            split[faction] = Math.round((split[faction] / total) * 100 * 10) / 10;
        }
    }

    return split;
}

/**
 * Rough estimate of what percentage of BiH territory a package represents.
 */
function estimatePackageTerritoryPct(pkgId: string): number {
    const estimates: Record<string, number> = {
        gorazde_corridor: 2.0,
        brcko_district: 1.5,
        posavina_pocket: 2.0,
        sarajevo_suburbs: 3.0,
        western_bosnia: 5.0,
        mostar: 1.5,
        central_bosnia: 4.0,
        srebrenica_area: 2.5,
    };
    return estimates[pkgId] ?? 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function ensureNegotiationState(state: GameState): void {
    if (!state.military.negotiation) {
        const capital: Record<string, import('../../state/negotiation_types.js').NegotiationBreakdown> = {};
        const patron_relationships: Record<string, import('../../state/negotiation_types.js').PatronRelationship> = {};
        for (const faction of CANONICAL_FACTIONS) {
            capital[faction] = createEmptyCapital();
            patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }
        state.military.negotiation = {
            capital,
            patron_relationships,
            peace_plan_history: [],
        };
    }
}

function flipChoice(choice: 'centralized' | 'decentralized'): 'centralized' | 'decentralized' {
    return choice === 'centralized' ? 'decentralized' : 'centralized';
}
