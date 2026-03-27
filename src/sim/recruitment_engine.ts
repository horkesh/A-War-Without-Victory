/**
 * Recruitment engine: setup-phase brigade activation from OOB catalog.
 *
 * Replaces `createOobFormations()` when recruitment_mode = "player_choice".
 * Three-resource model: manpower (militia pools), recruitment capital, equipment points.
 *
 * Bot AI: deterministic priority-ordered greedy spending algorithm with strategic area scoring.
 *
 * Design: recruitment_system_design_note.md §§3-10.
 */

import { resolveLocationOsid, type CanonicalToOperationalMap } from '../data/operational_data_types.js';
import type { OobBrigade, OobCorps } from '../scenario/oob_loader.js';
import { factionHasPresenceInMun } from '../scenario/oob_early_war_entry.js';
import type { BrigadeDecoration } from '../state/decoration_types.js';
import { deriveMaxPersonnel, ENCLAVE_FORMATION_CAPACITY_THRESHOLD, ENCLAVE_MAX_PERSONNEL, ENCLAVE_MUNICIPALITY_IDS, FORMATION_CAPACITY_THRESHOLD, MIN_MANDATORY_SPAWN } from '../state/formation_constants.js';
import { BRIGADE_BASE_COHESION } from '../state/formation_lifecycle.js';
import type {
    BrigadeComposition,
    EquipmentCondition,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    MunicipalityId,
    SettlementId
} from '../state/game_state.js';
import { militiaPoolKey } from '../state/militia_pool_key.js';
import type {
    EquipmentClass,
    EquipmentPool,
    RecruitmentAction,
    RecruitmentCapital,
    RecruitmentResourceState,
    SetupPhaseRecruitmentReport
} from '../state/recruitment_types.js';
import {
    bestAffordableClass,
    DEFAULT_FACTION_RESOURCES,
    EQUIPMENT_CLASS_TEMPLATES,
    getEquipmentCost
} from '../state/recruitment_types.js';
import { getRsJnaHeavyComposition, getRsMountainComposition } from './combat/equipment_effects.js';
import { getFactionDefaultOfficerQuality } from './combat/combat_math.js';

const FIXED_HOME_OSID_TAG = 'placement:fixed_home_osid';

// ---------------------------------------------------------------------------
// Strategic area scoring for bot AI
// ---------------------------------------------------------------------------

/** Strategic priority zones by faction (recruitment_system_design_note.md §6.3). */
const STRATEGIC_PRIORITY_ZONES: Record<string, Record<string, number>> = {
    RBiH: {
        // Sarajevo municipalities
        centar_sarajevo: 50, novi_grad_sarajevo: 50, novo_sarajevo: 50, stari_grad_sarajevo: 50,
        ilidza: 40, hadzici: 35, vogosca: 35, ilijas: 30,
        // Tuzla (2nd Corps) - industrial base
        tuzla: 45, lukavac: 30, zivinice: 25, gracanica: 20,
        // Zenica/Travnik (3rd Corps) - central corridor
        zenica: 40, travnik: 35, kakanj: 25, visoko: 25,
        // Bihac (5th Corps) - isolated pocket
        bihac: 45, cazin: 35, velika_kladusa: 30, bosanska_krupa: 25,
        // Enclaves
        gorazde: 40, srebrenica: 40, zepce: 25
    },
    RS: {
        // Banja Luka (1st Krajina)
        banja_luka: 50, prijedor: 40, doboj: 35, mrkonjic_grad: 25,
        kozarska_dubica: 20, gradiska: 25, prnjavor: 20,
        // Pale/Sarajevo siege ring
        pale: 45, sokolac: 35, rogatica: 30, han_pijesak: 25,
        // Brcko corridor
        brcko: 50, derventa: 35, modrica: 30, samac: 30,
        // Drina valley
        zvornik: 40, bijeljina: 35, bratunac: 30, visegrad: 30,
        vlasenica: 25, sekovici: 20,
        // Posavina
        bosanski_brod: 30, odzak: 25
    },
    HRHB: {
        // Mostar - political center
        mostar: 50, citluk: 30, siroki_brijeg: 30,
        // Western Herzegovina / Croatia border
        livno: 40, tomislavgrad: 35, grude: 25, posusje: 25,
        // Central Bosnia Croat enclaves
        vitez: 40, busovaca: 35, kiseljak: 30, novi_travnik: 25,
        // Southern Herzegovina
        capljina: 30, stolac: 30, neum: 20, ljubuski: 25
    }
};

function strategicAreaScore(faction: FactionId, munId: string): number {
    return STRATEGIC_PRIORITY_ZONES[faction]?.[munId] ?? 0;
}

/** Rough frontline proximity heuristic based on municipality contested status. */
function frontlineProximity(state: GameState, munId: MunicipalityId): number {
    const munState = state.political.municipalities?.[munId];
    if (!munState) return 10; // default mid-range
    if (munState.control === 'fragmented') return 0;
    if (munState.control_status === 'HIGHLY_CONTESTED') return 30;
    if (munState.control_status === 'CONTESTED') return 20;
    return 5; // SECURE = rear area
}

/** Equipment class value score for bot scoring. */
function equipmentClassValue(cls: EquipmentClass): number {
    switch (cls) {
        case 'mechanized': return 20;
        case 'motorized': return 15;
        case 'mountain': return 10;
        case 'special': return 12;
        case 'garrison': return 5;
        case 'police': return 3;
        case 'light_infantry': return 0;
    }
}

// ---------------------------------------------------------------------------
// Bot AI scoring (recruitment_system_design_note.md §10)
// ---------------------------------------------------------------------------

function computeBotScore(
    brigade: OobBrigade,
    state: GameState
): number {
    const base = 100 - brigade.priority;
    const area = strategicAreaScore(brigade.faction, brigade.home_mun);
    const frontline = frontlineProximity(state, brigade.home_mun);
    const equip = equipmentClassValue(brigade.default_equipment_class);
    return base + area + frontline + equip;
}

// ---------------------------------------------------------------------------
// Formation builder helpers
// ---------------------------------------------------------------------------

function convertOobDecorationsRecruitment(b: OobBrigade): { decorations?: BrigadeDecoration[] } {
    const result: BrigadeDecoration[] = [];
    if (b.historical_decorations && b.historical_decorations.length > 0) {
        for (const hd of b.historical_decorations) {
            result.push({ tier: hd.tier, awarded_turn: 0, reason: `Historical: ${hd.name}` });
        }
    } else if (b.honor === 'slavna') {
        result.push({ tier: 'tier_1', awarded_turn: 0, reason: 'Historical: Slavna' });
    } else if (b.honor === 'viteska') {
        result.push({ tier: 'tier_2', awarded_turn: 0, reason: 'Historical: Viteška' });
    }
    return result.length > 0 ? { decorations: result } : {};
}

function buildBrigadeComposition(
    equipmentClass: EquipmentClass,
    faction: FactionId,
    applyRsJnaOverride: boolean
): BrigadeComposition {
    if (applyRsJnaOverride && faction === 'RS') {
        if (equipmentClass === 'mechanized' || equipmentClass === 'motorized') {
            return getRsJnaHeavyComposition();
        }
        if (equipmentClass === 'mountain' || equipmentClass === 'light_infantry') {
            return getRsMountainComposition();
        }
    }
    const template = EQUIPMENT_CLASS_TEMPLATES[equipmentClass];
    const fullCondition: EquipmentCondition = { operational: 1, degraded: 0, non_operational: 0 };
    return {
        infantry: template.infantry,
        tanks: template.tanks,
        artillery: template.artillery,
        aa_systems: template.aa_systems,
        tank_condition: { ...fullCondition },
        artillery_condition: { ...fullCondition }
    };
}

/** Build tags array for a recruited brigade. */
function buildRecruitmentTags(
    homeMun: string,
    corps: string | undefined,
    equipClass: EquipmentClass,
    oobTags?: string[],
    fixedHomeOsid?: string
): string[] {
    const tags = [`mun:${homeMun}`];
    if (corps) tags.push(`corps:${corps}`);
    tags.push(`equip:${equipClass}`);
    if (oobTags) tags.push(...oobTags);
    if (fixedHomeOsid) tags.push(FIXED_HOME_OSID_TAG);
    tags.sort((a, b) => a.localeCompare(b));
    return tags;
}

/** Build a FormationState for a recruited brigade. */
function buildRecruitedFormation(
    brigade: OobBrigade,
    equipClass: EquipmentClass,
    personnel: number,
    currentTurn: number,
    hqSid: string | undefined,
    isMandatory: boolean,
    locationOsid?: string
): FormationState {
    // Per-brigade OOB overrides (initial_personnel, initial_cohesion, honor, home_osid)
    const effectivePersonnel = brigade.initial_personnel ?? personnel;
    const defaultCohesion = isMandatory ? BRIGADE_BASE_COHESION + 10 : BRIGADE_BASE_COHESION;
    const effectiveCohesion = brigade.initial_cohesion ?? defaultCohesion;
    const effectiveLocationOsid = brigade.home_osid ?? locationOsid;

    return {
        id: brigade.id as FormationId,
        faction: brigade.faction,
        name: brigade.name,
        created_turn: currentTurn,
        status: 'active',
        assignment: null,
        tags: buildRecruitmentTags(brigade.home_mun, brigade.corps, equipClass, brigade.tags, brigade.home_osid),
        kind: brigade.kind,
        personnel: effectivePersonnel,
        readiness: isMandatory ? 'active' : 'forming',
        cohesion: effectiveCohesion,
        composition: buildBrigadeComposition(equipClass, brigade.faction, true),
        corps_id: (brigade.corps as FormationId) ?? null,
        origin_mun: brigade.home_mun,
        officer_quality: brigade.initial_officer_quality ?? getFactionDefaultOfficerQuality(brigade.faction, currentTurn),
        ...(brigade.honor ? { honor: brigade.honor } : {}),
        ...convertOobDecorationsRecruitment(brigade),
        ...(brigade.is_elite ? { elite_loan_state: { on_loan: false, loaned_to_corps: null, loan_start_turn: null, last_recall_turn: null, loan_start_personnel: null, permanently_degraded: false, current_episode_id: null } } : {}),
        ...(brigade.defense_terrain_bonus != null ? { defense_terrain_bonus: brigade.defense_terrain_bonus } : {}),
        ...(brigade.recruit_pool_faction ? { recruit_pool_faction: brigade.recruit_pool_faction } : {}),
        ...(brigade.fallback_osid ? { fallback_osid: brigade.fallback_osid } : {}),
        ...(brigade.displaced_from ? { displaced_from: brigade.displaced_from } : {}),
        ...(brigade.garrison ? { garrison: true } : {}),
        ...(hqSid ? { hq_sid: hqSid } : {}),
        ...(effectiveLocationOsid != null ? { location_osid: effectiveLocationOsid } : {}),
        equipment_class: equipClass,
        max_personnel: brigade.max_personnel ?? deriveMaxPersonnel(equipClass, brigade.faction),
        home_osid: brigade.home_osid ?? locationOsid
    };
}

// ---------------------------------------------------------------------------
// Initialize recruitment resources
// ---------------------------------------------------------------------------

function normalizeTrickleByFaction(
    factions: FactionId[],
    source: Record<string, number> | undefined
): Record<FactionId, number> | undefined {
    if (!source) return undefined;
    const out: Record<FactionId, number> = {};
    let anyPositive = false;
    for (const faction of factions) {
        const raw = source[faction];
        const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
        out[faction] = value;
        if (value > 0) anyPositive = true;
    }
    return anyPositive ? out : undefined;
}

/** Initialize recruitment state from scenario config. */
export function initializeRecruitmentResources(
    factions: FactionId[],
    capitalByFaction?: Record<string, number>,
    equipmentByFaction?: Record<string, number>,
    capitalTrickleByFaction?: Record<string, number>,
    equipmentTrickleByFaction?: Record<string, number>,
    maxRecruitsPerFactionPerTurn?: number
): RecruitmentResourceState {
    const recruitment_capital: Record<FactionId, RecruitmentCapital> = {};
    const equipment_pools: Record<FactionId, EquipmentPool> = {};

    for (const faction of factions) {
        const defaults = DEFAULT_FACTION_RESOURCES[faction] ?? { capital: 100, equipment: 50 };
        const cap = capitalByFaction?.[faction] ?? defaults.capital;
        const equip = equipmentByFaction?.[faction] ?? defaults.equipment;

        recruitment_capital[faction] = {
            faction,
            points: cap,
            points_initial: cap
        };
        equipment_pools[faction] = {
            faction,
            points: equip,
            points_initial: equip
        };
    }

    return {
        recruitment_capital,
        equipment_pools,
        recruitment_capital_trickle: normalizeTrickleByFaction(factions, capitalTrickleByFaction),
        equipment_points_trickle: normalizeTrickleByFaction(factions, equipmentTrickleByFaction),
        ...(typeof maxRecruitsPerFactionPerTurn === 'number' && Number.isFinite(maxRecruitsPerFactionPerTurn)
            ? { max_recruits_per_faction_per_turn: Math.max(0, Math.floor(maxRecruitsPerFactionPerTurn)) }
            : {}),
        recruited_brigade_ids: []
    };
}

// ---------------------------------------------------------------------------
// HQ settlement resolution with faction-control validation
// ---------------------------------------------------------------------------

/**
 * Resolve a valid HQ settlement for a formation in its home municipality.
 * Uses the default municipality HQ if it's faction-controlled; otherwise falls back
 * to the first (deterministic by SID sort) faction-controlled settlement in the mun.
 * Returns undefined if no faction-controlled settlement exists in the municipality.
 */
function resolveValidHqSid(
    state: GameState,
    faction: string,
    homeMun: MunicipalityId,
    municipalityHqSettlement: Record<string, string>,
    sidToMun: Map<SettlementId, MunicipalityId>
): string | undefined {
    const pc = state.political.political_controllers ?? {};
    const defaultHq = municipalityHqSettlement[homeMun];

    // If default HQ is controlled by this faction, use it
    if (defaultHq && pc[defaultHq] === faction) {
        return defaultHq;
    }

    // Fallback: find faction-controlled settlements in this municipality, pick first by SID sort
    const candidates: SettlementId[] = [];
    for (const [sid, mun] of sidToMun) {
        if (mun === homeMun && pc[sid] === faction) {
            candidates.push(sid);
        }
    }

    if (candidates.length === 0) return undefined;
    candidates.sort((a, b) => a.localeCompare(b));
    return candidates[0];
}

// ---------------------------------------------------------------------------
// Single brigade recruitment
// ---------------------------------------------------------------------------

export interface RecruitBrigadeResult {
    success: boolean;
    reason?: string;
    action?: RecruitmentAction;
    formation?: FormationState;
}

/**
 * Recruit a single brigade from the catalog. Validates all constraints,
 * deducts resources, creates FormationState. Does NOT mutate state -- caller applies.
 */

/**
 * Check if a new brigade can form via pool-gated emergent formation.
 * Conditions: (1) currentTurn >= availableFrom, (2) pool can afford it,
 * (3) all existing same-faction brigades in the municipality are at capacity.
 */
export function canFormEmergentBrigade(
    existingBrigades: Array<{ personnel: number; max_personnel?: number }>,
    pool: { available: number } | undefined,
    requiredPersonnel: number,
    currentTurn: number,
    availableFrom: number,
    capacityThreshold: number = FORMATION_CAPACITY_THRESHOLD
): boolean {
    if (currentTurn < availableFrom) return false;
    if (!pool || pool.available < requiredPersonnel) return false;
    for (const b of existingBrigades) {
        const max = b.max_personnel ?? 3000;
        if (b.personnel < max * capacityThreshold) return false;
    }
    return true;
}

/** Get all active brigades in a municipality for a given faction. */
export function getMunBrigadesForFaction(
    state: GameState, munId: string, faction: string
): Array<{ personnel: number; max_personnel?: number }> {
    const formations = state.military.formations ?? {};
    const isEnclave = ENCLAVE_MUNICIPALITY_IDS.has(munId);
    const result: Array<{ personnel: number; max_personnel?: number }> = [];
    for (const f of Object.values(formations)) {
        if (f.faction !== faction || f.status !== 'active' || f.kind !== 'brigade') continue;
        const tags = f.tags;
        if (Array.isArray(tags)) {
            for (const t of tags) {
                if (typeof t === 'string' && t.startsWith('mun:') && t.slice(4) === munId) {
                    const rawMax = f.max_personnel;
                    const effectiveMax = isEnclave ? Math.min(rawMax ?? 3000, ENCLAVE_MAX_PERSONNEL) : rawMax;
                    result.push({ personnel: f.personnel ?? 0, max_personnel: effectiveMax });
                    break;
                }
            }
        }
    }
    return result;
}

export function recruitBrigade(
    state: GameState,
    brigade: OobBrigade,
    chosenClass: EquipmentClass,
    resources: RecruitmentResourceState,
    sidToMun: Map<SettlementId, MunicipalityId>,
    municipalityHqSettlement: Record<string, string>,
    canonicalToOperational?: CanonicalToOperationalMap
): RecruitBrigadeResult {
    const { faction, home_mun, id } = brigade;

    // Already recruited?
    if (resources.recruited_brigade_ids.includes(id)) {
        return { success: false, reason: 'already_recruited' };
    }

    // Control check
    if (!factionHasPresenceInMun(state, faction, home_mun, sidToMun)) {
        return { success: false, reason: 'no_control' };
    }

    // Manpower check (use recruit_pool_faction if set, fall back to own faction pool)
    const preferredPoolFaction = brigade.recruit_pool_faction ?? faction;
    let poolFaction = preferredPoolFaction;
    let poolKey = militiaPoolKey(home_mun, poolFaction);
    let pool = state.military.militia_pools?.[poolKey];
    if ((!pool || pool.available < brigade.manpower_cost) && preferredPoolFaction !== faction) {
        poolFaction = faction;
        poolKey = militiaPoolKey(home_mun, poolFaction);
        pool = state.military.militia_pools?.[poolKey];
    }
    if (!pool || pool.available < brigade.manpower_cost) {
        return { success: false, reason: 'no_manpower' };
    }

    // Capital check
    const capitalPool = resources.recruitment_capital[faction];
    if (!capitalPool || capitalPool.points < brigade.capital_cost) {
        return { success: false, reason: 'no_capital' };
    }

    // Equipment check
    const equipCost = getEquipmentCost(chosenClass);
    const equipPool = resources.equipment_pools[faction];
    if (!equipPool || equipPool.points < equipCost) {
        return { success: false, reason: 'no_equipment' };
    }

    // All checks pass -- build formation
    const hq_sid = resolveValidHqSid(state, faction, home_mun, municipalityHqSettlement, sidToMun);
    const location_osid = canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, canonicalToOperational) : undefined;
    // Dynamic recruitment: no JNA override — newly formed brigades are militia/TDF,
    // they don't inherit JNA heavy equipment. Only initial OOB brigades get JNA kit.
    const composition = buildBrigadeComposition(chosenClass, faction, false);
    const formation = buildRecruitedFormation(
        brigade, chosenClass, composition.infantry, state.meta.turn, hq_sid, brigade.mandatory, location_osid
    );

    const action: RecruitmentAction = {
        brigade_id: id,
        faction,
        ...(poolFaction !== faction ? { pool_faction: poolFaction } : {}),
        home_mun,
        equipment_class: chosenClass,
        manpower_spent: brigade.manpower_cost,
        capital_spent: brigade.capital_cost,
        equipment_spent: equipCost,
        mandatory: brigade.mandatory
    };

    return { success: true, action, formation };
}

// ---------------------------------------------------------------------------
// Apply a recruitment result to state
// ---------------------------------------------------------------------------

export function applyRecruitment(
    state: GameState,
    result: RecruitBrigadeResult,
    resources: RecruitmentResourceState
): void {
    if (!result.success || !result.action || !result.formation) return;

    const { action, formation } = result;

    // Deduct manpower (use pool_faction for cross-faction recruitment)
    const poolKey = militiaPoolKey(action.home_mun, action.pool_faction ?? action.faction);
    const pool = state.military.militia_pools![poolKey]!;
    pool.available -= action.manpower_spent;
    pool.committed += action.manpower_spent;
    pool.updated_turn = state.meta.turn;

    // Deduct capital
    resources.recruitment_capital[action.faction]!.points -= action.capital_spent;

    // Deduct equipment
    resources.equipment_pools[action.faction]!.points -= action.equipment_spent;

    // Register formation
    if (!state.military.formations) state.military.formations = {};
    state.military.formations[formation.id] = formation;

    // Track recruited ID
    resources.recruited_brigade_ids.push(action.brigade_id);
}

// ---------------------------------------------------------------------------
// Bot AI: full setup-phase recruitment
// ---------------------------------------------------------------------------

export interface RunBotRecruitmentOptions {
    includeCorps?: boolean;
    includeMandatory?: boolean;
    maxMandatoryPerFaction?: number;
    maxElectivePerFaction?: number;
    /** When set, formations get location_osid from hq_sid via canonical_to_operational_map. */
    canonicalToOperational?: CanonicalToOperationalMap;
}

/**
 * Run bot recruitment for all factions. Deterministic greedy algorithm.
 *
 * 1. Spawn mandatory formations first (free or reduced cost).
 * 2. Score all eligible catalog entries.
 * 3. Spend greedily in score order, respecting all three resource pools.
 */
export function runBotRecruitment(
    state: GameState,
    oobCorps: OobCorps[],
    oobBrigades: OobBrigade[],
    resources: RecruitmentResourceState,
    sidToMun: Map<SettlementId, MunicipalityId>,
    municipalityHqSettlement: Record<string, string>,
    options?: RunBotRecruitmentOptions
): SetupPhaseRecruitmentReport {
    const report: SetupPhaseRecruitmentReport = {
        actions: [],
        mandatory_recruited: 0,
        elective_recruited: 0,
        brigades_skipped_no_control: 0,
        brigades_skipped_no_manpower: 0,
        brigades_skipped_no_capital: 0,
        brigades_skipped_no_equipment: 0,
        remaining_capital: {},
        remaining_equipment: {}
    };

    const currentTurn = state.meta.turn;
    const includeCorps = options?.includeCorps !== false;
    const includeMandatory = options?.includeMandatory !== false;
    const maxMandatoryPerFaction = options?.maxMandatoryPerFaction;
    const maxElectivePerFaction = options?.maxElectivePerFaction;

    // Step 0: Create corps formations (always free, same as legacy)
    if (!state.military.formations) state.military.formations = {};
    if (includeCorps) {
        for (const c of oobCorps) {
            if (state.military.formations[c.id]) continue;
            if (!factionHasPresenceInMun(state, c.faction, c.hq_mun, sidToMun)) continue;
            const hq_sid = resolveValidHqSid(state, c.faction, c.hq_mun, municipalityHqSettlement, sidToMun);
            const location_osid =
                c.hq_osid ?? (options?.canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, options.canonicalToOperational) : undefined);
            state.military.formations[c.id] = {
                id: c.id as FormationId,
                faction: c.faction,
                name: c.name,
                created_turn: currentTurn,
                status: 'active',
                assignment: null,
                tags: [`mun:${c.hq_mun}`],
                kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
                personnel: 0,
                ...(hq_sid ? { hq_sid } : {}),
                // Corps/army HQ formations are command structures, not map entities.
                // No location_osid — BFS seeding uses subordinate brigade positions.
            };
        }
    }

    // Process factions in deterministic order
    const factions = [...new Set(oobBrigades.map(b => b.faction))].sort();

    for (const faction of factions) {
        const factionBrigades = oobBrigades.filter(b => b.faction === faction);

        // Step 1: Recruit mandatory formations first (zero cost for capital/equipment)
        // Pool-gated emergent formation: turn-0 brigades spawn unconditionally;
        // later brigades require pool surplus + existing brigades at capacity.
        const pools = state.military.militia_pools as Record<string, { available: number; committed: number }> | undefined;
        const mandatoryBrigades = includeMandatory
            ? factionBrigades
                .filter(b => b.mandatory)
                .filter(b => {
                    if (b.available_from > currentTurn) return false;
                    if (b.available_from === 0) return true; // seed formation
                    if (b.recruit_pool_faction && b.recruit_pool_faction !== faction) return true; // cross-faction mandatory: force-create handles pool
                    const munBrigades = getMunBrigadesForFaction(state, b.home_mun, faction);
                    const pool = pools?.[militiaPoolKey(b.home_mun, b.recruit_pool_faction ?? faction)];
                    const threshold = ENCLAVE_MUNICIPALITY_IDS.has(b.home_mun) ? ENCLAVE_FORMATION_CAPACITY_THRESHOLD : FORMATION_CAPACITY_THRESHOLD;
                    return canFormEmergentBrigade(munBrigades, pool, b.initial_personnel ?? b.manpower_cost ?? 500, currentTurn, b.available_from, threshold);
                })
                .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
            : [];

        let mandatoryRecruitedForFaction = 0;
        for (const brigade of mandatoryBrigades) {
            if (
                typeof maxMandatoryPerFaction === 'number' &&
                maxMandatoryPerFaction >= 0 &&
                mandatoryRecruitedForFaction >= maxMandatoryPerFaction
            ) {
                break;
            }
            if (resources.recruited_brigade_ids.includes(brigade.id)) continue;
            // Elite brigades are national-level professional units — bypass municipality presence check.
            // Their home_mun may use different slug formatting than the operational layer
            // (e.g. "han_pijesak" vs "hanpijesak"), and they spawn unconditionally from a national pool.
            if (!brigade.is_elite && !factionHasPresenceInMun(state, faction, brigade.home_mun, sidToMun)) {
                report.brigades_skipped_no_control++;
                continue;
            }

            // Mandatory formations: zero capital cost, zero equipment cost (equipment was already there)
            // Elite (is_elite) brigades are national-level professional units — they draw from
            // a professional volunteer pool, not the municipality militia pool. Spawn unconditionally
            // with full initial_personnel and skip pool drain (avoids depleting local pools).
            const isElite = brigade.is_elite === true;
            let effectiveManpower: number;
            let pool: { available: number; committed: number; updated_turn: number } | undefined;
            if (isElite) {
                effectiveManpower = brigade.initial_personnel ?? brigade.manpower_cost ?? MIN_MANDATORY_SPAWN;
                pool = undefined;
            } else {
                // Cross-faction recruitment: try recruit_pool_faction first, fall back to own faction pool
                const preferredPoolFaction = brigade.recruit_pool_faction ?? faction;
                let poolFaction = preferredPoolFaction;
                let poolKey = militiaPoolKey(brigade.home_mun, poolFaction);
                pool = state.military.militia_pools?.[poolKey];
                if ((!pool || pool.available <= 0) && preferredPoolFaction !== faction) {
                    poolFaction = faction;
                    poolKey = militiaPoolKey(brigade.home_mun, poolFaction);
                    pool = state.military.militia_pools?.[poolKey];
                }
                const manpowerAvailable = pool ? pool.available : 0;
                const mandatoryDrain = brigade.initial_personnel ?? brigade.manpower_cost;
                effectiveManpower = Math.min(mandatoryDrain, manpowerAvailable);

                // Mandatory brigades represent historically existing formations.
                // If the pool doesn't exist or is empty, force-create it and seed
                // with enough manpower. These men existed — they were mobilized from
                // day one. The pool system catches up later via ongoing_mobilization.
                if (manpowerAvailable < MIN_MANDATORY_SPAWN) {
                    // Force-create pool if missing
                    if (!state.military.militia_pools) state.military.militia_pools = {};
                    const pools = state.military.militia_pools as Record<string, any>;
                    if (!pools[poolKey]) {
                        pools[poolKey] = {
                            mun_id: brigade.home_mun,
                            faction: poolFaction,
                            available: 0,
                            committed: 0,
                            exhausted: 0,
                            updated_turn: state.meta.turn,
                        };
                    }
                    pool = pools[poolKey]!;
                    // Seed with enough for this brigade
                    pool!.available += mandatoryDrain;
                    effectiveManpower = mandatoryDrain;
                }
            }

            // Build formation directly for mandatory (bypass normal cost checks)
            const hq_sid = resolveValidHqSid(state, faction, brigade.home_mun, municipalityHqSettlement, sidToMun);
            const location_osid = options?.canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, options.canonicalToOperational) : undefined;
            const formation = buildRecruitedFormation(
                brigade, brigade.default_equipment_class, effectiveManpower, currentTurn, hq_sid, true, location_osid
            );

            state.military.formations[brigade.id] = formation;
            resources.recruited_brigade_ids.push(brigade.id);

            if (pool && effectiveManpower > 0) {
                pool.available -= effectiveManpower;
                pool.committed += effectiveManpower;
                pool.updated_turn = currentTurn;
            }

            report.actions.push({
                brigade_id: brigade.id,
                faction,
                home_mun: brigade.home_mun,
                equipment_class: brigade.default_equipment_class,
                manpower_spent: effectiveManpower,
                capital_spent: 0,
                equipment_spent: 0,
                mandatory: true
            });
            report.mandatory_recruited++;
            mandatoryRecruitedForFaction++;
        }

        // Step 2: Score and recruit elective formations
        // Same pool-gated emergent formation logic as mandatory brigades.
        const electiveBrigades = factionBrigades
            .filter(b => !b.mandatory && !resources.recruited_brigade_ids.includes(b.id))
            .filter(b => {
                if (b.available_from > currentTurn) return false;
                if (b.available_from === 0) return true;
                const munBrigades = getMunBrigadesForFaction(state, b.home_mun, faction);
                const pool = pools?.[militiaPoolKey(b.home_mun, b.recruit_pool_faction ?? faction)];
                const threshold = ENCLAVE_MUNICIPALITY_IDS.has(b.home_mun) ? ENCLAVE_FORMATION_CAPACITY_THRESHOLD : FORMATION_CAPACITY_THRESHOLD;
                return canFormEmergentBrigade(munBrigades, pool, b.initial_personnel ?? b.manpower_cost ?? 500, currentTurn, b.available_from, threshold);
            });

        // Score each brigade
        const scored = electiveBrigades.map(b => ({
            brigade: b,
            score: computeBotScore(b, state)
        }));

        // Sort by score descending, then by id for determinism
        scored.sort((a, b) => {
            const s = b.score - a.score;
            if (s !== 0) return s;
            return a.brigade.id.localeCompare(b.brigade.id);
        });

        let electiveRecruitedForFaction = 0;
        // Greedy spend
        for (const { brigade } of scored) {
            if (typeof maxElectivePerFaction === 'number' && maxElectivePerFaction >= 0 && electiveRecruitedForFaction >= maxElectivePerFaction) {
                break;
            }
            if (resources.recruited_brigade_ids.includes(brigade.id)) continue;

            // Determine best affordable equipment class
            const equipPool = resources.equipment_pools[faction];
            const availEquip = equipPool?.points ?? 0;
            const chosenClass = bestAffordableClass(brigade.default_equipment_class, availEquip);

            const result = recruitBrigade(
                state, brigade, chosenClass, resources, sidToMun, municipalityHqSettlement,
                options?.canonicalToOperational
            );

            if (result.success) {
                applyRecruitment(state, result, resources);
                if (result.action) report.actions.push(result.action);
                report.elective_recruited++;
                electiveRecruitedForFaction++;
            } else {
                switch (result.reason) {
                    case 'no_control': report.brigades_skipped_no_control++; break;
                    case 'no_manpower': report.brigades_skipped_no_manpower++; break;
                    case 'no_capital': report.brigades_skipped_no_capital++; break;
                    case 'no_equipment': report.brigades_skipped_no_equipment++; break;
                }
            }
        }
    }

    // Record remaining resources
    for (const faction of factions) {
        report.remaining_capital[faction] = resources.recruitment_capital[faction]?.points ?? 0;
        report.remaining_equipment[faction] = resources.equipment_pools[faction]?.points ?? 0;
    }

    return report;
}

// ---------------------------------------------------------------------------
// Emergent militia suppression check
// ---------------------------------------------------------------------------

/**
 * Check if emergent militia formation should be suppressed for (mun, faction).
 * If a recruited OOB brigade exists in that municipality for that faction,
 * emergent spawn is suppressed -- the OOB brigade absorbs reinforcements instead.
 * (recruitment_system_design_note.md §13)
 */
export function isEmergentFormationSuppressed(
    state: GameState,
    munId: MunicipalityId,
    faction: FactionId
): boolean {
    if (!state.military.recruitment_state) return false; // not using recruitment system
    const formations = state.military.formations ?? {};
    const tag = `mun:${munId}`;
    for (const f of Object.values(formations)) {
        if (!f || f.faction !== faction) continue;
        if (f.kind !== 'brigade') continue;
        if (!f.tags?.includes(tag)) continue;
        // Check if this is a recruited OOB brigade (has an ID in the recruited list)
        if (state.military.recruitment_state.recruited_brigade_ids.includes(f.id)) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Surplus pool rerouting
// ---------------------------------------------------------------------------

/**
 * Reroute surplus pool manpower from municipalities where all OOB candidates are
 * exhausted and all brigades are at capacity, to municipalities that have waiting
 * OOB candidates but insufficient pool.
 *
 * Does NOT route from/to enclave municipalities (isolated by definition).
 * Deterministic: surplus sorted by available descending, deficit by needed ascending.
 */
export function reroutePoolSurplus(
    state: GameState,
    faction: FactionId,
    /** Unspawned OOB candidates grouped by home_mun. */
    unspawnedByMun: Record<string, { faction: string; initial_personnel: number }[]>
): { transferred: number; routes: Array<{ from: string; to: string; amount: number }> } {
    const pools = state.military.militia_pools ?? {};
    const routes: Array<{ from: string; to: string; amount: number }> = [];
    let transferred = 0;

    // 1. Classify municipalities as SURPLUS or DEFICIT
    const surplusMuns: Array<{ mun: string; poolKey: string; available: number }> = [];
    const deficitMuns: Array<{ mun: string; poolKey: string; needed: number }> = [];

    for (const [key, pool] of Object.entries(pools)) {
        if (!key.endsWith(':' + faction)) continue;
        const mun = key.slice(0, key.lastIndexOf(':'));
        if (ENCLAVE_MUNICIPALITY_IDS.has(mun)) continue; // never route from/to enclaves
        const unspawned = unspawnedByMun[mun] ?? [];

        if (unspawned.length === 0 && pool.available > 0) {
            // Check all brigades at capacity
            const brigs = getMunBrigadesForFaction(state, mun, faction);
            const capacityThreshold = ENCLAVE_MUNICIPALITY_IDS.has(mun)
                ? ENCLAVE_FORMATION_CAPACITY_THRESHOLD
                : FORMATION_CAPACITY_THRESHOLD;
            const allAtCapacity = brigs.length === 0 || brigs.every(
                b => b.personnel >= (b.max_personnel ?? 3000) * capacityThreshold
            );
            if (allAtCapacity) {
                surplusMuns.push({ mun, poolKey: key, available: pool.available });
            }
        } else if (unspawned.length > 0) {
            // Deficit: has unspawned OOB, needs manpower
            const maxNeeded = unspawned.reduce((sum, c) => sum + (c.initial_personnel ?? 500), 0);
            const deficit = Math.max(0, maxNeeded - pool.available);
            if (deficit > 0) {
                deficitMuns.push({ mun, poolKey: key, needed: deficit });
            }
        }
    }

    // Also check deficit muns that have NO pool yet — they need a pool created
    for (const [mun, candidates] of Object.entries(unspawnedByMun)) {
        if (ENCLAVE_MUNICIPALITY_IDS.has(mun)) continue;
        const poolKey = militiaPoolKey(mun, faction);
        if (pools[poolKey]) continue; // already handled above
        const maxNeeded = candidates.reduce((sum, c) => sum + (c.initial_personnel ?? 500), 0);
        if (maxNeeded > 0) {
            deficitMuns.push({ mun, poolKey, needed: maxNeeded });
        }
    }

    // Deterministic sort
    surplusMuns.sort((a, b) => b.available - a.available || a.mun.localeCompare(b.mun));
    deficitMuns.sort((a, b) => a.needed - b.needed || a.mun.localeCompare(b.mun));

    // 2. Transfer
    for (const deficit of deficitMuns) {
        if (deficit.needed <= 0) continue;
        for (const surplus of surplusMuns) {
            if (surplus.available <= 0) continue;
            const amount = Math.min(surplus.available, deficit.needed);
            if (amount <= 0) continue;

            // Execute transfer
            pools[surplus.poolKey].available -= amount;
            surplus.available -= amount;

            // Create deficit pool if it doesn't exist yet
            if (!pools[deficit.poolKey]) {
                pools[deficit.poolKey] = {
                    mun_id: deficit.mun as MunicipalityId,
                    faction,
                    available: 0,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: state.meta?.turn ?? 0,
                };
            }
            pools[deficit.poolKey].available += amount;
            deficit.needed -= amount;
            transferred += amount;
            routes.push({ from: surplus.mun, to: deficit.mun, amount });

            if (deficit.needed <= 0) break;
        }
    }

    return { transferred, routes };
}
