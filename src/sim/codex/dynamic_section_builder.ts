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

function assertRingGuard(state: GameState): void {
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

function isTruthyFlag(value: string | number | boolean | undefined): boolean {
    if (value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.trim().length > 0 && value !== '0' && value.toLowerCase() !== 'false';
    return false;
}

/** Read an event flag from MilitaryState.event_flags. */
function flag(state: GameState, name: string): boolean {
    return isTruthyFlag(state.military?.event_flags?.[name]);
}

function flagNumber(state: GameState, name: string): number {
    const value = state.military?.event_flags?.[name];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
}

function eventFiredById(state: GameState, eventId: string): boolean {
    const counts = state.military?.event_fire_counts;
    if (!counts) return false;
    const n = counts[eventId];
    return typeof n === 'number' && n > 0;
}

/** Player faction is the gating subject for paramilitary-policy and
 *  patron-pressure predicates. Lives on `state.meta.player_faction` per the
 *  StateMeta schema. Falls back to RBiH if unset; predicates that rely on
 *  player_faction-specific state are tolerant of absence. */
function playerFaction(state: GameState): FactionId {
    return state.meta?.player_faction ?? 'RBiH';
}

// — Ghost 1: alliance_held —
//   federation_never_fractured = true AND croat_bosniak_war_begins_1993 did
//   NOT fire by t70.
function predAllianceHeld(state: GameState, currentTurn: number): boolean {
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
function predCleansingRefused(state: GameState, currentTurn: number): boolean {
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
function predEnclaveDefended(state: GameState): boolean {
    return flag(state, 'enclave_held_through_turn');
}

// — Ghost 4: patron_resisted —
//   count of patron_pressure_refused increments ≥ 3.
function predPatronResisted(state: GameState): boolean {
    return flagNumber(state, 'patron_pressure_refused') >= 3;
}

// — Ghost 5: early_peace_accepted —
//   vance_owen_accepted (turn 50-70) OR owen_stoltenberg_accepted (turn 70-90);
//   mutually exclusive with dayton_signed_1995.
function predEarlyPeaceAccepted(state: GameState): boolean {
    if (eventFiredById(state, 'dayton_signed_1995')) return false;
    if (flag(state, 'vance_owen_accepted')) return true;
    if (flag(state, 'owen_stoltenberg_accepted')) return true;
    return false;
}

// — Ghost 6: force_quality_inversion —
//   vrs_quality_inverted = true (RS per-brigade combat power < ARBiH for ≥ 8
//   turns sustained). Set by an upstream auditor; we just observe the flag.
function predForceQualityInversion(state: GameState): boolean {
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
function predParamilitaryStreakRefused(state: GameState, currentTurn: number): boolean {
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
function predWinterHeld(state: GameState, currentTurn: number): boolean {
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
function predCorridorBlocked(state: GameState, currentTurn: number): boolean {
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
function predDoctrineReformCompleted(state: GameState): boolean {
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
function predArmsEmbargoFullCompliance(state: GameState, currentTurn: number): boolean {
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
function predPoliticalUnityHeld(state: GameState, currentTurn: number): boolean {
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
function predEquipmentQualityCollapse(state: GameState): boolean {
    return flag(state, 'equipment_quality_collapsed');
}

// — Ghost 14: negotiation_capital_exhausted —
//   Divergence note: diplomatic capital ran out without any canonical peace
//   plan being signed. Reads negotiation_capital_exhausted flag AND
//   no peace-plan acceptance flag is set.
function predNegotiationCapitalExhausted(state: GameState): boolean {
    if (!flag(state, 'negotiation_capital_exhausted')) return false;
    if (flag(state, 'vance_owen_accepted')) return false;
    if (flag(state, 'owen_stoltenberg_accepted')) return false;
    if (eventFiredById(state, 'dayton_signed_1995')) return false;
    return true;
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
    predicate: (state: GameState, currentTurn: number) => boolean;
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
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build all ghost entries that match their predicate against `state` at
 * `currentTurn`. Pure, deterministic. Output ordered by `strictCompare` on
 * `ghost_id` for stable consumption.
 *
 * Throws if the input state carries any §6 refused flag; see `assertRingGuard`.
 */
export function buildGhostEntries(state: GameState, currentTurn: number): BuiltGhostEntry[] {
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
 * Build dynamic essay sections. For Phase 0 of the slice, dynamic-section
 * production is delegated to existing essay-side machinery (the resolver in
 * `codexEssayResolver.ts` handles `dynamic_sections` declared on essay
 * entries). The builder reserves this surface for sections that must be
 * synthesised from frozen end-game state — none in Phase 0.
 *
 * The function is provided so consumers can call a single API; it returns an
 * empty array on Phase 0 inputs and is shaped for future expansion.
 *
 * Determinism: deterministic empty-list emission today; future sections will
 * be sorted by `strictCompare` on `id`.
 */
export function buildDynamicSections(input: BuilderInput): BuiltDynamicSection[] {
    assertRingGuard(input.state);
    return [];
}

/**
 * Combined Phase 0 entry point: emit both dynamic sections (currently empty)
 * and ghost entries. Useful for VerdictScreen-side consumption that wants a
 * single read-only call.
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
