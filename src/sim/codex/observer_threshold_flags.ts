/**
 * LANE-OBSERVER-FLAG-WRITER (owner decision #3, 2026-06-07).
 *
 * Default-OFF engine observer that writes the two NON-Srebrenica positive
 * threshold "observer flags" consumed by the dormant Ring-2 ghost-codex
 * entries in `dynamic_section_builder.ts`:
 *
 *   - `equipment_quality_collapsed`     → lights ghost `equipment_quality_collapse`
 *   - `negotiation_capital_exhausted`   → lights ghost `negotiation_capital_exhausted`
 *
 * These two ghosts gate on a single positive flag each that no upstream system
 * currently writes (verified: zero writers in src/ + data/scenarios/events/),
 * so the entries are wired-but-dark. The four `*_through_turn` deadline flags
 * are written by data audit events in `consequences.json`; this engine observer
 * covers the remaining two threshold flags that require reading live per-turn
 * engine metrics rather than a calendar/flag-absence deadline.
 *
 * The Srebrenica `enclave_held_through_turn` threshold flag (ghost
 * `enclave_defended`) is §6-GATED (SENSITIVE_HISTORY_DESIGN_GATE.md §6:
 * Srebrenica / Žepa / Goražde enclave-held framing) and is DELIBERATELY NOT
 * written here. It is deferred for separate §6 historian handling.
 *
 * Substrate discipline (mirrors the ENABLE_* default-off pattern used by
 * ENABLE_SHARED_SECTOR_DEFENSE / ENABLE_TG_COMBAT_SYNTHESIS /
 * SIEGE_MORALE_DRAIN_ENABLED): the observer is gated behind
 * `ENABLE_OBSERVER_THRESHOLD_FLAGS`, which is `false` by default. With the flag
 * off, `observeThresholdFlags` returns an inert report and writes NOTHING, so
 * the 40w / 188w calibration runs are byte-identical. The threshold predicates
 * below are authored honestly for the day the flag is flipped, but they cannot
 * move calibration while the flag is off.
 *
 * Even when ON, this observer only ever WRITES the two boolean flags above onto
 * `state.military.event_flags`; it never touches OSID control, dimensions,
 * morale, supply, or any combat surface. So flipping it on is calibration-FLAT
 * by construction (OSID control map bit-identical; only the new flag /
 * fire-count entries differ — the Ring-3 observer-write contract).
 *
 * Determinism (Engine Invariants §4): no `Math.random()`, no `Date.now()`, no
 * `Date`. All faction iteration is over a fixed canonical-id list sorted via
 * `strictCompare`. Same state → same flags.
 */
import { strictCompare } from '../../state/validateGameState.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { getActiveEquipmentQualityMultiplier } from '../events/active_modifiers.js';

/**
 * Master default-OFF gate for the threshold-flag observer. Flip to `true`
 * (or wire a runtime accessor, mirroring getEnablePhase3D) only after a
 * dual-horizon calibration re-floor confirms the OSID control map stays
 * bit-identical. Default `false` keeps 40w / 188w byte-identical.
 */
export const ENABLE_OBSERVER_THRESHOLD_FLAGS = false;

/**
 * Equipment-quality "collapse" audit threshold. A faction's active
 * equipment-quality multiplier at or below this value (e.g. the 0.7x NATO
 * air-campaign degradation in `nato_deliberate_force_1995`) is read as a
 * catastrophic equipment-quality collapse. The multiplier's no-modifier
 * fast-path is exactly 1.0, so the historical (no-event) reading never trips
 * this threshold.
 */
export const EQUIPMENT_QUALITY_COLLAPSE_THRESHOLD = 0.75;

/**
 * Negotiation-capital "exhausted" audit threshold. A faction whose live
 * negotiation capital (`faction.negotiation.capital`, integer ≥ 0, computed
 * each turn in negotiation_capital.ts) is at or below this floor has run its
 * diplomatic capital out. The ghost predicate additionally requires that no
 * canonical peace plan was signed, so this flag is necessary-not-sufficient
 * for the ghost — it only records the capital-floor observation.
 */
export const NEGOTIATION_CAPITAL_EXHAUSTED_THRESHOLD = 0;

/** Canonical faction id list, iterated in `strictCompare` order. */
const FACTION_IDS: readonly FactionId[] = (['HRHB', 'RBiH', 'RS'] as FactionId[])
    .slice()
    .sort(strictCompare);

/** Diagnostic report. Counters increment regardless of the write gate (the N4
 *  precedent: a default-off mechanic still emits its observability counter), so
 *  a future flip can be validated against pre-flip diagnostics. */
export interface ObserverThresholdReport {
    /** Whether the write gate (`ENABLE_OBSERVER_THRESHOLD_FLAGS`) was on. */
    enabled: boolean;
    /** True when at least one faction is at/below the equipment-collapse threshold. */
    equipment_quality_collapsed_observed: boolean;
    /** True when at least one faction is at/below the negotiation-capital floor. */
    negotiation_capital_exhausted_observed: boolean;
    /** Flag names actually written this call (empty when the gate is off). */
    flags_written: string[];
}

/** True when any faction's active equipment-quality multiplier is at or below
 *  the collapse threshold. Faction-agnostic; reads the canonical multiplier. */
function observeEquipmentQualityCollapsed(state: GameState, currentTurn: number): boolean {
    for (const faction of FACTION_IDS) {
        const mult = getActiveEquipmentQualityMultiplier(state, faction, currentTurn);
        if (mult <= EQUIPMENT_QUALITY_COLLAPSE_THRESHOLD) return true;
    }
    return false;
}

/** True when any faction's live negotiation capital is at or below the
 *  exhaustion floor. Reads `state.factions[*].negotiation.capital`. */
function observeNegotiationCapitalExhausted(state: GameState): boolean {
    const factions = state.factions;
    if (!Array.isArray(factions) || factions.length === 0) return false;
    // Sort by id for deterministic short-circuit ordering.
    const sorted = [...factions].sort((a, b) => strictCompare(a.id, b.id));
    for (const faction of sorted) {
        const capital = faction.negotiation?.capital;
        if (typeof capital === 'number' && capital <= NEGOTIATION_CAPITAL_EXHAUSTED_THRESHOLD) {
            return true;
        }
    }
    return false;
}

/**
 * Observe the two non-Srebrenica threshold flags and, when the write gate is
 * on, write them onto `state.military.event_flags`. Pure observation of live
 * state plus an optional gated boolean write — never mutates OSID control,
 * dimensions, or any combat surface.
 *
 * Idempotent: once a flag is set true it is never cleared here (an audit
 * observation persists for the rest of the run, matching the `*_fell` /
 * `*_occurred` source-flag pattern). Default-off → returns an inert report
 * with `flags_written: []` and writes nothing.
 */
export function observeThresholdFlags(state: GameState, currentTurn: number): ObserverThresholdReport {
    const equipmentCollapsed = observeEquipmentQualityCollapsed(state, currentTurn);
    const capitalExhausted = observeNegotiationCapitalExhausted(state);

    const report: ObserverThresholdReport = {
        enabled: ENABLE_OBSERVER_THRESHOLD_FLAGS,
        equipment_quality_collapsed_observed: equipmentCollapsed,
        negotiation_capital_exhausted_observed: capitalExhausted,
        flags_written: [],
    };

    if (!ENABLE_OBSERVER_THRESHOLD_FLAGS) return report;

    if (!state.military.event_flags) {
        state.military.event_flags = {};
    }
    const flags = state.military.event_flags;

    // Write in a fixed sorted order so the diagnostic list is deterministic.
    if (equipmentCollapsed && flags.equipment_quality_collapsed !== true) {
        flags.equipment_quality_collapsed = true;
        report.flags_written.push('equipment_quality_collapsed');
    }
    if (capitalExhausted && flags.negotiation_capital_exhausted !== true) {
        flags.negotiation_capital_exhausted = true;
        report.flags_written.push('negotiation_capital_exhausted');
    }
    report.flags_written.sort(strictCompare);
    return report;
}
