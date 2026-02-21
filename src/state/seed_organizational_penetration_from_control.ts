/**
 * Seed municipality organizational penetration from deterministic A/B/C inputs:
 * A = municipal controller (mayor-party proxy)
 * B = faction-aligned population share
 * C = planned war-start brigade presence (OOB, available_from <= war_start_turn)
 */

import type { SettlementRecord } from '../map/settlements.js';
import type { FactionId, GameState, MunicipalityId } from './game_state.js';
import {
    deriveOrganizationalPenetrationFromFormula
} from './organizational_penetration_formula.js';
import {
    getFactionAlignedPopulationShare,
    type MunicipalityPopulation1991Map
} from './population_share.js';
import { strictCompare } from './validateGameState.js';

const FACTION_ORDER: FactionId[] = ['RBiH', 'HRHB', 'RS'];
const FORMULA_FACTION_ORDER: FactionId[] = ['RBiH', 'RS', 'HRHB'];

export type PlannedWarStartBrigadePresenceByMunicipality = Record<string, Partial<Record<FactionId, boolean>>>;

export interface OrganizationalPenetrationSeedOptions {
    municipality_controller_by_mun?: Record<string, FactionId | null>;
    population_1991_by_mun?: MunicipalityPopulation1991Map;
    planned_war_start_brigade_by_mun?: PlannedWarStartBrigadePresenceByMunicipality;
}

function normalizeMunKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildNormalizedLookup<T>(source: Record<string, T> | undefined): Map<string, T> {
    const out = new Map<string, T>();
    if (!source) return out;
    for (const key of Object.keys(source).sort(strictCompare)) {
        const normalized = normalizeMunKey(key);
        if (!out.has(normalized)) out.set(normalized, source[key]!);
    }
    return out;
}

function getLookupValue<T>(source: Record<string, T> | undefined, normalized: Map<string, T>, munId: string): T | undefined {
    const exact = source?.[munId];
    if (exact !== undefined) return exact;
    return normalized.get(normalizeMunKey(munId));
}

/**
 * Build mun_id -> sorted list of sids. Deterministic.
 */
function buildSettlementsByMun(settlements: Map<string, SettlementRecord>): Map<MunicipalityId, string[]> {
    const byMun = new Map<MunicipalityId, string[]>();
    for (const [sid, rec] of settlements.entries()) {
        const munId = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
        const list = byMun.get(munId) ?? [];
        list.push(sid);
        byMun.set(munId, list);
    }
    for (const list of byMun.values()) {
        list.sort(strictCompare);
    }
    return byMun;
}

/**
 * Return majority political controller for a municipality, or null if no majority.
 * Tie-break: FACTION_ORDER (RBiH < HRHB < RS), then null.
 */
function getMajorityController(state: GameState, sids: string[]): FactionId | null {
    const counts: Record<string, number> = { RBiH: 0, HRHB: 0, RS: 0, _null: 0 };
    const pc = state.political_controllers ?? {};
    for (const sid of sids) {
        const c = pc[sid];
        const key = c ?? '_null';
        if (key in counts) counts[key] += 1;
        else counts._null += 1;
    }
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const key of [...FACTION_ORDER, '_null']) {
        const n = counts[key] ?? 0;
        if (n > bestCount) {
            bestCount = n;
            bestKey = key;
        }
    }
    if (bestKey === null || bestKey === '_null') return null;
    return bestKey as FactionId;
}

function buildAlignedPopulationShareByFaction(
    munId: MunicipalityId,
    controller: FactionId | null,
    populationByMun: MunicipalityPopulation1991Map | undefined
): Partial<Record<FactionId, number>> {
    const out: Partial<Record<FactionId, number>> = {};
    for (const faction of FORMULA_FACTION_ORDER) {
        const fallbackShare = controller === faction ? 1 : 0;
        out[faction] = getFactionAlignedPopulationShare(munId, faction, populationByMun, fallbackShare);
    }
    return out;
}

function buildPlannedWarStartByFaction(
    munId: MunicipalityId,
    plannedByMun: PlannedWarStartBrigadePresenceByMunicipality | undefined,
    normalizedPlannedByMun: Map<string, Partial<Record<FactionId, boolean>>>
): Partial<Record<FactionId, boolean>> {
    const raw = getLookupValue(plannedByMun, normalizedPlannedByMun, munId) ?? {};
    return {
        RBiH: raw.RBiH === true,
        RS: raw.RS === true,
        HRHB: raw.HRHB === true
    };
}

/**
 * Seed state.municipalities[].organizational_penetration deterministically for every municipality
 * in the settlement graph. Uses explicit A/B/C maps when present and falls back to settlement
 * political-controller majority when A is not provided.
 */
export function seedOrganizationalPenetrationFromControl(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    options?: OrganizationalPenetrationSeedOptions
): void {
    if (
        (!state.political_controllers || Object.keys(state.political_controllers).length === 0) &&
        !options?.municipality_controller_by_mun
    ) {
        return;
    }

    const byMun = buildSettlementsByMun(settlements);
    const munIds = [...byMun.keys()].sort(strictCompare);
    const normalizedControllers = buildNormalizedLookup(options?.municipality_controller_by_mun);
    const normalizedPlannedByMun = buildNormalizedLookup(options?.planned_war_start_brigade_by_mun);

    if (!state.municipalities) state.municipalities = {};
    for (const munId of munIds) {
        const sids = byMun.get(munId);
        if (!sids?.length) continue;

        const mappedController = getLookupValue(options?.municipality_controller_by_mun, normalizedControllers, munId);
        const controller = mappedController !== undefined ? mappedController : getMajorityController(state, sids);
        const alignedShareByFaction = buildAlignedPopulationShareByFaction(
            munId,
            controller,
            options?.population_1991_by_mun
        );
        const plannedWarStartByFaction = buildPlannedWarStartByFaction(
            munId,
            options?.planned_war_start_brigade_by_mun,
            normalizedPlannedByMun
        );
        const op = deriveOrganizationalPenetrationFromFormula({
            controller,
            aligned_population_share_by_faction: alignedShareByFaction,
            planned_war_start_brigade_by_faction: plannedWarStartByFaction
        });
        let mun = state.municipalities[munId];
        if (!mun) {
            mun = {};
            state.municipalities[munId] = mun;
        }
        mun.organizational_penetration = op;
    }
}
