import type { SettlementRecord } from '../map/settlements.js';
import type { OobBrigade, OobCorps } from '../scenario/oob_loader.js';
import { getEffectiveHeavyEquipmentAccess } from '../state/embargo.js';
import { MIN_MANDATORY_SPAWN } from '../state/formation_constants.js';
import type { FactionId, GameState, MunicipalityId, SettlementId } from '../state/game_state.js';
import { militiaPoolKey } from '../state/militia_pool_key.js';
import { ensureProductionFacilities } from '../state/production_facilities.js';
import type { SetupPhaseRecruitmentReport } from '../state/recruitment_types.js';
import type { LocalProductionCapacityReport } from '../state/supply_state_derivation.js';
import { strictCompare } from '../state/validateGameState.js';
import { runBotRecruitment } from './recruitment_engine.js';

export interface RecruitmentAccrualFactionDelta {
    faction_id: FactionId;
    capital_delta: number;
    equipment_delta: number;
}

export interface RecruitmentAccrualReport {
    by_faction: RecruitmentAccrualFactionDelta[];
}

const EQUIPMENT_TYPE_WEIGHT: Readonly<Record<string, number>> = {
    heavy_equipment: 4,
    small_arms: 2,
    ammunition: 1
};

/**
 * Controlled RS-only Phase II manpower accrual for pending mandatory brigades.
 * Prevents historical RS brigades from stalling permanently below mandatory spawn floor.
 */
const RS_MANDATORY_MOBILIZATION_PER_TURN = 120;

function clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function sortedFactionIds(state: GameState): FactionId[] {
    return (state.factions ?? []).map((f) => f.id).sort(strictCompare);
}

function factionById(state: GameState): Map<FactionId, NonNullable<GameState['factions']>[number]> {
    const out = new Map<FactionId, NonNullable<GameState['factions']>[number]>();
    for (const faction of state.factions ?? []) {
        out.set(faction.id, faction);
    }
    return out;
}

function municipalityControllerByMajority(
    state: GameState,
    settlements: Map<string, SettlementRecord>
): Map<MunicipalityId, FactionId | null> {
    const controllers = state.political_controllers ?? {};
    const byMunFaction = new Map<MunicipalityId, Map<FactionId, number>>();
    const sids = Array.from(settlements.keys()).sort(strictCompare);
    for (const sid of sids) {
        const rec = settlements.get(sid);
        if (!rec) continue;
        const mun = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
        if (!mun) continue;
        const controller = controllers[sid];
        if (!controller) continue;
        const counts = byMunFaction.get(mun) ?? new Map<FactionId, number>();
        counts.set(controller, (counts.get(controller) ?? 0) + 1);
        byMunFaction.set(mun, counts);
    }
    const out = new Map<MunicipalityId, FactionId | null>();
    for (const [munId, counts] of byMunFaction.entries()) {
        const ranked = Array.from(counts.entries()).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return strictCompare(a[0], b[0]);
        });
        out.set(munId, ranked.length > 0 ? ranked[0]![0] : null);
    }
    return out;
}

function capitalFromMilitiaPools(state: GameState, factionId: FactionId): number {
    const pools = state.militia_pools ?? {};
    const poolKeys = Object.keys(pools).sort(strictCompare);
    let totalMilitia = 0;
    for (const key of poolKeys) {
        const pool = pools[key];
        if (!pool || pool.faction !== factionId) continue;
        totalMilitia += Math.max(0, pool.available) + Math.max(0, pool.committed) + Math.max(0, pool.exhausted);
    }
    // 1 capital point per 5k mobilized manpower (deterministic integer conversion).
    return Math.floor(totalMilitia / 5000);
}

function displacementMultiplierByFaction(
    state: GameState,
    municipalityController: Map<MunicipalityId, FactionId | null>,
    factionId: FactionId
): number {
    const displacement = state.displacement_state ?? {};
    const munIds = Object.keys(displacement).sort(strictCompare);
    let weightedSum = 0;
    let count = 0;
    for (const munId of munIds) {
        if (municipalityController.get(munId) !== factionId) continue;
        const rec = displacement[munId];
        if (!rec || rec.original_population <= 0) continue;
        const effectivePopulation = Math.max(
            0,
            rec.original_population - rec.displaced_out - rec.lost_population + rec.displaced_in
        );
        weightedSum += clamp01(effectivePopulation / rec.original_population);
        count += 1;
    }
    if (count <= 0) return 1;
    return weightedSum / count;
}

export function accrueRecruitmentResources(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    localProduction?: LocalProductionCapacityReport
): RecruitmentAccrualReport | null {
    const resources = state.recruitment_state;
    if (!resources) return null;

    ensureProductionFacilities(state);
    const factions = sortedFactionIds(state);
    const factionsById = factionById(state);
    const facilities = state.production_facilities ?? {};
    const facilityIds = Object.keys(facilities).sort(strictCompare);
    const municipalityController = municipalityControllerByMajority(state, settlements);
    const localCapacityByMun = new Map<MunicipalityId, number>();
    for (const row of localProduction?.by_municipality ?? []) {
        localCapacityByMun.set(row.mun_id, clamp01(row.capacity));
    }

    const equipmentFromProductionByFaction = new Map<FactionId, number>();
    for (const factionId of factions) equipmentFromProductionByFaction.set(factionId, 0);

    for (const facilityId of facilityIds) {
        const facility = facilities[facilityId];
        if (!facility) continue;
        if (!facility.required_inputs.electricity || !facility.required_inputs.raw_materials || !facility.required_inputs.skilled_labor) {
            continue;
        }
        const controller = municipalityController.get(facility.municipality_id);
        if (!controller) continue;
        const typeWeight = EQUIPMENT_TYPE_WEIGHT[facility.type] ?? 1;
        const localCapacity = localCapacityByMun.get(facility.municipality_id) ?? 0;
        const faction = factionsById.get(controller);
        const embargoProfile = faction?.embargo_profile;
        const embargoMultiplier =
            facility.type === 'heavy_equipment'
                ? getEffectiveHeavyEquipmentAccess(embargoProfile)
                : clamp01(
                    ((embargoProfile?.ammunition_resupply_rate ?? 1) * 0.6) +
                    ((embargoProfile?.external_pipeline_status ?? 1) * 0.4)
                );
        const generated = facility.base_capacity * clamp01(facility.current_condition) * localCapacity * typeWeight * embargoMultiplier;
        equipmentFromProductionByFaction.set(controller, (equipmentFromProductionByFaction.get(controller) ?? 0) + generated);
    }

    const by_faction: RecruitmentAccrualFactionDelta[] = [];
    for (const factionId of factions) {
        const faction = factionsById.get(factionId);
        const authorityMult = clamp01((faction?.profile.authority ?? 50) / 100);
        const legitimacyMult = clamp01((faction?.profile.legitimacy ?? 50) / 100);
        const displacementMult = displacementMultiplierByFaction(state, municipalityController, factionId);
        const organizationalBase = capitalFromMilitiaPools(state, factionId);
        const baseCapital = resources.recruitment_capital_trickle?.[factionId] ?? 0;
        const capitalDelta = Math.max(
            0,
            baseCapital + Math.round(organizationalBase * (0.5 + authorityMult * 0.5) * (0.5 + legitimacyMult * 0.5) * displacementMult)
        );

        const baseEquipment = resources.equipment_points_trickle?.[factionId] ?? 0;
        const producedEquipment = equipmentFromProductionByFaction.get(factionId) ?? 0;
        const rawEquipmentDelta = Math.max(0, baseEquipment + Math.round(producedEquipment));

        // Embargo enforcement: equipment accrual is capped by effective heavy equipment access.
        // Per Engine Invariants §16.D: embargo is differential per faction, not binary.
        // The trickle component passes through (represents smuggling/stockpiles);
        // only production is scaled by embargo access (already done above).
        // Additionally, enforce a hard ceiling on the pool based on initial * access.
        const embargoAccess = getEffectiveHeavyEquipmentAccess(faction?.embargo_profile);
        const equipmentDelta = rawEquipmentDelta;

        if (resources.recruitment_capital[factionId]) {
            resources.recruitment_capital[factionId]!.points += capitalDelta;
        }
        if (resources.equipment_pools[factionId]) {
            const pool = resources.equipment_pools[factionId]!;
            const embargoPoolCeiling = Math.round(pool.points_initial * (1.0 + embargoAccess));
            pool.points = Math.min(embargoPoolCeiling, pool.points + equipmentDelta);
        }
        by_faction.push({
            faction_id: factionId,
            capital_delta: capitalDelta,
            equipment_delta: equipmentDelta
        });
    }

    return { by_faction };
}

export function runOngoingRecruitment(
    state: GameState,
    oobCorps: OobCorps[],
    oobBrigades: OobBrigade[],
    sidToMun: Map<SettlementId, MunicipalityId>,
    municipalityHqSettlement: Record<string, string>
): SetupPhaseRecruitmentReport | null {
    const resources = state.recruitment_state;
    if (!resources) return null;
    const maxRecruitsPerFaction = resources.max_recruits_per_faction_per_turn ?? 1;
    applyRsMandatoryMobilizationAccrual(state, oobBrigades);
    return runBotRecruitment(state, oobCorps, oobBrigades, resources, sidToMun, municipalityHqSettlement, {
        includeCorps: false,
        includeMandatory: true,
        maxMandatoryPerFaction: maxRecruitsPerFaction,
        maxElectivePerFaction: maxRecruitsPerFaction
    });
}

function applyRsMandatoryMobilizationAccrual(state: GameState, oobBrigades: OobBrigade[]): void {
    const resources = state.recruitment_state;
    const pools = state.militia_pools;
    if (!resources || !pools) return;
    const recruited = new Set(resources.recruited_brigade_ids);

    const pendingMandatoryRs = oobBrigades
        .filter(
            (brigade) =>
                brigade.faction === 'RS' &&
                brigade.mandatory &&
                brigade.available_from <= state.meta.turn &&
                !recruited.has(brigade.id)
        )
        .sort((a, b) => a.priority - b.priority || strictCompare(a.id, b.id));

    let budget = RS_MANDATORY_MOBILIZATION_PER_TURN;
    for (const brigade of pendingMandatoryRs) {
        if (budget <= 0) break;
        const key = militiaPoolKey(brigade.home_mun, 'RS');
        const pool = pools[key];
        if (!pool) continue;
        if (pool.available >= MIN_MANDATORY_SPAWN) continue;

        const needed = MIN_MANDATORY_SPAWN - pool.available;
        const transfer = Math.min(needed, budget);
        if (transfer <= 0) continue;

        pool.available += transfer;
        pool.updated_turn = state.meta.turn;
        budget -= transfer;
    }
}
