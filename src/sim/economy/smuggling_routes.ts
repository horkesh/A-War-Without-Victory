/**
 * Smuggling Routes — v0.4.3 Economy & War Production
 *
 * Each faction has 3 smuggling routes with distinct availability windows,
 * capacity growth, and disruption risk. Routes generate per-turn supply
 * income that feeds into the supply reserves system.
 *
 * Deterministic: uses deterministicRandom for disruption rolls.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { deterministicRandom } from '../../state/deterministic_random.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SmugglingRouteDef {
    id: string;
    name: string;
    faction: FactionId;
    /** Week from which this route becomes available. */
    available_from_week: number;
    /** Maximum capacity [0–100]. */
    max_capacity: number;
    /** General supply income per turn at full capacity. */
    base_income_general: number;
    /** Heavy munitions income per turn at full capacity. */
    base_income_heavy: number;
}

export interface SmugglingRouteState {
    id: string;
    /** Current capacity [0–100]. */
    capacity: number;
    /** Whether the route is currently disrupted this turn. */
    disrupted: boolean;
    /** Cumulative turns the route has been active. */
    active_turns: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Per-turn capacity growth when a route is active and not disrupted. */
export const SMUGGLING_CAPACITY_GROWTH = 2.0;

/** Base disruption probability per turn [0–1]. */
export const SMUGGLING_DISRUPTION_CHANCE = 0.08;

/** Capacity lost when disrupted. */
export const SMUGGLING_DISRUPTION_CAPACITY_LOSS = 10;

// ── Route Definitions ────────────────────────────────────────────────────────

export const SMUGGLING_ROUTE_DEFS: readonly SmugglingRouteDef[] = [
    // RBiH routes
    {
        id: 'rbih_sarajevo_tunnel',
        name: 'Sarajevo Tunnel',
        faction: 'RBiH',
        available_from_week: 60,
        max_capacity: 80,
        base_income_general: 0.4,
        base_income_heavy: 0.1,
    },
    {
        id: 'rbih_adriatic_coast',
        name: 'Adriatic Coast',
        faction: 'RBiH',
        available_from_week: 0,
        max_capacity: 60,
        base_income_general: 0.3,
        base_income_heavy: 0.05,
    },
    {
        id: 'rbih_dinaric_spine',
        name: 'Dinaric Spine',
        faction: 'RBiH',
        available_from_week: 20,
        max_capacity: 50,
        base_income_general: 0.2,
        base_income_heavy: 0.05,
    },
    // RS routes
    {
        id: 'rs_belgrade_pipeline',
        name: 'Belgrade Pipeline',
        faction: 'RS',
        available_from_week: 0,
        max_capacity: 100,
        base_income_general: 0.5,
        base_income_heavy: 0.3,
    },
    {
        id: 'rs_corridor',
        name: 'Posavina Corridor',
        faction: 'RS',
        available_from_week: 14,
        max_capacity: 70,
        base_income_general: 0.3,
        base_income_heavy: 0.15,
    },
    {
        id: 'rs_montenegro',
        name: 'Montenegro Route',
        faction: 'RS',
        available_from_week: 0,
        max_capacity: 60,
        base_income_general: 0.2,
        base_income_heavy: 0.1,
    },
    // HRHB routes
    {
        id: 'hrhb_croatian_supply',
        name: 'Croatian Supply Line',
        faction: 'HRHB',
        available_from_week: 0,
        max_capacity: 90,
        base_income_general: 0.4,
        base_income_heavy: 0.2,
    },
    {
        id: 'hrhb_adriatic',
        name: 'Adriatic Port',
        faction: 'HRHB',
        available_from_week: 0,
        max_capacity: 70,
        base_income_general: 0.3,
        base_income_heavy: 0.1,
    },
    {
        id: 'hrhb_herzegovina',
        name: 'Herzegovina Network',
        faction: 'HRHB',
        available_from_week: 0,
        max_capacity: 50,
        base_income_general: 0.2,
        base_income_heavy: 0.05,
    },
].sort((a, b) => a.id.localeCompare(b.id));

// ── Initialization ───────────────────────────────────────────────────────────

/** Ensure smuggling route state exists. Idempotent. */
export function ensureSmugglingRoutes(state: GameState): void {
    if (state.military.smuggling_routes && state.military.smuggling_routes.length > 0) return;
    state.military.smuggling_routes = SMUGGLING_ROUTE_DEFS.map(def => ({
        id: def.id,
        capacity: 0,
        disrupted: false,
        active_turns: 0,
    }));
}

// ── Per-Turn Update ──────────────────────────────────────────────────────────

export interface SmugglingUpdateReport {
    routes_active: number;
    routes_disrupted: number;
    total_income_general: number;
    total_income_heavy: number;
}

/**
 * Update smuggling routes: grow capacity, check disruption, compute income.
 * Deterministic via deterministicRandom seeded on turn + route id.
 */
export function updateSmugglingRoutes(state: GameState, turn: number): SmugglingUpdateReport {
    ensureSmugglingRoutes(state);
    const routes = state.military.smuggling_routes!;
    const report: SmugglingUpdateReport = {
        routes_active: 0,
        routes_disrupted: 0,
        total_income_general: 0,
        total_income_heavy: 0,
    };

    // Build def lookup
    const defById = new Map<string, SmugglingRouteDef>();
    for (const def of SMUGGLING_ROUTE_DEFS) defById.set(def.id, def);

    // Sort for deterministic iteration
    const sortedRoutes = [...routes].sort((a, b) => a.id.localeCompare(b.id));

    for (const routeState of sortedRoutes) {
        const def = defById.get(routeState.id);
        if (!def) continue;

        // Check availability
        if (turn < def.available_from_week) {
            routeState.disrupted = false;
            routeState.capacity = 0;
            continue;
        }

        // RBiH Adriatic Coast requires alliance with HRHB (alliance_value > 0)
        if (def.id === 'rbih_adriatic_coast') {
            const allianceValueRaw = state.political.rbih_hrhb_state && 'alliance_value' in state.political.rbih_hrhb_state
                ? state.political.rbih_hrhb_state.alliance_value
                : undefined;
            const allianceValue = typeof allianceValueRaw === 'number'
                ? allianceValueRaw
                : 0;
            if (allianceValue <= 0) {
                routeState.disrupted = true;
                routeState.capacity = Math.max(0, routeState.capacity - SMUGGLING_DISRUPTION_CAPACITY_LOSS);
                report.routes_disrupted++;
                continue;
            }
        }

        // Disruption check (deterministic)
        const seed = `${turn}`;
        const roll = deterministicRandom(seed, `smuggling:disruption:${routeState.id}`);
        if (roll < SMUGGLING_DISRUPTION_CHANCE) {
            routeState.disrupted = true;
            routeState.capacity = Math.max(0, routeState.capacity - SMUGGLING_DISRUPTION_CAPACITY_LOSS);
            report.routes_disrupted++;
            continue;
        }

        // Not disrupted: grow capacity
        routeState.disrupted = false;
        routeState.capacity = Math.min(def.max_capacity, routeState.capacity + SMUGGLING_CAPACITY_GROWTH);
        routeState.active_turns++;
        report.routes_active++;
    }

    // Write back sorted routes
    state.military.smuggling_routes = sortedRoutes;

    return report;
}

// ── Income Computation ───────────────────────────────────────────────────────

export interface SmugglingIncomeByFaction {
    general: Record<string, number>;
    heavy: Record<string, number>;
}

/**
 * Compute per-faction smuggling income from active routes.
 * Income scales linearly with capacity / max_capacity.
 */
export function getSmugglingIncome(state: GameState): SmugglingIncomeByFaction {
    const result: SmugglingIncomeByFaction = {
        general: {},
        heavy: {},
    };

    const routes = state.military.smuggling_routes ?? [];
    const defById = new Map<string, SmugglingRouteDef>();
    for (const def of SMUGGLING_ROUTE_DEFS) defById.set(def.id, def);

    for (const routeState of [...routes].sort((a, b) => a.id.localeCompare(b.id))) {
        if (routeState.disrupted || routeState.capacity <= 0) continue;
        const def = defById.get(routeState.id);
        if (!def) continue;

        const ratio = routeState.capacity / def.max_capacity;
        const general = def.base_income_general * ratio;
        const heavy = def.base_income_heavy * ratio;

        result.general[def.faction] = (result.general[def.faction] ?? 0) + general;
        result.heavy[def.faction] = (result.heavy[def.faction] ?? 0) + heavy;
    }

    return result;
}
