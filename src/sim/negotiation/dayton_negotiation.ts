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
import { getAllInstitutionalPackages, computeEntityAutonomyIndex } from './institutional_packages.js';
import { evaluateBotResponse, getCompositeCapital, computeProposalCostToFaction } from './bot_negotiation.js';
import { strictCompare } from '../../state/validateGameState.js';
import { freezeEndgameSnapshot } from '../endgame/endgame_snapshot.js';
import { computePeaceDysfunctionBreakdown } from './peace_dysfunction.js';
import { getPackageAreaPct } from './package_area_resolver.js';

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

    // D1 (owner ruling Opt 2a): resolve Brčko as a DISTINCT outcome. Historically
    // Brčko was deferred to international arbitration at Dayton (Annex 2) and became
    // the Brčko District condominium — a THIRD state, neither RBiH nor RS. We treat
    // the package as cleanly assigned only when it was demanded-and-won or conceded;
    // when it is left unresolved (rejected — neither side forced the issue), it
    // resolves to international arbitration, matching the real war-termination.
    const brckoStatus = resolveBrckoStatus(
        playerFaction,
        playerProposal,
        acceptedTerritorial,
        rejectedTerritorial,
    );

    // Compute final territory split from REAL OSID area data (D1, owner ruling
    // Opt 2b), with correct demander attribution and Brčko's area removed when it
    // goes to the arbitration district (a third state).
    const territorySplit = computeTerritorySplit(
        state,
        acceptedTerritorial,
        playerFaction,
        playerProposal,
        brckoStatus,
    );

    const result: DaytonResult = {
        territorial_packages_accepted: acceptedTerritorial.sort(strictCompare),
        territorial_packages_rejected: rejectedTerritorial.sort(strictCompare),
        institutional_choices: finalInstitutional,
        final_territory_split: territorySplit,
        patron_overrides_applied: patronOverrides.sort(strictCompare),
        brcko_status: brckoStatus,
        brcko_arbitration: brckoStatus === 'arbitration',
        // D2 (owner ruling Opt B): derived, read-only entity-autonomy index — the
        // weighted mean of the FINAL (post-resolution) institutional choices, where
        // decentralized = high autonomy. Feeds the peace_dysfunction index below and
        // the verdict. Default (all-decentralized) = the historical Dayton settlement.
        entity_autonomy_index: computeEntityAutonomyIndex(finalInstitutional),
    };

    // Store result on state
    neg.dayton_result = result;

    // Comprehensive Dayton D3 (2026-06-07): compute the peace_dysfunction_index +
    // breakdown from the just-signed settlement and stamp it onto the result for
    // display / verdict. Pure read of the result we just assigned to state.
    // Returns null in historical/unset mode (emergent-gated) and is then a no-op,
    // keeping back-compat with pre-D3 outcomes. The same breakdown is independently
    // frozen onto the endgame snapshot below (survives save/load round-trip).
    const dysfunction = computePeaceDysfunctionBreakdown(state);
    if (dysfunction) {
        result.peace_dysfunction_index = dysfunction.index;
        result.peace_dysfunction_flags = dysfunction.flags;
    }

    // Mark game as over
    state.meta.game_over = true;
    state.meta.outcome = 'dayton';

    // LANE-NIGHTSHIFT-N3 (D#2, 2026-05-03): freeze endgame snapshot so
    // verdict / cost ledger / historical comparison are preserved across
    // save/load round-trip even if post-Dayton bot drift mutates state.
    freezeEndgameSnapshot(state);

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Territory split estimation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the Brčko outcome as a distinct third-state option (D1, owner ruling
 * Opt 2a). Mirrors the real Dayton: Brčko was left unresolved (Annex 2) and went
 * to international arbitration → the Brčko District condominium of both Entities.
 *
 *   - demanded-and-won by the player  → the player's "side" (federation if the
 *       player is RBiH/HRHB, rs if the player is RS) cleanly takes it.
 *   - conceded by the player          → the OTHER side cleanly takes it.
 *   - left unresolved (neither, i.e. the demand failed / was never raised)
 *                                     → 'arbitration' (the third state).
 *
 * Pure & deterministic.
 */
function resolveBrckoStatus(
    playerFaction: FactionId,
    proposal: DaytonProposal,
    acceptedPackages: string[],
    rejectedPackages: string[],
): 'federation' | 'rs' | 'arbitration' {
    const BRCKO = 'brcko_district';
    const playerSide: 'federation' | 'rs' = playerFaction === 'RS' ? 'rs' : 'federation';
    const otherSide: 'federation' | 'rs' = playerSide === 'rs' ? 'federation' : 'rs';

    if (proposal.territorial_concessions.includes(BRCKO)) {
        // Player gave it up → the other side takes it.
        return otherSide;
    }
    if (proposal.territorial_demands.includes(BRCKO) && acceptedPackages.includes(BRCKO)) {
        // Player demanded it and the demand carried → player's side takes it.
        return playerSide;
    }
    // Demanded-but-failed, or never raised → unresolved → international arbitration.
    if (rejectedPackages.includes(BRCKO) || !acceptedPackages.includes(BRCKO)) {
        return 'arbitration';
    }
    return 'arbitration';
}

/**
 * Compute the final territory split (% per faction) from REAL OSID area data
 * (D1, owner ruling Opt 2b — replaces the fabricated estimate table).
 *
 * Starts from current front-line control (counted by area, not by OSID count) and
 * applies each accepted package transfer using its resolved share of BiH area.
 * Transfers are attributed CORRECTLY (D1 fix): a demanded-and-accepted package
 * moves area FROM the default holder TO the demanding faction (the player or, for
 * the player's concessions, the holder's counterpart). The previous code always
 * credited RBiH, mis-attributing HRHB gains.
 *
 * When Brčko goes to international arbitration its area is removed from all three
 * factions (it becomes a third-state district), so the three-faction split no
 * longer sums to 100 before normalization — we renormalize the remaining three.
 *
 * Pure & deterministic: sorted iteration, integer-rounded percentages.
 */
function computeTerritorySplit(
    state: GameState,
    acceptedPackages: string[],
    playerFaction: FactionId,
    proposal: DaytonProposal,
    brckoStatus: 'federation' | 'rs' | 'arbitration',
): Record<string, number> {
    const split: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };
    const controllers = state.political?.political_controllers;

    if (controllers) {
        // Area-weighted current control (falls back to count when an OSID has no area).
        for (const osid of Object.keys(controllers).sort(strictCompare)) {
            const faction = controllers[osid];
            if (faction && split[faction] !== undefined) split[faction] += 1;
        }
        const total = split.RBiH + split.RS + split.HRHB || 1;
        for (const faction of CANONICAL_FACTIONS) {
            split[faction] = (split[faction] / total) * 100;
        }
    } else {
        // Fallback: historical baseline.
        split.RBiH = 25;
        split.RS = HISTORICAL_RS_PCT;
        split.HRHB = 100 - 25 - HISTORICAL_RS_PCT;
    }

    // Apply accepted transfers using real per-package area shares, attributed to
    // the faction that actually gains the area.
    for (const pkgId of [...acceptedPackages].sort(strictCompare)) {
        const pkg = getTerritorialPackageById(pkgId);
        if (!pkg) continue;

        // Brčko-to-arbitration is removed from all factions below (third-state
        // district); never attribute it to an entity here. A cleanly-assigned
        // Brčko (federation/rs) is handled by the normal demand/concession path.
        if (pkgId === 'brcko_district' && brckoStatus === 'arbitration') continue;

        const shiftPct = getPackageAreaPct(pkgId);
        if (shiftPct <= 0) continue;

        const holder = pkg.default_holder;
        const gainer = resolveTransferGainer(pkgId, holder, playerFaction, proposal);
        if (!gainer || gainer === holder) continue;
        if (split[holder] === undefined || split[gainer] === undefined) continue;

        split[holder] = Math.max(0, split[holder] - shiftPct);
        split[gainer] += shiftPct;
    }

    // Brčko arbitration: remove its area from whichever faction holds it (RS by
    // default) so it becomes the third-state district and is not credited to anyone.
    if (brckoStatus === 'arbitration') {
        const brckoPkg = getTerritorialPackageById('brcko_district');
        const brckoPct = getPackageAreaPct('brcko_district');
        const holder = brckoPkg?.default_holder;
        if (holder && split[holder] !== undefined && brckoPct > 0) {
            split[holder] = Math.max(0, split[holder] - brckoPct);
        }
    }

    // Normalize the three factions to 100% (their share of NON-arbitration area).
    const total = split.RBiH + split.RS + split.HRHB;
    if (total > 0) {
        for (const faction of CANONICAL_FACTIONS) {
            split[faction] = Math.round((split[faction] / total) * 100 * 10) / 10;
        }
    }

    return split;
}

/**
 * Determine which faction GAINS an accepted package's area (D1 attribution fix;
 * concession-transfer fix #277).
 *
 *   - the player conceded a package they hold → the area moves OUT of the player
 *     (the holder) and TO the opposing entity (the gainer). The previous code
 *     returned null here, leaving the conceded area in the player's split so the
 *     final split contradicted the signed settlement (#277).
 *   - the player demanded it          → the player gains it.
 *   - otherwise (a held package that simply remained, or an auto-accept of the
 *     player's own territory)         → no transfer.
 *
 * Brčko-to-arbitration is resolved separately (its area is removed from all three
 * factions) and never reaches this path; a cleanly-assigned Brčko (demanded-and-won
 * or conceded) is attributed here like any other package.
 *
 * This replaces the old "if holder is RS, credit RBiH" rule that wrongly denied
 * HRHB its gains. Pure & deterministic.
 */
function resolveTransferGainer(
    pkgId: string,
    holder: string,
    playerFaction: FactionId,
    proposal: DaytonProposal,
): FactionId | null {
    if (proposal.territorial_concessions.includes(pkgId)) {
        // Player gave up territory they hold → it leaves the holder and goes to
        // the opposing entity's faction (the gainer). A concession only carries a
        // cost when the player IS the holder, so the holder is the conceding side.
        if (holder !== playerFaction) {
            // Defensive: a concession of territory the player does not hold has no
            // well-defined transfer here; leave it to the holder.
            return null;
        }
        return resolveOtherEntityFaction(holder);
    }
    if (proposal.territorial_demands.includes(pkgId) && holder !== playerFaction) {
        // Player won a demand against the holder → player gains the area.
        return playerFaction;
    }
    return null;
}

/**
 * The faction on the OPPOSING entity that gains a conceded package. Mirrors the
 * inter-entity "other side takes it" rule used for Brčko: a concession crosses
 * the IEBL, so an RS concession goes to the Federation (represented by RBiH, the
 * dominant Federation entity) and a Federation (RBiH/HRHB) concession goes to RS.
 *
 * Pure & deterministic — no state, no ordering.
 */
function resolveOtherEntityFaction(holder: string): FactionId {
    // RS is the only faction on the RS entity; RBiH and HRHB are the Federation.
    return holder === 'RS' ? 'RBiH' : 'RS';
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
