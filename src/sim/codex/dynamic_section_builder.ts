/**
 * Dynamic Codex section builder — LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE.
 *
 * Pure, deterministic builder for the v0.9.1 Dynamic Codex slice. Reads frozen
 * end-of-game inputs and emits:
 *
 *   1. `BuiltDynamicSection[]` — dynamic essay sections that should be inserted
 *      into canonical historical essays at endgame, gated on observable
 *      campaign state.
 *   2. `BuiltGhostEntry[]` — twenty explicitly classified path-not-taken,
 *      divergence-context, or audit-context Ring 2 records under
 *      `data/codex/ghost_entries/`.
 *
 * Sensitive-history boundary (`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`):
 *
 *   - Every entry emitted by this builder is Ring 2 (narrative). Ring 1
 *     (mechanical consequences such as condemnation flags or rupture
 *     enforcement) is owned by `evaluateRuptureConsequences()` and is NOT
 *     touched here.
 *   - The "enclave_defended" ghost entry is AUDIT-ONLY. It MUST be emitted with
 *     `variant: 'context'`. Emitting it with `variant: 'outcome'` would frame
 *     it as a player-induced strategic outcome — i.e. as a rupture-flip on the
 *     Srebrenica genocide. That is a §6 refused surface and the Ring guard
 *     enforces this at runtime.
 *   - The `assertRingGuard()` predicate refuses any builder input whose state
 *     carries a §6-class flag (rupture flip, genocide non-occurrence, score
 *     inversion). It throws rather than silently producing output.
 *
 * Determinism (Engine Invariants §4):
 *
 *   - No `Math.random()`, no `Date.now()`, no `Date` construction, no `Intl`
 *     locale dependence.
 *   - All iteration is over arrays produced by `sortedKeys()` /
 *     `sortedEntries()` using the canonical `strictCompare`.
 *   - Output ordering is fixed by `GHOST_ENTRIES` declaration order plus a
 *     final `strictCompare` sort on the emitted ids; same input → same output.
 *
 * Faction-agnostic predicates: where flags or counters are read for a
 * particular faction, the faction id is sourced from `state.player_faction`.
 * The builder never hard-codes RBiH/RS/HRHB-specific behaviour.
 */
import { strictCompare } from '../../state/validateGameState.js';
import { CANONICAL_FACTIONS } from '../../state/game_state.js';
import type { GameState, FactionId } from '../../state/game_state.js';
import {
    buildRealizedConsequenceReceipts,
    type ClaimPredicateOperand,
    type NamedClaimPredicate,
} from '../events/realized_consequence_receipts.js';

// ═══════════════════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════════════════

/** Ring classification per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1. Ring 2 only
 *  is emitted by this builder; Ring 1 mechanical consequences are owned by
 *  the rupture system. Ring 3 is the refused list and is never emitted. */
export type RingClassification = 1 | 2 | 3;

/** Variant hint used by the codex resolver to render dynamic content. The
 *  `outcome` variant frames a section as the consequence of a player choice;
 *  it must NOT be applied to the AUDIT-ONLY enclave-defended ghost entry.
 *  `outcome` is included in this union so future dynamic-section authoring
 *  can declare it for player-driven sections in other essays — the runtime
 *  guard in `buildGhostEntries` enforces that `enclave_defended` itself
 *  never receives that variant. */
export type SectionVariant = 'note' | 'divergence' | 'context' | 'ghost' | 'outcome';

/** A dynamic section emitted for a specific historical essay. The builder
 *  does not own the canonical essay text; it produces inserts that the
 *  resolver merges at render time. */
export interface BuiltDynamicSection {
    /** Stable id; deterministic across runs with identical input. */
    id: string;
    /** Target essay (canonical event id, no `essay_` prefix). */
    target_essay_event_id: string;
    /** Inserted body text after `{token}` resolution. */
    content: string;
    /** Render hint. Must be `context` for AUDIT-ONLY entries. */
    variant: SectionVariant;
    /** §1 ring classification. Must be 2 for everything this builder emits. */
    ring_classification: RingClassification;
    /** Human-readable predicate name(s) that gated this section. Diagnostic. */
    conditional_on: string[];
    /** Exact state/receipt owner that proves the rendered claim. */
    claim_predicate: NamedClaimPredicate;
    /** Calendar values may contextualize a claim but never prove it. */
    calendar_context: string[];
    /** Shared receipt identity when this section projects a realized receipt. */
    receipt_record_id?: string;
}

/** A classified Campaign Codex record. Records live as standalone Markdown
 *  bodies under `data/codex/ghost_entries/` and surface only when their exact
 *  persisted-state predicate evaluates true. */
export type GhostRecordClassification = 'path_not_taken' | 'divergence_context' | 'audit_context';

interface BuiltGhostEntryBase {
    /** Stable ghost id matching the file basename under `data/codex/ghost_entries/`. */
    ghost_id: string;
    /** Repo-relative path to the authored markdown body. */
    path: string;
    /** Always 2 for Ring 2 narrative observation. */
    ring_classification: RingClassification;
    /** Human-readable predicate name(s) that gated this ghost. Diagnostic. */
    conditional_on: string[];
    /** Render variant. Must be `context` for AUDIT-ONLY (`enclave_defended`). */
    variant: SectionVariant;
    /** Positive state predicate that proves this campaign record. */
    claim_predicate: NamedClaimPredicate;
    /** Calendar thresholds are context only, never the claim owner. */
    calendar_context: string[];
}

/** Only a genuine path-not-taken record may carry distinct missed-condition proof. */
export type BuiltGhostEntry =
    | (BuiltGhostEntryBase & {
        classification: 'path_not_taken';
        missed_condition_predicate: NamedClaimPredicate;
    })
    | (BuiltGhostEntryBase & {
        classification: 'divergence_context' | 'audit_context';
        missed_condition_predicate?: never;
    });

/** Builder input. Wraps the frozen end-of-game state and the current turn. */
export interface BuilderInput {
    state: GameState;
    currentTurn: number;
}

type GhostEntryFlagValue = string | number | boolean | undefined;

interface GhostEntryNegotiationCapitalView {
    war_crimes_events?: number;
}

/** Narrow read shape for a recorded rupture consequence. Mirrors
 *  `RuptureConsequence` (src/state/negotiation_types.ts) but kept local so the
 *  read-model builder does not import the negotiation-state surface. The
 *  Srebrenica receipt (#78) reads `id` + `recorded_turn` only; it never writes
 *  and never alters the rupture trigger/timing — it observes off the already
 *  recorded array. */
export interface RuptureConsequenceView {
    id: string;
    recorded_turn?: number;
    perpetrator_faction?: string;
    description?: string;
    condemnation_flag?: string;
}

/**
 * Minimal read shape required for ghost-entry predicates. The sim passes full
 * `GameState`; renderer consumers pass the flattened `LoadedGameState`
 * adapter snapshot. Keep this narrow so UI code does not need to pretend it
 * owns raw engine state.
 */
export interface GhostEntryDecisionLogEntry {
    event_id: string;
    response_id: string;
    /** Provenance owner; dynamic response sections only read player-authored rows. */
    decision_source?: string;
    faction?: FactionId | null;
    player_faction?: FactionId | null;
    turn?: number;
}

export interface GhostEntryStateView {
    meta?: {
        player_faction?: FactionId;
    };
    player_faction?: FactionId | null;
    paramilitary_policy?: GameState['paramilitary_policy'];
    military?: {
        event_flags?: Record<string, GhostEntryFlagValue>;
        event_fire_counts?: Record<string, number | undefined>;
        /** Append-only audit trail of resolved decisions (bot or player). The
         *  dynamic-section builder reads `(event_id, response_id)` pairs here to
         *  surface authored-choice morphing for load-bearing events via the A1c
         *  `RESPONSE:<event>:<branch>` mechanism. */
        event_decision_log?: GhostEntryDecisionLogEntry[];
        negotiation?: {
            capital?: Partial<Record<FactionId, GhostEntryNegotiationCapitalView>>;
            /** Locked, append-only record of rupture consequences (owned by
             *  `evaluateRuptureConsequences`). The Srebrenica codex-receipt (#78)
             *  reads this array; it never mutates it and never influences whether
             *  or when a rupture is recorded. */
            rupture_consequences?: RuptureConsequenceView[];
        };
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Ring guard — refuses §6 sensitive-history flags
// ═══════════════════════════════════════════════════════════════════════════

/** §6 refused-list flag names. If any of these is truthy on the input state's
 *  event_flags, the builder refuses to run rather than silently producing
 *  output that would imply a refused mechanical surface (rupture-flip,
 *  genocide non-occurrence, score inversion). */
const RING_3_REFUSED_FLAGS: readonly string[] = [
    // Rupture-flip surfaces — claiming a recorded rupture did not occur.
    'rupture_flip',
    'srebrenica_genocide_did_not_occur',
    'genocide_did_not_happen',
    // Body-count optimisation surfaces — score inversion.
    'pyrrhic_score_inverted',
    'atrocity_efficiency',
    // Player-authorised cleansing target — refused decision tree.
    'commit_genocide_authorised',
];

function assertRingGuard(state: GhostEntryStateView): void {
    const flags = state.military?.event_flags;
    if (!flags) return;
    for (const refused of RING_3_REFUSED_FLAGS) {
        const value = flags[refused];
        if (value === true || (typeof value === 'number' && value !== 0) ||
            (typeof value === 'string' && value.trim().length > 0 && value !== '0' && value.toLowerCase() !== 'false')) {
            throw new Error(
                `[dynamic_section_builder] Ring guard refused: §6 sensitive-history flag '${refused}' is set. ` +
                `Sensitive-history flags listed in SENSITIVE_HISTORY_DESIGN_GATE.md §6 cannot be input to dynamic section construction. ` +
                `Fix the upstream system that set this flag.`,
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Predicate helpers (faction-agnostic, deterministic, side-effect-free)
// ═══════════════════════════════════════════════════════════════════════════

function isTruthyFlag(value: GhostEntryFlagValue): boolean {
    if (value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim().length > 0 && value !== '0' && value.toLowerCase() !== 'false';
    return false;
}

function flagNumber(state: GhostEntryStateView, name: string): number {
    const value = state.military?.event_flags?.[name];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
}

/** Player faction is the gating subject for every ghost predicate. Raw state
 *  owns it at `meta.player_faction`; the flattened adapter mirror is accepted
 *  only when the raw path is absent. Missing/noncanonical identity fails closed. */
interface GhostPredicateMatch {
    claim_operands: ClaimPredicateOperand[];
    missed_operands: ClaimPredicateOperand[];
    calendar_context: string[];
}

interface SelectedPlayerSubject {
    faction: FactionId;
    operand: ClaimPredicateOperand;
}

function selectedPlayerSubject(state: GhostEntryStateView): SelectedPlayerSubject | null {
    const metaFaction = state.meta?.player_faction;
    if (metaFaction != null) {
        if (!CANONICAL_FACTIONS.includes(metaFaction)) return null;
        return {
            faction: metaFaction,
            operand: {
                owner_path: 'state.meta.player_faction',
                operator: 'equals',
                expected_value: metaFaction,
                observed_value: metaFaction,
                expression: `state.meta.player_faction=${metaFaction}`,
            },
        };
    }
    const adaptedFaction = state.player_faction;
    if (adaptedFaction != null && CANONICAL_FACTIONS.includes(adaptedFaction)) {
        return {
            faction: adaptedFaction,
            operand: {
                owner_path: 'state.player_faction',
                operator: 'equals',
                expected_value: adaptedFaction,
                observed_value: adaptedFaction,
                expression: `state.player_faction=${adaptedFaction}`,
            },
        };
    }
    return null;
}

function flagOperand(
    state: GhostEntryStateView,
    name: string,
    expected: boolean,
): ClaimPredicateOperand | null {
    const observedRaw = state.military?.event_flags?.[name];
    const observed = isTruthyFlag(observedRaw);
    if (observed !== expected) return null;
    return {
        owner_path: `state.military.event_flags.${name}`,
        operator: 'truthy_equals',
        expected_value: expected,
        observed_value: observedRaw ?? null,
        expression: `truthy(event_flags[${name}])=${expected}`,
    };
}

function flagAtLeastOperand(
    state: GhostEntryStateView,
    name: string,
    minimum: number,
): ClaimPredicateOperand | null {
    const observed = flagNumber(state, name);
    if (observed < minimum) return null;
    return {
        owner_path: `state.military.event_flags.${name}`,
        operator: 'at_least',
        expected_value: minimum,
        observed_value: observed,
        expression: `number(event_flags[${name}])=${observed}>=${minimum}`,
    };
}

function eventFiredOperand(
    state: GhostEntryStateView,
    eventId: string,
    expected: boolean,
): ClaimPredicateOperand | null {
    const raw = state.military?.event_fire_counts?.[eventId];
    const observed = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    if (expected ? observed < 1 : observed !== 0) return null;
    return {
        owner_path: `state.military.event_fire_counts.${eventId}`,
        operator: expected ? 'at_least' : 'equals',
        expected_value: expected ? 1 : 0,
        observed_value: observed,
        expression: expected
            ? `event_fire_counts[${eventId}]=${observed}>=1`
            : `event_fire_counts[${eventId}]=0`,
    };
}

function policyOperand(
    state: GhostEntryStateView,
    expected: Exclude<GameState['paramilitary_policy'], undefined>,
): ClaimPredicateOperand | null {
    if (state.paramilitary_policy !== expected) return null;
    return {
        owner_path: 'state.paramilitary_policy',
        operator: 'equals',
        expected_value: expected,
        observed_value: state.paramilitary_policy,
        expression: `state.paramilitary_policy=${expected}`,
    };
}

function warCrimesZeroOperand(
    state: GhostEntryStateView,
    faction: FactionId,
): ClaimPredicateOperand | null {
    const observed = state.military?.negotiation?.capital?.[faction]?.war_crimes_events;
    if (typeof observed !== 'number' || observed !== 0) return null;
    return {
        owner_path: `state.military.negotiation.capital.${faction}.war_crimes_events`,
        operator: 'equals',
        expected_value: 0,
        observed_value: observed,
        expression: `negotiation.capital[${faction}].war_crimes_events=0`,
    };
}

function matchGhost(
    claimOperands: ClaimPredicateOperand[],
    missedOperands: ClaimPredicateOperand[],
    currentTurn: number,
    minimumTurn?: number,
): GhostPredicateMatch | null {
    if (minimumTurn !== undefined && currentTurn < minimumTurn) return null;
    return {
        claim_operands: claimOperands,
        missed_operands: missedOperands,
        calendar_context: minimumTurn === undefined
            ? []
            : [`turn.current=${currentTurn}>=${minimumTurn}`],
    };
}

function combineClaimPredicate(
    kind: NamedClaimPredicate['kind'],
    operands: readonly ClaimPredicateOperand[],
): NamedClaimPredicate {
    if (operands.length === 0) {
        throw new Error('[dynamic_section_builder] claim predicate requires at least one owner operand.');
    }
    const ownerPaths = [...new Set(operands.map((operand) => operand.owner_path))];
    return {
        kind,
        owner_path: ownerPaths.join('+'),
        owner_paths: ownerPaths,
        expression: operands.map((operand) => operand.expression).join(' AND '),
        operands: operands.map((operand) => ({ ...operand })),
    };
}

function requiredOperands(
    ...operands: Array<ClaimPredicateOperand | null>
): ClaimPredicateOperand[] | null {
    return operands.every((operand): operand is ClaimPredicateOperand => operand !== null)
        ? operands
        : null;
}

// — Ghost 1: alliance_held —
//   federation_never_fractured = true AND croat_bosniak_war_begins_1993 did
//   NOT fire by t70.
function predAllianceHeld(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'federation_never_fractured', true),
        eventFiredOperand(state, 'croat_bosniak_war_begins_1993', false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 70) : null;
}

// — Ghost 2: cleansing_refused —
//   paramilitary_policy === 'always_deny' for player faction full run AND
//   war_crimes_events === 0 at turn ≥ 100. War-crimes count is read from the
//   negotiation breakdown (`state.political.negotiation.capital[faction]`),
//   which is the canonical accumulator written by paramilitary_sweep and
//   per-turn negotiation-capital recalculation.
function predCleansingRefused(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        policyOperand(state, 'always_deny'),
        warCrimesZeroOperand(state, faction),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 100) : null;
}

// — Ghost 3: enclave_defended (AUDIT-ONLY) —
//   Observable campaign state: `enclave_held_through_turn` flag is set when
//   the upstream observation system records that ARBiH retains control of
//   op:srebrenica:srebrenica_2 AND op:zepa:zepa_2 AND op:gorazde:gorazde_2 at
//   the recorded turn N. This is a present-state audit signal — NOT a
//   forecast, and NOT a claim about Srebrenica 1995 outcomes. The
//   surrounding ghost-entry body (data/codex/ghost_entries/enclave_defended.md)
//   carries the strict audit register; this predicate only gates emission.
function predEnclaveDefended(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operand = flagOperand(state, 'enclave_held_through_turn', true);
    return operand ? matchGhost([operand], [operand], currentTurn) : null;
}

// — Ghost 4: patron_resisted —
//   count of patron_pressure_refused increments ≥ 3.
function predPatronResisted(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operand = flagAtLeastOperand(state, 'patron_pressure_refused', 3);
    return operand ? matchGhost([operand], [operand], currentTurn) : null;
}

// — Ghost 5: early_peace_accepted —
//   vance_owen_accepted (turn 50-70) OR owen_stoltenberg_accepted (turn 70-90);
//   mutually exclusive with dayton_signed_1995.
function predEarlyPeaceAccepted(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const accepted = flagOperand(state, 'vance_owen_accepted', true)
        ?? flagOperand(state, 'owen_stoltenberg_accepted', true);
    const noDayton = eventFiredOperand(state, 'dayton_signed_1995', false);
    const operands = requiredOperands(accepted, noDayton);
    return operands ? matchGhost(operands, [operands[1]!], currentTurn) : null;
}

// — Ghost 6: force_quality_inversion —
//   vrs_quality_inverted = true (RS per-brigade combat power < ARBiH for ≥ 8
//   turns sustained). Set by an upstream auditor; we just observe the flag.
function predForceQualityInversion(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operand = flagOperand(state, 'vrs_quality_inverted', true);
    return operand ? matchGhost([operand], [operand], currentTurn) : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Wave 2 ghost-entry predicates
// (LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION, 2026-05-05)
//
// All Wave 2 predicates are Ring 2 narrative observations, faction-agnostic
// where possible (faction is read from `state.meta.player_faction` for
// per-faction flag substitution), and AUDIT-ONLY in framing. None of them
// cross into §6 surface (rupture-flip, genocide-recording, atrocity-
// attribution). They observe upstream Wave 4-11 consequences-event flags
// and timeline events; they do not write any state.
// ═══════════════════════════════════════════════════════════════════════════

// — Ghost 7: paramilitary_streak_refused —
//   The sustained-refusal pattern. clean_record flag set AND
//   paramilitary_authorization_refused flag set AND turn ≥ 80. Both flags
//   come from csq_paramilitary_authorization_refused. Distinct from
//   cleansing_refused, which is gated on policy + war_crimes counter
//   rather than the upstream divergence-event flag.
function predParamilitaryStreakRefused(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'paramilitary_authorization_refused', true),
        flagOperand(state, 'clean_record', true),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 80) : null;
}

// — Ghost 8: winter_held —
//   Counterfactual: the seasonal supply-attrition predicate did NOT fire on
//   the player faction's track by the audit turn. Requires an upstream
//   observer to set `winter_held_through_turn` as a positive audit signal
//   (analogous to enclave_held_through_turn) AND the per-faction
//   winter_supply_attrition_active_<faction> flag remains unset.
//   Faction-agnostic via player_faction.
function predWinterHeld(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'winter_held_through_turn', true),
        flagOperand(state, `winter_supply_attrition_active_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 80) : null;
}

// — Ghost 9: corridor_blocked —
//   Counterfactual: the Posavina corridor breakthrough did not occur.
//   Requires upstream observer to set `corridor_blocked_through_turn` as a
//   positive audit signal AND NOT corridor_secured AND NOT
//   event_fire_counts['operation_corridor_1992'] = 0. Turn ≥ 30 is a margin past
//   the historical operational window (w12-w22) so we are observing the
//   post-window state, not racing it.
function predCorridorBlocked(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'corridor_blocked_through_turn', true),
        flagOperand(state, 'corridor_secured', false),
        eventFiredOperand(state, 'operation_corridor_1992', false),
    );
    return operands ? matchGhost(operands, [operands[1]!, operands[2]!], currentTurn, 30) : null;
}

// — Ghost 10: doctrine_reform_completed —
//   The reform-without-drift sequence. Both reform-initiation AND
//   modernisation pulse fired AND drift did NOT fire on player faction's track.
//   Faction-agnostic via player_faction. Modernisation chains on prior reform
//   (csq_doctrine_modernization_<faction> requires doctrine_reform_initiated).
function predDoctrineReformCompleted(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, `doctrine_reform_initiated_${faction}`, true),
        flagOperand(state, `doctrine_modernization_active_${faction}`, true),
        flagOperand(state, `doctrine_drift_active_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[2]!], currentTurn) : null;
}

// — Ghost 11: arms_embargo_full_compliance —
//   Counterfactual: no third-party channel activated and no attenuation event
//   fired on player faction's track by the audit turn. Requires upstream
//   observer to set `arms_embargo_compliant_through_turn` as a positive
//   audit signal AND no third-party-channel or attenuation flags are set
//   for the player faction. Faction-agnostic via player_faction.
function predArmsEmbargoFullCompliance(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'arms_embargo_compliant_through_turn', true),
        flagOperand(state, `third_party_arms_channel_active_${faction}`, false),
        flagOperand(state, `iran_arms_channel_attenuation_active_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[1]!, operands[2]!], currentTurn, 100) : null;
}

// — Ghost 12: political_unity_held —
//   Counterfactual: the temporary-political-split predicate did NOT fire on
//   player faction's track by the audit turn. Requires upstream observer to
//   set `political_unity_held_through_turn` as a positive audit signal AND
//   the per-faction political_split_temporary_active_<faction> flag remains
//   unset. Faction-agnostic via player_faction.
function predPoliticalUnityHeld(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'political_unity_held_through_turn', true),
        flagOperand(state, `political_split_temporary_active_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 100) : null;
}

// — Ghost 13: equipment_quality_collapse —
//   Divergence note: a catastrophic late-war equipment-quality collapse fired
//   on player faction's track. Reads equipment_quality_collapsed flag (set by
//   an upstream auditor when per-brigade equipment-quality readings cross the
//   collapse audit threshold).
function predEquipmentQualityCollapse(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operand = flagOperand(state, 'equipment_quality_collapsed', true);
    return operand ? matchGhost([operand], [operand], currentTurn) : null;
}

// — Ghost 14: negotiation_capital_exhausted —
//   Divergence note: diplomatic capital ran out without any canonical peace
//   plan being signed. Reads negotiation_capital_exhausted flag AND
//   no peace-plan acceptance flag is set.
function predNegotiationCapitalExhausted(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'negotiation_capital_exhausted', true),
        flagOperand(state, 'vance_owen_accepted', false),
        flagOperand(state, 'owen_stoltenberg_accepted', false),
        eventFiredOperand(state, 'dayton_signed_1995', false),
    );
    return operands ? matchGhost(operands, operands.slice(1), currentTurn) : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Wave 3 ghost-entry predicates
// (LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3, content authored 2026-05-05;
//  builder wiring 2026-06-07)
//
// Wave 3 authored 6 counterfactual/divergence ghost-entry bodies (EN + BCS)
// under data/codex/ghost_entries/ but left them unwired. These predicates
// connect that authored content to `buildGhostEntries`, mirroring the Wave 2
// pattern exactly:
//   - Each gates on a POSITIVE faction-agnostic observer flag (`*_through_turn`)
//     written by an upstream observation lane (same contract as Wave 2's
//     winter_held_through_turn / corridor_blocked_through_turn etc.). Until that
//     lane lands the flag is unset, so the predicate is dormant (always false)
//     and emission is byte-identical to the pre-wiring sim. No new state is
//     written here.
//   - Per-faction EXCLUSION guards substitute `state.meta.player_faction` so the
//     predicates stay faction-agnostic.
//   - All are Ring 2 narrative observations, AUDIT-ONLY, variant 'context'. None
//     cross a §6 surface (rupture-flip, genocide-recording, atrocity reward
//     framing). The recovery/discipline/containment framing never rewards
//     atrocity; the authored bodies explicitly state they do not displace
//     Tribunal findings.
// ═══════════════════════════════════════════════════════════════════════════

// — Ghost 15: ceasefire_streak_held —
//   The declared cessation held across the audit window without a violation
//   being attributed to the player faction. Requires the upstream observer to
//   set `ceasefire_held_through_turn` AND no ceasefire-violation attribution
//   flag for the player faction. turn >= 80 observes a post-window streak.
function predCeasefireStreakHeld(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'ceasefire_held_through_turn', true),
        flagOperand(state, `ceasefire_violation_attributed_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 80) : null;
}

// — Ghost 16: mediator_trust_sustained —
//   The trust channel to the active mediation phase was not repudiated within
//   the window. Requires `mediator_trust_held_through_turn` AND no
//   mediator-denounced attribution for the player faction. turn >= 80.
function predMediatorTrustSustained(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'mediator_trust_held_through_turn', true),
        flagOperand(state, `mediator_denounced_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 80) : null;
}

// — Ghost 17: rear_pocket_sustained —
//   Rear-area discipline held: the observer streak flag is set AND the
//   war_crimes_events counter on the player faction's negotiation capital
//   remains at zero. Reuses the real war_crimes_events accumulator (the same
//   counter cleansing_refused reads), so this is grounded on live substrate.
//   turn >= 80.
function predRearPocketSustained(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'rear_pocket_discipline_held_through_turn', true),
        warCrimesZeroOperand(state, faction),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 80) : null;
}

// — Ghost 18: civilian_displacement_contained —
//   The displacement-counter trajectory stayed below the canonical baseline by
//   the audit turn. Requires `civilian_displacement_contained_through_turn` AND
//   no mass-displacement attribution for the player faction. turn >= 80.
function predCivilianDisplacementContained(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'civilian_displacement_contained_through_turn', true),
        flagOperand(state, `mass_displacement_attributed_${faction}`, false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn, 80) : null;
}

// — Ghost 19: equipment_quality_recovered —
//   Divergence note: equipment quality bent upward from the canonical baseline.
//   The recovery consequence substrate (csq_equipment_quality_recovery_streak_*
//   in data/scenarios/events/consequences.json) sets PER-FACTION streak flags
//   `equipment_quality_recovery_streak_active_<FACTION>` — it never sets a bare
//   `equipment_quality_recovered`. The ghost is player-visible, so it reads only
//   the selected player's per-faction streak and never a foreign/aggregate flag.
//   Mutual exclusion with the equipment_quality_collapse reading is preserved.
function predEquipmentQualityRecovered(
    state: GhostEntryStateView,
    currentTurn: number,
    faction: FactionId,
): GhostPredicateMatch | null {
    const noCollapse = flagOperand(state, 'equipment_quality_collapsed', false);
    if (!noCollapse) return null;
    const recovery = flagOperand(state, `equipment_quality_recovery_streak_active_${faction}`, true);
    const operands = requiredOperands(recovery, noCollapse);
    return operands ? matchGhost(operands, [operands[1]!], currentTurn) : null;
}

// — Ghost 20: negotiation_capital_recovered —
//   Divergence note: negotiation capital bent upward against the historical
//   one-way-drain baseline. Requires `negotiation_capital_recovered` AND NOT
//   `negotiation_capital_exhausted` (mutually exclusive readings of the same
//   ledger).
function predNegotiationCapitalRecovered(state: GhostEntryStateView, currentTurn: number): GhostPredicateMatch | null {
    const operands = requiredOperands(
        flagOperand(state, 'negotiation_capital_recovered', true),
        flagOperand(state, 'negotiation_capital_exhausted', false),
    );
    return operands ? matchGhost(operands, [operands[1]!], currentTurn) : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Ghost-entry registry — fixed declaration order, deterministic
// ═══════════════════════════════════════════════════════════════════════════

interface GhostRegistryEntry {
    ghost_id: string;
    path: string;
    /** Variant for this entry. AUDIT-ONLY entries are pinned to 'context'. */
    variant: SectionVariant;
    classification: GhostRecordClassification;
    /** Evaluates and returns the exact structured operands that proved emission. */
    predicate: (
        state: GhostEntryStateView,
        currentTurn: number,
        faction: FactionId,
    ) => GhostPredicateMatch | null;
}

const GHOST_ENTRIES: readonly GhostRegistryEntry[] = [
    {
        ghost_id: 'alliance_held',
        path: 'data/codex/ghost_entries/alliance_held.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predAllianceHeld,
    },
    {
        ghost_id: 'cleansing_refused',
        path: 'data/codex/ghost_entries/cleansing_refused.md',
        variant: 'context',
        classification: 'divergence_context',
        predicate: predCleansingRefused,
    },
    {
        // AUDIT-ONLY. variant pinned to 'context'. Tested explicitly (T7).
        ghost_id: 'enclave_defended',
        path: 'data/codex/ghost_entries/enclave_defended.md',
        variant: 'context',
        classification: 'audit_context',
        predicate: predEnclaveDefended,
    },
    {
        ghost_id: 'patron_resisted',
        path: 'data/codex/ghost_entries/patron_resisted.md',
        variant: 'context',
        classification: 'divergence_context',
        predicate: predPatronResisted,
    },
    {
        ghost_id: 'early_peace_accepted',
        path: 'data/codex/ghost_entries/early_peace_accepted.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predEarlyPeaceAccepted,
    },
    {
        ghost_id: 'force_quality_inversion',
        path: 'data/codex/ghost_entries/force_quality_inversion.md',
        variant: 'context',
        classification: 'divergence_context',
        predicate: predForceQualityInversion,
    },
    // ─── Wave 2 entries (LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION) ────────
    {
        ghost_id: 'paramilitary_streak_refused',
        path: 'data/codex/ghost_entries/paramilitary_streak_refused.md',
        variant: 'context',
        classification: 'divergence_context',
        predicate: predParamilitaryStreakRefused,
    },
    {
        ghost_id: 'winter_held',
        path: 'data/codex/ghost_entries/winter_held.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predWinterHeld,
    },
    {
        ghost_id: 'corridor_blocked',
        path: 'data/codex/ghost_entries/corridor_blocked.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predCorridorBlocked,
    },
    {
        ghost_id: 'doctrine_reform_completed',
        path: 'data/codex/ghost_entries/doctrine_reform_completed.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predDoctrineReformCompleted,
    },
    {
        ghost_id: 'arms_embargo_full_compliance',
        path: 'data/codex/ghost_entries/arms_embargo_full_compliance.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predArmsEmbargoFullCompliance,
    },
    {
        ghost_id: 'political_unity_held',
        path: 'data/codex/ghost_entries/political_unity_held.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predPoliticalUnityHeld,
    },
    {
        ghost_id: 'equipment_quality_collapse',
        path: 'data/codex/ghost_entries/equipment_quality_collapse.md',
        variant: 'context',
        classification: 'divergence_context',
        predicate: predEquipmentQualityCollapse,
    },
    {
        ghost_id: 'negotiation_capital_exhausted',
        path: 'data/codex/ghost_entries/negotiation_capital_exhausted.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predNegotiationCapitalExhausted,
    },
    // ─── Wave 3 entries (LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3) ──
    {
        ghost_id: 'ceasefire_streak_held',
        path: 'data/codex/ghost_entries/ceasefire_streak_held.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predCeasefireStreakHeld,
    },
    {
        ghost_id: 'mediator_trust_sustained',
        path: 'data/codex/ghost_entries/mediator_trust_sustained.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predMediatorTrustSustained,
    },
    {
        ghost_id: 'rear_pocket_sustained',
        path: 'data/codex/ghost_entries/rear_pocket_sustained.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predRearPocketSustained,
    },
    {
        ghost_id: 'civilian_displacement_contained',
        path: 'data/codex/ghost_entries/civilian_displacement_contained.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predCivilianDisplacementContained,
    },
    {
        ghost_id: 'equipment_quality_recovered',
        path: 'data/codex/ghost_entries/equipment_quality_recovered.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predEquipmentQualityRecovered,
    },
    {
        ghost_id: 'negotiation_capital_recovered',
        path: 'data/codex/ghost_entries/negotiation_capital_recovered.md',
        variant: 'context',
        classification: 'path_not_taken',
        predicate: predNegotiationCapitalRecovered,
    },
];

// Defence-in-depth runtime guard: enclave_defended (AUDIT-ONLY) MUST be
// declared with variant 'context'. The type union for `variant` includes
// 'outcome' to support other dynamic sections, so the literal check happens
// at module load time rather than compile time.
{
    const enclave = GHOST_ENTRIES.find((e) => e.ghost_id === 'enclave_defended');
    if (!enclave) {
        throw new Error('[dynamic_section_builder] GHOST_ENTRIES registry missing enclave_defended.');
    }
    if (enclave.variant !== 'context') {
        throw new Error(
            "[dynamic_section_builder] enclave_defended ghost entry MUST be declared with variant='context'. " +
            'See SENSITIVE_HISTORY_DESIGN_GATE.md §6.',
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Load-bearing dynamic-section registry (A3 — authorship loop legibility)
//
// `buildDynamicSections` was a Phase-0 stub returning []. The instrumented
// campaign audit (docs/40_reports/playtest/20260609_INSTRUMENTED_CAMPAIGN_AUDIT.md
// §A3) identifies the LOAD-BEARING decision events whose authored-choice
// morphing the codex never surfaced. This registry connects those decisions —
// the ones that actually FIRE and are narratively central — to the dynamic
// codex by emitting `BuiltDynamicSection` records keyed on the SAME A1c
// `RESPONSE:<event>:<branch>` mechanism shipped in #334 (essay_index.json
// `dynamic_sections`). It is NOT a parallel prose system: each emitted record
// is a thin pointer (target essay + the `RESPONSE:` condition that gated it)
// that the renderer joins to the authored essay_index sections. The builder
// owns only the (event → essay) routing and the deterministic synthesis from
// frozen `event_decision_log`; the prose stays in essay_index.json.
//
// Calibration: this reads `state.military.event_decision_log` (already
// persisted) and emits read-model records. It writes NO state and is consumed
// only by codex/Verdict surfaces — calibration-inert by construction.
//
// Ring boundary: every record in the LOAD_BEARING registry is Ring 2
// (narrative). The Srebrenica-fall codex surface keyed on
// `srebrenica_genocide_1995` is a §6 sensitive-history item and is handled
// SEPARATELY below by `buildRuptureReceiptSections` — NOT via the load-bearing
// decision registry (it is a locked consequence, not a player decision).
//
// §6 codex-receipt (#78, owner-signed): the Srebrenica rupture
// (`srebrenica_genocide_1995`) is surfaced as a read-only codex receipt at the
// moment the rupture is ALREADY recorded by `evaluateRuptureConsequences`
// (src/sim/negotiation/rupture_consequences.ts). This builder ONLY observes the
// recorded `state.military.negotiation.rupture_consequences` array — it never
// records, flips, re-times, or prevents a rupture, and it adds no player choice.
// The emitted record is a thin pointer whose `conditional_on` join key
// (`FINDING:rupture_srebrenica_genocide_1995`) matches the already-authored,
// already-ICTY-sourced dynamic section in essay_index.json
// (`essay_srebrenica_falls_1995` / `v091_cost_ledger_srebrenica_finding`).
// No new prose is introduced here. Ring 1 (the rupture itself + its
// condemnation flag) stays owned by the rupture system.
// ═══════════════════════════════════════════════════════════════════════════

interface LoadBearingSectionSpec {
    /** Decision `event_id` as it appears in `event_decision_log`. */
    event_id: string;
    /** Target canonical essay (event id, no `essay_` prefix). */
    target_essay_event_id: string;
    /** Stable summary text for the synthesized record. The full authored prose
     *  per branch lives in essay_index.json `dynamic_sections`; this is the
     *  builder-side legend the Verdict codex panel can render directly when it
     *  consumes the sim-side build result without re-reading essay_index. */
    summary: string;
    /** Render variant. Ring 2 narrative — `note` or `divergence`. Never
     *  `outcome` (reserved for non-audit player-driven sections) and never
     *  `context`-pinned audit framing. */
    variant: Extract<SectionVariant, 'note' | 'divergence'>;
}

/**
 * The load-bearing decision events from the A3 audit punch-list. Declaration
 * order is fixed and the emitted output is additionally `strictCompare`-sorted
 * on `id`, so synthesis is deterministic. Each entry surfaces whichever branch
 * the campaign actually recorded.
 */
const LOAD_BEARING_SECTIONS: readonly LoadBearingSectionSpec[] = [
    {
        event_id: 'vance_owen_plan_1993',
        target_essay_event_id: 'vance_owen_plan_1993',
        summary: 'Sarajevo’s recorded posture on the Vance-Owen Peace Plan in this campaign.',
        variant: 'note',
    },
    {
        event_id: 'owen_stoltenberg_plan_1993',
        target_essay_event_id: 'owen_stoltenberg_plan_1993',
        summary: 'Sarajevo’s recorded posture on the Owen-Stoltenberg framework in this campaign.',
        variant: 'note',
    },
    {
        event_id: 'os_rbih_tactical_acceptance_1993',
        target_essay_event_id: 'os_rbih_tactical_acceptance_1993',
        summary: 'The Sarajevo Assembly’s recorded vote on the Owen-Stoltenberg Invincible package.',
        variant: 'note',
    },
    {
        event_id: 'london_conference_1992',
        target_essay_event_id: 'london_conference_1992',
        summary: 'The recorded posture taken at the London Conference in this campaign.',
        variant: 'note',
    },
    // NOTE: `rbih_state_identity` was removed here (Codex #348 P2). It is a
    // once-only turn 2-5 decision with branches civic/bosniak_national/pragmatic,
    // but the matching `essay_rbih_state_identity` entry in essay_index.json has
    // NO `dynamic_sections` for any `RESPONSE:rbih_state_identity:*` key. Since
    // `conditional_on` is the join key to the authored essay-index prose, a
    // registry entry here would emit a dynsec whose join key resolves to nothing
    // — all three identity choices would collapse to the same generic summary
    // with no per-branch morphing. Re-add this entry ONLY once the authored
    // per-branch `dynamic_sections` exist in essay_index.json.
];

/** Index for O(1) event_id lookup. Declaration order preserved for diagnostics. */
const LOAD_BEARING_BY_EVENT: ReadonlyMap<string, LoadBearingSectionSpec> = new Map(
    LOAD_BEARING_SECTIONS.map((s) => [s.event_id, s]),
);

/**
 * First recorded response for each load-bearing event in
 * `event_decision_log`. The log is append-only and a load-bearing event is
 * `once: true`, so the first entry is the canonical resolution; we still scan
 * deterministically (array order is insertion/turn order, which is stable
 * across replays of identical input).
 */
function isPlayerOwnedDecision(entry: GhostEntryDecisionLogEntry, loadedFaction: FactionId | null): boolean {
    if (entry.decision_source !== 'player') return false;
    if (loadedFaction == null) return false;
    if (entry.player_faction != null && entry.player_faction !== loadedFaction) return false;
    if (entry.faction !== loadedFaction) return false;
    return Number.isInteger(entry.turn);
}

function firstDecisionByEvent(
    log: readonly GhostEntryDecisionLogEntry[],
    loadedFaction: FactionId | null,
): ReadonlyMap<string, GhostEntryDecisionLogEntry> {
    const out = new Map<string, GhostEntryDecisionLogEntry>();
    for (const entry of log) {
        if (!entry || typeof entry.event_id !== 'string' || typeof entry.response_id !== 'string') continue;
        if (!isPlayerOwnedDecision(entry, loadedFaction)) continue;
        if (!LOAD_BEARING_BY_EVENT.has(entry.event_id)) continue;
        if (out.has(entry.event_id)) continue;
        out.set(entry.event_id, entry);
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// §6 rupture-receipt registry (#78, owner-signed sensitive-history lane)
//
// A rupture receipt is surfaced when a LOCKED rupture consequence is ALREADY
// present in `state.military.negotiation.rupture_consequences` (recorded by
// `evaluateRuptureConsequences`). The builder observes the recorded array and
// emits a Ring-2 read-model pointer to the already-authored, ICTY-sourced
// dynamic section in essay_index.json. It introduces NO new prose, NO player
// choice, and does NOT influence whether/when the rupture records.
//
// Each spec maps a recorded rupture `id` → the target essay + the existing
// `FINDING:rupture_<id>` join key the essay's `dynamic_sections` already gate
// on. The receipt never carries `variant: 'outcome'` (that would frame the
// genocide as a player-induced outcome — a §6 refused surface); it is a
// `divergence`/`note` record consumed only by codex/Verdict read surfaces.
// ═══════════════════════════════════════════════════════════════════════════

interface RuptureReceiptSpec {
    /** Recorded rupture `id` (matches RuptureConsequence.id). */
    rupture_id: string;
    /** Target canonical essay (event id, no `essay_` prefix). */
    target_essay_event_id: string;
    /** Stable, restrained summary for the synthesized receipt record. The full
     *  authored prose lives in essay_index.json `dynamic_sections`; this is the
     *  builder-side legend the Verdict codex panel can render directly. It states
     *  a recorded fact and never frames the rupture as a player choice/reward. */
    summary: string;
    /** Render variant. Ring 2 narrative — `divergence` only. NEVER `outcome`
     *  (would frame a recorded rupture as a player-induced outcome — §6 refused)
     *  and never `context` (reserved for AUDIT-ONLY counterfactual ghosts). */
    variant: Extract<SectionVariant, 'divergence'>;
}

/**
 * Rupture receipts. Declaration order is fixed; emitted output is additionally
 * `strictCompare`-sorted on `id`. Only the Srebrenica rupture is wired (#78);
 * the join key matches the authored `v091_cost_ledger_srebrenica_finding`
 * section already present on `essay_srebrenica_falls_1995`.
 */
const RUPTURE_RECEIPTS: readonly RuptureReceiptSpec[] = [
    {
        rupture_id: 'srebrenica_genocide_1995',
        target_essay_event_id: 'srebrenica_falls_1995',
        summary:
            'This campaign recorded the fall of the Srebrenica safe area and the genocide that followed — a locked consequence established by the Tribunal, surfaced here as a permanent entry in the historical record.',
        variant: 'divergence',
    },
];

/** O(1) lookup of a receipt spec by recorded rupture id. */
const RUPTURE_RECEIPT_BY_ID: ReadonlyMap<string, RuptureReceiptSpec> = new Map(
    RUPTURE_RECEIPTS.map((s) => [s.rupture_id, s]),
);

/**
 * Build codex receipts for ruptures ALREADY recorded on the input state.
 *
 * Pure & deterministic, READ-ONLY:
 *   - reads only `state.military.negotiation.rupture_consequences` (written by
 *     `evaluateRuptureConsequences`); writes nothing.
 *   - does NOT decide whether/when a rupture records and does NOT alter its
 *     trigger or timing — it observes the recorded array after the fact.
 *   - emits at most one record per known rupture id, keyed on the existing
 *     `FINDING:rupture_<id>` essay-index join key (no new prose introduced).
 *
 * A state with no recorded ruptures (or only unknown ones) emits `[]`.
 */
function buildRuptureReceiptSections(state: GhostEntryStateView): BuiltDynamicSection[] {
    const recorded = state.military?.negotiation?.rupture_consequences ?? [];
    const emitted: BuiltDynamicSection[] = [];
    const seen = new Set<string>();
    for (const r of recorded) {
        if (!r || typeof r.id !== 'string') continue;
        const spec = RUPTURE_RECEIPT_BY_ID.get(r.id);
        if (!spec) continue;
        if (seen.has(spec.rupture_id)) continue;
        seen.add(spec.rupture_id);
        emitted.push({
            id: `rupture_receipt_${spec.rupture_id}`,
            target_essay_event_id: spec.target_essay_event_id,
            content: spec.summary,
            variant: spec.variant,
            ring_classification: 2,
            // Join key matches the already-authored essay_index dynamic section
            // (`FINDING:rupture_<id>`); the renderer pulls the ICTY-sourced prose
            // from there. Defence in depth: never emit an `outcome`-framed record.
            conditional_on: [`FINDING:rupture_${spec.rupture_id}`],
            claim_predicate: combineClaimPredicate('receipt', [{
                owner_path: 'state.military.negotiation.rupture_consequences',
                operator: 'contains',
                expected_value: spec.rupture_id,
                observed_value: spec.rupture_id,
                expression: `rupture_consequences contains id=${spec.rupture_id}`,
            }]),
            calendar_context: [],
        });
    }
    // Defence in depth — a rupture receipt must never be framed as a player
    // outcome. Mirrors the enclave_defended variant guard.
    for (const e of emitted) {
        if (e.variant === 'outcome') {
            throw new Error(
                "[dynamic_section_builder] rupture receipt MUST NOT emit variant='outcome'. " +
                'See SENSITIVE_HISTORY_DESIGN_GATE.md §6: framing a recorded rupture as a player-induced outcome is a refused surface.',
            );
        }
    }
    return emitted;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build all ghost entries that match their predicate against `state` at
 * `currentTurn`. Pure, deterministic. Output ordered by `strictCompare` on
 * `ghost_id` for stable consumption.
 *
 * Throws if the input state carries any §6 refused flag; see `assertRingGuard`.
 */
export function buildGhostEntries(state: GhostEntryStateView, currentTurn: number): BuiltGhostEntry[] {
    assertRingGuard(state);
    const player = selectedPlayerSubject(state);
    if (player === null) return [];

    const emitted: BuiltGhostEntry[] = [];
    for (const entry of GHOST_ENTRIES) {
        const match = entry.predicate(state, currentTurn, player.faction);
        if (match === null) continue;
        const claimOperands = [player.operand, ...match.claim_operands];
        const common: BuiltGhostEntryBase = {
            ghost_id: entry.ghost_id,
            path: entry.path,
            ring_classification: 2,
            conditional_on: [
                ...match.claim_operands.map((operand) => operand.expression),
                ...match.calendar_context,
            ],
            variant: entry.variant,
            claim_predicate: combineClaimPredicate('state', claimOperands),
            calendar_context: match.calendar_context,
        };
        if (entry.classification === 'path_not_taken') {
            if (match.missed_operands.length === 0) continue;
            const evaluatedClaim = combineClaimPredicate('state', match.claim_operands);
            const missedCondition = combineClaimPredicate('state', match.missed_operands);
            // Duplicate positive evidence cannot prove that another path was
            // missed. Fail closed rather than inventing an inverse predicate.
            if (missedCondition.expression === evaluatedClaim.expression) continue;
            emitted.push({
                ...common,
                classification: 'path_not_taken',
                missed_condition_predicate: missedCondition,
            });
        } else {
            emitted.push({ ...common, classification: entry.classification });
        }
    }

    // Defence in depth: enforce variant invariant at emission time even if
    // someone bypasses the type-level guard with a ts-ignore.
    for (const e of emitted) {
        if (e.ghost_id === 'enclave_defended' && e.variant !== 'context') {
            throw new Error(
                "[dynamic_section_builder] enclave_defended ghost entry MUST emit variant='context'. " +
                'See SENSITIVE_HISTORY_DESIGN_GATE.md §6: rupture-flip framing of Srebrenica is a refused surface.',
            );
        }
    }

    return emitted.slice().sort((a, b) => strictCompare(a.ghost_id, b.ghost_id));
}

/**
 * Build dynamic essay sections from frozen end-game state (A3).
 *
 * For each LOAD-BEARING decision event that the campaign actually recorded
 * (`state.military.event_decision_log`), emit one `BuiltDynamicSection` keyed
 * on the A1c `RESPONSE:<event>:<branch>` mechanism (essay_index.json
 * `dynamic_sections`, #334). The record is a thin sim-side pointer — target
 * essay + the exact `RESPONSE:` condition that gated it — so a single-call
 * Verdict consumer can surface authored-choice morphing without re-deriving
 * the decision log, while the authored prose stays in essay_index.json.
 *
 * Pure & deterministic:
 *   - reads only frozen state; writes nothing (calibration-inert).
 *   - authored-choice and rupture records are sorted by `strictCompare` on
 *     `id`; realized consequence receipts follow them in shared projector
 *     order (`fired_turn`, then receipt id).
 *
 * In addition (#78), any rupture ALREADY recorded on
 * `state.military.negotiation.rupture_consequences` is surfaced as a Ring-2
 * codex receipt via `buildRuptureReceiptSections` — read-only; it never records,
 * flips, or re-times a rupture.
 *
 * Phase-0 compatibility: a state with no recorded load-bearing decisions and no
 * recorded ruptures emits `[]` exactly as before.
 *
 * Throws if the input state carries any §6 refused flag; see `assertRingGuard`.
 */
export function buildDynamicSections(input: BuilderInput): BuiltDynamicSection[] {
    assertRingGuard(input.state);

    const log = input.state.military?.event_decision_log ?? [];
    const player = selectedPlayerSubject(input.state);
    const chosenByEvent = firstDecisionByEvent(log, player?.faction ?? null);

    const emitted: BuiltDynamicSection[] = [];
    for (const spec of LOAD_BEARING_SECTIONS) {
        const decision = chosenByEvent.get(spec.event_id);
        if (decision === undefined || player === null || !Number.isInteger(decision.turn)) continue;
        const branch = decision.response_id;
        const decisionTurn = decision.turn as number;
        const responseCondition = `RESPONSE:${spec.event_id}:${branch}`;
        const decisionOperand: ClaimPredicateOperand = {
            owner_path: 'state.military.event_decision_log',
            operator: 'contains',
            expected_value: `${spec.event_id}::${branch}::${decisionTurn}::${player.faction}::player`,
            observed_value: `${spec.event_id}::${branch}::${decisionTurn}::${player.faction}::player`,
            expression:
                `event_decision_log(event_id=${spec.event_id},response_id=${branch},turn=${decisionTurn},` +
                `faction=${player.faction},decision_source=player)`,
        };
        emitted.push({
            id: `dynsec_${spec.event_id}_${branch}`,
            target_essay_event_id: spec.target_essay_event_id,
            content: spec.summary,
            variant: spec.variant,
            ring_classification: 2,
            // `conditional_on` carries the A1c join key so the renderer can pull
            // the authored per-branch prose from essay_index `dynamic_sections`.
            conditional_on: [responseCondition],
            claim_predicate: combineClaimPredicate('receipt', [player.operand, decisionOperand]),
            calendar_context: [],
        });
    }

    // §6 rupture receipts (#78): observe ruptures ALREADY recorded on the state
    // (read-only; does not record/flip/re-time any rupture) and emit a Ring-2
    // pointer to the already-authored `FINDING:rupture_<id>` essay section.
    for (const receipt of buildRuptureReceiptSections(input.state)) {
        emitted.push(receipt);
    }

    // Keep the projector's realized chronology intact. These receipt rows are
    // appended after the independently sorted authored/rupture sections so a
    // lexical receipt id cannot reorder fired history, while the pre-existing
    // dynamic-section order remains unchanged.
    const consequenceSections: BuiltDynamicSection[] = [];
    for (const receipt of buildRealizedConsequenceReceipts(input.state)) {
        consequenceSections.push({
            id: `dynsec_consequence_${receipt.receipt_id}`,
            target_essay_event_id: receipt.consequence_event_id,
            content: 'The campaign record ties this realized consequence to a filed player decision.',
            variant: 'note',
            ring_classification: 2,
            conditional_on: [`RECEIPT:${receipt.receipt_id}`],
            claim_predicate: receipt.claim_predicate,
            calendar_context: [
                `turn decision=${receipt.decision_turn}`,
                `turn fired=${receipt.fired_turn}`,
            ],
            receipt_record_id: receipt.receipt_record_id,
        });
    }

    return [
        ...emitted.slice().sort((a, b) => strictCompare(a.id, b.id)),
        ...consequenceSections,
    ];
}

/**
 * Combined entry point: emit both dynamic sections (load-bearing decision
 * morphing + §6 rupture receipts) and ghost entries. Useful for VerdictScreen-
 * side consumption that wants a single read-only call.
 */
export interface DynamicCodexBuildResult {
    sections: BuiltDynamicSection[];
    ghosts: BuiltGhostEntry[];
}

export function buildDynamicCodex(input: BuilderInput): DynamicCodexBuildResult {
    return {
        sections: buildDynamicSections(input),
        ghosts: buildGhostEntries(input.state, input.currentTurn),
    };
}

/** Exported for tests: list of refused flags the Ring guard rejects. */
export const __TEST_RING_3_REFUSED_FLAGS = RING_3_REFUSED_FLAGS;
