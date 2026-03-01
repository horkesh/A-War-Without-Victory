/**
 * Supply Reserves System (Phase A — SUPPLY_AMMO_SYSTEM_PLAN.md §3)
 *
 * Two faction-level reserve pools: general_supply_reserve and heavy_munitions_reserve.
 * - Maintenance: per-turn drain proportional to formation count.
 * - Combat expenditure: per-battle deduction (called from attack_resolution_osid).
 * - Production income: from controlled production facilities.
 *
 * All iteration is deterministic (sorted faction IDs, sorted formation IDs).
 */

import type { GameState, FactionId } from './game_state.js';
import type { SupplyStateLevel } from './supply_state_derivation.js';
import {
    MAINTENANCE_DRAIN_PER_FORMATION,
    COMBAT_HEAVY_MUNITIONS_RATE,
    COMBAT_GENERAL_SUPPLY_RATE,
    PRODUCTION_SCALE,
    PRODUCTION_GENERAL_FRACTION,
    PRODUCTION_HEAVY_FRACTION,
    INIT_GENERAL_SUPPLY_RESERVE,
    INIT_HEAVY_MUNITIONS_RESERVE,
    RESERVE_ADEQUATE_THRESHOLD,
    RESERVE_STRAINED_THRESHOLD,
} from './supply_reserve_constants.js';

// ── Init ─────────────────────────────────────────────────────────────────────

/** Ensure reserve fields exist on GameState with default values. Idempotent. */
export function ensureSupplyReserves(state: GameState): void {
    const factionIds = (state.factions ?? []).map((f) => f.id).sort((a, b) => a.localeCompare(b));
    if (!state.general_supply_reserve) {
        state.general_supply_reserve = {};
        for (const fid of factionIds) {
            state.general_supply_reserve[fid as FactionId] = INIT_GENERAL_SUPPLY_RESERVE;
        }
    }
    if (!state.heavy_munitions_reserve) {
        state.heavy_munitions_reserve = {};
        for (const fid of factionIds) {
            state.heavy_munitions_reserve[fid as FactionId] = INIT_HEAVY_MUNITIONS_RESERVE;
        }
    }
}

// ── Report ───────────────────────────────────────────────────────────────────

export interface SupplyReservesReport {
    schema: 1;
    turn: number;
    factions: SupplyReservesFactionEntry[];
}

export interface SupplyReservesFactionEntry {
    faction_id: string;
    general_supply: number;
    heavy_munitions: number;
    maintenance_drain: number;
    production_income_general: number;
    production_income_heavy: number;
}

// ── Core: Per-Turn Reserve Update ────────────────────────────────────────────

/**
 * Update supply reserves for all factions.
 * Called once per turn from the `compute-supply-reserves` pipeline step.
 *
 * @param state - mutable GameState
 * @param productionBonusByFaction - from calculateFactionProductionBonus()
 * @returns report for diagnostics
 */
export function updateSupplyReserves(
    state: GameState,
    productionBonusByFaction: Record<string, number>
): SupplyReservesReport {
    ensureSupplyReserves(state);

    const factionIds = (state.factions ?? []).map((f) => f.id).sort((a, b) => a.localeCompare(b));
    const formations = state.formations ?? {};
    const formationIds = Object.keys(formations).sort((a, b) => a.localeCompare(b));

    // Count formations per faction (deterministic)
    const formationCountByFaction: Record<string, number> = {};
    for (const fid of factionIds) formationCountByFaction[fid] = 0;
    for (const fmId of formationIds) {
        const fm = formations[fmId];
        if (!fm || !fm.faction) continue;
        const fid = fm.faction as string;
        formationCountByFaction[fid] = (formationCountByFaction[fid] ?? 0) + 1;
    }

    const entries: SupplyReservesFactionEntry[] = [];

    for (const fid of factionIds) {
        const factionKey = fid as FactionId;
        const formCount = formationCountByFaction[fid] ?? 0;

        // Maintenance drain: general supply only
        const maintenanceDrain = formCount * MAINTENANCE_DRAIN_PER_FORMATION;

        // Production income: split by facility type fraction
        const totalProduction = (productionBonusByFaction[fid] ?? 0) * PRODUCTION_SCALE;
        const productionGeneral = totalProduction * PRODUCTION_GENERAL_FRACTION;
        const productionHeavy = totalProduction * PRODUCTION_HEAVY_FRACTION;

        // Update reserves
        const prevGeneral = state.general_supply_reserve![factionKey] ?? INIT_GENERAL_SUPPLY_RESERVE;
        const prevHeavy = state.heavy_munitions_reserve![factionKey] ?? INIT_HEAVY_MUNITIONS_RESERVE;

        state.general_supply_reserve![factionKey] = Math.max(0, Math.min(100,
            prevGeneral - maintenanceDrain + productionGeneral
        ));
        state.heavy_munitions_reserve![factionKey] = Math.max(0, Math.min(100,
            prevHeavy + productionHeavy
        ));

        entries.push({
            faction_id: fid,
            general_supply: state.general_supply_reserve![factionKey],
            heavy_munitions: state.heavy_munitions_reserve![factionKey],
            maintenance_drain: maintenanceDrain,
            production_income_general: productionGeneral,
            production_income_heavy: productionHeavy,
        });
    }

    return {
        schema: 1,
        turn: state.meta.turn,
        factions: entries,
    };
}

// ── Combat Expenditure ───────────────────────────────────────────────────────

/**
 * Deduct combat expenditure from faction reserves after a battle.
 * Called from attack_resolution_osid per battle.
 *
 * @param state - mutable GameState
 * @param factionId - attacking (or defending) faction
 * @param attackerCount - number of formations in attack
 * @param intensity - battle intensity (power ratio, typically 0.5..3.0)
 */
export function deductCombatExpenditure(
    state: GameState,
    factionId: string,
    attackerCount: number,
    intensity: number
): void {
    if (!state.general_supply_reserve || !state.heavy_munitions_reserve) return;
    const fkey = factionId as FactionId;

    const heavyDrain = attackerCount * intensity * COMBAT_HEAVY_MUNITIONS_RATE / 100;
    const generalDrain = attackerCount * intensity * COMBAT_GENERAL_SUPPLY_RATE / 100;

    state.heavy_munitions_reserve[fkey] = Math.max(0,
        (state.heavy_munitions_reserve[fkey] ?? 0) - heavyDrain
    );
    state.general_supply_reserve[fkey] = Math.max(0,
        (state.general_supply_reserve[fkey] ?? 0) - generalDrain
    );
}

// ── Effective Supply State ───────────────────────────────────────────────────

/**
 * Get effective supply state by combining OSID reachability with faction reserve level.
 * Per SUPPLY_AMMO_SYSTEM_PLAN.md §3.4 interaction table.
 *
 * @param reachabilityState - supply state from BFS reachability (adequate/strained/critical)
 * @param reserveLevel - faction reserve level [0..100]
 * @returns effective supply state
 */
export function getEffectiveSupplyState(
    reachabilityState: SupplyStateLevel,
    reserveLevel: number
): SupplyStateLevel {
    // Critical reachability always → critical regardless of reserves
    if (reachabilityState === 'critical') return 'critical';

    // Strained reachability: can't improve beyond strained even with reserves
    if (reachabilityState === 'strained') {
        return reserveLevel < RESERVE_STRAINED_THRESHOLD ? 'critical' : 'strained';
    }

    // Adequate reachability: reserves can degrade the effective state
    if (reserveLevel >= RESERVE_ADEQUATE_THRESHOLD) return 'adequate';
    if (reserveLevel >= RESERVE_STRAINED_THRESHOLD) return 'strained';
    return 'critical';
}
