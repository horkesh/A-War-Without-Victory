/**
 * Paramilitary sweep system.
 *
 * Rear pocket cleanup: small units that capture isolated enemy pockets completely surrounded
 * by friendly territory. Active weeks 0-20. War crimes wired.
 *
 * The offensive mode (v0.6.5) has no detector: it was never called by a turn phase and was
 * retired in §6 D1 stage 2. Only its read side remains, so an old save's `offensive`
 * paramilitary or request still advances and resolves.
 *
 * Casualties inflicted and suffered count toward faction totals.
 *
 * Player choice: a manual (autonomy 0) player gets the batch decision panel under `ask`; every
 * other faction (bots, and a human's staff at Assisted to Observer) passes the one policy gate in
 * `detectParamilitaryTargets` (paramilitary_policy.ts, §6 D1 stage 2).
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { recordBattleCasualties } from '../../state/casualty_ledger.js';
import { strictCompare } from '../../state/validateGameState.js';
import { defaultArmyLabelForSide, type PoliticalSideId } from '../../state/identity.js';
import { appendDisplacementEvent } from '../../state/displacement_event_log.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
import { recordWarCrime } from '../../state/war_crimes_record.js';
import {
    PARAMILITARY_UNIT_SIZE,
    PARAMILITARY_MARCH_TURNS,
    PARAMILITARY_CASUALTY_RATE,
    PARAMILITARY_CIVILIAN_CASUALTY_RATE,
    PARAMILITARY_COHESION,
    PARAMILITARY_INITIAL_MORALE,
    PARAMILITARY_TARGET_AVG_POPULATION,
    PARAMILITARY_FADE_WEEK,
    PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN,
    PARAMILITARY_REAR_MIN_ORGANIZATIONAL_PENETRATION,
    PARAMILITARY_MAX_DEPLOYMENTS_PER_MUNICIPALITY_TURN,
    CONSOLIDATION_MIN_ORGANIZATIONAL_PENETRATION,
    OFFENSIVE_PARA_UNIT_SIZE,
    OFFENSIVE_PARA_FADE_WEEK,
    OFFENSIVE_PARA_MARCH_TURNS,
    OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE,
} from '../../state/formation_constants.js';
import { analyzeFactionGraph } from './osid_graph_analysis.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from './enclave_resilience.js';
import { isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';
import { lookupParamilitaryNamedUnit } from '../../../data/source/oob/paramilitary_named_units.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { EdgeRecord } from '../../map/settlements.js';
// Casualty split routed through the B1 casualty-realism V2 gate. Flag-OFF returns the
// shipped main-path split (KIA 0.22 / WIA 0.74 / MIA 0.04), byte-identical to before.
import { getMainCasualtySplit } from './casualty_realism_v2_gate.js';
import { selectManualPlayerFaction } from '../bot/staff_control.js';
import { resolveNonManualParamilitaryPolicy } from './paramilitary_policy.js';
import {
    PARAMILITARY_POLICY_CARD_BY_FACTION,
    hasParamilitaryPolicyCardApplied,
    readParamilitaryStandingOrder,
} from '../events/paramilitary_policy_card.js';
import type { EventDefinition } from '../events/event_types.js';
/** Casualty multiplier when paramilitary retreats from defended OSID (heavy losses). */
const DEFENDED_RETREAT_CASUALTY_MULT = 3;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ParamilitarySweepReport {
    spawned: Array<{ faction: FactionId; target_osid: string; formation_id: FormationId }>;
    captured: Array<{ faction: FactionId; osid: string; formation_id: FormationId; casualties_inflicted: number; casualties_suffered: number }>;
    dissolved: FormationId[];
    pending_player_requests: number;
}

export type ParamilitarySeverityBand = 'minor' | 'mid' | 'severe';

function emptyReport(): ParamilitarySweepReport {
    return { spawned: [], captured: [], dissolved: [], pending_player_requests: 0 };
}

/**
 * THE MANUAL REQUEST GATE (§6 design T3, signed 2026-11-19, round 2 R2-1).
 *
 * A player with a registered paramilitary-policy card (RBiH, RS) gets no paramilitary request, and no stale
 * request is approved or kept, until that card has APPLIED an answer: fired, receipted, and its policy flag a
 * valid order (`hasParamilitaryPolicyCardApplied`, the one accessor M-a's cap and D1 also read). A FILED
 * answer is not an applied one: under T2 the RBiH card is answered at t0 and applies at t4, and releasing on
 * the t0 receipt would let the player approve t1-t3 sweeps and then collect the refusal's credit at t4.
 *
 * There is no turn test and no "window passed" or "closed" exit: a card that never applies (its enabling card
 * left unanswered, a lapse, a closure) holds the player through the sweep fade week, so no act is ever bought
 * at zero card price. The gate runs before the fade check in both detect steps; once nothing more is made
 * after the fade, holding and not holding are the same. Held requests are deleted, never replayed: after the
 * card applies, requests are built afresh from the current map by the normal detection.
 *
 * Binds only a manual (autonomy 0) player in `detectParamilitaryTargets` (staff control and headless have no
 * gate player). HRHB has no card and is never held (the registered §6 gap).
 */
function paramilitaryRequestGateHolds(state: GameState, playerFaction: FactionId | null): boolean {
    if (!playerFaction || !PARAMILITARY_POLICY_CARD_BY_FACTION[playerFaction]) return false;
    return !hasParamilitaryPolicyCardApplied(state, playerFaction);
}

/**
 * The player the request gate binds: a manual (autonomy 0) player only; null for staff control and headless.
 * It is the player of `detectParamilitaryTargets`' manual path (`selectManualPlayerFaction`, §6 D1 stage 2).
 */
function selectRequestGatePlayer(state: GameState): FactionId | null {
    return selectManualPlayerFaction(state);
}

/**
 * Whether the manual player's paramilitary requests are held this turn. The request IPC reads it too
 * (engine D5): a save loaded while the gate holds may still carry requests an older build made, and none of
 * them may be approved before the next detect deletes them.
 */
export function isPlayerParamilitaryRequestGateHolding(state: GameState): boolean {
    return paramilitaryRequestGateHolds(state, selectRequestGatePlayer(state));
}

function removePrematurePlayerParamilitaryRequests(state: GameState, playerFaction: FactionId): void {
    if (!Array.isArray(state.pending_paramilitary_requests)) return;
    state.pending_paramilitary_requests = state.pending_paramilitary_requests
        .filter((request) => request.faction !== playerFaction);
}

/**
 * §6 mechanics item 4 (ruled 6/6, 2026-11-23): when the player's side is no longer manual (autonomy >= 1, its staff
 * in control), its UNDECIDED paramilitary requests are deleted WITHOUT writing history, as the premature-request
 * removal above does. A deleted request was never answered, so it is no decision of the player's: it must not reach
 * `resolvePlayerParamilitaryDecisions`, `paramilitary_decision_history`, or any receipt. The staff default then acts on
 * those targets at the next detect. Decided requests (allow / deny / regular) are kept for their resolver.
 *
 * Callers: `apply-autonomy-transition` (the advance that raises the level) and `detectParamilitaryTargets` (saves
 * already at levels 1-3). No-op without a player faction, for a manual player, and when the field is absent (never
 * created), so headless stays byte-identical.
 */
export function removeNonManualPlayerParamilitaryRequests(state: GameState): void {
    const playerFaction = state.meta?.player_faction ?? null;
    if (playerFaction == null || selectManualPlayerFaction(state) === playerFaction) return;
    if (!Array.isArray(state.pending_paramilitary_requests)) return;
    const kept = state.pending_paramilitary_requests.filter((request) => (
        request.faction !== playerFaction
        || request.decision === 'allow'
        || request.decision === 'deny'
        || request.decision === 'regular'
    ));
    if (kept.length !== state.pending_paramilitary_requests.length) {
        state.pending_paramilitary_requests = kept;
    }
}

export function classifyParamilitaryDeploymentBand(deploymentCount: number): ParamilitarySeverityBand {
    if (deploymentCount >= 10) return 'severe';
    if (deploymentCount >= 4) return 'mid';
    return 'minor';
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Build a set of OSIDs that have an enemy defender, for O(1) lookup. */
function buildDefendedOsids(state: GameState): Set<string> {
    const defended = new Set<string>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.location_osid) defended.add(f.location_osid);
    }
    return defended;
}

/** Build a map of OSID → defending faction for non-paramilitary brigades. */
function buildDefenderFactionMap(state: GameState): Map<string, FactionId> {
    const map = new Map<string, FactionId>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.location_osid && !map.has(f.location_osid)) {
            map.set(f.location_osid, f.faction);
        }
    }
    return map;
}

/** Check if an OSID has a same-controller brigade at any adjacent OSID.
 *  Paramilitaries avoid villages adjacent to organized military presence. */
function hasAdjacentDefender(
    osid: string,
    controller: string,
    adjacency: Map<string, string[]>,
    defenderFactionMap: Map<string, FactionId>
): boolean {
    const neighbors = adjacency.get(osid);
    if (!neighbors) return false;
    for (const n of neighbors) {
        const defFaction = defenderFactionMap.get(n);
        if (defFaction && defFaction === controller) return true;
    }
    return false;
}

/** Check if an OSID is defended by a formation from a different faction. */
function isDefendedAgainst(defendedOsids: Set<string>, state: GameState, osid: string, attackerFaction: FactionId): boolean {
    if (!defendedOsids.has(osid)) return false;
    // Confirm at least one non-attacker active formation is there
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.faction !== attackerFaction && f.location_osid === osid) return true;
    }
    return false;
}

/** Generate a deterministic paramilitary formation ID. */
function makeParamilitaryId(faction: FactionId, turn: number, index: number): FormationId {
    return `para_${faction.toLowerCase()}_t${turn}_${index}`;
}

type ParamilitaryMode = 'rear_pocket' | 'offensive';

interface ParamilitaryOrganizationScore {
    paramilitary: number;
    party: number;
}

interface RankedParamilitaryTarget {
    osid: string;
    municipalityId: string;
    organization: ParamilitaryOrganizationScore;
    dominance: number;
    support: number;
}

function municipalityIdFromOsid(osid: string): string {
    return osid.split(':')[1] ?? osid;
}

function getFactionOrganizationScore(
    state: GameState,
    faction: FactionId,
    osid: string,
): ParamilitaryOrganizationScore {
    const penetration = state.political.municipalities?.[municipalityIdFromOsid(osid)]
        ?.organizational_penetration;
    if (!penetration) return { paramilitary: 0, party: 0 };

    switch (faction) {
        case 'RBiH':
            return {
                paramilitary: penetration.patriotska_liga ?? 0,
                party: penetration.sda_penetration ?? 0,
            };
        case 'RS':
            return {
                paramilitary: penetration.paramilitary_rs ?? 0,
                party: penetration.sds_penetration ?? 0,
            };
        case 'HRHB':
            return {
                paramilitary: penetration.paramilitary_hrhb ?? 0,
                party: penetration.hdz_penetration ?? 0,
            };
        default:
            return { paramilitary: 0, party: 0 };
    }
}

function buildRankedParamilitaryTarget(
    state: GameState,
    faction: FactionId,
    controller: FactionId,
    osid: string,
    minimumOrganization: number,
    adjacency: Map<string, string[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): RankedParamilitaryTarget | null {
    const organization = getFactionOrganizationScore(state, faction, osid);
    const controllerOrganization = getFactionOrganizationScore(state, controller, osid);
    if (
        organization.paramilitary < minimumOrganization
        || organization.paramilitary <= controllerOrganization.paramilitary
    ) {
        return null;
    }
    return {
        osid,
        municipalityId: municipalityIdFromOsid(osid),
        organization,
        dominance: organization.paramilitary - controllerOrganization.paramilitary,
        support: countFriendlyAdjacentOsids(osid, faction, adjacency, state, reverseMap),
    };
}

/**
 * CONSOLIDATION SWEEP (2026-08-25, flag-gated by `meta.consolidation_sweep_enabled`).
 *
 * Returns enemy-held OSIDs that are NOT isolated pockets but sit inside a municipality the
 * faction already controls politically and dominates organisationally.
 *
 * WHY. `enemy_pockets` models mop-up of cut-off settlements. The 1992 upper-Drina campaign
 * was not that: it cleared minority villages that remained CONTIGUOUS with other minority
 * ground, municipality by municipality, in areas already under Serb political control. With
 * pocket-only targeting the engine produced 19 paramilitary flips in 188 weeks, and Čajniče's
 * batotici/miljeno_2/todorovici, Foča's brusna_2 and Pale's prača survive to January 1993
 * although every reference snapshot has them RS from 1992. The authored data was always
 * there and unused: Čajniče and Foča carry paramilitary_rs 60, sds 85, to_control 'controlled'.
 *
 * GUARDS PRESERVED DELIBERATELY. Enclave membership is still an absolute skip, so the
 * ENCLAVE GUARD (canon H1.8) is untouched — Goražde's own osid_list, including glamoc,
 * kamen, sopotnica and kolovarice, remains unreachable by any sweep. Defended settlements,
 * regular-force-claimed targets, adjacent defenders, the per-turn caps and
 * PARAMILITARY_FADE_WEEK all continue to apply.
 *
 * AGENCY AND CONSEQUENCE. Candidates returned here flow into the SAME ranking and the SAME
 * player/bot branch as pocket candidates, so a player faction is asked per deployment via
 * `pending_paramilitary_requests` (carrying `estimated_civilian_risk`) and the choice is
 * written to `paramilitary_decision_history`. On resolution `recordWarCrime` increments
 * `war_crimes_events_emergent`, which sets `authorized_cleansing_condemnation` at a
 * threshold of ONE and caps the grade at C / hollow_victory. Ground taken this way is
 * historically reachable and never free.
 */
function collectConsolidationCandidates(
    state: GameState,
    faction: FactionId,
    adjacency: Map<string, string[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): string[] {
    const controllers = state.political.political_controllers ?? {};
    const out: string[] = [];
    for (const osid of Object.keys(controllers).sort(strictCompare)) {
        const controller = controllers[osid];
        if (!controller || controller === faction) continue;
        const municipalityId = municipalityIdFromOsid(osid);
        const penetration = state.political.municipalities?.[municipalityId]?.organizational_penetration;
        // Political control of the municipality is required — this represents consolidating
        // ground you already hold, not seizing a municipality by paramilitary alone.
        if (!penetration || penetration.to_control !== 'controlled') continue;
        const org = getFactionOrganizationScore(state, faction, osid);
        const controllerOrg = getFactionOrganizationScore(state, controller, osid);
        if (org.paramilitary < CONSOLIDATION_MIN_ORGANIZATIONAL_PENETRATION) continue;
        if (org.paramilitary <= controllerOrg.paramilitary) continue;
        // Must border ground the faction already holds: a sweep spreads outward from held
        // territory, it does not appear in the middle of enemy country.
        if (countFriendlyAdjacentOsids(osid, faction, adjacency, state, reverseMap) === 0) continue;
        out.push(osid);
    }
    return out;
}

function compareRankedParamilitaryTargets(
    a: RankedParamilitaryTarget,
    b: RankedParamilitaryTarget,
): number {
    if (a.organization.paramilitary !== b.organization.paramilitary) {
        return b.organization.paramilitary - a.organization.paramilitary;
    }
    if (a.organization.party !== b.organization.party) {
        return b.organization.party - a.organization.party;
    }
    if (a.support !== b.support) return b.support - a.support;
    if (a.dominance !== b.dominance) return b.dominance - a.dominance;
    const municipalityOrder = strictCompare(a.municipalityId, b.municipalityId);
    return municipalityOrder !== 0 ? municipalityOrder : strictCompare(a.osid, b.osid);
}

function getFormationParamilitaryMode(formation: FormationState): ParamilitaryMode {
    return formation.paramilitary_mode === 'offensive' ? 'offensive' : 'rear_pocket';
}

function getRequestParamilitaryMode(
    request: NonNullable<GameState['pending_paramilitary_requests']>[number],
): ParamilitaryMode {
    return request.mode === 'offensive' ? 'offensive' : 'rear_pocket';
}

function collectParamilitaryIssuedTargets(
    state: GameState,
    faction: FactionId,
    turn: number,
    mode?: ParamilitaryMode,
): Set<string> {
    const targets = new Set<string>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[fid];
        if (
            !formation
            || formation.kind !== 'paramilitary'
            || formation.faction !== faction
            || formation.created_turn !== turn
            || !formation.paramilitary_target
        ) {
            continue;
        }
        if (mode && getFormationParamilitaryMode(formation) !== mode) continue;
        targets.add(formation.paramilitary_target);
    }
    for (const request of state.pending_paramilitary_requests ?? []) {
        if (request.faction !== faction) continue;
        if (mode && getRequestParamilitaryMode(request) !== mode) continue;
        targets.add(request.target_osid);
    }
    for (const decision of state.paramilitary_decision_history ?? []) {
        if (decision.faction !== faction || decision.turn !== turn) continue;
        const decisionMode = decision.mode === 'offensive' ? 'offensive' : 'rear_pocket';
        if (mode && decisionMode !== mode) continue;
        targets.add(decision.target_osid);
    }
    return targets;
}

function buildRegularForceClaimedTargets(state: GameState): Set<string> {
    const targets = new Set<string>();
    const attackOrders = state.military.brigade_attack_orders ?? {};
    for (const formationId of Object.keys(attackOrders).sort(strictCompare)) {
        const target = attackOrders[formationId];
        if (target) targets.add(target);
    }
    return targets;
}

/**
 * Rear-pocket cleanup is a rear-area mechanism, not an enclave offensive.
 * A besieged enclave faction must use a CorpsOperation to expand within the
 * enclave capital's municipality, even when OSID topology makes an enemy
 * perimeter cell look isolated.
 */
function isEnclaveMunicipalityExpansion(faction: FactionId, targetOsid: string): boolean {
    const targetMunicipality = municipalityIdFromOsid(targetOsid);
    const enclave = ENCLAVE_DEFINITIONS.find((candidate) =>
        candidate.faction === faction
        && typeof candidate.capital_osid === 'string'
        && municipalityIdFromOsid(candidate.capital_osid) === targetMunicipality,
    );
    return enclave != null && !osidBelongsToEnclave(targetOsid, enclave);
}

/** Split total casualties into KIA/WIA/MIA using the main-path split.
 * Routed through the B1 casualty-realism V2 gate (default OFF ⇒ KIA/WIA_FRACTION exactly). */
function splitCasualties(total: number): { killed: number; wounded: number; missing_captured: number } {
    const { kia, wia } = getMainCasualtySplit();
    const killed = Math.floor(total * kia);
    const wounded = Math.floor(total * wia);
    return { killed, wounded, missing_captured: Math.max(0, total - killed - wounded) };
}

// ═══════════════════════════════════════════════════════════════════════════
// Core: Detect pockets and create requests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect rear enemy pockets for all factions and generate paramilitary requests.
 * A manual (autonomy 0) player's faction follows its standing order request by request and
 * populates pending_paramilitary_requests under `ask`. Every other faction (a bot, or a human's
 * staff at Assisted, Delegated or Observer) sends sweeps only when
 * `resolveNonManualParamilitaryPolicy` allows it (§6 D1 stage 2).
 *
 * `eventDefinitions` is the turn's event catalog: an undecided bot reads its card's historical
 * default from it. Production passes it on every turn (scenario runner, desktop); `undefined`
 * keeps the pre-binding allow for undecided bots only and exists for synthetic unit tests.
 *
 * Call once per turn, after partition-corps-front-sectors.
 */
export function detectParamilitaryTargets(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
    eventDefinitions: readonly EventDefinition[] | undefined,
): ParamilitarySweepReport {
    const report = emptyReport();
    const turn = state.meta?.turn ?? 0;
    // Only a manual (autonomy 0) player keeps the request/policy path below, behind the §6 T3
    // request gate. At autonomy >= 1 the player's staff and every bot go through the one policy
    // gate in the faction loop (§6 D1 stage 2, which replaced the 2026-11-05 "staff run
    // consolidation like bots" rule). Headless has no player: every faction is a bot.
    const playerFaction = selectRequestGatePlayer(state);
    const requestGateHolds = paramilitaryRequestGateHolds(state, playerFaction);
    if (requestGateHolds && playerFaction) {
        removePrematurePlayerParamilitaryRequests(state, playerFaction);
    } else {
        resolveStandingPolicyPendingParamilitaryRequests(state, playerFaction);
    }
    // §6 mechanics item 4: a save already at levels 1-3 may still hold the player's undecided requests from
    // Full Control. Delete them before the targets are built, so the staff default can take those targets.
    removeNonManualPlayerParamilitaryRequests(state);
    if (turn > PARAMILITARY_FADE_WEEK) return report;

    const adjacency = buildOsidAdjacency(edges);
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);
    const defendedOsids = buildDefendedOsids(state);
    const defenderFactionMap = buildDefenderFactionMap(state);
    const regularForceClaimedTargets = buildRegularForceClaimedTargets(state);

    // Existing paramilitary targets — avoid duplicates
    const existingTargets = new Set<string>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (f?.kind === 'paramilitary' && f.paramilitary_target) {
            existingTargets.add(`${f.faction}:${f.paramilitary_target}`);
        }
    }
    for (const req of state.pending_paramilitary_requests ?? []) {
        existingTargets.add(`${req.faction}:${req.target_osid}`);
    }

    for (const faction of factions) {
        if (faction === playerFaction && requestGateHolds) continue;
        // §6 D1 stage 2: the one gate in front of every non-manual spawn. A bot follows its
        // decided card flag, else the card's historical default; a human's staff follow the
        // human's current standing order (unanswered or `ask` sends none). Deny skips every
        // candidate, so skipping the faction here is the same as skipping each one.
        if (
            faction !== playerFaction
            && resolveNonManualParamilitaryPolicy(state, faction, eventDefinitions) !== 'always_allow'
        ) {
            continue;
        }
        // LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-DEDUPE bisect (2026-05-05): this call site
        // MUST stay on legacy `analyzeFactionGraph`. Routing it through `analyzeFactionGraphCached`
        // produced reproducible 40w hash drift (`51dca710b9db7d37` cached vs baseline
        // `ef03ab4d6c5ecd28`); reverting only this site to legacy restored byte-identity (n1648).
        // Cause is structural (paramilitary runs at war_phases:809 BEFORE bot-orders at 1148; if
        // it seeds the per-(state, faction) cache, the bot-orders pipeline reads pre-paramilitary-
        // mutation graph state) — keep this site fresh-recompute. The G3-safe dedup ships at
        // bot_corps_ai.ts + bot_brigade_ai_osid.ts (the audit's primary 198 ms/turn target).
        const graphAnalysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);
        const consolidationTargets = state.meta?.consolidation_sweep_enabled === true
            ? collectConsolidationCandidates(state, faction, adjacency, reverseMap)
            : [];
        const pockets = [...new Set([...graphAnalysis.enemy_pockets, ...consolidationTargets])]
            .sort(strictCompare);
        if (pockets.length === 0) continue;

        let spawnIndex = 0;
        const issuedTargets = collectParamilitaryIssuedTargets(state, faction, turn, 'rear_pocket');
        const allModeIssuedTargets = collectParamilitaryIssuedTargets(state, faction, turn);
        for (const target of allModeIssuedTargets) existingTargets.add(`${faction}:${target}`);
        let deploymentsThisTurn = issuedTargets.size;
        const municipalityDeploymentCounts = new Map<string, number>();
        for (const target of allModeIssuedTargets) {
            const municipalityId = municipalityIdFromOsid(target);
            municipalityDeploymentCounts.set(
                municipalityId,
                (municipalityDeploymentCounts.get(municipalityId) ?? 0) + 1,
            );
        }

        const candidates: RankedParamilitaryTarget[] = [];
        for (const pocketOsid of pockets) {
            if (existingTargets.has(`${faction}:${pocketOsid}`)) continue;
            // Skip enclave OSIDs — surrounded topology is correct siege geometry, not abandoned pocket
            if (ENCLAVE_DEFINITIONS.some(enc => enc.faction !== faction && osidBelongsToEnclave(pocketOsid, enc))) continue;
            // The enclave holder may not turn the same topological abstraction
            // into a free outward capture. Expansion requires CorpsOperation.
            if (isEnclaveMunicipalityExpansion(faction, pocketOsid)) continue;
            const currentController = getPoliticalControllerOSID(state, pocketOsid, reverseMap);
            if (!currentController || currentController === faction) continue;
            if (isRbihHrhbCombatBlocked(state, faction, currentController)) continue;
            if (regularForceClaimedTargets.has(pocketOsid)) continue;
            if (hasAdjacentDefender(pocketOsid, currentController, adjacency, defenderFactionMap)) continue;
            if (isDefendedAgainst(defendedOsids, state, pocketOsid, faction)) continue;
            const candidate = buildRankedParamilitaryTarget(
                state,
                faction,
                currentController,
                pocketOsid,
                PARAMILITARY_REAR_MIN_ORGANIZATIONAL_PENETRATION,
                adjacency,
                reverseMap,
            );
            if (candidate) candidates.push(candidate);
        }

        candidates.sort(compareRankedParamilitaryTargets);
        for (const candidate of candidates) {
            if (deploymentsThisTurn >= PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN) break;
            const deploymentsInMunicipality = municipalityDeploymentCounts.get(candidate.municipalityId) ?? 0;
            if (deploymentsInMunicipality >= PARAMILITARY_MAX_DEPLOYMENTS_PER_MUNICIPALITY_TURN) continue;

            // Player faction: create request instead of auto-spawning. The standing order is read through
            // the §6 M-a cap (never above the policy card's applied answer; `ask` before it applies).
            if (faction === playerFaction) {
                const policy = readParamilitaryStandingOrder(state, faction);
                if (policy === 'always_deny') continue;
                if (policy === 'always_allow') {
                    spawnParamilitary(state, faction, candidate.osid, turn, spawnIndex, report);
                    spawnIndex++;
                    deploymentsThisTurn++;
                    existingTargets.add(`${faction}:${candidate.osid}`);
                    municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
                    continue;
                }
                // 'ask' — add to pending
                const requests = state.pending_paramilitary_requests ??= [];
                requests.push({
                    target_osid: candidate.osid,
                    faction,
                    strength: PARAMILITARY_UNIT_SIZE,
                    estimated_civilian_risk: estimateParamilitaryCivilianRisk('rear_pocket'),
                    mode: 'rear_pocket',
                });
                report.pending_player_requests++;
                deploymentsThisTurn++;
                existingTargets.add(`${faction}:${candidate.osid}`);
                municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
                continue;
            }

            // Non-manual faction (bot, or a human's staff): the policy gate above already allowed it.
            spawnParamilitary(state, faction, candidate.osid, turn, spawnIndex, report);
            spawnIndex++;
            deploymentsThisTurn++;
            existingTargets.add(`${faction}:${candidate.osid}`);
            municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
        }
    }

    return report;
}

function resolveStandingPolicyPendingParamilitaryRequests(
    state: GameState,
    playerFaction: FactionId | null,
): void {
    // §6 M-a: a standing order above the card's applied answer (an old save's modal order) never auto-approves.
    const policy = readParamilitaryStandingOrder(state, playerFaction);
    if (policy === 'ask' || !playerFaction || !Array.isArray(state.pending_paramilitary_requests)) return;
    let changed = false;
    for (const request of state.pending_paramilitary_requests) {
        if (!request || request.faction !== playerFaction) continue;
        if (request.decision === 'allow' || request.decision === 'deny' || request.decision === 'regular') continue;
        request.decision = policy === 'always_allow' ? 'allow' : 'deny';
        changed = true;
    }
    if (changed) resolvePlayerParamilitaryDecisions(state);
}

function countFriendlyAdjacentOsids(
    osid: string,
    faction: FactionId,
    adjacency: Map<string, string[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
): number {
    let count = 0;
    const neighbors = [...(adjacency.get(osid) ?? [])].sort(strictCompare);
    for (const neighbor of neighbors) {
        if (getPoliticalControllerOSID(state, neighbor, reverseMap) === faction) count++;
    }
    return count;
}

/** Spawn a paramilitary formation targeting an OSID. Shared by rear pocket and offensive modes. */
function spawnParamilitary(
    state: GameState,
    faction: FactionId,
    targetOsid: string,
    turn: number,
    index: number,
    report: ParamilitarySweepReport,
    mode: 'rear_pocket' | 'offensive' = 'rear_pocket'
): void {
    const isOffensive = mode === 'offensive';
    const formations = state.military.formations ??= {};
    let resolvedIndex = index;
    let fid = isOffensive
        ? `opara_${faction.toLowerCase()}_t${turn}_${resolvedIndex}`
        : makeParamilitaryId(faction, turn, resolvedIndex);
    while (formations[fid]) {
        resolvedIndex++;
        fid = isOffensive
            ? `opara_${faction.toLowerCase()}_t${turn}_${resolvedIndex}`
            : makeParamilitaryId(faction, turn, resolvedIndex);
    }
    const namedUnit = lookupParamilitaryNamedUnit(faction, mode, resolvedIndex, turn);

    formations[fid] = {
        id: fid,
        faction,
        force_label: defaultArmyLabelForSide(faction as PoliticalSideId),
        name: namedUnit?.name ?? (isOffensive ? `Offensive Paramilitary (${faction})` : `Paramilitary Unit (${faction})`),
        created_turn: turn,
        status: 'active',
        assignment: null,
        kind: 'paramilitary',
        readiness: 'active',
        personnel: isOffensive ? OFFENSIVE_PARA_UNIT_SIZE : PARAMILITARY_UNIT_SIZE,
        cohesion: PARAMILITARY_COHESION,
        morale: PARAMILITARY_INITIAL_MORALE,
        activation_gated: false,
        activation_turn: null,
        ops: { fatigue: 0, last_supplied_turn: null },
        paramilitary_target: targetOsid,
        paramilitary_eta: isOffensive ? OFFENSIVE_PARA_MARCH_TURNS : PARAMILITARY_MARCH_TURNS,
        ...(isOffensive ? { paramilitary_mode: 'offensive' as const } : {}),
    } satisfies FormationState;

    const counts = ensureParamilitaryDeploymentCountMap(state);
    counts[faction] = (counts[faction] ?? 0) + 1;
    recordParamilitaryCostAnnotation(state, faction, counts[faction], turn);

    report.spawned.push({ faction, target_osid: targetOsid, formation_id: fid });
}

function ensureParamilitaryDeploymentCountMap(state: GameState): Record<FactionId, number> {
    if (!state.paramilitary_deployment_count || typeof state.paramilitary_deployment_count !== 'object') {
        state.paramilitary_deployment_count = {} as Record<FactionId, number>;
    }
    return state.paramilitary_deployment_count;
}

function recordParamilitaryCostAnnotation(
    state: GameState,
    faction: FactionId,
    deploymentCount: number,
    turn: number
): void {
    const annotations = state.military.cost_ledger_annotations ??= [];
    const eventId = `cost_war_crimes_findings_${faction}`;
    const tag = `paramilitary_war_crimes_${classifyParamilitaryDeploymentBand(deploymentCount)}`;
    const text = `deployment_count=${deploymentCount}`;
    const existing = annotations.find((entry) => entry.event_id === eventId && entry.turn === turn && entry.faction === faction);
    if (existing) {
        existing.tag = tag;
        existing.text = text;
        return;
    }
    annotations.push({ event_id: eventId, tag, text, turn, faction });
}

// ═══════════════════════════════════════════════════════════════════════════
// Offensive paramilitary detection: retired (§6 D1 stage 2, 2026-11-18)
// ═══════════════════════════════════════════════════════════════════════════
//
// `detectOffensiveParamilitaryTargets` had no production call site (no turn phase called it) and
// read the raw `player_faction`, the staff-bypass bug class. It was deleted together with its
// detector-only constants; the retirement commit is byte-identical, which proves the code was dead.
// The read side stays so old saves still advance and resolve an `offensive` paramilitary:
// `spawnParamilitary`'s mode, the offensive branch of `advanceParamilitaries`, the offensive fade
// in `resolvePlayerParamilitaryDecisions`, `paramilitary_mode` and the `opara_` filter.
// tests/paramilitary_spawn_guard.test.ts fails if any phase calls an offensive spawner again.

// recordWarCrime lives in src/state/war_crimes_record.ts (RF-5B): the minority
// expulsion policy in displacement_takeover.ts records through the same writer.

function estimateParamilitaryCivilianRisk(mode: 'rear_pocket' | 'offensive'): number {
    const rate = mode === 'offensive'
        ? OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE
        : PARAMILITARY_CIVILIAN_CASUALTY_RATE;
    return Math.ceil(PARAMILITARY_TARGET_AVG_POPULATION * rate);
}

// ═══════════════════════════════════════════════════════════════════════════
// Core: Advance and resolve paramilitary units
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advance all active paramilitary formations.
 * - Decrement ETA
 * - At ETA=0: capture target, suffer/inflict casualties, dissolve
 *
 * Call once per turn, after detection.
 */
export function advanceParamilitaries(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): ParamilitarySweepReport {
    const report = emptyReport();
    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;
    const defendedOsids = buildDefendedOsids(state);
    const adjacency = buildOsidAdjacency(edges);
    const defenderFactionMap = buildDefenderFactionMap(state);

    const paraIds = Object.keys(formations)
        .filter(fid => formations[fid]?.kind === 'paramilitary' && formations[fid]?.status === 'active')
        .sort(strictCompare);

    for (const fid of paraIds) {
        const f = formations[fid];
        if (!f || !f.paramilitary_target) continue;

        if (turn > PARAMILITARY_FADE_WEEK) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        const eta = (f.paramilitary_eta ?? 0) - 1;
        f.paramilitary_eta = eta;
        if (eta > 0) continue;

        const targetOsid = f.paramilitary_target;
        const currentController = getPoliticalControllerOSID(state, targetOsid, reverseMap);
        const isOffensive = f.paramilitary_mode === 'offensive';

        // Already faction-controlled — just dissolve
        if (currentController === f.faction) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Apply the same bilateral-combat truth used by regular battle resolution.
        if (isRbihHrhbCombatBlocked(state, f.faction, currentController)) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Organized defense blocks autonomous paramilitary seizure in every mode.
        const defended = isDefendedAgainst(defendedOsids, state, targetOsid, f.faction);
        const hasAdjacentOrganizedDefense = currentController
            ? hasAdjacentDefender(targetOsid, currentController, adjacency, defenderFactionMap)
            : false;

        if (defended || hasAdjacentOrganizedDefense) {
            if (isOffensive) {
                const casualties = Math.ceil((f.personnel ?? OFFENSIVE_PARA_UNIT_SIZE) * PARAMILITARY_CASUALTY_RATE * DEFENDED_RETREAT_CASUALTY_MULT);
                if (state.military.casualty_ledger) {
                    recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(casualties));
                }
                dissolveParamilitary(state, fid, report);
                continue;
            } else {
                // Rear pocket mode: exact-tile or adjacent organized defense blocks silent cleanup capture
                const casualties = Math.ceil(f.personnel! * PARAMILITARY_CASUALTY_RATE * DEFENDED_RETREAT_CASUALTY_MULT);
                if (state.military.casualty_ledger) {
                    recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(casualties));
                }
                dissolveParamilitary(state, fid, report);
                continue;
            }
        }

        // Capture: flip control
        const pc = state.political.political_controllers ??= {};
        const previousController = pc[targetOsid];
        pc[targetOsid] = f.faction;
        if (previousController && previousController !== f.faction) {
            seedDisplacementTimerOnFlip(state, targetOsid, previousController, f.faction);
        }

        (state.political.control_events ??= []).push({
            turn,
            settlement_id: targetOsid,
            mechanism: 'paramilitary' as const,
            from: currentController ?? null,
            to: f.faction
        });

        // Paramilitary casualties (suffered)
        const unitSize = isOffensive ? OFFENSIVE_PARA_UNIT_SIZE : PARAMILITARY_UNIT_SIZE;
        const selfCas = Math.ceil((f.personnel ?? unitSize) * PARAMILITARY_CASUALTY_RATE);
        if (state.military.casualty_ledger) {
            recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(selfCas));
        }

        // Civilian casualties inflicted (war crimes)
        const civCasRate = isOffensive ? OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE : PARAMILITARY_CIVILIAN_CASUALTY_RATE;
        const civCas = Math.ceil(PARAMILITARY_TARGET_AVG_POPULATION * civCasRate);
        if (currentController) {
            const targetMunId = targetOsid.split(':')[1];
            const cc = state.displacement.civilian_casualties ??= {} as typeof state.displacement.civilian_casualties & Record<string, { killed?: number; fled_abroad?: number }>;
            const civFaction = cc[currentController] ??= { killed: 0, fled_abroad: 0 };
            civFaction.killed = (civFaction.killed ?? 0) + civCas;

            const municipalityPopulation = targetMunId
                ? state.displacement.displacement_state?.[targetMunId]
                : undefined;
            if (municipalityPopulation) {
                municipalityPopulation.lost_population += civCas;
                municipalityPopulation.last_updated_turn = turn;
            }

            appendDisplacementEvent(state, {
                turn: state.meta.turn ?? 0,
                origin_mun: targetMunId ?? 'unknown',
                origin_osid: targetOsid,
                dest_mun: targetMunId ?? 'unknown',
                ethnicity: currentController,
                caused_by: f.faction,
                displaced: 0,
                killed: civCas,
                fled_abroad: 0,
                settled: 0,
            });
        }

        // War crimes wiring — every paramilitary capture is a war crime
        recordWarCrime(state, f.faction);

        report.captured.push({
            faction: f.faction,
            osid: targetOsid,
            formation_id: fid,
            casualties_inflicted: civCas,
            casualties_suffered: selfCas
        });

        dissolveParamilitary(state, fid, report);
    }

    return report;
}

/** Remove a paramilitary formation from state. */
function dissolveParamilitary(state: GameState, fid: FormationId, report: ParamilitarySweepReport): void {
    const f = (state.military.formations ?? {})[fid];
    if (f) {
        f.status = 'inactive';
        f.lifecycle_status = 'disbanded';
        f.readiness = 'degraded';
        f.personnel = 0;
    }
    report.dissolved.push(fid);
}

// ═══════════════════════════════════════════════════════════════════════════
// Player decision resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve player paramilitary decisions from the pending requests queue.
 * Called after player UI submits choices.
 */
export function resolvePlayerParamilitaryDecisions(state: GameState): ParamilitarySweepReport {
    const report = emptyReport();
    const requests = state.pending_paramilitary_requests ?? [];
    if (requests.length === 0) return report;

    const turn = state.meta?.turn ?? 0;
    let spawnIndex = 0;
    const history = Array.isArray(state.paramilitary_decision_history)
        ? [...state.paramilitary_decision_history]
        : [];

    for (const req of [...requests].sort((a, b) => strictCompare(a.target_osid, b.target_osid))) {
        if (req.decision === 'allow' || req.decision === 'deny' || req.decision === 'regular') {
            history.push({
                id: `paramilitary:${turn}:${req.target_osid}`,
                turn,
                target_osid: req.target_osid,
                faction: req.faction,
                strength: req.strength,
                decision: req.decision,
                ...(req.mode === 'rear_pocket' || req.mode === 'offensive'
                    ? { mode: req.mode }
                    : {}),
                ...(typeof req.estimated_civilian_risk === 'number'
                    ? { estimated_civilian_risk: req.estimated_civilian_risk }
                    : {}),
            });
        }
        const requestFadeWeek = req.mode === 'offensive'
            ? OFFENSIVE_PARA_FADE_WEEK
            : PARAMILITARY_FADE_WEEK;
        if (req.decision === 'allow' && turn <= requestFadeWeek) {
            spawnParamilitary(
                state,
                req.faction,
                req.target_osid,
                turn,
                spawnIndex,
                report,
                req.mode === 'offensive' ? 'offensive' : 'rear_pocket',
            );
            spawnIndex++;
        }
    }

    state.pending_paramilitary_requests = [];
    state.paramilitary_decision_history = history.sort((a, b) =>
        a.turn !== b.turn ? a.turn - b.turn : strictCompare(a.id, b.id)
    );
    return report;
}
