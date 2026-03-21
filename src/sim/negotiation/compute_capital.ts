/**
 * Compute negotiation capital per faction each turn.
 *
 * Reads existing state (territory, formations, displacement, operations)
 * and updates state.military.negotiation.capital.
 *
 * Deterministic: sorted iteration, no Math.random().
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { NegotiationCapital, NegotiationState } from '../../state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

// ═══════════════════════════════════════════════════════════════════════════
// OSID area data (loaded lazily)
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { resolve } from 'path';

let osidAreaCache: { total: number; areas: Record<string, number> } | null = null;

function getOsidAreas(): { total: number; areas: Record<string, number> } {
    if (osidAreaCache) return osidAreaCache;
    try {
        const filePath = resolve(process.cwd(), 'data/derived/operational/osid_areas.json');
        const raw = JSON.parse(readFileSync(filePath, 'utf8')) as { total_area_km2: number; areas: Record<string, number> };
        osidAreaCache = { total: raw.total_area_km2, areas: raw.areas };
    } catch {
        osidAreaCache = { total: 51337, areas: {} }; // fallback: BiH total area
    }
    return osidAreaCache;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize or update negotiation state for all factions.
 * Called once per turn from war_phases pipeline.
 */
export function computeNegotiationCapital(state: GameState): void {
    if (!state.military.negotiation) {
        state.military.negotiation = initializeNegotiationState(state);
    }

    const neg = state.military.negotiation;

    for (const faction of CANONICAL_FACTIONS) {
        if (!neg.capital[faction]) {
            neg.capital[faction] = createEmptyCapital();
        }
        if (!neg.patron_relationships[faction]) {
            neg.patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }

        updateFactionCapital(state, faction, neg.capital[faction]);
    }
}

function initializeNegotiationState(state: GameState): NegotiationState {
    const capital: Record<string, NegotiationCapital> = {};
    const patron_relationships: Record<string, import('../../state/negotiation_types.js').PatronRelationship> = {};

    for (const faction of CANONICAL_FACTIONS) {
        capital[faction] = createEmptyCapital();
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }

    return {
        capital,
        patron_relationships,
        peace_plan_history: [],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-faction capital update
// ═══════════════════════════════════════════════════════════════════════════

function updateFactionCapital(state: GameState, faction: FactionId, cap: NegotiationCapital): void {
    // 1. Territory
    const territoryData = computeTerritoryData(state, faction);
    cap.territory_controlled_pct = territoryData.pct;
    cap.territory_controlled_km2 = territoryData.km2;
    cap.military_position = clamp(territoryData.pct * 1.5, 0, 100); // 66% territory = 100 military position

    // 2. Military effectiveness
    const milData = computeMilitaryData(state, faction);
    cap.military_casualties_inflicted = milData.casualties_inflicted;
    cap.military_casualties_taken = milData.casualties_taken;
    cap.operations_launched = milData.ops_launched;
    cap.operations_successful = milData.ops_successful;

    // Effectiveness: ratio of inflicted/taken, scaled. 1:1 = 50, 2:1 = 75, 3:1 = 100
    const casualtyRatio = milData.casualties_taken > 0
        ? milData.casualties_inflicted / milData.casualties_taken
        : milData.casualties_inflicted > 0 ? 3.0 : 1.0;
    cap.military_effectiveness = clamp(casualtyRatio * 33, 0, 100);

    // 3. Humanitarian standing
    const humanData = computeHumanitarianData(state, faction);
    cap.refugees_created = humanData.refugees_created;
    cap.refugees_received = humanData.refugees_received;
    cap.civilians_under_protection = humanData.civilians_under_protection;
    cap.civilian_casualties_caused = humanData.civilian_casualties_caused;

    // Humanitarian: starts at 50, decreases with refugees created / atrocities
    const humanScore = 50
        - (humanData.refugees_created / 5000) // each 5000 refugees costs 1 point
        - (humanData.war_crimes_events * 10)  // each war crime costs 10 points
        + (humanData.refugees_received / 10000); // receiving refugees gains some credit
    cap.humanitarian_standing = clamp(humanScore, 0, 100);
    cap.war_crimes_events = humanData.war_crimes_events;

    // 4. International credibility
    const credData = computeCredibilityData(state, faction);
    cap.peace_plans_accepted = credData.accepted;
    cap.peace_plans_rejected = credData.rejected;

    // Credibility: starts at 50, modified by peace plan responses
    const credScore = 50
        + (credData.accepted.length * 10)
        - (credData.rejected.length * 15)
        - (humanData.war_crimes_events * 5);
    cap.international_credibility = clamp(credScore, 0, 100);

    // 5. Political cohesion
    const cohData = computeCohesionData(state, faction);
    cap.political_cohesion = clamp(cohData.score, 0, 100);

    // 6. Enclaves
    const enclaveData = computeEnclaveData(state, faction);
    cap.enclaves_held = enclaveData.held;
    cap.enclaves_lost = enclaveData.lost;
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
    ops_launched: number;
    ops_successful: number;
} {
    const formations = state.military.formations ?? {};
    let casualties_inflicted = 0;
    let casualties_taken = 0;
    let ops_launched = 0;
    let ops_successful = 0;

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction) continue;

        const bh = f.brigade_history;
        if (bh) {
            casualties_inflicted += bh.total_casualties_inflicted ?? 0;
            casualties_taken += bh.total_casualties_taken ?? 0;
            // Operations tracked at corps level — count battles as proxy
            ops_launched += bh.battles_as_attacker ?? 0;
            ops_successful += bh.victories ?? 0;
        }
    }

    return { casualties_inflicted, casualties_taken, ops_launched, ops_successful };
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

    // Attribution: count refugees from events where THIS faction was the causer.
    // Fallback: if caused_by is absent (legacy events), attribute to current OSID controller.
    const eventLog = displacement?.displacement_event_log;
    if (eventLog) {
        const controllers = state.political?.political_controllers;
        for (const evt of eventLog) {
            const causer = evt.caused_by
                ?? (evt.origin_osid && controllers ? controllers[evt.origin_osid] : undefined);
            if (causer === faction) {
                refugees_created += (evt.displaced ?? 0) + (evt.killed ?? 0) + (evt.fled_abroad ?? 0);
            }
            // refugees_received: events where displaced people settled in faction-controlled territory
            if (evt.dest_osid && controllers && controllers[evt.dest_osid] === faction) {
                refugees_received += evt.settled ?? 0;
            }
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
        civilian_casualties_caused: 0, // TODO: derive from battle civilian casualties when available
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

function computeCohesionData(state: GameState, faction: FactionId): { score: number } {
    let score = 50; // baseline

    // Alliance management (RBiH and HRHB)
    if (faction === 'RBiH' || faction === 'HRHB') {
        const alliance = (state.military as any).rbih_hrhb_state?.alliance_value;
        if (typeof alliance === 'number') {
            // Allied = +20, strained = 0, hostile = -20
            score += alliance * 20;
        }
    }

    // Formation cohesion average
    const formations = state.military.formations ?? {};
    let cohesionSum = 0;
    let cohesionCount = 0;
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction || (f.kind ?? 'brigade') !== 'brigade') continue;
        if (typeof f.cohesion === 'number') {
            cohesionSum += f.cohesion;
            cohesionCount++;
        }
    }
    if (cohesionCount > 0) {
        const avgCohesion = cohesionSum / cohesionCount;
        // 70+ cohesion = +10, 50 = 0, 30 = -10
        score += (avgCohesion - 50) / 2;
    }

    return { score: Math.max(0, Math.min(100, score)) };
}

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

    const enclaveState = (state.military as any).enclave_state;
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
