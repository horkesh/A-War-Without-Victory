import { clamp01 } from '../utils/math.js';
import {
    SARAJEVO_CITY_CORE_MUN_IDS,
    SARAJEVO_PRESSURE_MULTIPLIER
} from './enclave_integrity.js';
import type { GameState, SarajevoState, SiegeLifelineState } from './game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from './supply_state_derivation.js';
import { isSarajevoLifelineEnabled } from '../sim/combat/sarajevo_siege_params.js';
import { deriveSarajevoLifeline } from './sarajevo_lifeline.js';

const BASE_IMPORTANCE = 1.0;

function supplyStateToScore(state: SupplyStateLevel): number {
    if (state === 'adequate') return 1;
    if (state === 'strained') return 0.5;
    return 0;
}

/** Extract municipality from an OSID (format: `op:<mun>:<slug>`). */
function getMunFromOsid(osid: string): string | null {
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : null;
}

/** Get all Sarajevo OSIDs from political_controllers. */
function getSarajevoOsids(state: GameState): string[] {
    const controllers = state.political.political_controllers;
    if (!controllers) return [];
    const sarajevoMunSet = new Set(SARAJEVO_CITY_CORE_MUN_IDS as string[]);
    const osids: string[] = [];
    for (const osid of Object.keys(controllers)) {
        const mun = getMunFromOsid(osid);
        if (mun && sarajevoMunSet.has(mun)) osids.push(osid);
    }
    osids.sort((a, b) => a.localeCompare(b));
    return osids;
}

function getOsidSupplyState(
    supplyByOsid: SupplyStateByOsidReport | undefined,
    factionId: string,
    osid: string
): SupplyStateLevel | null {
    if (!supplyByOsid) return null;
    const entry = supplyByOsid.factions.find((f) => f.faction_id === factionId);
    if (!entry) return null;
    const found = entry.by_osid.find((e) => e.osid === osid);
    return found?.state ?? null;
}

function getMajorityController(state: GameState, osids: string[]): string | null {
    const counts: Record<string, number> = {};
    for (const osid of osids) {
        const controller = state.political.political_controllers?.[osid];
        const key = controller ?? '_null_';
        counts[key] = (counts[key] ?? 0) + 1;
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(counts)) {
        if (count > bestCount) {
            bestCount = count;
            best = key === '_null_' ? null : key;
        }
    }
    return best;
}

function getSarajevoDefenderController(state: GameState, osids: string[]): string | null {
    if (isSarajevoSiegeCanonicallyActive(state)) {
        for (const osid of osids) {
            if (state.political.political_controllers?.[osid] === 'RBiH') {
                return 'RBiH';
            }
        }
    }
    return getMajorityController(state, osids);
}

function isSarajevoSiegeCanonicallyActive(state: GameState): boolean {
    if (state.military.event_flags?.sarajevo_siege_active === true) return true;
    const resilience = state.political.enclave_resilience?.sarajevo;
    if (typeof resilience === 'number') return resilience > 0;
    return (resilience?.isolation_turns ?? 0) > 0 || resilience?.hardening_active === true;
}

/**
 * Shared derivation of the Sarajevo pocket OSIDs, defender controller, internal
 * supply score and banded siege status. Pure read over state + the per-turn
 * supply report. Used by both `updateSarajevoState` (the authoritative writer)
 * and `refreshSarajevoLifelineCache` (the early, lifeline-only refresh) so the
 * two paths can never drift on what "besieged" means.
 */
function deriveSarajevoSiegeContext(
    state: GameState,
    supplyByOsid: SupplyStateByOsidReport | undefined
): {
    controller: string | null;
    pocketOsids: string[];
    internalSupply: number;
    siegeStatus: SarajevoState['siege_status'];
} {
    const sarajevoOsids = getSarajevoOsids(state);
    const controller = getSarajevoDefenderController(state, sarajevoOsids);
    const pocketOsids =
        controller == null
            ? sarajevoOsids
            : sarajevoOsids.filter((osid) => state.political.political_controllers?.[osid] === controller);

    let supplyScoreSum = 0;
    let count = 0;
    if (controller) {
        for (const osid of pocketOsids) {
            const supplyState = getOsidSupplyState(supplyByOsid, controller, osid);
            if (!supplyState) continue;
            supplyScoreSum += supplyStateToScore(supplyState);
            count += 1;
        }
    }
    const internalSupply = count > 0 ? clamp01(supplyScoreSum / count) : 0;
    const siegeStatus =
        controller === 'RBiH' && isSarajevoSiegeCanonicallyActive(state)
            ? 'BESIEGED'
            : internalSupply < 0.4
                ? 'BESIEGED'
                : internalSupply < 0.8
                    ? 'PARTIAL'
                    : 'OPEN';
    return { controller, pocketOsids, internalSupply, siegeStatus };
}

/**
 * B7 STALE-CACHE FIX (#271): the authoritative `updateSarajevoState` runs LATE in
 * the war pipeline (after the bombardment/morale/supply-reserve/exhaustion
 * consumers), so those consumers would otherwise read the PREVIOUS turn's cached
 * lifeline. This refresh derives ONLY the lifeline scalar from current-turn event
 * truth + supply and writes it to `state.political.sarajevo_state.lifeline` early
 * (right after supply resolution), so consumers see a current-turn value.
 *
 * It deliberately does NOT touch siege_duration or any other sarajevo_state field
 * (which would double-increment if computed twice per turn) — the late
 * `updateSarajevoState` remains the authoritative writer and recomputes an
 * identical lifeline from the same inputs.
 *
 * FLAG-GATED: a no-op (returns undefined, writes nothing) when
 * `ENABLE_SARAJEVO_LIFELINE` is OFF, so the flag-OFF path is byte-identical.
 */
export function refreshSarajevoLifelineCache(
    state: GameState,
    supplyByOsid: SupplyStateByOsidReport | undefined
): SiegeLifelineState | undefined {
    if (!isSarajevoLifelineEnabled()) return undefined;
    const { siegeStatus } = deriveSarajevoSiegeContext(state, supplyByOsid);
    const lifeline = deriveSarajevoLifeline(state, siegeStatus === 'BESIEGED', state.meta.turn);
    // Attach to the existing cache without disturbing other fields. If no
    // sarajevo_state exists yet this turn, the late writer will create the full
    // object; we still seed a minimal carrier so early consumers read the value.
    if (state.political.sarajevo_state) {
        state.political.sarajevo_state.lifeline = lifeline;
    } else {
        state.political.sarajevo_state = {
            mun_id: 'sarajevo_cluster_1990',
            mun_ids: SARAJEVO_CITY_CORE_MUN_IDS.slice(),
            settlement_ids: [],
            siege_status: siegeStatus,
            siege_duration: 0,
            external_supply: lifeline.throughput,
            internal_supply: 0,
            siege_intensity: 0,
            international_focus: BASE_IMPORTANCE,
            humanitarian_pressure: 0,
            last_updated_turn: state.meta.turn,
            lifeline,
        };
    }
    return lifeline;
}

export function updateSarajevoState(
    state: GameState,
    supplyByOsid: SupplyStateByOsidReport | undefined
): SarajevoState {
    const { controller, pocketOsids, internalSupply, siegeStatus } =
        deriveSarajevoSiegeContext(state, supplyByOsid);
    const prev = state.political.sarajevo_state;
    const turn = state.meta.turn;

    // B7 lifeline (default-OFF). FLAG-OFF: externalSupply aliases internalSupply
    // exactly as before and `lifeline` stays undefined — byte-identical. FLAG-ON:
    // the airlift+tunnel lifeline mediates external supply (closing the
    // `externalSupply = internalSupply` fidelity bug) so the tunnel becomes a
    // CONTINUOUS relief rather than the discrete one-shot +10 supply_delta.
    let externalSupply = internalSupply;
    let lifeline: SiegeLifelineState | undefined;
    if (isSarajevoLifelineEnabled()) {
        lifeline = deriveSarajevoLifeline(state, siegeStatus === 'BESIEGED', turn);
        externalSupply = lifeline.throughput;
    }

    const siegeDuration =
        siegeStatus === 'OPEN' ? 0 : (prev?.siege_duration ?? 0) + 1;
    const siegeIntensity =
        (siegeStatus === 'BESIEGED' ? 1.0 : 0.5) *
        (siegeDuration / 20) *
        (1.0 - externalSupply);

    const humanitarianPressure = clamp01((1 - internalSupply) * SARAJEVO_PRESSURE_MULTIPLIER);
    const internationalFocus = BASE_IMPORTANCE + siegeIntensity * 10.0 + humanitarianPressure * 0.5;

    const sarajevo: SarajevoState = {
        mun_id: 'sarajevo_cluster_1990',
        mun_ids: SARAJEVO_CITY_CORE_MUN_IDS.slice(),
        settlement_ids: pocketOsids,
        siege_status: siegeStatus,
        siege_duration: siegeDuration,
        external_supply: externalSupply,
        internal_supply: internalSupply,
        siege_intensity: clamp01(siegeIntensity),
        international_focus: internationalFocus,
        humanitarian_pressure: humanitarianPressure,
        last_updated_turn: turn
    };
    // Only attach `lifeline` when derived (flag ON) so the serialized shape and
    // hash are byte-identical when the flag is OFF.
    if (lifeline) sarajevo.lifeline = lifeline;

    state.political.sarajevo_state = sarajevo;
    return sarajevo;
}
