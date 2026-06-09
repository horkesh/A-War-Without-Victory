/**
 * Dynamic Codex section builder — LANE-NIGHTSHIFT-DYNAMIC-CODEX-SLICE.
 *
 * Pure, deterministic builder for the v0.9.1 Dynamic Codex slice. Reads frozen
 * end-of-game inputs and emits:
 *
 *   1. `BuiltDynamicSection[]` — dynamic essay sections that should be inserted
 *      into canonical historical essays at endgame, gated on observable
 *      campaign state.
 *   2. `BuiltGhostEntry[]` — ghost-entry records describing six paths-not-taken
 *      authored as Ring 2 narrative observations under
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
}

/** A ghost-entry record. Ghost entries live as standalone Markdown bodies
 *  under `data/codex/ghost_entries/` and are surfaced only when the
 *  corresponding path-not-taken predicate fires. */
export interface BuiltGhostEntry {
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
}

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
    /** Diagnostic only; not read by the section builder. */
    decision_source?: string;
    faction?: FactionId | null;
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

/** Read an event flag from MilitaryState.event_flags. */
function flag(state: GhostEntryStateView, name: string): boolean {
    return isTruthyFlag(state.military?.event_flags?.[name]);
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

function eventFiredById(state: GhostEntryStateView, eventId: string): boolean {
    const counts = state.military?.event_fire_counts;
    if (!counts) return false;
    const n = counts[eventId];
    return typeof n === 'number' && n > 0;
}

/** Player faction is the gating subject for paramilitary-policy and
 *  patron-pressure predicates. Lives on `state.meta.player_faction` per the
 *  StateMeta schema. Falls back to RBiH if unset; predicates that rely on
 *  player_faction-specific state are tolerant of absence. */
function playerFaction(state: GhostEntryStateView): FactionId {
    return state.meta?.player_faction ?? state.player_faction ?? 'RBiH';
}

// — Ghost 1: alliance_held —
//   federation_never_fractured = true AND croat_bosniak_war_begins_1993 did
//   NOT fire by t70.
function predAllianceHeld(state: GhostEntryStateView, currentTurn: number): boolean {
    if (!flag(state, 'federation_never_fractured')) return false;
    if (currentTurn < 70) return false;
    return !eventFiredById(state, 'croat_bosniak_war_begins_1993');
}

// — Ghost 2: cleansing_refused —
//   paramilitary_policy === 'always_deny' for player faction full run AND
//   war_crimes_events === 0 at turn ≥ 100. War-crimes count is read from the
//   negotiation breakdown (`state.political.negotiation.capital[faction]`),
//   which is the canonical accumulator written by paramilitary_sweep and
//   per-turn negotiation-capital recalculation.
function predCleansingRefused(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 100) return false;
    if (state.paramilitary_policy !== 'always_deny') return false;
    const faction = playerFaction(state);
    // NegotiationState (with `capital`) lives on MilitaryState — `state.military.negotiation`.
    const breakdown = state.military?.negotiation?.capital?.[faction];
    const warCrimes = breakdown?.war_crimes_events ?? 0;
    return warCrimes === 0;
}

// — Ghost 3: enclave_defended (AUDIT-ONLY) —
//   Observable campaign state: `enclave_held_through_turn` flag is set when
//   the upstream observation system records that ARBiH retains control of
//   op:srebrenica:srebrenica_2 AND op:zepa:zepa_2 AND op:gorazde:gorazde_2 at
//   the recorded turn N. This is a present-state audit signal — NOT a
//   forecast, and NOT a claim about Srebrenica 1995 outcomes. The
//   surrounding ghost-entry body (data/codex/ghost_entries/enclave_defended.md)
//   carries the strict audit register; this predicate only gates emission.
function predEnclaveDefended(state: GhostEntryStateView): boolean {
    return flag(state, 'enclave_held_through_turn');
}

// — Ghost 4: patron_resisted —
//   count of patron_pressure_refused increments ≥ 3.
function predPatronResisted(state: GhostEntryStateView): boolean {
    return flagNumber(state, 'patron_pressure_refused') >= 3;
}

// — Ghost 5: early_peace_accepted —
//   vance_owen_accepted (turn 50-70) OR owen_stoltenberg_accepted (turn 70-90);
//   mutually exclusive with dayton_signed_1995.
function predEarlyPeaceAccepted(state: GhostEntryStateView): boolean {
    if (eventFiredById(state, 'dayton_signed_1995')) return false;
    if (flag(state, 'vance_owen_accepted')) return true;
    if (flag(state, 'owen_stoltenberg_accepted')) return true;
    return false;
}

// — Ghost 6: force_quality_inversion —
//   vrs_quality_inverted = true (RS per-brigade combat power < ARBiH for ≥ 8
//   turns sustained). Set by an upstream auditor; we just observe the flag.
function predForceQualityInversion(state: GhostEntryStateView): boolean {
    return flag(state, 'vrs_quality_inverted');
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
function predParamilitaryStreakRefused(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 80) return false;
    if (!flag(state, 'paramilitary_authorization_refused')) return false;
    return flag(state, 'clean_record');
}

// — Ghost 8: winter_held —
//   Counterfactual: the seasonal supply-attrition predicate did NOT fire on
//   the player faction's track by the audit turn. Requires an upstream
//   observer to set `winter_held_through_turn` as a positive audit signal
//   (analogous to enclave_held_through_turn) AND the per-faction
//   winter_supply_attrition_active_<faction> flag remains unset.
//   Faction-agnostic via player_faction.
function predWinterHeld(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 80) return false;
    if (!flag(state, 'winter_held_through_turn')) return false;
    const faction = playerFaction(state);
    return !flag(state, `winter_supply_attrition_active_${faction}`);
}

// — Ghost 9: corridor_blocked —
//   Counterfactual: the Posavina corridor breakthrough did not occur.
//   Requires upstream observer to set `corridor_blocked_through_turn` as a
//   positive audit signal AND NOT corridor_secured AND NOT
//   eventFiredById('operation_corridor_1992'). Turn ≥ 30 is a margin past
//   the historical operational window (w12-w22) so we are observing the
//   post-window state, not racing it.
function predCorridorBlocked(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 30) return false;
    if (!flag(state, 'corridor_blocked_through_turn')) return false;
    if (flag(state, 'corridor_secured')) return false;
    return !eventFiredById(state, 'operation_corridor_1992');
}

// — Ghost 10: doctrine_reform_completed —
//   The reform-without-drift sequence. Both reform-initiation AND
//   modernisation pulse fired AND drift did NOT fire on player faction's track.
//   Faction-agnostic via player_faction. Modernisation chains on prior reform
//   (csq_doctrine_modernization_<faction> requires doctrine_reform_initiated).
function predDoctrineReformCompleted(state: GhostEntryStateView): boolean {
    const faction = playerFaction(state);
    if (!flag(state, `doctrine_reform_initiated_${faction}`)) return false;
    if (!flag(state, `doctrine_modernization_active_${faction}`)) return false;
    return !flag(state, `doctrine_drift_active_${faction}`);
}

// — Ghost 11: arms_embargo_full_compliance —
//   Counterfactual: no third-party channel activated and no attenuation event
//   fired on player faction's track by the audit turn. Requires upstream
//   observer to set `arms_embargo_compliant_through_turn` as a positive
//   audit signal AND no third-party-channel or attenuation flags are set
//   for the player faction. Faction-agnostic via player_faction.
function predArmsEmbargoFullCompliance(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 100) return false;
    if (!flag(state, 'arms_embargo_compliant_through_turn')) return false;
    const faction = playerFaction(state);
    if (flag(state, `third_party_arms_channel_active_${faction}`)) return false;
    return !flag(state, `iran_arms_channel_attenuation_active_${faction}`);
}

// — Ghost 12: political_unity_held —
//   Counterfactual: the temporary-political-split predicate did NOT fire on
//   player faction's track by the audit turn. Requires upstream observer to
//   set `political_unity_held_through_turn` as a positive audit signal AND
//   the per-faction political_split_temporary_active_<faction> flag remains
//   unset. Faction-agnostic via player_faction.
function predPoliticalUnityHeld(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 100) return false;
    if (!flag(state, 'political_unity_held_through_turn')) return false;
    const faction = playerFaction(state);
    return !flag(state, `political_split_temporary_active_${faction}`);
}

// — Ghost 13: equipment_quality_collapse —
//   Divergence note: a catastrophic late-war equipment-quality collapse fired
//   on player faction's track. Reads equipment_quality_collapsed flag (set by
//   an upstream auditor when per-brigade equipment-quality readings cross the
//   collapse audit threshold).
function predEquipmentQualityCollapse(state: GhostEntryStateView): boolean {
    return flag(state, 'equipment_quality_collapsed');
}

// — Ghost 14: negotiation_capital_exhausted —
//   Divergence note: diplomatic capital ran out without any canonical peace
//   plan being signed. Reads negotiation_capital_exhausted flag AND
//   no peace-plan acceptance flag is set.
function predNegotiationCapitalExhausted(state: GhostEntryStateView): boolean {
    if (!flag(state, 'negotiation_capital_exhausted')) return false;
    if (flag(state, 'vance_owen_accepted')) return false;
    if (flag(state, 'owen_stoltenberg_accepted')) return false;
    if (eventFiredById(state, 'dayton_signed_1995')) return false;
    return true;
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
function predCeasefireStreakHeld(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 80) return false;
    if (!flag(state, 'ceasefire_held_through_turn')) return false;
    const faction = playerFaction(state);
    return !flag(state, `ceasefire_violation_attributed_${faction}`);
}

// — Ghost 16: mediator_trust_sustained —
//   The trust channel to the active mediation phase was not repudiated within
//   the window. Requires `mediator_trust_held_through_turn` AND no
//   mediator-denounced attribution for the player faction. turn >= 80.
function predMediatorTrustSustained(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 80) return false;
    if (!flag(state, 'mediator_trust_held_through_turn')) return false;
    const faction = playerFaction(state);
    return !flag(state, `mediator_denounced_${faction}`);
}

// — Ghost 17: rear_pocket_sustained —
//   Rear-area discipline held: the observer streak flag is set AND the
//   war_crimes_events counter on the player faction's negotiation capital
//   remains at zero. Reuses the real war_crimes_events accumulator (the same
//   counter cleansing_refused reads), so this is grounded on live substrate.
//   turn >= 80.
function predRearPocketSustained(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 80) return false;
    if (!flag(state, 'rear_pocket_discipline_held_through_turn')) return false;
    const faction = playerFaction(state);
    const breakdown = state.military?.negotiation?.capital?.[faction];
    const warCrimes = breakdown?.war_crimes_events ?? 0;
    return warCrimes === 0;
}

// — Ghost 18: civilian_displacement_contained —
//   The displacement-counter trajectory stayed below the canonical baseline by
//   the audit turn. Requires `civilian_displacement_contained_through_turn` AND
//   no mass-displacement attribution for the player faction. turn >= 80.
function predCivilianDisplacementContained(state: GhostEntryStateView, currentTurn: number): boolean {
    if (currentTurn < 80) return false;
    if (!flag(state, 'civilian_displacement_contained_through_turn')) return false;
    const faction = playerFaction(state);
    return !flag(state, `mass_displacement_attributed_${faction}`);
}

// — Ghost 19: equipment_quality_recovered —
//   Divergence note: equipment quality bent upward from the canonical baseline.
//   The recovery consequence substrate (csq_equipment_quality_recovery_streak_*
//   in data/scenarios/events/consequences.json) sets PER-FACTION streak flags
//   `equipment_quality_recovery_streak_active_<FACTION>` — it never sets a bare
//   `equipment_quality_recovered`. Gating on the bare flag meant this ghost
//   could never emit from a live run (#267). Re-gated on any-faction-active over
//   the canonical faction set (faction-agnostic; the recovery is an observable
//   campaign-wide audit reading, not a player-faction-only one). The legacy
//   `equipment_quality_recovered` flag is still honoured for back-compat with
//   any upstream that writes the aggregate name directly. Mutual exclusion with
//   the equipment_quality_collapse reading is preserved.
function predEquipmentQualityRecovered(state: GhostEntryStateView): boolean {
    if (flag(state, 'equipment_quality_collapsed')) return false;
    // Deterministic iteration over the canonical faction set.
    const anyStreakActive = CANONICAL_FACTIONS.some((f) =>
        flag(state, `equipment_quality_recovery_streak_active_${f}`),
    );
    if (anyStreakActive) return true;
    // Back-compat: honour the aggregate flag if some upstream sets it directly.
    return flag(state, 'equipment_quality_recovered');
}

// — Ghost 20: negotiation_capital_recovered —
//   Divergence note: negotiation capital bent upward against the historical
//   one-way-drain baseline. Requires `negotiation_capital_recovered` AND NOT
//   `negotiation_capital_exhausted` (mutually exclusive readings of the same
//   ledger).
function predNegotiationCapitalRecovered(state: GhostEntryStateView): boolean {
    if (!flag(state, 'negotiation_capital_recovered')) return false;
    return !flag(state, 'negotiation_capital_exhausted');
}

// ═══════════════════════════════════════════════════════════════════════════
// Ghost-entry registry — fixed declaration order, deterministic
// ═══════════════════════════════════════════════════════════════════════════

interface GhostRegistryEntry {
    ghost_id: string;
    path: string;
    /** Variant for this entry. AUDIT-ONLY entries are pinned to 'context'. */
    variant: SectionVariant;
    /** Diagnostic predicate names recorded on the emission. */
    conditional_on: string[];
    /** Pure predicate over (state, currentTurn). */
    predicate: (state: GhostEntryStateView, currentTurn: number) => boolean;
}

const GHOST_ENTRIES: readonly GhostRegistryEntry[] = [
    {
        ghost_id: 'alliance_held',
        path: 'data/codex/ghost_entries/alliance_held.md',
        variant: 'context',
        conditional_on: ['federation_never_fractured', 'NOT croat_bosniak_war_begins_1993', 'turn>=70'],
        predicate: predAllianceHeld,
    },
    {
        ghost_id: 'cleansing_refused',
        path: 'data/codex/ghost_entries/cleansing_refused.md',
        variant: 'context',
        conditional_on: ['paramilitary_policy=always_deny', 'war_crimes_events=0', 'turn>=100'],
        predicate: predCleansingRefused,
    },
    {
        // AUDIT-ONLY. variant pinned to 'context'. Tested explicitly (T7).
        ghost_id: 'enclave_defended',
        path: 'data/codex/ghost_entries/enclave_defended.md',
        variant: 'context',
        conditional_on: ['enclave_held_through_turn:N (Srebrenica AND Žepa AND Goražde)'],
        predicate: predEnclaveDefended,
    },
    {
        ghost_id: 'patron_resisted',
        path: 'data/codex/ghost_entries/patron_resisted.md',
        variant: 'context',
        conditional_on: ['patron_pressure_refused>=3'],
        predicate: predPatronResisted,
    },
    {
        ghost_id: 'early_peace_accepted',
        path: 'data/codex/ghost_entries/early_peace_accepted.md',
        variant: 'context',
        conditional_on: ['(vance_owen_accepted OR owen_stoltenberg_accepted)', 'NOT dayton_signed_1995'],
        predicate: predEarlyPeaceAccepted,
    },
    {
        ghost_id: 'force_quality_inversion',
        path: 'data/codex/ghost_entries/force_quality_inversion.md',
        variant: 'context',
        conditional_on: ['vrs_quality_inverted'],
        predicate: predForceQualityInversion,
    },
    // ─── Wave 2 entries (LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION) ────────
    {
        ghost_id: 'paramilitary_streak_refused',
        path: 'data/codex/ghost_entries/paramilitary_streak_refused.md',
        variant: 'context',
        conditional_on: ['paramilitary_authorization_refused', 'clean_record', 'turn>=80'],
        predicate: predParamilitaryStreakRefused,
    },
    {
        ghost_id: 'winter_held',
        path: 'data/codex/ghost_entries/winter_held.md',
        variant: 'context',
        conditional_on: [
            'winter_held_through_turn',
            'NOT winter_supply_attrition_active_<player>',
            'turn>=80',
        ],
        predicate: predWinterHeld,
    },
    {
        ghost_id: 'corridor_blocked',
        path: 'data/codex/ghost_entries/corridor_blocked.md',
        variant: 'context',
        conditional_on: [
            'corridor_blocked_through_turn',
            'NOT corridor_secured',
            'NOT operation_corridor_1992',
            'turn>=30',
        ],
        predicate: predCorridorBlocked,
    },
    {
        ghost_id: 'doctrine_reform_completed',
        path: 'data/codex/ghost_entries/doctrine_reform_completed.md',
        variant: 'context',
        conditional_on: [
            'doctrine_reform_initiated_<player>',
            'doctrine_modernization_active_<player>',
            'NOT doctrine_drift_active_<player>',
        ],
        predicate: predDoctrineReformCompleted,
    },
    {
        ghost_id: 'arms_embargo_full_compliance',
        path: 'data/codex/ghost_entries/arms_embargo_full_compliance.md',
        variant: 'context',
        conditional_on: [
            'arms_embargo_compliant_through_turn',
            'NOT third_party_arms_channel_active_<player>',
            'NOT iran_arms_channel_attenuation_active_<player>',
            'turn>=100',
        ],
        predicate: predArmsEmbargoFullCompliance,
    },
    {
        ghost_id: 'political_unity_held',
        path: 'data/codex/ghost_entries/political_unity_held.md',
        variant: 'context',
        conditional_on: [
            'political_unity_held_through_turn',
            'NOT political_split_temporary_active_<player>',
            'turn>=100',
        ],
        predicate: predPoliticalUnityHeld,
    },
    {
        ghost_id: 'equipment_quality_collapse',
        path: 'data/codex/ghost_entries/equipment_quality_collapse.md',
        variant: 'context',
        conditional_on: ['equipment_quality_collapsed'],
        predicate: predEquipmentQualityCollapse,
    },
    {
        ghost_id: 'negotiation_capital_exhausted',
        path: 'data/codex/ghost_entries/negotiation_capital_exhausted.md',
        variant: 'context',
        conditional_on: [
            'negotiation_capital_exhausted',
            'NOT vance_owen_accepted',
            'NOT owen_stoltenberg_accepted',
            'NOT dayton_signed_1995',
        ],
        predicate: predNegotiationCapitalExhausted,
    },
    // ─── Wave 3 entries (LANE-NIGHTSHIFT-CODEX-CONTENT-EXPANSION-WAVE-3) ──
    {
        ghost_id: 'ceasefire_streak_held',
        path: 'data/codex/ghost_entries/ceasefire_streak_held.md',
        variant: 'context',
        conditional_on: [
            'ceasefire_held_through_turn',
            'NOT ceasefire_violation_attributed_<player>',
            'turn>=80',
        ],
        predicate: predCeasefireStreakHeld,
    },
    {
        ghost_id: 'mediator_trust_sustained',
        path: 'data/codex/ghost_entries/mediator_trust_sustained.md',
        variant: 'context',
        conditional_on: [
            'mediator_trust_held_through_turn',
            'NOT mediator_denounced_<player>',
            'turn>=80',
        ],
        predicate: predMediatorTrustSustained,
    },
    {
        ghost_id: 'rear_pocket_sustained',
        path: 'data/codex/ghost_entries/rear_pocket_sustained.md',
        variant: 'context',
        conditional_on: [
            'rear_pocket_discipline_held_through_turn',
            'war_crimes_events=0',
            'turn>=80',
        ],
        predicate: predRearPocketSustained,
    },
    {
        ghost_id: 'civilian_displacement_contained',
        path: 'data/codex/ghost_entries/civilian_displacement_contained.md',
        variant: 'context',
        conditional_on: [
            'civilian_displacement_contained_through_turn',
            'NOT mass_displacement_attributed_<player>',
            'turn>=80',
        ],
        predicate: predCivilianDisplacementContained,
    },
    {
        ghost_id: 'equipment_quality_recovered',
        path: 'data/codex/ghost_entries/equipment_quality_recovered.md',
        variant: 'context',
        conditional_on: [
            'equipment_quality_recovery_streak_active_<any-faction> (or legacy equipment_quality_recovered)',
            'NOT equipment_quality_collapsed',
        ],
        predicate: predEquipmentQualityRecovered,
    },
    {
        ghost_id: 'negotiation_capital_recovered',
        path: 'data/codex/ghost_entries/negotiation_capital_recovered.md',
        variant: 'context',
        conditional_on: ['negotiation_capital_recovered', 'NOT negotiation_capital_exhausted'],
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
function firstResponseByEvent(
    log: readonly GhostEntryDecisionLogEntry[],
): ReadonlyMap<string, string> {
    const out = new Map<string, string>();
    for (const entry of log) {
        if (!entry || typeof entry.event_id !== 'string' || typeof entry.response_id !== 'string') continue;
        if (!LOAD_BEARING_BY_EVENT.has(entry.event_id)) continue;
        if (out.has(entry.event_id)) continue;
        out.set(entry.event_id, entry.response_id);
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

    const emitted: BuiltGhostEntry[] = [];
    for (const entry of GHOST_ENTRIES) {
        if (!entry.predicate(state, currentTurn)) continue;
        emitted.push({
            ghost_id: entry.ghost_id,
            path: entry.path,
            ring_classification: 2,
            conditional_on: [...entry.conditional_on],
            variant: entry.variant,
        });
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
 *   - iterates the fixed `LOAD_BEARING_SECTIONS` declaration order, then sorts
 *     the emitted records by `strictCompare` on `id`.
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
    const chosenByEvent = firstResponseByEvent(log);

    const emitted: BuiltDynamicSection[] = [];
    for (const spec of LOAD_BEARING_SECTIONS) {
        const branch = chosenByEvent.get(spec.event_id);
        if (branch === undefined) continue;
        const responseCondition = `RESPONSE:${spec.event_id}:${branch}`;
        emitted.push({
            id: `dynsec_${spec.event_id}_${branch}`,
            target_essay_event_id: spec.target_essay_event_id,
            content: spec.summary,
            variant: spec.variant,
            ring_classification: 2,
            // `conditional_on` carries the A1c join key so the renderer can pull
            // the authored per-branch prose from essay_index `dynamic_sections`.
            conditional_on: [responseCondition],
        });
    }

    // §6 rupture receipts (#78): observe ruptures ALREADY recorded on the state
    // (read-only; does not record/flip/re-time any rupture) and emit a Ring-2
    // pointer to the already-authored `FINDING:rupture_<id>` essay section.
    for (const receipt of buildRuptureReceiptSections(input.state)) {
        emitted.push(receipt);
    }

    return emitted.slice().sort((a, b) => strictCompare(a.id, b.id));
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
