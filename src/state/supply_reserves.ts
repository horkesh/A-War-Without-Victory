/**
 * Supply Reserves System (Phase A+B — SUPPLY_AMMO_SYSTEM_PLAN.md §3)
 *
 * Two faction-level reserve pools: general_supply_reserve and heavy_munitions_reserve.
 * - Maintenance: per-turn drain proportional to formation count.
 * - Combat expenditure: per-battle deduction (called from attack_resolution_osid).
 * - Production income: from controlled production facilities.
 * - Phase B: Siege drain (escalating per besieged OSID), patron aid income, embargo reduction.
 *
 * All iteration is deterministic (sorted faction IDs, sorted formation IDs).
 */

import type { GameState, FactionId } from './game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from './supply_state_derivation.js';
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
    SIEGE_BASE_RATE,
    SIEGE_ESCALATION_RATE,
    MAX_SIEGE_PRESSURE_RATE,
    SIEGE_MIN_POCKET_SIZE,
    PATRON_AID_SCALE,
    PATRON_AID_GENERAL_FRACTION,
    PATRON_AID_HEAVY_FRACTION,
    AIRDROP_ISOLATION_THRESHOLD,
    AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE,
    AIRDROP_MAX_SUPPLY_PER_TURN,
    AIRDROP_ELIGIBLE_FACTION,
    JNA_INHERITANCE_FACTION,
    JNA_INHERITANCE_HEAVY_BONUS,
} from './supply_reserve_constants.js';
import type { EnclaveResilienceEntry } from './game_state.js';

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
    siege_drain_general: number;
    siege_drain_heavy: number;
    patron_aid_general: number;
    patron_aid_heavy: number;
    embargo_factor_general: number;
    embargo_factor_heavy: number;
}

export interface SiegeTurnCounterReport {
    counters_updated: number;
    counters_reset: number;
    active_sieges: number;
}

// ── Siege Turn Counters (Phase B + pocket-size threshold) ───────────────────

/**
 * Compute connected components of critical OSIDs for a faction using BFS.
 * Returns an array of sets, each set = one connected component.
 * Deterministic: sorted iteration over OSIDs and neighbors.
 */
function computeCriticalPockets(
    criticalOsids: string[],
    adjacency: Map<string, string[]>
): Set<string>[] {
    const criticalSet = new Set(criticalOsids);
    const visited = new Set<string>();
    const components: Set<string>[] = [];

    for (const start of criticalOsids) {
        if (visited.has(start)) continue;
        const component = new Set<string>();
        const queue = [start];
        visited.add(start);
        while (queue.length > 0) {
            const node = queue.shift()!;
            component.add(node);
            const neighbors = adjacency.get(node) ?? [];
            for (const n of neighbors) {
                if (criticalSet.has(n) && !visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }
        }
        components.push(component);
    }

    return components;
}

/**
 * Update siege turn counters based on OSID supply state.
 * Critical supply → increment counter. Else → reset (delete).
 *
 * Pocket-size threshold: When adjacency data is provided, critical OSIDs in
 * connected components smaller than SIEGE_MIN_POCKET_SIZE get their counter
 * frozen at 1 (flat drain, no escalation). Genuine siege pockets (large
 * connected components) escalate normally.
 *
 * Without adjacency data: all critical OSIDs escalate (backward compat).
 *
 * Mutates state.siege_turn_counters. Deterministic (sorted iteration).
 */
export function updateSiegeTurnCounters(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null,
    adjacency?: Map<string, string[]>
): SiegeTurnCounterReport {
    const report: SiegeTurnCounterReport = { counters_updated: 0, counters_reset: 0, active_sieges: 0 };

    if (!state.siege_turn_counters) {
        state.siege_turn_counters = {};
    }
    const counters = state.siege_turn_counters;

    if (!supplyByOsid?.factions) return report;

    // Track which keys are still active this turn
    const activeKeys = new Set<string>();

    // Pre-compute small-pocket OSIDs when adjacency available
    const smallPocketOsids = new Set<string>();
    if (adjacency) {
        const sortedFactions = [...supplyByOsid.factions].sort((a, b) => a.faction_id.localeCompare(b.faction_id));
        for (const facEntry of sortedFactions) {
            if (!facEntry.by_osid) continue;
            const criticalOsids = facEntry.by_osid
                .filter(e => e.state === 'critical')
                .map(e => e.osid)
                .sort((a, b) => a.localeCompare(b));
            if (criticalOsids.length === 0) continue;

            const pockets = computeCriticalPockets(criticalOsids, adjacency);
            for (const pocket of pockets) {
                if (pocket.size < SIEGE_MIN_POCKET_SIZE) {
                    for (const osid of pocket) {
                        smallPocketOsids.add(`${facEntry.faction_id}:${osid}`);
                    }
                }
            }
        }
    }

    const sortedFactions = [...supplyByOsid.factions].sort((a, b) => a.faction_id.localeCompare(b.faction_id));
    for (const facEntry of sortedFactions) {
        if (!facEntry.by_osid) continue;
        const sortedOsids = [...facEntry.by_osid].sort((a, b) => a.osid.localeCompare(b.osid));
        for (const entry of sortedOsids) {
            const key = `${facEntry.faction_id}:${entry.osid}`;
            if (entry.state === 'critical') {
                if (smallPocketOsids.has(key)) {
                    // Small pocket: freeze counter at 1 (flat drain, no escalation)
                    counters[key] = 1;
                } else {
                    counters[key] = (counters[key] ?? 0) + 1;
                }
                activeKeys.add(key);
                report.counters_updated++;
                report.active_sieges++;
            }
        }
    }

    // Reset counters for keys no longer critical
    const allKeys = Object.keys(counters).sort((a, b) => a.localeCompare(b));
    for (const key of allKeys) {
        if (!activeKeys.has(key)) {
            delete counters[key];
            report.counters_reset++;
        }
    }

    return report;
}

// ── Core: Per-Turn Reserve Update ────────────────────────────────────────────

/** Clamp to [0, 1]. */
function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

/**
 * Update supply reserves for all factions.
 * Called once per turn from the `compute-supply-reserves` pipeline step.
 *
 * Phase A: maintenance drain + production income.
 * Phase B: + siege drain + patron aid income + embargo reduction.
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

    // Pre-compute siege drain per faction from siege_turn_counters
    const siegeDrainByFaction: Record<string, { general: number; heavy: number }> = {};
    for (const fid of factionIds) siegeDrainByFaction[fid] = { general: 0, heavy: 0 };
    if (state.siege_turn_counters) {
        const counterKeys = Object.keys(state.siege_turn_counters).sort((a, b) => a.localeCompare(b));
        for (const key of counterKeys) {
            const colonIdx = key.indexOf(':');
            if (colonIdx < 0) continue;
            const fid = key.substring(0, colonIdx);
            if (!siegeDrainByFaction[fid]) continue;
            const counter = state.siege_turn_counters[key];
            const drain = Math.min(MAX_SIEGE_PRESSURE_RATE, SIEGE_BASE_RATE * (1 + SIEGE_ESCALATION_RATE * counter));
            siegeDrainByFaction[fid].general += drain * 0.7;
            siegeDrainByFaction[fid].heavy += drain * 0.3;
        }
    }

    const entries: SupplyReservesFactionEntry[] = [];

    for (const fid of factionIds) {
        const factionKey = fid as FactionId;
        const formCount = formationCountByFaction[fid] ?? 0;
        const faction = state.factions.find((f) => f.id === fid);

        // Maintenance drain: general supply only
        const maintenanceDrain = formCount * MAINTENANCE_DRAIN_PER_FORMATION;

        // Production income: split by facility type fraction
        const totalProduction = (productionBonusByFaction[fid] ?? 0) * PRODUCTION_SCALE;
        const productionGeneral = totalProduction * PRODUCTION_GENERAL_FRACTION;
        const productionHeavy = totalProduction * PRODUCTION_HEAVY_FRACTION;

        // Phase B: Siege drain
        const siegeDrain = siegeDrainByFaction[fid] ?? { general: 0, heavy: 0 };

        // Phase B: Patron aid income
        const materialSupport = faction?.patron_state?.material_support_level ?? 0;
        const rawPatronAid = materialSupport * PATRON_AID_SCALE;
        const patronAidGeneral = rawPatronAid * PATRON_AID_GENERAL_FRACTION;
        const patronAidHeavy = rawPatronAid * PATRON_AID_HEAVY_FRACTION;

        // Phase B: Embargo reduction (multiplicative cap on income)
        const embargo = faction?.embargo_profile;
        const smuggling = embargo?.smuggling_efficiency ?? 0;
        const embargoFactorHeavy = embargo
            ? clamp01((embargo.ammunition_resupply_rate ?? 0) + smuggling * 0.3)
            : 1.0;
        const embargoFactorGeneral = embargo
            ? clamp01((embargo.external_pipeline_status ?? 0) + smuggling * 0.2)
            : 1.0;

        // Combine income channels with embargo
        const totalIncomeGeneral = (productionGeneral + patronAidGeneral) * embargoFactorGeneral;
        const totalIncomeHeavy = (productionHeavy + patronAidHeavy) * embargoFactorHeavy;

        // Update reserves
        const prevGeneral = state.general_supply_reserve![factionKey] ?? INIT_GENERAL_SUPPLY_RESERVE;
        const prevHeavy = state.heavy_munitions_reserve![factionKey] ?? INIT_HEAVY_MUNITIONS_RESERVE;

        state.general_supply_reserve![factionKey] = Math.max(0, Math.min(100,
            prevGeneral - maintenanceDrain - siegeDrain.general + totalIncomeGeneral
        ));
        state.heavy_munitions_reserve![factionKey] = Math.max(0, Math.min(100,
            prevHeavy - siegeDrain.heavy + totalIncomeHeavy
        ));

        entries.push({
            faction_id: fid,
            general_supply: state.general_supply_reserve![factionKey],
            heavy_munitions: state.heavy_munitions_reserve![factionKey],
            maintenance_drain: maintenanceDrain,
            production_income_general: productionGeneral,
            production_income_heavy: productionHeavy,
            siege_drain_general: siegeDrain.general,
            siege_drain_heavy: siegeDrain.heavy,
            patron_aid_general: patronAidGeneral,
            patron_aid_heavy: patronAidHeavy,
            embargo_factor_general: embargoFactorGeneral,
            embargo_factor_heavy: embargoFactorHeavy,
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

// ── UN Airdrops (Phase D) ─────────────────────────────────────────────────────

/**
 * Apply UN humanitarian airdrops to isolated RBiH enclaves.
 * Called once per turn after enclave resilience update.
 *
 * Historically: US C-130 drops to Srebrenica, Goražde, Žepa, Bihać (Feb 1993+).
 * Humanitarian only — general supply (food/medical), no heavy munitions.
 * Deterministic: sorted enclave key iteration, bounded by AIRDROP_MAX_SUPPLY_PER_TURN.
 */
export function applyUnAirdrops(state: GameState): void {
    if (!state.meta?.supply_reserves_enabled) return;

    const enclaveResilience = state.enclave_resilience ?? {};
    let totalDrop = 0;

    // Sorted iteration for determinism
    for (const key of Object.keys(enclaveResilience).sort((a, b) => a.localeCompare(b))) {
        const entry = enclaveResilience[key];
        if (typeof entry !== 'object' || entry === null) continue;
        const typedEntry = entry as EnclaveResilienceEntry;
        if (typedEntry.isolation_turns < AIRDROP_ISOLATION_THRESHOLD) continue;
        totalDrop += AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE;
    }

    const drop = Math.min(totalDrop, AIRDROP_MAX_SUPPLY_PER_TURN);
    if (drop <= 0) return;

    if (!state.general_supply_reserve) state.general_supply_reserve = {};
    const current = state.general_supply_reserve[AIRDROP_ELIGIBLE_FACTION] ?? 0;
    state.general_supply_reserve[AIRDROP_ELIGIBLE_FACTION] = Math.min(100, current + drop);
}

// ── JNA Inheritance Bonus (Phase E1) ─────────────────────────────────────────

/**
 * Apply JNA inheritance heavy munitions bonus to RS at scenario start.
 * Represents the ammunition warehouses inherited from the JNA in April 1992.
 * Called once from scenario_runner after ensureSupplyReserves().
 * No-op when supply_reserves_enabled is false.
 */
export function applyJnaInheritanceBonus(state: GameState): void {
    if (!state.meta?.supply_reserves_enabled) return;
    if (!state.heavy_munitions_reserve) return;
    const current = (state.heavy_munitions_reserve as Record<string, number>)[JNA_INHERITANCE_FACTION] ?? 0;
    (state.heavy_munitions_reserve as Record<string, number>)[JNA_INHERITANCE_FACTION] = Math.min(100, current + JNA_INHERITANCE_HEAVY_BONUS);
}
