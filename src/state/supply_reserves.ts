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

import type { EnclaveResilienceEntry, EnclaveState, FactionId, GameState, PendingConvoyDecision } from './game_state.js';
import type { EdgeRecord } from '../map/settlements.js';
import { clamp01 } from '../utils/math.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from './supply_state_derivation.js';
import { isGrazAccordsActive } from '../sim/local_truces.js';
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
    SIEGE_BASE_RATE,
    SIEGE_ESCALATION_RATE,
    MAX_SIEGE_PRESSURE_RATE,
    MAX_SIEGE_DRAIN_GENERAL_PER_FACTION,
    MAX_SIEGE_DRAIN_HEAVY_PER_FACTION,
    SIEGE_MIN_POCKET_SIZE,
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
import { ensureInternationalVisibilityPressure, ensurePatronState } from './patron_pressure.js';

// ── Init ─────────────────────────────────────────────────────────────────────

/** Ensure reserve fields exist on GameState with default values. Idempotent. */
export function ensureSupplyReserves(state: GameState): void {
    const factionIds = (state.factions ?? []).map((f) => f.id).sort((a, b) => a.localeCompare(b));
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
        let head = 0;
        while (head < queue.length) {
            const node = queue[head++]!;
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

    if (!state.military.siege_turn_counters) {
        state.military.siege_turn_counters = {};
    }
    const counters = state.military.siege_turn_counters;

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

    // When Graz Accords are active, HRHB is not under siege:
    // RS has a ceasefire with HRHB, and RBiH is an ally. Central Bosnia HRHB pockets
    // are classified as "critical" (isolated) because the BFS only traverses own territory,
    // but historically supply flowed through allied RBiH territory and RS truce zones.
    // Skip HRHB siege counters entirely under Graz — resume when truce breaks.
    const grazActive = isGrazAccordsActive(state);

    const sortedFactions = [...supplyByOsid.factions].sort((a, b) => a.faction_id.localeCompare(b.faction_id));
    for (const facEntry of sortedFactions) {
        if (!facEntry.by_osid) continue;

        // Graz Accords: HRHB is not besieged while RS truce + RBiH alliance hold
        if (grazActive && facEntry.faction_id === 'HRHB') continue;

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
    assertSupplyInvariant(state, 'updateSupplyReserves:entry');

    const factionIds = (state.factions ?? []).map((f) => f.id).sort((a, b) => a.localeCompare(b));
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort((a, b) => a.localeCompare(b));

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

    // Pre-compute siege drain per faction from siege_turn_counters
    const siegeDrainByFaction: Record<string, { general: number; heavy: number }> = {};
    for (const fid of factionIds) siegeDrainByFaction[fid] = { general: 0, heavy: 0 };
    if (state.military.siege_turn_counters) {
        const counterKeys = Object.keys(state.military.siege_turn_counters).sort((a, b) => a.localeCompare(b));
        for (const key of counterKeys) {
            const colonIdx = key.indexOf(':');
            if (colonIdx < 0) continue;
            const fid = key.substring(0, colonIdx);
            if (!siegeDrainByFaction[fid]) continue;
            const counter = state.military.siege_turn_counters[key];
            const drain = Math.min(MAX_SIEGE_PRESSURE_RATE, SIEGE_BASE_RATE * (1 + SIEGE_ESCALATION_RATE * counter));
            siegeDrainByFaction[fid].general += drain * 0.7;
            siegeDrainByFaction[fid].heavy += drain * 0.3;
        }
    }
    // Cap total siege drain per faction to prevent early-war cascade
    for (const fid of factionIds) {
        const sd = siegeDrainByFaction[fid];
        if (!sd) continue;
        sd.general = Math.min(MAX_SIEGE_DRAIN_GENERAL_PER_FACTION, sd.general);
        sd.heavy = Math.min(MAX_SIEGE_DRAIN_HEAVY_PER_FACTION, sd.heavy);
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

        // Phase B: Siege drain
        const siegeDrain = siegeDrainByFaction[fid] ?? { general: 0, heavy: 0 };

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
            prevGeneral - maintenanceDrain - siegeDrain.general + totalIncomeGeneral
        ));
        generalSupplyReserve[factionKey] = generalSupply;
        const heavyCap = EMBARGO_HEAVY_CAP[fid] ?? 100;
        const heavyMunitions = Math.max(0, Math.min(heavyCap,
            prevHeavy - heavyMaintenanceDrain - siegeDrain.heavy + totalIncomeHeavy
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
            siege_drain_general: siegeDrain.general,
            siege_drain_heavy: siegeDrain.heavy,
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
    for (const key of Object.keys(enclaveResilience).sort((a, b) => a.localeCompare(b))) {
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

function getPlayerFaction(state: GameState): FactionId | undefined {
    const rootPlayerFaction = (state as GameState & { player_faction?: FactionId }).player_faction;
    return state.meta?.player_faction ?? rootPlayerFaction ?? undefined;
}

function determineConvoyRouteFaction(enclave: EnclaveState, state: GameState, edges: EdgeRecord[]): FactionId | null {
    const enclaveSet = new Set(enclave.settlement_ids);
    const hostileCounts = new Map<FactionId, number>();
    for (const edge of edges) {
        let externalSid: string | null = null;
        if (enclaveSet.has(edge.a) && !enclaveSet.has(edge.b)) externalSid = edge.b;
        if (enclaveSet.has(edge.b) && !enclaveSet.has(edge.a)) externalSid = edge.a;
        if (!externalSid) continue;
        const controller = state.political.political_controllers?.[externalSid];
        if (!controller || controller === enclave.faction_id) continue;
        hostileCounts.set(controller, (hostileCounts.get(controller) ?? 0) + 1);
    }
    return [...hostileCounts.entries()]
        .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0]), 'en'))
        .map(([faction]) => faction)[0] ?? null;
}

export function evaluateHumanitarianConvoys(state: GameState, edges: EdgeRecord[]): PendingConvoyDecision[] {
    if (!state.meta?.supply_reserves_enabled) return [];
    const ivp = ensureInternationalVisibilityPressure(state);
    const pending = Array.isArray(state.military.pending_convoy_decisions) ? [...state.military.pending_convoy_decisions] : [];
    const pendingIds = new Set(pending.map((convoy) => convoy.id));
    const created: PendingConvoyDecision[] = [];

    for (const enclave of [...(state.political.enclaves ?? [])].sort((a, b) => a.id.localeCompare(b.id))) {
        if (enclave.siege_duration < 4 || enclave.collapsed) continue;
        const routeFaction = determineConvoyRouteFaction(enclave, state, edges);
        if (!routeFaction) continue;
        const convoyScore = enclave.siege_duration * 0.1 + enclave.humanitarian_pressure + (ivp.composite_ivp ?? 0) * 0.5;
        if (convoyScore < 1) continue;
        const convoy: PendingConvoyDecision = {
            id: `convoy:${state.meta.turn}:${enclave.id}:${routeFaction}`,
            target_enclave: enclave.id,
            route_faction: routeFaction,
            supply_amount: Math.max(0.3, Math.min(0.8, 0.3 + enclave.humanitarian_pressure * 0.5)),
        };
        if (pendingIds.has(convoy.id)) continue;
        created.push(convoy);
        pending.push(convoy);
        pendingIds.add(convoy.id);
    }

    state.military.pending_convoy_decisions = pending.sort((a, b) => a.id.localeCompare(b.id));
    return created;
}

export function applyHumanitarianConvoyDecisions(state: GameState): void {
    const pending = Array.isArray(state.military.pending_convoy_decisions) ? [...state.military.pending_convoy_decisions] : [];
    if (pending.length === 0) return;

    const ivp = ensureInternationalVisibilityPressure(state);
    if (!state.military.general_supply_reserve) state.military.general_supply_reserve = {};
    const playerFaction = getPlayerFaction(state);
    const remaining: PendingConvoyDecision[] = [];

    for (const convoy of pending.sort((a, b) => a.id.localeCompare(b.id))) {
        let decision = convoy.decision;
        if (!decision) {
            if (playerFaction && convoy.route_faction === playerFaction) {
                remaining.push(convoy);
                continue;
            }
            const composite = ivp.composite_ivp ?? 0;
            decision = composite > 0.5 ? 'allow' : composite < 0.3 ? 'block' : 'divert';
        }

        const targetFaction = state.political.enclaves?.find((enclave) => enclave.id === convoy.target_enclave)?.faction_id ?? 'RBiH';
        const ivpMult = convoy.route_faction === 'HRHB' ? 0.6 : 1.0;
        const routePatron = ensurePatronState(state, convoy.route_faction);

        if (decision === 'allow') {
            state.military.general_supply_reserve[targetFaction] = Math.min(100, (state.military.general_supply_reserve[targetFaction] ?? 0) + convoy.supply_amount);
            continue;
        }
        if (decision === 'block') {
            ivp.enclave_humanitarian_pressure = Math.min(1, ivp.enclave_humanitarian_pressure + 0.03 * ivpMult);
            routePatron.diplomatic_isolation = Math.min(1, routePatron.diplomatic_isolation + 0.05 * ivpMult);
            continue;
        }
        state.military.general_supply_reserve[targetFaction] = Math.min(100, (state.military.general_supply_reserve[targetFaction] ?? 0) + convoy.supply_amount * 0.5);
        state.military.general_supply_reserve[convoy.route_faction] = Math.min(100, (state.military.general_supply_reserve[convoy.route_faction] ?? 0) + convoy.supply_amount * 0.5);
        ivp.enclave_humanitarian_pressure = Math.min(1, ivp.enclave_humanitarian_pressure + 0.01 * ivpMult);
        routePatron.diplomatic_isolation = Math.min(1, routePatron.diplomatic_isolation + 0.02 * ivpMult);
    }

    state.military.pending_convoy_decisions = remaining;
}

export function applySmugglingAllocation(state: GameState): void {
    const rbih = state.factions.find((faction) => faction.id === 'RBiH');
    const budget = Math.max(0, (rbih?.embargo_profile?.smuggling_efficiency ?? 0) * 2);
    if (budget <= 0) return;
    const entries = Object.entries(state.military.smuggling_allocation ?? {})
        .filter(([, allocation]) => allocation && typeof allocation.amount === 'number' && allocation.amount > 0)
        .sort(([a], [b]) => a.localeCompare(b));
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

export function maybeActivateSarajevoTunnel(state: GameState): boolean {
    if (state.military.sarajevo_tunnel_operational) return false;
    if ((state.meta?.turn ?? 0) < 60) return false;
    const sarajevoEnclave = (state.political.enclaves ?? []).find((enclave) =>
        enclave.faction_id === 'RBiH' &&
        enclave.settlement_ids.some((sid) => state.political.sarajevo_state?.settlement_ids?.includes(sid))
    );
    const sarajevoResilience = state.political.enclave_resilience?.sarajevo;
    const sarajevoIsolation = typeof sarajevoResilience === 'object' && sarajevoResilience
        ? (sarajevoResilience as EnclaveResilienceEntry).isolation_turns
        : 0;
    if (!sarajevoEnclave || sarajevoEnclave.siege_duration < 20 || sarajevoIsolation < 20) return false;
    state.military.sarajevo_tunnel_operational = true;
    if (!state.military.general_supply_reserve) state.military.general_supply_reserve = {};
    state.military.general_supply_reserve.RBiH = Math.min(100, (state.military.general_supply_reserve.RBiH ?? 0) + 0.5);
    return true;
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
    if (!state.military.heavy_munitions_reserve) return;
    const current = (state.military.heavy_munitions_reserve as Record<string, number>)[JNA_INHERITANCE_FACTION] ?? 0;
    (state.military.heavy_munitions_reserve as Record<string, number>)[JNA_INHERITANCE_FACTION] = Math.min(100, current + JNA_INHERITANCE_HEAVY_BONUS);
}
