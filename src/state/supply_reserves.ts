/**
 * Supply Reserves System (Phase A+B — SUPPLY_AMMO_SYSTEM_PLAN.md §3)
 *
 * Two faction-level reserve pools: general_supply_reserve and heavy_munitions_reserve.
 * - Maintenance: per-turn drain proportional to formation count.
 * - Combat expenditure: per-battle deduction (called from attack_resolution_osid).
 * - Production income: from controlled production facilities.
 * - Phase B: patron aid income, embargo reduction. (Siege drain retired 2026-11-17, §6 panel.)
 *
 * All iteration is deterministic (sorted faction IDs, sorted formation IDs).
 */

import type { EnclaveResilienceEntry, FactionId, GameState } from './game_state.js';
import { clamp01 } from '../utils/math.js';
import type { SupplyStateLevel } from './supply_state_derivation.js';
import { strictCompare } from './validateGameState.js';
import { EMBARGO_PHASE_CAPS, resolveActiveEmbargoPhase } from './embargo.js';
import {
    MAINTENANCE_DRAIN_PER_FORMATION,
    COMBAT_HEAVY_MUNITIONS_RATE,
    COMBAT_GENERAL_SUPPLY_RATE,
    PRODUCTION_SCALE,
    PRODUCTION_GENERAL_FRACTION,
    PRODUCTION_HEAVY_FRACTION,
    INIT_GENERAL_SUPPLY_RESERVE,
    INIT_HEAVY_MUNITIONS_RESERVE,
    INIT_GENERAL_SUPPLY_RESERVE_BY_FACTION,
    INIT_HEAVY_MUNITIONS_RESERVE_BY_FACTION,
    RESERVE_ADEQUATE_THRESHOLD,
    RESERVE_STRAINED_THRESHOLD,
    PATRON_AID_SCALE,
    PATRON_AID_FACTION_EFFICIENCY,
    EMBARGO_SUPPLY_CAP,
    EMBARGO_HEAVY_CAP,
    PATRON_AID_GENERAL_FRACTION,
    PATRON_AID_HEAVY_FRACTION,
    AIRDROP_ISOLATION_THRESHOLD,
    AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE,
    AIRDROP_MAX_SUPPLY_PER_TURN,
    AIRDROP_ELIGIBLE_FACTION,
    JNA_INHERITANCE_FACTION,
    JNA_INHERITANCE_HEAVY_BONUS,
    HEAVY_MAINTENANCE_PER_WEAPON,
} from './supply_reserve_constants.js';
import { ensureInternationalVisibilityPressure } from './patron_pressure.js';

// ── Init ─────────────────────────────────────────────────────────────────────

/** Ensure reserve fields exist on GameState with default values. Idempotent. */
export function ensureSupplyReserves(state: GameState): void {
    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    if (!state.military.general_supply_reserve) {
        state.military.general_supply_reserve = {};
        for (const fid of factionIds) {
            state.military.general_supply_reserve[fid] =
                INIT_GENERAL_SUPPLY_RESERVE_BY_FACTION[fid] ?? INIT_GENERAL_SUPPLY_RESERVE;
        }
    }
    if (!state.military.heavy_munitions_reserve) {
        state.military.heavy_munitions_reserve = {};
        for (const fid of factionIds) {
            state.military.heavy_munitions_reserve[fid] =
                INIT_HEAVY_MUNITIONS_RESERVE_BY_FACTION[fid] ?? INIT_HEAVY_MUNITIONS_RESERVE;
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
    heavy_maintenance_drain: number;
    production_income_general: number;
    production_income_heavy: number;
    patron_aid_general: number;
    patron_aid_heavy: number;
    embargo_factor_general: number;
    embargo_factor_heavy: number;
}

// Siege turn counters (updateSiegeTurnCounters / computeCriticalPockets) retired
// 2026-11-17 (§6 panel, Fable consult 6): siege counters are not modelled in 1.0.

// ── Invariant Assertion ──────────────────────────────────────────────────────

/** Validate supply reserve invariants. Throws on violation. */
function assertSupplyInvariant(state: GameState, label: string): void {
    for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
        const gen = state.military.general_supply_reserve?.[faction] ?? 0;
        const heavy = state.military.heavy_munitions_reserve?.[faction] ?? 0;
        if (gen < 0 || heavy < 0) {
            throw new Error(`Supply invariant violation at ${label}: ${faction} gen=${gen.toFixed(2)} heavy=${heavy.toFixed(2)}`);
        }
        if (gen > 200 || heavy > 200) {
            throw new Error(`Supply invariant violation at ${label}: ${faction} gen=${gen.toFixed(2)} heavy=${heavy.toFixed(2)} (>200 cap)`);
        }
    }
}

// ── Core: Per-Turn Reserve Update ────────────────────────────────────────────


/**
 * Update supply reserves for all factions.
 * Called once per turn from the `compute-supply-reserves` pipeline step.
 *
 * Phase A: maintenance drain + production income.
 * Phase B: + patron aid income + embargo reduction (siege drain retired 2026-11-17).
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
    assertSupplyInvariant(state, 'updateSupplyReserves:entry');

    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);

    // Count formations and heavy weapons per faction (deterministic)
    const formationCountByFaction: Record<string, number> = {};
    const heavyWeaponCountByFaction: Record<string, number> = {};
    for (const fid of factionIds) {
        formationCountByFaction[fid] = 0;
        heavyWeaponCountByFaction[fid] = 0;
    }
    for (const fmId of formationIds) {
        const fm = formations[fmId];
        if (!fm || !fm.faction) continue;
        const fid = fm.faction as string;
        formationCountByFaction[fid] = (formationCountByFaction[fid] ?? 0) + 1;
        const comp = fm.composition;
        if (comp) {
            heavyWeaponCountByFaction[fid] = (heavyWeaponCountByFaction[fid] ?? 0)
                + (comp.tanks ?? 0) + (comp.artillery ?? 0);
        }
    }

    const entries: SupplyReservesFactionEntry[] = [];
    const generalSupplyReserve = state.military.general_supply_reserve;
    const heavyMunitionsReserve = state.military.heavy_munitions_reserve;
    if (!generalSupplyReserve || !heavyMunitionsReserve) {
        throw new Error('Supply reserve state failed to initialize');
    }

    for (const fid of factionIds) {
        const factionKey: FactionId = fid;
        const formCount = formationCountByFaction[fid] ?? 0;
        const faction = state.factions.find((f) => f.id === fid);

        // Maintenance drain: general supply (per formation) + heavy munitions (per heavy weapon)
        const maintenanceDrain = formCount * MAINTENANCE_DRAIN_PER_FORMATION;
        const heavyWeaponCount = heavyWeaponCountByFaction[fid] ?? 0;
        const heavyMaintenanceDrain = heavyWeaponCount * HEAVY_MAINTENANCE_PER_WEAPON;

        // Production income: split by facility type fraction
        const totalProduction = (productionBonusByFaction[fid] ?? 0) * PRODUCTION_SCALE;
        const productionGeneral = totalProduction * PRODUCTION_GENERAL_FRACTION;
        const productionHeavy = totalProduction * PRODUCTION_HEAVY_FRACTION;

        // Phase B: Patron aid income
        const materialSupport = faction?.patron_state?.material_support_level ?? 0;
        const factionEfficiency = PATRON_AID_FACTION_EFFICIENCY[fid] ?? 1.0;

        // Arms embargo throttles RBiH patron aid through the phase-keyed H4 timeline.
        const embargoPhase = resolveActiveEmbargoPhase(state);
        const embargoCap = EMBARGO_PHASE_CAPS[embargoPhase][factionKey] ?? { general: 1.0, heavy: 1.0 };

        // Posavina corridor boosts RS supply (v0.7.0 Phase 4)
        const corridorSecured = state.military.event_flags?.corridor_secured === true;
        const corridorMult = (fid === 'RS' && corridorSecured) ? 1.3 : 1.0;

        const rawPatronAid = materialSupport * PATRON_AID_SCALE * factionEfficiency * corridorMult;
        const patronAidGeneral = rawPatronAid * PATRON_AID_GENERAL_FRACTION * embargoCap.general;
        const patronAidHeavy = rawPatronAid * PATRON_AID_HEAVY_FRACTION * embargoCap.heavy;

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
        const prevGeneral = generalSupplyReserve[factionKey] ?? INIT_GENERAL_SUPPLY_RESERVE;
        const prevHeavy = heavyMunitionsReserve[factionKey] ?? INIT_HEAVY_MUNITIONS_RESERVE;

        const reserveCap = EMBARGO_SUPPLY_CAP[fid] ?? 100;
        const generalSupply = Math.max(0, Math.min(reserveCap,
            prevGeneral - maintenanceDrain + totalIncomeGeneral
        ));
        generalSupplyReserve[factionKey] = generalSupply;
        const heavyCap = EMBARGO_HEAVY_CAP[fid] ?? 100;
        const heavyMunitions = Math.max(0, Math.min(heavyCap,
            prevHeavy - heavyMaintenanceDrain + totalIncomeHeavy
        ));
        heavyMunitionsReserve[factionKey] = heavyMunitions;

        entries.push({
            faction_id: fid,
            general_supply: generalSupply,
            heavy_munitions: heavyMunitions,
            maintenance_drain: maintenanceDrain,
            heavy_maintenance_drain: heavyMaintenanceDrain,
            production_income_general: productionGeneral,
            production_income_heavy: productionHeavy,
            patron_aid_general: patronAidGeneral,
            patron_aid_heavy: patronAidHeavy,
            embargo_factor_general: embargoFactorGeneral,
            embargo_factor_heavy: embargoFactorHeavy,
        });
    }

    assertSupplyInvariant(state, 'updateSupplyReserves:exit');

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
    if (!state.military.general_supply_reserve || !state.military.heavy_munitions_reserve) return;
    const fkey: FactionId = factionId;

    const heavyDrain = attackerCount * intensity * COMBAT_HEAVY_MUNITIONS_RATE / 100;
    const generalDrain = attackerCount * intensity * COMBAT_GENERAL_SUPPLY_RATE / 100;

    state.military.heavy_munitions_reserve[fkey] = Math.max(0,
        (state.military.heavy_munitions_reserve[fkey] ?? 0) - heavyDrain
    );
    state.military.general_supply_reserve[fkey] = Math.max(0,
        (state.military.general_supply_reserve[fkey] ?? 0) - generalDrain
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
    // Critical reachability: normally critical, but high reserves compensate partially.
    // Historically: a well-stocked faction can supply isolated brigades via convoys/depots.
    // High reserves (≥ RESERVE_ADEQUATE_THRESHOLD) upgrade critical → strained.
    // This allows RS (general=80) to attack from fragmented positions while blocking
    // RBiH (general=10) and HRHB (general=55, marginally above threshold).
    if (reachabilityState === 'critical') {
        return reserveLevel >= RESERVE_ADEQUATE_THRESHOLD ? 'strained' : 'critical';
    }

    // Strained reachability: logistics fragmentation caps effective state at strained.
    // Even high reserves can't compensate for inadequate supply routes.
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

    const enclaveResilience = state.political.enclave_resilience ?? {};
    const eligibleEnclaves: string[] = [];

    // Sorted iteration for determinism
    for (const key of Object.keys(enclaveResilience).sort(strictCompare)) {
        const entry = enclaveResilience[key];
        if (typeof entry !== 'object' || entry === null) continue;
        const typedEntry = entry as EnclaveResilienceEntry;
        if (typedEntry.isolation_turns < AIRDROP_ISOLATION_THRESHOLD) continue;
        eligibleEnclaves.push(key);
    }

    let totalDrop = eligibleEnclaves.length * AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE;
    const drop = Math.min(totalDrop, AIRDROP_MAX_SUPPLY_PER_TURN);
    if (drop <= 0) return;

    const stagedAllocations = state.military.airdrop_allocation ?? {};
    const normalizedAllocations: Record<string, number> = {};
    let allocated = 0;
    for (const enclaveId of eligibleEnclaves) {
        const requested = stagedAllocations[enclaveId];
        if (typeof requested !== 'number' || !Number.isFinite(requested) || requested <= 0) continue;
        const grant = Math.min(requested, drop - allocated);
        if (grant <= 0) break;
        normalizedAllocations[enclaveId] = grant;
        allocated += grant;
    }
    const remaining = Math.max(0, drop - allocated);
    if (remaining > 0 && eligibleEnclaves.length > 0) {
        const perEnclave = remaining / eligibleEnclaves.length;
        for (const enclaveId of eligibleEnclaves) {
            normalizedAllocations[enclaveId] = (normalizedAllocations[enclaveId] ?? 0) + perEnclave;
        }
    }
    state.military.airdrop_allocation = normalizedAllocations;

    if (!state.military.general_supply_reserve) state.military.general_supply_reserve = {};
    const current = state.military.general_supply_reserve[AIRDROP_ELIGIBLE_FACTION] ?? 0;
    state.military.general_supply_reserve[AIRDROP_ELIGIBLE_FACTION] = Math.min(100, current + drop);
}

// F1i (2026-11-16, §6 panel, unanimous): humanitarian convoys are not in 1.0. The convoy step
// (evaluateHumanitarianConvoys / applyHumanitarianConvoyDecisions / determineConvoyRouteFaction)
// never found a route on any reachable path: it ran only with supply_reserves_enabled (true only in
// scenarios a player cannot start) and on legacy settlement edges that never match an OSID. The
// optional save fields pending_convoy_decisions / convoy_decision_history stay so old saves load;
// nothing writes them.

export function applySmugglingAllocation(state: GameState): void {
    const rbih = state.factions.find((faction) => faction.id === 'RBiH');
    const budget = Math.max(0, (rbih?.embargo_profile?.smuggling_efficiency ?? 0) * 2);
    if (budget <= 0) return;
    const entries = Object.entries(state.military.smuggling_allocation ?? {})
        .filter(([, allocation]) => allocation && typeof allocation.amount === 'number' && allocation.amount > 0)
        .sort(([a], [b]) => strictCompare(a, b));
    if (entries.length === 0) return;

    const totalRequested = entries.reduce((sum, [, allocation]) => sum + allocation.amount, 0);
    const scale = totalRequested > budget ? budget / totalRequested : 1;
    const normalized: NonNullable<GameState['military']['smuggling_allocation']> = {};

    if (!state.military.heavy_munitions_reserve) state.military.heavy_munitions_reserve = {};
    const ivp = ensureInternationalVisibilityPressure(state);
    for (const [enclaveId, allocation] of entries) {
        const amount = allocation.amount * scale;
        normalized[enclaveId] = { type: allocation.type, amount };
        if (allocation.type === 'ammo') {
            state.military.heavy_munitions_reserve.RBiH = Math.min(100, (state.military.heavy_munitions_reserve.RBiH ?? 0) + amount * 0.5);
        } else {
            ivp.enclave_humanitarian_pressure = Math.max(0, ivp.enclave_humanitarian_pressure - amount * 0.2);
        }
    }
    state.military.smuggling_allocation = normalized;
}

// F1i (2026-11-16): the enclave-derived Sarajevo tunnel activation is retired. It could never fire
// (Sarajevo is never a critical-supply component), and the tunnel is event truth in
// sarajevo_lifeline.ts (isTunnelActive). The sarajevo_tunnel_operational field stays: isTunnelActive,
// the IVP Sarajevo modifier, the UI and the validator read it.

// ── JNA Inheritance Bonus (Phase E1) ─────────────────────────────────────────

/**
 * Apply JNA inheritance heavy munitions bonus to RS at scenario start.
 * Represents the ammunition warehouses inherited from the JNA in April 1992.
 * Called once from scenario_runner after ensureSupplyReserves().
 * No-op when supply_reserves_enabled is false.
 */
export function applyJnaInheritanceBonus(state: GameState): void {
    if (!state.meta?.supply_reserves_enabled) return;
    if (!state.military.heavy_munitions_reserve) return;
    const current = (state.military.heavy_munitions_reserve as Record<string, number>)[JNA_INHERITANCE_FACTION] ?? 0;
    (state.military.heavy_munitions_reserve as Record<string, number>)[JNA_INHERITANCE_FACTION] = Math.min(100, current + JNA_INHERITANCE_HEAVY_BONUS);
}
