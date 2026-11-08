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
    DaytonAgreementRecord,
    DaytonProposal,
    DaytonResult,
    DaytonBotResponse,
    NegotiationState,
} from '../../state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import { getAllTerritorialPackages, getTerritorialPackageById } from './territorial_packages.js';
import { ENTITY_AUTONOMY_DEFAULT, getAllInstitutionalPackages, computeTreatyAutonomyIndex } from './institutional_packages.js';
import { evaluateBotResponse, getCompositeCapital, computeProposalCostToFaction, clampPlayerProposalToBudget } from './bot_negotiation.js';
import {
    finalCompetencyCost,
    finalConstitutionalCost,
    finalReturnJusticeCost,
    getDialDeclarationCost,
} from './dayton_dial_cost.js';
import { reconcileProposalPowers, reconcileResolvedPowers } from './power_overlap.js';
import { buildDelegationFolder } from './delegation_folder.js';
import { daytonRoundWillingness, effectiveDaytonOverride } from './dayton_rounds.js';
import type { DelegationFolder } from '../../state/negotiation_types.js';
import {
    adjustedCost,
    dialPrefDelta,
    competencyPrefDelta,
    constitutionalPrefDelta,
} from './bot_preferences.js';
import {
    getAllConstitutionalChoices,
    getAllReturnJusticeChoices,
    getConstitutionalChoiceById,
    getDefaultOptionId,
    type ConstitutionalChoice,
} from './constitutional_packages.js';
import { getAllCompetencyPackages } from './competency_packages.js';
import type { CompetencyOwner } from './competency_packages.js';
import type { CompetencyOwnerChoice, EntityAutonomySetting } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { freezeEndgameSnapshot } from '../endgame/endgame_snapshot.js';
import { computePeaceDysfunctionBreakdown } from './peace_dysfunction.js';
import { getPackageAreaPct, resolveOsidsForKeywords } from './package_area_resolver.js';
import { applyPeaceSettlement, computeSettlementControllers, settlementControllersFor } from './peace_settlement.js';
import { frontPackagesForProposal, frontPackageVisibleToPlayer, sameEntitySide } from './front_packages.js';
import { demandPrice, packageOsids, selectPatronForced } from './patron_leverage.js';
import type { TerritorialPackage } from '../../state/negotiation_types.js';

import { loadEventDefinitions } from '../events/event_loader.js';
import { fireEventDefinitionNow } from '../events/evaluate_events.js';
import type { EventDefinition } from '../events/event_types.js';

/** Territorial package id of the Brčko District (its outcome is brcko_status). */
const BRCKO_DISTRICT_PACKAGE_ID = 'brcko_district';

function freezeInstitutionalChoices(
    choices: readonly ConstitutionalChoice[],
    resolved?: Record<string, string>,
): Record<string, string> {
    return Object.fromEntries(choices.map(({ id }) => {
        const option = resolved?.[id] ?? getDefaultOptionId(id);
        if (option === undefined) throw new Error(`No default Dayton option for ${id}`);
        return [id, option];
    }));
}

/** Capture the public treaty immediately after resolution, while the settlement inputs are current. */
export function projectDaytonAgreement(
    state: GameState,
    wartimeControllers: Record<string, FactionId | null>,
): DaytonAgreementRecord {
    const negotiation = state.military.negotiation;
    const result = negotiation?.dayton_result;
    const settlement = negotiation?.settlement;
    if (!result || settlement?.plan_id !== 'dayton') {
        throw new Error('Dayton resolution did not record a settlement');
    }
    const controllers = settlementControllersFor({
        ...state,
        political: { ...state.political, political_controllers: wartimeControllers },
    })!;

    return {
        version: 1,
        terms: {
            ...structuredClone(result),
            entity_autonomy: result.entity_autonomy ?? ENTITY_AUTONOMY_DEFAULT,
            competency_allocation: Object.fromEntries(getAllCompetencyPackages().map(({ id, default_owner }) =>
                [id, result.competency_allocation?.[id] ?? default_owner])),
            constitutional_choices: freezeInstitutionalChoices(getAllConstitutionalChoices(), result.constitutional_choices),
            return_justice: freezeInstitutionalChoices(getAllReturnJusticeChoices(), result.return_justice),
        },
        map: {
            controllers,
            wartimeControllers: Object.fromEntries(Object.entries(wartimeControllers)
                .sort(([a], [b]) => strictCompare(a, b))),
            // An explicit assignment supersedes the baseline map's special status.
            specialOsids: settlement.special_osids.filter(osid => !settlement.map_overrides?.[osid]),
            territoryPct: { ...settlement.territory_pct },
        },
    };
}

/** Set when Dayton is signed or imposed; dayton_signed_1995's trigger reads it. */
export const DAYTON_SETTLEMENT_SIGNED_FLAG = 'dayton_settlement_signed';
const DAYTON_SIGNED_EVENT_ID = 'dayton_signed_1995';
let daytonSignedDef: EventDefinition | null | undefined;

/**
 * Fire the catalog's "Dayton signed" record (essay, codex, ticker) at the signature.
 * Callers that hold the catalog pass it: the bundled desktop sim cannot resolve the
 * source-relative events directory (`event_loader.ts` EVENTS_DIR sits outside the
 * packaged data root), so it passes `loadDesktopEventDefinitions(baseDir)`, and the turn
 * pipeline passes `input.eventDefinitions`. Without a catalog, the source-tree loader
 * is the fallback (headless runner, tests).
 */
function fireDaytonSignedRecord(state: GameState, eventDefinitions?: readonly EventDefinition[]): void {
    if (eventDefinitions) {
        const def = eventDefinitions.find((d) => d.id === DAYTON_SIGNED_EVENT_ID);
        if (def) fireEventDefinitionNow(state, def, state.meta.turn);
        return;
    }
    if (daytonSignedDef === undefined) {
        try {
            daytonSignedDef = loadEventDefinitions(0).find((d) => d.id === DAYTON_SIGNED_EVENT_ID) ?? null;
        } catch {
            daytonSignedDef = null; // no event catalog on this path (e.g. a bare unit-test state)
        }
    }
    if (daytonSignedDef) fireEventDefinitionNow(state, daytonSignedDef, state.meta.turn);
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

/**
 * Default week (from April 1992 start) when Dayton fires: ~188 weeks = November
 * 1995. On a 188-week horizon this lands on the FINAL turn, so the menu opens but
 * there is no turn left to negotiate across — the campaign freeze-frames on an open
 * menu (see 20260609 instrumented-campaign audit, Dimension 3 / A2).
 */
export const DAYTON_TRIGGER_WEEK = 188;

/**
 * A2 close-out (task #71): when `meta.dayton_close_out` is on, the trigger is pulled
 * forward to week 180. Historically the Dayton story is the autumn-1995 sequence —
 * the 8 Sept Geneva agreed-principles, the 26 Sept New York further-principles, the
 * 5 Oct nationwide cease-fire, then the 1–21 Nov Wright-Patterson (Dayton) proximity
 * talks that ran for WEEKS and initialled on 21 Nov 1995. Week 180 of an April-1992
 * start ≈ late September 1995 (cease-fire / proximity-talks run-up), giving the
 * negotiation ~8 turns of air before the 188-week horizon instead of a single
 * final-turn snapshot. Default (flag off) keeps 188 → calibration byte-identical.
 */
export const DAYTON_TRIGGER_WEEK_CLOSE_OUT = 180;

/**
 * The trigger week in effect for this state: the pulled-forward close-out week when
 * `meta.dayton_close_out` is on, else the default. Pure read of meta.
 */
export function effectiveDaytonTriggerWeek(state: GameState): number {
    return state.meta.dayton_close_out === true ? DAYTON_TRIGGER_WEEK_CLOSE_OUT : DAYTON_TRIGGER_WEEK;
}

/** Patron override level at which Dayton is forced even before the trigger week. */
const FORCED_DAYTON_OVERRIDE_THRESHOLD = 95;

/** Patron override at which a patron can force its client to accept a Dayton term. */
const PATRON_OVERRIDE_THRESHOLD = 75;

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

    // Trigger 1: reached the Dayton date (pulled forward to w180 under close-out).
    if (warWeek >= effectiveDaytonTriggerWeek(state)) return true;

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
    delegation_folder?: DelegationFolder;
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
    // The player's delegation folder (DC A1). Read-only over state.
    const folder = buildDelegationFolder(state);

    return {
        territorial_packages: getAllTerritorialPackages().map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            default_holder: pkg.default_holder,
            // Price for any side that does not hold it (protected ground at its premium, DC A6).
            demand_cost: demandPrice(pkg, ''),
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
        ...(folder ? { delegation_folder: folder } : {}),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Terminal close-out (A2, task #71)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The deterministic historical-default Dayton proposal — what a headless /
 * historical-mode run signs when no human spends negotiation capital.
 *
 * It is intentionally EMPTY: no territorial demands, no concessions, no
 * institutional/dial/competency/constitutional/return-justice deviations. Per the
 * resolver, an empty proposal leaves every package with its default holder and
 * every institutional choice at the historical (decentralized / Annex-4) baseline —
 * i.e. the real Dayton settlement's structural shape, the maximal-gridlock peace the
 * negative-sum thesis grades as Pyrrhic. The player faction spends nothing, so the
 * budget clamp is a no-op and the outcome is reproducible regardless of capital.
 *
 * This mirrors the calibration "bots replay historical defaults" contract: the
 * close-out is the negotiation's options[0]/AI-default analogue.
 */
export function buildHistoricalDefaultDaytonProposal(): DaytonProposal {
    return {
        territorial_demands: [],
        territorial_concessions: [],
        institutional_choices: {},
    };
}

/**
 * A2 terminal close-out: resolve a still-PENDING Dayton menu to a verdict.
 *
 * Called once, after the campaign reaches its horizon, when a `pending_dayton`
 * menu was opened (trigger fired) but nothing resolved it — the freeze-frame the
 * instrumented-campaign audit flagged. In headless / historical mode no human
 * proposal exists, so we resolve via the deterministic historical-default proposal
 * (`buildHistoricalDefaultDaytonProposal`). resolveDaytonNegotiation then:
 *   - signs the all-default settlement,
 *   - sets `meta.game_over = true` + `meta.outcome = 'dayton'`,
 *   - freezes the endgame snapshot (the Pyrrhic verdict + cost ledger),
 * so the campaign CLOSES on a coherent verdict instead of an open menu.
 *
 * Idempotent + safe: a no-op when close-out is not armed, when there is no pending
 * menu, when Dayton already resolved, or when the game is already over. Returns the
 * signed DaytonResult when it resolved this call, else null. Pure-deterministic
 * (delegates to the deterministic resolver; no RNG / wall-clock).
 *
 * CALIBRATION: only runs when `meta.dayton_close_out` is on — the calibration
 * scenarios never set it, so this is never reached on the byte-identical baselines.
 */
export function resolvePendingDaytonCloseOut(state: GameState): DaytonResult | null {
    if (state.meta.dayton_close_out !== true) return null;
    if (state.meta.game_over) return null;
    const neg = state.military.negotiation;
    if (!neg) return null;
    if (neg.dayton_result) return null;     // already resolved
    if (!neg.pending_dayton) return null;   // no menu to close

    // resolveDaytonNegotiation now consumes `pending_dayton` atomically with the signed
    // result (R4 Phase 6 Task 6.1), so this headless close-out no longer deletes the
    // menu separately — request and receipt travel together in one owner. This function
    // remains the headless/historical terminal-close-out entry (gated on
    // `meta.dayton_close_out`, set only by scenario_runner): it resolves an unresolved
    // terminal menu via the deterministic historical-default proposal so a horizon-
    // reached headless campaign closes on a coherent verdict instead of an open menu.
    return resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal());
}

// ═══════════════════════════════════════════════════════════════════════════
// Decline and imposition (owner, 2026-11-07)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Weeks of war the player gets after declining Dayton before the settlement is
 * imposed. Owner direction first set 4 ("he should get 4 more weeks and then an
 * event"); raised to 8 on 2026-11-07 so the reopened war leaves room for the
 * continuation operations to plan, attack and draw counterattacks.
 */
export const DAYTON_DECLINE_GRACE_WEEKS = 8;

/** Flag the imposition step raises the turn before imposition; the coercion events trigger on it. */
export const DAYTON_IMPOSITION_DUE_FLAG = 'dayton_imposition_due';

/** Who forces the settlement on a declining faction. Historically all three signed. */
export const DAYTON_COERCING_POWER: Record<string, 'united_states' | 'belgrade' | 'zagreb'> = {
    // Counterfactual: Washington's real coercion of Sarajevo was diplomatic.
    RBiH: 'united_states',
    // Milošević held the Bosnian Serb mandate at Dayton (Patriarch letter, Aug 1995).
    RS: 'belgrade',
    // Tuđman negotiated for and bound the Bosnian Croats at Dayton.
    HRHB: 'zagreb',
};

/**
 * The player faction declines Dayton. The menu is withdrawn; the war continues for
 * DAYTON_DECLINE_GRACE_WEEKS more resolutions, then the faction's coercion event fires
 * and the table reopens as a forced menu that cannot be declined
 * (enforceDaytonImposition). Deterministic; no RNG.
 */
export function declineDaytonNegotiation(state: GameState): {
    ok: boolean;
    error?: string;
    imposition_turn?: number;
} {
    const neg = state.military.negotiation;
    if (state.meta.game_over) return { ok: false, error: 'game_over' };
    if (!neg?.pending_dayton) return { ok: false, error: 'no_pending_dayton' };
    if (neg.dayton_result) return { ok: false, error: 'already_resolved' };
    if (neg.pending_dayton.forced || neg.dayton_decline) return { ok: false, error: 'forced_settlement' };
    const faction = state.meta.player_faction;
    if (!faction) return { ok: false, error: 'no_player_faction' };
    const impositionTurn = recordDaytonDecline(state, faction);
    return { ok: true, imposition_turn: impositionTurn };
}

/** Flag recording who declined Dayton; gates the remaining acceptance events. */
export const DAYTON_DECLINED_BY_FLAG = 'dayton_declined_by';

/** Event flag a faction's own Dayton acceptance event writes ('accept' | 'hardline'). */
const DAYTON_ACCEPTANCE_FLAG: Record<string, string> = {
    RBiH: 'rbih_dayton_acceptance',
    RS: 'rs_dayton_acceptance',
    HRHB: 'hrhb_dayton_acceptance',
};

/**
 * Record a decline: withdraw any pending menu, schedule the imposition DAYTON_DECLINE_GRACE_WEEKS out,
 * and reopen the war (owner, 2026-11-07: "declining Dayton would reopen the war and the
 * ops would continue"). Returns the imposition turn.
 */
function recordDaytonDecline(state: GameState, faction: string): number {
    const neg = state.military.negotiation!;
    const declinedTurn = state.meta.turn;
    const impositionTurn = declinedTurn + DAYTON_DECLINE_GRACE_WEEKS;
    neg.dayton_decline = { faction, declined_turn: declinedTurn, imposition_turn: impositionTurn };
    delete neg.pending_dayton;
    if (!state.military.event_flags) state.military.event_flags = {};
    state.military.event_flags[DAYTON_DECLINED_BY_FLAG] = faction;
    reopenWarAfterDaytonDecline(state);
    return impositionTurn;
}

/**
 * Lift the autumn-1995 brakes that froze the front: the launch suppression and the
 * aggression cut written by us_halts_federation_advance_1995 (the Holbrooke halt).
 * Operations already executing continue regardless; with the suppression gone, planned
 * operations can launch again. Deterministic; touches only records tied to that event.
 */
export function reopenWarAfterDaytonDecline(state: GameState): void {
    const HALT_EVENT = 'us_halts_federation_advance_1995';
    const military = state.military;
    if (military.offensive_ops_suppressions) {
        military.offensive_ops_suppressions = military.offensive_ops_suppressions
            .filter((s) => s.reason !== HALT_EVENT);
    }
    const haltTurn = military.event_last_fired_turn?.[HALT_EVENT];
    if (typeof haltTurn === 'number' && military.event_aggression_modifiers) {
        // The halt pushes RBiH and HRHB -0.2 for 12 turns (war_1995.json); those records
        // carry no source field, so they are matched by faction, delta and expiry.
        const haltExpiry = haltTurn + 12;
        military.event_aggression_modifiers = military.event_aggression_modifiers.filter((m) =>
            !((m.faction === 'RBiH' || m.faction === 'HRHB') && m.delta < 0 && m.expires_turn === haltExpiry));
    }
    if (!military.event_flags) military.event_flags = {};
    military.event_flags.advance_halted = false;
}

/**
 * Cells that changed hands after the player declined Dayton (control-event log). Empty when
 * Dayton was not declined. Used so no patron is forced to hand over post-decline ground.
 */
export function postDeclineChangedCells(state: GameState): Set<string> {
    const declinedTurn = state.military.negotiation?.dayton_decline?.declined_turn;
    const out = new Set<string>();
    if (typeof declinedTurn !== 'number') return out;
    for (const ev of state.political?.control_events ?? []) {
        if (typeof ev.turn === 'number' && ev.turn > declinedTurn && typeof ev.settlement_id === 'string') {
            out.add(ev.settlement_id);
        }
    }
    return out;
}

/**
 * A player's "hard line" answer to its own Dayton acceptance event (e.g. RBiH at
 * dayton_talks_begin_1995) is a refusal of the settlement and takes the decline path.
 * Bot answers stay narrative. Returns true when it recorded a decline this call.
 */
export function applyPlayerDaytonHardline(state: GameState): boolean {
    const neg = state.military.negotiation;
    const faction = state.meta.player_faction;
    if (!neg || !faction || state.meta.game_over) return false;
    if (neg.dayton_decline || neg.dayton_result) return false;
    // An open menu means the talks answer predates this rule (older saves): do not convert it.
    if (neg.pending_dayton) return false;
    const flag = DAYTON_ACCEPTANCE_FLAG[faction];
    if (!flag || state.military.event_flags?.[flag] !== 'hardline') return false;
    recordDaytonDecline(state, faction);
    return true;
}

/**
 * War-phase step: enforce a declined Dayton.
 *  - One turn before `imposition_turn` it raises DAYTON_IMPOSITION_DUE_FLAG (= the
 *    declining faction) so that faction's coercion event fires early in the imposition turn.
 *  - At the end of the imposition turn it reopens the table as a FORCED menu (owner,
 *    2026-11-07: "Re-open the table, no decline"): ground taken since the decline is on it
 *    as captured-ground packages, the player must submit, and nothing can be declined.
 *  - A forced menu still unanswered at a later turn's step is signed on the historical
 *    Dayton map (the bot / headless fallback). Unraised captures follow the map.
 * Returns the imposed result when it resolved this call, else null.
 */
export function enforceDaytonImposition(
    state: GameState,
    eventDefinitions?: readonly EventDefinition[],
): DaytonResult | null {
    applyPlayerDaytonHardline(state);
    const neg = state.military.negotiation;
    const decline = neg?.dayton_decline;
    if (!neg || !decline) return null;
    if (state.meta.game_over || neg.dayton_result) return null;
    const turn = state.meta.turn;
    if (turn >= decline.imposition_turn - 1) {
        if (!state.military.event_flags) state.military.event_flags = {};
        state.military.event_flags[DAYTON_IMPOSITION_DUE_FLAG] = decline.faction;
    }
    if (turn < decline.imposition_turn) return null;
    const forced = neg.pending_dayton?.forced;
    if (forced && turn > forced.opened_turn) {
        return resolveDaytonNegotiation(state, buildHistoricalDefaultDaytonProposal(), eventDefinitions);
    }
    if (!neg.pending_dayton) {
        neg.pending_dayton = {
            ...initiateDaytonNegotiation(state),
            forced: {
                on_faction: decline.faction,
                by: DAYTON_COERCING_POWER[decline.faction] ?? 'united_states',
                opened_turn: turn,
            },
        };
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the Dayton negotiation given the player's proposal.
 *
 * Steps:
 * 1. ENGINE-ENFORCE the player budget: clamp the proposal to the player faction's
 *    available negotiation capital (defense-in-depth — the UI disables Submit when
 *    over-budget, but a bot / headless / future-API path could overspend, so the
 *    sim boundary re-checks). Within-budget proposals pass through UNCHANGED.
 * 2. Evaluate bot responses for each non-player faction.
 * 3. For rejected/countered items, apply patron overrides.
 * 4. Build final DaytonResult and store in state.
 *
 * The clamp is deterministic (drops the dearest charged items first, stable id
 * tie-break) so an over-budget non-UI proposal degrades gracefully and reproducibly.
 *
 * @param state - Current game state
 * @param playerProposal - Player's selected territorial demands, concessions, and institutional choices
 * @returns The final DaytonResult
 */
export function resolveDaytonNegotiation(
    state: GameState,
    playerProposal: DaytonProposal,
    eventDefinitions?: readonly EventDefinition[],
): DaytonResult {
    ensureNegotiationState(state);

    const neg = state.military.negotiation!;

    // R4 Phase 6 Task 6.1 — first-write-wins re-entry guard. `dayton_result`,
    // `meta.game_over`, the consumed `pending_dayton`, and the frozen endgame snapshot
    // are all written together at the end of this function, so a present `dayton_result`
    // means Dayton is already signed. A repeat resolution call (e.g. a player who
    // "Decline Talks" clears only their local copy and resubmits) is then a provable
    // no-op returning the already-signed result — it can never re-sign, re-freeze, or
    // re-open a consumed menu. Matches freezeEndgameSnapshot's idempotency contract.
    if (neg.dayton_result) {
        return neg.dayton_result;
    }

    const playerFaction = state.meta.player_faction ?? 'RBiH';
    const botFactions = CANONICAL_FACTIONS.filter(f => f !== playerFaction).sort(strictCompare);

    // ── Step 1: engine-level player-budget enforcement (defense-in-depth) ──────
    // Mirror the DaytonNegotiationModal `capitalSpent`/`overBudget` check at the sim
    // boundary so a non-UI caller cannot overspend the player's earned capital. The
    // player's available capital is the SAME composite reading the UI surfaces.
    const playerCapital = neg.capital[playerFaction]
        ? getCompositeCapital(neg.capital[playerFaction], playerFaction, neg.strategic_dimensions)
        : 0;
    // Captured-ground packages (front_packages.ts) as the front stands at signature. Only
    // the ones the proposal raises enter the result; unraised ones follow the Dayton map.
    // One operative assignment per power (power_overlap.ts): an explicit competency or
    // constitutional slot wins over a contradicting legacy toggle before anything is priced.
    const reconciledProposal = reconcileProposalPowers(playerProposal);
    const frontPackages = frontPackagesForProposal(state, reconciledProposal);
    const proposal = clampPlayerProposalToBudget(reconciledProposal, playerFaction, playerCapital, frontPackages).proposal;

    // Collect bot responses
    const botResponses: Record<string, DaytonBotResponse> = {};
    for (const faction of botFactions) {
        botResponses[faction] = evaluateBotResponse(state, faction, proposal, frontPackages);
    }

    // Build the final agreement by resolving each package
    const acceptedTerritorial: string[] = [];
    const rejectedTerritorial: string[] = [];
    const patronOverrides: string[] = [];

    // Process territorial demands
    // Only captured ground the player can act on (the menu's list) is negotiable.
    const raisedFront = frontPackages
        .filter(p => frontPackageVisibleToPlayer(p, playerFaction))
        .map(p => p.id)
        .filter(id => proposal.territorial_demands.includes(id) || proposal.territorial_concessions.includes(id));
    const allTerritorialIds = [...getAllTerritorialPackages().map(p => p.id), ...raisedFront].sort(strictCompare);
    const refusedByHolder = new Map<string, TerritorialPackage[]>();

    for (const pkgId of allTerritorialIds) {
        const isDemanded = proposal.territorial_demands.includes(pkgId);
        const isConceded = proposal.territorial_concessions.includes(pkgId);

        if (!isDemanded && !isConceded) {
            // Not part of the negotiation — stays with default holder
            rejectedTerritorial.push(pkgId);
            continue;
        }

        const pkg = getTerritorialPackageById(pkgId, frontPackages);
        if (!pkg) {
            rejectedTerritorial.push(pkgId);
            continue;
        }
        // The faction that holds this package must accept the demand
        const holderFaction = pkg.default_holder;

        // Owner ruling 2026-11-07: Dayton drew the inter-entity line only. Ground a Federation
        // partner holds is not negotiable between RBiH and HRHB (independent review F1).
        if (holderFaction !== playerFaction && sameEntitySide(holderFaction, playerFaction)) {
            rejectedTerritorial.push(pkgId);
            continue;
        }

        if (isConceded) {
            // Only the holder can concede; conceding someone else's ground moves nothing.
            if (holderFaction === playerFaction) acceptedTerritorial.push(pkgId);
            else rejectedTerritorial.push(pkgId);
            continue;
        }

        if (holderFaction === playerFaction) {
            // Player already holds it — auto-accepted
            acceptedTerritorial.push(pkgId);
            continue;
        }

        const holderResponse = botResponses[holderFaction];
        // A counter-offer that still grants this demand carries it (owner, 2026-11-07:
        // "the other side can accept or counter").
        const keptInCounter = holderResponse?.decision === 'counter'
            && (holderResponse.counter_proposal?.territorial_demands ?? []).includes(pkgId);

        if ((holderResponse && holderResponse.decision === 'accept') || keptInCounter) {
            acceptedTerritorial.push(pkgId);
        } else {
            const list = refusedByHolder.get(holderFaction) ?? [];
            list.push(pkg);
            refusedByHolder.set(holderFaction, list);
        }
    }

    // Owner ruling 2026-11-07 (patron_leverage.ts): a patron forces refused demands only up
    // to its area budget, smallest first, never on protected ground, and never on ground
    // taken after the player declined Dayton.
    const postDeclineCells = postDeclineChangedCells(state);
    const isPostDeclineGround = (p: TerritorialPackage) =>
        postDeclineCells.size > 0 && packageOsids(p).some((o) => postDeclineCells.has(o));
    for (const holder of [...refusedByHolder.keys()].sort(strictCompare)) {
        const refused = refusedByHolder.get(holder)!;
        const override = effectiveDaytonOverride(neg, holder);
        const forced = new Set(selectPatronForced(refused, holder, override, isPostDeclineGround));
        for (const p of [...refused].sort((a, b) => strictCompare(a.id, b.id))) {
            if (forced.has(p.id)) {
                acceptedTerritorial.push(p.id);
                patronOverrides.push(`territorial:${p.id}:${holder}`);
            } else {
                rejectedTerritorial.push(p.id);
            }
        }
    }

    // Process institutional choices
    const finalInstitutional: Record<string, 'centralized' | 'decentralized'> = {};
    const allInstitutionalIds = getAllInstitutionalPackages().map(p => p.id).sort(strictCompare);

    for (const pkgId of allInstitutionalIds) {
        const playerChoice = proposal.institutional_choices[pkgId];

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

                if (costToBotFaction > botCapital * (0.3 + daytonRoundWillingness(neg))) {
                    objected = true;

                    // Check patron override
                    const botPatron = neg.patron_relationships[botFaction];
                    if (botPatron && effectiveDaytonOverride(neg, botFaction) >= PATRON_OVERRIDE_THRESHOLD) {
                        objected = false;
                        patronOverrides.push(`institutional:${pkgId}:${botFaction}`);
                    }
                }
            }
        }

        finalInstitutional[pkgId] = objected ? flipChoice(playerChoice) : playerChoice;
    }

    // D1 (owner ruling Opt 2a): resolve Brčko as a DISTINCT outcome. Historically the
    // Inter-Entity Boundary Line in the Brčko area could not be agreed at Dayton and
    // was deferred to binding international arbitration (Annex 2, Art. V). The 1999
    // Final Award created the Brčko District — a self-governing district held in
    // CONDOMINIUM by BOTH Entities (NOT a separate/third state, and not assigned to
    // either RBiH or RS). We treat the package as cleanly assigned only when it was
    // demanded-and-won or conceded; when it is left unresolved (rejected — neither
    // side forced the issue), it resolves to arbitration, matching the real outcome.
    const brckoStatus = resolveBrckoStatus(
        playerFaction,
        proposal,
        acceptedTerritorial,
        rejectedTerritorial,
    );

    // Compute final territory split from REAL OSID area data (D1, owner ruling
    // Opt 2b), with correct demander attribution and Brčko's area removed when it
    // goes to the arbitration district (the condominium district of both Entities).
    const territorySplit = computeTerritorySplit(
        state,
        acceptedTerritorial,
        playerFaction,
        proposal,
        brckoStatus,
    );

    // ── Institutional-architecture expansion (Phase 2): resolve + PERSIST the new
    //    Dim-2/3/4/5 dimensions onto the result so the dysfunction index/flags + the
    //    verdict cap actually SEE the player's deviations. At the historical default
    //    (absent fields) these resolve to the canonical baseline (dayton-historical
    //    dial, empty allocations) so the all-default settlement is BYTE-IDENTICAL:
    //    an empty competency map leaves the autonomy reading on the legacy D2 index,
    //    empty constitutional choices read as the historical maximal-gridlock=100.
    const finalDimensions = resolveInstitutionalDimensions(neg, proposal, botFactions, patronOverrides);
    // Reconcile the two vocabularies on the record (power_overlap.ts): a resolved
    // operative slot writes its legacy toggle; a raised legacy toggle with no slot writes
    // the slot. The autonomy index below then reads the same treaty the binder shows.
    Object.assign(finalDimensions, reconcileResolvedPowers(finalInstitutional, finalDimensions, Object.keys(proposal.institutional_choices)));

    const result: DaytonResult = {
        territorial_packages_accepted: acceptedTerritorial.sort(strictCompare),
        territorial_packages_rejected: rejectedTerritorial.sort(strictCompare),
        institutional_choices: finalInstitutional,
        final_territory_split: territorySplit,
        patron_overrides_applied: patronOverrides.sort(strictCompare),
        brcko_status: brckoStatus,
        brcko_arbitration: brckoStatus === 'arbitration',
        // D2 (owner ruling Opt B): derived, read-only entity-autonomy index of the FINAL
        // treaty. Since the DC walkthrough (2026-11-08) it is the single treaty autonomy
        // measure (competencies counted once, historical Dayton = 100), the same number
        // peace_dysfunction reads; the historical default still reads 100.
        entity_autonomy_index: computeTreatyAutonomyIndex({
            institutional_choices: finalInstitutional,
            competency_allocation: finalDimensions.competency_allocation,
        }),
        // Phase 2 verdict feed — the signed Dim-2/3/4/5 dimensions (omitted entirely
        // at the historical default to keep the result shape byte-identical).
        ...finalDimensions,
    };

    // A declined Dayton signed at the reopened table (or by its fallback) was imposed.
    const decline = neg.dayton_decline;
    if (decline) {
        result.imposed = {
            on_faction: decline.faction,
            by: DAYTON_COERCING_POWER[decline.faction] ?? 'united_states',
            turn: state.meta.turn,
        };
    }

    // Store result on state
    neg.dayton_result = result;

    // Owner, 2026-11-07: Dayton's consequence is its MAP. The settlement is the researched
    // Dayton map, with the packages this negotiation actually moved overriding it, and RS
    // recognised by name with the Posavina corridor. The displayed final split and the
    // dysfunction index read the settled share, the same number the grade reads (review F2);
    // computeTerritorySplit remains only as the fallback when no settlement is recorded.
    const settlement = applyPeaceSettlement(state, 'dayton', daytonPackageOverrides(state, result, proposal, playerFaction, frontPackages));
    // Only a map covering (almost) all of BiH — every real campaign — replaces the split;
    // a partial fixture map keeps the package-shift estimate.
    const coveredPct = CANONICAL_FACTIONS.reduce((s, f) => s + (settlement.territory_pct[f] ?? 0), 0);
    if (coveredPct >= 90) {
        const settledSplit: Record<string, number> = {};
        for (const faction of CANONICAL_FACTIONS) {
            settledSplit[faction] = Math.round(((settlement.territory_pct[faction] ?? 0) / coveredPct) * 100 * 10) / 10;
        }
        result.final_territory_split = settledSplit;
    }

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

    // R4 Phase 6 Task 6.1 — request and receipt are ONE owner now: consume the pending
    // menu in the SAME mutation that signs the result, so a resolved Dayton can never
    // leave a dangling `pending_dayton` packet. Previously only the headless-only
    // resolvePendingDaytonCloseOut deleted it and the desktop `resolve-dayton` path
    // never did, so the terminal-state decision gate saw a forever-blocking Dayton
    // decision — the self-sealing game-over deadlock the RS-playthrough panel
    // root-caused. CALIBRATION-FLAT: resolveDaytonNegotiation is not reached on the
    // byte-identical baselines (headless close-out is gated on `meta.dayton_close_out`,
    // which the calibration scenarios never set), so moving the delete here moves no
    // baseline — and on the close-out path the final state is identical either way.
    if (neg.pending_dayton) {
        delete neg.pending_dayton;
    }

    // Owner, 2026-11-07: the "Dayton signed" record belongs to the signature, not to a
    // turn's trigger scan (it used to fire at week 185, before the menu even opened).
    if (!state.military.event_flags) state.military.event_flags = {};
    state.military.event_flags[DAYTON_SETTLEMENT_SIGNED_FLAG] = true;
    fireDaytonSignedRecord(state, eventDefinitions);

    // LANE-NIGHTSHIFT-N3 (D#2, 2026-05-03): freeze endgame snapshot so
    // verdict / cost ledger / historical comparison are preserved across
    // save/load round-trip even if post-Dayton bot drift mutates state.
    freezeEndgameSnapshot(state);

    return result;
}

/**
 * OSIDs whose Dayton package outcome departs from the historical Dayton map.
 *  - A package the player DEMANDED from another party and won goes to the player.
 *    (Demanding a package one already holds costs nothing and moves nothing.)
 *  - A package the player CONCEDED goes to the other side: to RS when the player is a
 *    Federation party; when the player is RS, to the Federation party the base map
 *    already names for that OSID, else RBiH.
 *  - Brčko follows brcko_status: 'rs' or 'federation' assign the Brčko OSIDs; the
 *    default 'arbitration' keeps the base map's arbitration district.
 *  - A captured-ground package (front_packages.ts) won by demand stays with its claimant
 *    when the claimant is on the player's side (the player itself, or its Federation
 *    partner), else goes to the player; one the map assignee concedes goes to the claimant.
 * Unraised packages follow the historical Dayton map.
 */
function daytonPackageOverrides(
    state: GameState,
    result: DaytonResult,
    proposal: DaytonProposal,
    playerFaction: string,
    frontPackages: readonly TerritorialPackage[],
): Record<string, FactionId> {
    const overrides: Record<string, FactionId> = {};
    const base = computeSettlementControllers(state, 'dayton').controllers;
    const accepted = new Set(result.territorial_packages_accepted);
    for (const pkgId of [...accepted].sort(strictCompare)) {
        if (pkgId === BRCKO_DISTRICT_PACKAGE_ID) continue;
        const pkg = getTerritorialPackageById(pkgId, frontPackages);
        if (!pkg) continue;
        if (pkg.osids && pkg.claimant) {
            let gainer: string | null = null;
            if (proposal.territorial_demands.includes(pkgId) && pkg.default_holder !== playerFaction) {
                gainer = sameEntitySide(pkg.claimant, playerFaction) ? pkg.claimant : playerFaction;
            } else if (proposal.territorial_concessions.includes(pkgId) && pkg.default_holder === playerFaction) {
                gainer = pkg.claimant;
            }
            if (gainer) for (const o of pkg.osids) overrides[o] = gainer;
            continue;
        }
        // A fixed package names a whole area (e.g. every Mostar cell), but a deal at the
        // table only moves ground across the inter-entity line, and only the parties'
        // own ground (walkthrough 2026-11-08: an HRHB concession of Mostar had handed
        // east Mostar, which the map gives RBiH, to RS). A won demand takes only the cells
        // the settlement map puts on the other entity's side; a concession gives up only
        // the conceding party's own cells. Lines inside the Federation follow the map
        // (owner ruling 2026-11-07: Dayton drew the inter-entity line only).
        const osids = resolveOsidsForKeywords(pkg.osid_keywords ?? []);
        if (proposal.territorial_demands.includes(pkgId) && pkg.default_holder !== playerFaction) {
            for (const o of osids) {
                const b = base[o];
                if (b && !sameEntitySide(b, playerFaction)) overrides[o] = playerFaction;
            }
        } else if (proposal.territorial_concessions.includes(pkgId)) {
            for (const o of osids) {
                if (base[o] !== playerFaction) continue;
                overrides[o] = playerFaction === 'RS' ? 'RBiH' : 'RS';
            }
        }
    }
    if (result.brcko_status === 'rs' || result.brcko_status === 'federation') {
        const brcko = getTerritorialPackageById(BRCKO_DISTRICT_PACKAGE_ID);
        for (const o of resolveOsidsForKeywords(brcko?.osid_keywords ?? [])) {
            overrides[o] = result.brcko_status === 'rs' ? 'RS' : 'RBiH';
        }
    }
    return overrides;
}

// ═══════════════════════════════════════════════════════════════════════════
// Territory split estimation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the Brčko outcome as a distinct condominium-district option (D1, owner
 * ruling Opt 2a). Mirrors the real Dayton: the Brčko-area IEBL was left unresolved
 * (Annex 2, Art. V) and went to binding arbitration → the 1999 Final Award's Brčko
 * District, held in CONDOMINIUM by both Entities (not a separate/third state).
 *
 *   - demanded-and-won by the player  → the player's "side" (federation if the
 *       player is RBiH/HRHB, rs if the player is RS) cleanly takes it.
 *   - conceded by the player          → the OTHER side cleanly takes it.
 *   - left unresolved (neither, i.e. the demand failed / was never raised)
 *                                     → 'arbitration' (the condominium district).
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
 * When Brčko goes to arbitration its area is removed from all three factions (it
 * becomes the condominium district of both Entities, credited to neither RBiH/RS/
 * HRHB), so the three-faction split no longer sums to 100 before normalization —
 * we renormalize the remaining three.
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

        // Brčko-to-arbitration is removed from all factions below (the condominium
        // district of both Entities); never attribute it to a single entity here. A
        // cleanly-assigned Brčko (federation/rs) is handled by the normal demand/
        // concession path.
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
    // default) so it becomes the condominium district of both Entities and is not
    // credited to any single faction.
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

/** The signed Dim-2/3/4/5 dimensions to persist on the result (only when deviated). */
interface ResolvedDimensions {
    entity_autonomy?: EntityAutonomySetting;
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    constitutional_choices?: Record<string, string>;
    return_justice?: Record<string, string>;
}


/**
 * Resolve + persist the Phase-2 institutional dimensions (Dim 2 dial, Dim 3
 * competencies, Dim 4 constitutional, Dim 5 return/justice).
 *
 * For each deviating sub-choice we test whether ANY bot faction objects (its
 * post-dial IDEOLOGICALLY-ADJUSTED cost exceeds 30% of its composite capital). The
 * adjusted cost is the SAME the bot uses in computeProposalCostToFaction /
 * evaluateBotResponse (base × preference-lerp + an 8-pt objection floor for an
 * anathema choice), so the resolution objection test is consistent with how the bot
 * actually prices the proposal: a free-in-capital but ideologically-anathema choice
 * (e.g. a domestic-only court that bills HRHB nothing yet runs against its ideal) is
 * objected to here exactly as the bot would object to it — closing the gap where the
 * raw asymmetric base (cost 0) silently let such a choice through unchallenged. An
 * objection is overridden when the objecting faction's patron authority is ≥75
 * (recorded as a
 * `dial:<setting>:<faction>` / `competency:<id>:<faction>` / `constitutional:<id>:
 * <faction>` / `return_justice:<id>:<faction>` patron-override entry, same convention
 * as the shipped `institutional:<id>:<faction>`). An un-overridden objection drops
 * the sub-choice back to its historical default (it never enters the signed result).
 *
 * BYTE-IDENTITY: at the historical default the proposal carries none of these fields,
 * so every branch is skipped and an EMPTY object is returned — the result shape is
 * unchanged. Pure aside from pushing override entries; deterministic (sorted).
 */
function resolveInstitutionalDimensions(
    neg: NegotiationState,
    proposal: DaytonProposal,
    botFactions: FactionId[],
    patronOverrides: string[],
): ResolvedDimensions {
    const out: ResolvedDimensions = {};

    const capitalOf = (faction: string): number =>
        neg.capital[faction]
            ? getCompositeCapital(neg.capital[faction], faction, neg.strategic_dimensions)
            : 0;
    const patronForces = (faction: string): boolean =>
        effectiveDaytonOverride(neg, faction) >= PATRON_OVERRIDE_THRESHOLD;

    // Returns true if the sub-choice survives (no un-overridden objection). Records a
    // patron override when an objection is forced through.
    const survives = (cost: (botFaction: FactionId) => number, overrideKey: (botFaction: FactionId) => string): boolean => {
        let survived = true;
        for (const bot of [...botFactions].sort(strictCompare)) {
            const c = cost(bot);
            if (c <= 0) continue;
            if (c > capitalOf(bot) * (0.3 + daytonRoundWillingness(neg))) {
                if (patronForces(bot)) {
                    patronOverrides.push(overrideKey(bot));
                } else {
                    survived = false;
                }
            }
        }
        return survived;
    };

    // DIMENSION 2 — the master dial. Ideologically-adjusted (same as the bot prices it).
    const dial: EntityAutonomySetting = proposal.entity_autonomy ?? 'dayton-historical';
    if (dial !== 'dayton-historical') {
        const survived = survives(
            bot => adjustedCost(getDialDeclarationCost(dial, bot), dialPrefDelta(bot, dial)),
            bot => `dial:${dial}:${bot}`,
        );
        if (survived) out.entity_autonomy = dial;
    }

    // DIMENSION 3 — competency allocation (each deviating competency independently).
    if (proposal.competency_allocation) {
        const kept: Record<string, CompetencyOwnerChoice> = {};
        for (const compId of Object.keys(proposal.competency_allocation).sort(strictCompare)) {
            const owner = proposal.competency_allocation[compId] as CompetencyOwner;
            if (!owner) continue;
            const survived = survives(
                bot => adjustedCost(finalCompetencyCost(compId, owner, bot, dial), competencyPrefDelta(bot, compId, owner)),
                bot => `competency:${compId}:${bot}`,
            );
            if (survived) kept[compId] = owner;
        }
        if (Object.keys(kept).length > 0) out.competency_allocation = kept;
    }

    // DIMENSION 4 — constitutional choices.
    if (proposal.constitutional_choices) {
        const kept: Record<string, string> = {};
        for (const slotId of Object.keys(proposal.constitutional_choices).sort(strictCompare)) {
            const optionId = proposal.constitutional_choices[slotId];
            if (!optionId) continue;
            const order = getConstitutionalChoiceById(slotId)?.options.map(o => o.id) ?? [];
            const survived = survives(
                bot => adjustedCost(finalConstitutionalCost(slotId, optionId, bot, dial), constitutionalPrefDelta(bot, slotId, optionId, order)),
                bot => `constitutional:${slotId}:${bot}`,
            );
            if (survived) kept[slotId] = optionId;
        }
        if (Object.keys(kept).length > 0) out.constitutional_choices = kept;
    }

    // DIMENSION 5 — return/justice choices.
    if (proposal.return_justice) {
        const kept: Record<string, string> = {};
        for (const slotId of Object.keys(proposal.return_justice).sort(strictCompare)) {
            const optionId = proposal.return_justice[slotId];
            if (!optionId) continue;
            const order = getConstitutionalChoiceById(slotId)?.options.map(o => o.id) ?? [];
            const survived = survives(
                bot => adjustedCost(finalReturnJusticeCost(slotId, optionId, bot, dial), constitutionalPrefDelta(bot, slotId, optionId, order)),
                bot => `return_justice:${slotId}:${bot}`,
            );
            if (survived) kept[slotId] = optionId;
        }
        if (Object.keys(kept).length > 0) out.return_justice = kept;
    }

    return out;
}

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
