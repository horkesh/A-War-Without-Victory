import { clamp01 } from '../utils/math.js';
import {
    SARAJEVO_CITY_CORE_MUN_IDS,
    SARAJEVO_PRESSURE_MULTIPLIER
} from './enclave_integrity.js';
import type { GameState, SarajevoState } from './game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from './supply_state_derivation.js';

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

export function updateSarajevoState(
    state: GameState,
    supplyByOsid: SupplyStateByOsidReport | undefined
): SarajevoState {
    const sarajevoOsids = getSarajevoOsids(state);
    const controller = getSarajevoDefenderController(state, sarajevoOsids);
    const pocketOsids =
        controller == null
            ? sarajevoOsids
            : sarajevoOsids.filter((osid) => state.political.political_controllers?.[osid] === controller);
    const prev = state.political.sarajevo_state;
    const turn = state.meta.turn;

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
    const externalSupply = internalSupply;
    const siegeStatus =
        controller === 'RBiH' && isSarajevoSiegeCanonicallyActive(state)
            ? 'BESIEGED'
            : internalSupply < 0.4
                ? 'BESIEGED'
                : internalSupply < 0.8
                    ? 'PARTIAL'
                    : 'OPEN';
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

    state.political.sarajevo_state = sarajevo;
    return sarajevo;
}
