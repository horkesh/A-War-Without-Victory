/**
 * Compute negotiation capital per faction each turn.
 *
 * Reads existing state (territory, formations, displacement, operations)
 * and updates state.military.negotiation.capital.
 *
 * Deterministic: sorted iteration, no Math.random().
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { NegotiationBreakdown, NegotiationState } from '../../state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import { initializeStrategicDimensions } from '../events/strategic_dimensions.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { ParamilitarySeverityBand } from '../combat/paramilitary_sweep.js';

import { getOsidAreas } from '../osid_areas.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

const PARAMILITARY_MINOR_PENALTY_PER_DEPLOYMENT = 2;
const PARAMILITARY_MID_PENALTY_PER_DEPLOYMENT = 4;
const PARAMILITARY_SEVERE_PENALTY_PER_DEPLOYMENT = 5;
const PARAMILITARY_SEVERE_STANDING_CLIFF = 10;

export function computeParamilitaryInternationalStandingPenalty(
    band: ParamilitarySeverityBand,
    deploymentCount: number
): number {
    const count = Math.max(0, Math.trunc(deploymentCount));
    if (count === 0) return 0;
    if (band === 'severe') return (count * PARAMILITARY_SEVERE_PENALTY_PER_DEPLOYMENT) + PARAMILITARY_SEVERE_STANDING_CLIFF;
    if (band === 'mid') return count * PARAMILITARY_MID_PENALTY_PER_DEPLOYMENT;
    return count * PARAMILITARY_MINOR_PENALTY_PER_DEPLOYMENT;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize or update negotiation state for all factions.
 * Called once per turn from war_phases pipeline.
 */
export function computeNegotiationBreakdown(state: GameState): void {
    if (!state.military.negotiation) {
        state.military.negotiation = initializeNegotiationState(state);
    }

    const neg = state.military.negotiation;

    // Initialize strategic dimensions if missing (existing saves)
    if (!neg.strategic_dimensions) {
        neg.strategic_dimensions = initializeStrategicDimensions();
    }

    for (const faction of CANONICAL_FACTIONS) {
        if (!neg.capital[faction]) {
            neg.capital[faction] = createEmptyCapital();
        }
        if (!neg.patron_relationships[faction]) {
            neg.patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }

        updateFactionCapital(state, faction, neg.capital[faction]);
        updateParamilitaryInternationalStanding(state, faction, neg);
    }
}

function initializeNegotiationState(state: GameState): NegotiationState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, import('../../state/negotiation_types.js').PatronRelationship> = {};

    for (const faction of CANONICAL_FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }

    return {
        capital,
        patron_relationships,
        peace_plan_history: [],
        strategic_dimensions: initializeStrategicDimensions(),
    };
}

function updateParamilitaryInternationalStanding(state: GameState, faction: FactionId, neg: NegotiationState): void {
    const dimension = neg.strategic_dimensions?.[faction]?.international_standing;
    if (!dimension) return;
    const finding = getLatestParamilitaryFinding(state, faction);
    const cap = neg.capital[faction];
    const warCrimes = cap?.war_crimes_events ?? 0;
    const civCas = cap?.civilian_casualties_caused ?? 0;
    const plansAccepted = cap?.peace_plans_accepted?.length ?? 0;
    const plansRejected = cap?.peace_plans_rejected?.length ?? 0;
    const warCrimePenalty = finding
        ? computeParamilitaryInternationalStandingPenalty(finding.band, finding.deploymentCount)
        : warCrimes * 10;
    const base = clamp(50 - warCrimePenalty - (civCas / 5000) + (plansAccepted * 10) - (plansRejected * 15), 0, 100);
    dimension.base_value = base;
    dimension.effective_value = clamp(dimension.base_value + dimension.event_modifier, 0, 100);
}

function getLatestParamilitaryFinding(
    state: GameState,
    faction: FactionId
): { band: ParamilitarySeverityBand; deploymentCount: number } | null {
    const entries = (state.military.cost_ledger_annotations ?? [])
        .filter((entry) => entry.faction === faction && entry.event_id === `cost_war_crimes_findings_${faction}`)
        .sort((a, b) => {
            if (a.turn !== b.turn) return b.turn - a.turn;
            return strictCompare(b.tag, a.tag);
        });
    const latest = entries[0];
    if (!latest) return null;
    const band = parseParamilitaryBand(latest.tag);
    if (!band) return null;
    return { band, deploymentCount: parseDeploymentCount(latest.text) };
}

function parseParamilitaryBand(tag: string): ParamilitarySeverityBand | null {
    if (tag === 'paramilitary_war_crimes_minor') return 'minor';
    if (tag === 'paramilitary_war_crimes_mid') return 'mid';
    if (tag === 'paramilitary_war_crimes_severe') return 'severe';
    return null;
}

function parseDeploymentCount(text?: string): number {
    const match = text?.match(/\bdeployment_count=(\d+)\b/);
    return match ? Number.parseInt(match[1]!, 10) : 0;
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

    const accepted: string[] = [];
    const rejected: string[] = [];

    for (const plan of neg.peace_plan_history) {
        const response = plan.responses[faction];
        if (response === 'accepted') accepted.push(plan.plan_id);
        else if (response === 'rejected') rejected.push(plan.plan_id);
    }

    return { accepted, rejected };
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

    const enclaveState = state.military.enclave_state;
    if (!enclaveState) return { held: KNOWN_ENCLAVES, lost: [] };

    for (const eid of KNOWN_ENCLAVES) {
        const e = enclaveState[eid];
        if (e?.fallen) {
            lost.push(eid);
        } else {
            held.push(eid);
        }
    }

    return { held, lost };
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
