/**
 * Phase B Step 2: Pre-War Capital System (Phase_0_Specification_v0_4_0.md §4.1).
 *
 * Asymmetric pools: RS=100, RBiH=70, HRHB=40.
 * Capital is spent via organizational investments.
 * By default it is non-renewable. Scheduled pre-war scenarios may use a
 * deterministic trickle to avoid dead turns while preserving scarcity.
 */

import type { FactionId, GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

/** Initial pre-war capital per faction (Phase_0_Spec §4.1). RS=100, RBiH=70, HRHB=40. */
export const PREWAR_CAPITAL_INITIAL: Readonly<Record<FactionId, number>> = {
    RS: 100,
    RBiH: 70,
    HRHB: 40
};

/** Scenario-gated deterministic trickle amount per turn (Phase 0 §4.1.1). */
export const PREWAR_CAPITAL_TRICKLE_PER_TURN = 1;

/** Maximum additional reserve above initial capital from trickle at any moment. */
export const PREWAR_CAPITAL_TRICKLE_MAX_BONUS = 20;

/**
 * Initialize pre-war capital for all factions that do not yet have it set.
 * Idempotent: only sets prewar_capital when undefined (e.g. new Phase 0 game or loaded state without it).
 * Deterministic: iterates factions in sorted order by id (Engine Invariants §11.3).
 */
export function initializePrewarCapital(state: GameState): void {
    const factions = state.factions;
    const sorted = [...factions].sort((a, b) => strictCompare(a.id, b.id));
    for (const faction of sorted) {
        if (faction.prewar_capital === undefined) {
            const initial = PREWAR_CAPITAL_INITIAL[faction.id as keyof typeof PREWAR_CAPITAL_INITIAL];
            faction.prewar_capital = typeof initial === 'number' ? initial : 0;
        }
    }
}

export interface PrewarCapitalTrickleOptions {
    perTurn?: number;
    maxBonus?: number;
}

function isNonNegativeInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
}

function hasScheduledPhase0Timing(state: GameState): boolean {
    return isNonNegativeInteger(state.meta.phase_0_scheduled_referendum_turn ?? -1) &&
        isNonNegativeInteger(state.meta.phase_0_scheduled_war_start_turn ?? -1);
}

/**
 * Apply deterministic per-turn pre-war capital trickle for scheduled pre-war scenarios only.
 *
 * Gating:
 * - state.meta.phase must be phase_0
 * - both scheduled referendum and war-start turns must be present
 *
 * Deterministic:
 * - applies in canonical faction order (RBiH, RS, HRHB)
 * - no random/time APIs
 */
export function applyPrewarCapitalTrickle(
    state: GameState,
    options: PrewarCapitalTrickleOptions = {}
): void {
    if (state.meta.phase !== 'phase_0') return;
    if (!hasScheduledPhase0Timing(state)) return;

    const perTurn = options.perTurn ?? PREWAR_CAPITAL_TRICKLE_PER_TURN;
    const maxBonus = options.maxBonus ?? PREWAR_CAPITAL_TRICKLE_MAX_BONUS;
    if (!Number.isInteger(perTurn) || perTurn <= 0) return;
    if (!Number.isInteger(maxBonus) || maxBonus < 0) return;

    for (const factionId of PHASE0_FACTION_ORDER) {
        const faction = state.factions.find((f) => f.id === factionId);
        if (!faction) continue;
        const current = faction.prewar_capital ?? 0;
        const initial = PREWAR_CAPITAL_INITIAL[factionId] ?? 0;
        const cap = initial + maxBonus;
        if (current >= cap) continue;
        faction.prewar_capital = Math.min(cap, current + perTurn);
    }
}

export type SpendPrewarCapitalResult =
    | { ok: true; remaining: number }
    | { ok: false; reason: string };

/**
 * Spend pre-war capital for a faction. Validates cost and deducts; non-renewable (no refunds).
 * Returns { ok: true, remaining } on success, { ok: false, reason } on failure.
 * Mutates state.factions[].prewar_capital.
 */
export function spendPrewarCapital(
    state: GameState,
    factionId: FactionId,
    amount: number
): SpendPrewarCapitalResult {
    if (!Number.isInteger(amount) || amount < 0) {
        return { ok: false, reason: 'amount must be a non-negative integer' };
    }
    if (amount === 0) {
        const faction = state.factions.find((f) => f.id === factionId);
        const current = faction?.prewar_capital ?? 0;
        return { ok: true, remaining: current };
    }
    const faction = state.factions.find((f) => f.id === factionId);
    if (!faction) {
        return { ok: false, reason: `faction not found: ${factionId}` };
    }
    const current = faction.prewar_capital ?? 0;
    if (amount > current) {
        return { ok: false, reason: `insufficient capital: have ${current}, need ${amount}` };
    }
    faction.prewar_capital = current - amount;
    return { ok: true, remaining: faction.prewar_capital };
}

/**
 * Get current pre-war capital for a faction. Returns 0 if faction missing or prewar_capital undefined.
 */
export function getPrewarCapital(state: GameState, factionId: FactionId): number {
    const faction = state.factions.find((f) => f.id === factionId);
    const value = faction?.prewar_capital;
    return typeof value === 'number' ? value : 0;
}

/** Canonical faction order for Phase 0 turn sequence (Phase_0_Spec §5: RBiH, RS, HRHB). */
export const PHASE0_FACTION_ORDER: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'];
