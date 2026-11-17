/**
 * Compute negotiation capital per faction each turn.
 *
 * Reads existing state (territory, formations, displacement, operations)
 * and updates state.military.negotiation.capital.
 *
 * Deterministic: sorted iteration, no Math.random().
 */

import { CANONICAL_FACTIONS, type GameState, type FactionId } from '../../state/game_state.js';
import type { NegotiationBreakdown } from '../../state/negotiation_types.js';
import { initializeNegotiationState } from './initialize_negotiation_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { derivePeacePlanResponseLists } from '../events/strategic_dimensions.js';

import { getOsidAreas } from '../osid_areas.js';

// §6 E3a1 D2: the paramilitary-finding penalty moved into the single international_standing
// base writer (computeDimensionBaseValues → computeInternationalStandingBase). Re-exported here
// so existing importers keep one definition.
export { computeParamilitaryInternationalStandingPenalty } from '../events/strategic_dimensions.js';

// ═══════════════════════════════════════════════════════════════════════════
// Main computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize or update negotiation state for all factions.
 * Called once per turn from war_phases pipeline.
 *
 * Rebuilds the raw capital record only. It writes no strategic-dimension base_value:
 * computeDimensionBaseValues is the one owner of every base (§6 E3a1 D2).
 */
export function computeNegotiationBreakdown(state: GameState): void {
    const neg = initializeNegotiationState(state);
    for (const faction of CANONICAL_FACTIONS) {
        updateFactionCapital(state, faction, neg.capital[faction]);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-faction capital update
// ═══════════════════════════════════════════════════════════════════════════

function updateFactionCapital(state: GameState, faction: FactionId, cap: NegotiationBreakdown): void {
    // 1. Territory (raw data)
    const territoryData = computeTerritoryData(state, faction);
    cap.territory_controlled_pct = territoryData.pct;
    cap.territory_controlled_km2 = territoryData.km2;

    // 2. Military data (raw)
    const milData = computeMilitaryData(state, faction);
    cap.military_casualties_inflicted = milData.casualties_inflicted;
    cap.military_casualties_taken = milData.casualties_taken;
    cap.operations_launched = milData.operations_launched;
    cap.operations_successful = milData.operations_successful;

    // 3. Humanitarian data (raw)
    const humanData = computeHumanitarianData(state, faction);
    cap.refugees_created = humanData.refugees_created;
    cap.refugees_received = humanData.refugees_received;
    cap.civilians_under_protection = humanData.civilians_under_protection;
    cap.civilian_casualties_caused = humanData.civilian_casualties_caused;
    cap.war_crimes_events = humanData.war_crimes_events;

    // 4. Credibility data (raw)
    const credData = computeCredibilityData(state, faction);
    cap.peace_plans_accepted = credData.accepted;
    cap.peace_plans_rejected = credData.rejected;

    // 5. Enclaves (raw)
    const enclaveData = computeEnclaveData(state, faction);
    cap.enclaves_held = enclaveData.held;
    cap.enclaves_lost = enclaveData.lost;

    // NOTE: Scoring dimensions (military_position, humanitarian_standing, etc.)
    // are now derived via computeDimensionBaseValues() in strategic_dimensions.ts
}

// ═══════════════════════════════════════════════════════════════════════════
// Data extraction helpers
// ═══════════════════════════════════════════════════════════════════════════

function computeTerritoryData(state: GameState, faction: FactionId): { pct: number; km2: number } {
    const controllers = state.political?.political_controllers;
    if (!controllers) return { pct: 0, km2: 0 };

    const osidAreas = getOsidAreas();
    let factionKm2 = 0;

    for (const osid of Object.keys(controllers).sort(strictCompare)) {
        if (controllers[osid] === faction) {
            factionKm2 += osidAreas.areas[osid] ?? 0;
        }
    }

    const pct = osidAreas.total > 0 ? (factionKm2 / osidAreas.total) * 100 : 0;
    return { pct, km2: factionKm2 };
}

function computeMilitaryData(state: GameState, faction: FactionId): {
    casualties_inflicted: number;
    casualties_taken: number;
    operations_launched: number;
    operations_successful: number;
} {
    const formations = state.military.formations ?? {};
    let casualties_inflicted = 0;
    let casualties_taken = 0;

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction) continue;

        const bh = f.brigade_history;
        if (bh) {
            casualties_inflicted += bh.total_casualties_inflicted ?? 0;
            casualties_taken += bh.total_casualties_taken ?? 0;
        }
    }

    const factionOperations = (state.operation_history ?? []).filter((aar) => aar.faction === faction);
    const operations_launched = factionOperations.length;
    const operations_successful = factionOperations.filter((aar) => aar.outcome === 'success').length;

    return { casualties_inflicted, casualties_taken, operations_launched, operations_successful };
}

function computeHumanitarianData(state: GameState, faction: FactionId): {
    refugees_created: number;
    refugees_received: number;
    civilians_under_protection: number;
    civilian_casualties_caused: number;
    war_crimes_events: number;
} {
    const displacement = state.displacement;
    let refugees_created = 0;
    let refugees_received = 0;
    let civilians_under_protection = 0;
    let civilian_casualties_caused = 0;

    // LANE D-CONTENT (Path A): read from bounded humanitarian aggregates instead
    // of full-history scan over displacement_event_log. Aggregates are written at
    // append-time via appendDisplacementEvent (see src/state/displacement_event_log.ts)
    // with capture-time controller attribution. Semantically more correct than the
    // legacy read-time fallback (refugees attributed to the faction controlling
    // the origin/dest OSID at the moment displacement happened, NOT whoever holds
    // it later in the run when this consumer scans).
    //
    // The faction-keyed outer bucket sums refugees_created + civilian_casualties_caused
    // (when this faction was the causer) AND refugees_received (when this faction
    // controlled dest_osid at append time) across all ethnicities.
    const humAgg = displacement?.displacement_humanitarian_aggregates;
    if (humAgg && humAgg[faction]) {
        for (const eth of Object.keys(humAgg[faction]!).sort(strictCompare)) {
            const slot = humAgg[faction]![eth]!;
            refugees_created += slot.refugees_created ?? 0;
            refugees_received += slot.refugees_received ?? 0;
            civilian_casualties_caused += slot.civilian_casualties_caused ?? 0;
        }
    }

    // Civilians under protection: sum population of faction-controlled municipalities
    if (displacement?.displacement_state) {
        const ds = displacement.displacement_state as Record<string, { original_population?: number; displaced_out?: number; displaced_in?: number; lost_population?: number }>;
        const controllers = state.political?.political_controllers;
        for (const munId of Object.keys(ds).sort(strictCompare)) {
            const mun = ds[munId];
            if (!mun) continue;
            if (controllers) {
                const munOsids = Object.keys(controllers).filter(o => o.includes(munId));
                const factionControls = munOsids.some(o => controllers[o] === faction);
                if (factionControls) {
                    const pop = (mun.original_population ?? 0) - (mun.displaced_out ?? 0) - (mun.lost_population ?? 0) + (mun.displaced_in ?? 0);
                    civilians_under_protection += Math.max(0, pop);
                }
            }
        }
    }

    // War crimes: count from negotiation history (accumulated by events system)
    const warCrimes = state.military.negotiation?.capital[faction]?.war_crimes_events ?? 0;

    return {
        refugees_created,
        refugees_received,
        civilians_under_protection,
        civilian_casualties_caused,
        war_crimes_events: warCrimes,
    };
}

function computeCredibilityData(state: GameState, faction: FactionId): {
    accepted: string[];
    rejected: string[];
} {
    const neg = state.military.negotiation;
    if (!neg) return { accepted: [], rejected: [] };

    // peace_plan_history is the single source of these lists (§6 E3a1 D3); resolvePeacePlan
    // no longer pushes into them.
    return derivePeacePlanResponseLists(neg.peace_plan_history, faction);
}

// computeCohesionData removed — cohesion now derived via internal_cohesion in strategic_dimensions.ts

function computeEnclaveData(state: GameState, faction: FactionId): {
    held: string[];
    lost: string[];
} {
    // Known enclaves for tracking — RBiH and HRHB both have besieged pockets
    const FACTION_ENCLAVES: Record<string, string[]> = {
        RBiH: ['sarajevo', 'srebrenica', 'zepa', 'gorazde', 'bihac'],
        HRHB: ['kiseljak', 'lasva_valley', 'zepce'],
    };
    const KNOWN_ENCLAVES = FACTION_ENCLAVES[faction];
    const held: string[] = [];
    const lost: string[] = [];

    if (!KNOWN_ENCLAVES) return { held: [], lost: [] };

    // RD run review (2026-11-07): `military.enclave_state` has no writer, so every enclave
    // used to read as held even after Srebrenica and Žepa fell. An enclave is lost when its
    // capital OSID is held by another faction (or when a legacy enclave_state says fallen).
    const enclaveState = state.military.enclave_state;
    const controllers = state.political?.political_controllers ?? {};
    for (const eid of KNOWN_ENCLAVES) {
        const capital = ENCLAVE_CAPITAL_OSID[eid];
        const holder = capital ? controllers[capital] : undefined;
        const fallenByControl = typeof holder === 'string' && holder !== faction;
        if (enclaveState?.[eid]?.fallen || fallenByControl) {
            lost.push(eid);
        } else {
            held.push(eid);
        }
    }

    return { held, lost };
}

/** Capital OSID of each tracked enclave (enclave_resilience.ts ENCLAVE_DEFINITIONS; Bihać town for the pocket). */
const ENCLAVE_CAPITAL_OSID: Readonly<Record<string, string>> = {
    sarajevo: 'op:centar_sarajevo:centar_sarajevo',
    srebrenica: 'op:srebrenica:srebrenica_2',
    zepa: 'op:rogatica:zepa_2',
    gorazde: 'op:gorazde:gorazde_2',
    bihac: 'op:bihac:bihac_2',
    kiseljak: 'op:kiseljak:kiseljak_2',
    lasva_valley: 'op:vitez:vitez_2',
    zepce: 'op:zepce:zepce_2',
};

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
