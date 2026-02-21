/**
 * Recruitment engine: setup-phase brigade activation from OOB catalog.
 *
 * Replaces `createOobFormationsAtPhaseIEntry()` when recruitment_mode = "player_choice".
 * Three-resource model: manpower (militia pools), recruitment capital, equipment points.
 *
 * Bot AI: deterministic priority-ordered greedy spending algorithm with strategic area scoring.
 *
 * Design: recruitment_system_design_note.md §§3-10.
 */

import type { OobBrigade, OobCorps } from '../scenario/oob_loader.js';
import { factionHasPresenceInMun } from '../scenario/oob_phase_i_entry.js';
import { MIN_MANDATORY_SPAWN } from '../state/formation_constants.js';
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
import { getRsJnaHeavyComposition } from './phase_ii/equipment_effects.js';

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
    const munState = state.municipalities?.[munId];
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

function buildBrigadeComposition(
    equipmentClass: EquipmentClass,
    faction: FactionId,
    applyRsJnaOverride: boolean
): BrigadeComposition {
    if (
        applyRsJnaOverride &&
        faction === 'RS' &&
        (equipmentClass === 'mechanized' || equipmentClass === 'motorized')
    ) {
        return getRsJnaHeavyComposition();
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
function buildRecruitmentTags(homeMun: string, corps: string | undefined, equipClass: EquipmentClass): string[] {
    const tags = [`mun:${homeMun}`];
    if (corps) tags.push(`corps:${corps}`);
    tags.push(`equip:${equipClass}`);
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
    isMandatory: boolean
): FormationState {
    return {
        id: brigade.id as FormationId,
        faction: brigade.faction,
        name: brigade.name,
        created_turn: currentTurn,
        status: 'active',
        assignment: null,
        tags: buildRecruitmentTags(brigade.home_mun, brigade.corps, equipClass),
        kind: brigade.kind,
        personnel,
        readiness: isMandatory ? 'active' : 'forming',
        cohesion: isMandatory ? BRIGADE_BASE_COHESION + 10 : BRIGADE_BASE_COHESION,
        composition: buildBrigadeComposition(equipClass, brigade.faction, true),
        corps_id: (brigade.corps as FormationId) ?? null,
        ...(hqSid ? { hq_sid: hqSid } : {})
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
    const pc = state.political_controllers ?? {};
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
export function recruitBrigade(
    state: GameState,
    brigade: OobBrigade,
    chosenClass: EquipmentClass,
    resources: RecruitmentResourceState,
    sidToMun: Map<SettlementId, MunicipalityId>,
    municipalityHqSettlement: Record<string, string>
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

    // Manpower check
    const poolKey = militiaPoolKey(home_mun, faction);
    const pool = state.militia_pools?.[poolKey];
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
    const composition = buildBrigadeComposition(chosenClass, faction, true);
    const formation = buildRecruitedFormation(
        brigade, chosenClass, composition.infantry, state.meta.turn, hq_sid, brigade.mandatory
    );

    const action: RecruitmentAction = {
        brigade_id: id,
        faction,
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

    // Deduct manpower
    const poolKey = militiaPoolKey(action.home_mun, action.faction);
    const pool = state.militia_pools![poolKey]!;
    pool.available -= action.manpower_spent;
    pool.committed += action.manpower_spent;
    pool.updated_turn = state.meta.turn;

    // Deduct capital
    resources.recruitment_capital[action.faction]!.points -= action.capital_spent;

    // Deduct equipment
    resources.equipment_pools[action.faction]!.points -= action.equipment_spent;

    // Register formation
    if (!state.formations) state.formations = {};
    state.formations[formation.id] = formation;

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
    if (!state.formations) state.formations = {};
    if (includeCorps) {
        for (const c of oobCorps) {
            if (state.formations[c.id]) continue;
            if (!factionHasPresenceInMun(state, c.faction, c.hq_mun, sidToMun)) continue;
            const hq_sid = resolveValidHqSid(state, c.faction, c.hq_mun, municipalityHqSettlement, sidToMun);
            state.formations[c.id] = {
                id: c.id as FormationId,
                faction: c.faction,
                name: c.name,
                created_turn: currentTurn,
                status: 'active',
                assignment: null,
                tags: [`mun:${c.hq_mun}`],
                kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
                personnel: 0,
                ...(hq_sid ? { hq_sid } : {})
            };
        }
    }

    // Process factions in deterministic order
    const factions = [...new Set(oobBrigades.map(b => b.faction))].sort();

    for (const faction of factions) {
        const factionBrigades = oobBrigades.filter(b => b.faction === faction);

        // Step 1: Recruit mandatory formations first (zero cost for capital/equipment)
        const mandatoryBrigades = includeMandatory
            ? factionBrigades
                .filter(b => b.mandatory)
                .filter(b => b.available_from <= currentTurn)
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
            if (!factionHasPresenceInMun(state, faction, brigade.home_mun, sidToMun)) {
                report.brigades_skipped_no_control++;
                continue;
            }

            // Mandatory formations: zero capital cost, zero equipment cost (equipment was already there)
            const poolKey = militiaPoolKey(brigade.home_mun, faction);
            const pool = state.militia_pools?.[poolKey];
            const manpowerAvailable = pool ? pool.available : 0;
            const effectiveManpower = Math.min(brigade.manpower_cost, manpowerAvailable);

            // Mandatory historical formations use a lower threshold than emergent brigades since
            // they definitely existed — pools will reinforce them over time.
            if (effectiveManpower < MIN_MANDATORY_SPAWN) {
                report.brigades_skipped_no_manpower++;
                continue;
            }

            // Build formation directly for mandatory (bypass normal cost checks)
            const hq_sid = resolveValidHqSid(state, faction, brigade.home_mun, municipalityHqSettlement, sidToMun);
            const formation = buildRecruitedFormation(
                brigade, brigade.default_equipment_class, effectiveManpower, currentTurn, hq_sid, true
            );

            state.formations[brigade.id] = formation;
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
        const electiveBrigades = factionBrigades
            .filter(b => !b.mandatory && !resources.recruited_brigade_ids.includes(b.id))
            .filter(b => b.available_from <= currentTurn);

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
                state, brigade, chosenClass, resources, sidToMun, municipalityHqSettlement
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
    if (!state.recruitment_state) return false; // not using recruitment system
    const formations = state.formations ?? {};
    const tag = `mun:${munId}`;
    for (const f of Object.values(formations)) {
        if (!f || f.faction !== faction) continue;
        if (f.kind !== 'brigade') continue;
        if (!f.tags?.includes(tag)) continue;
        // Check if this is a recruited OOB brigade (has an ID in the recruited list)
        if (state.recruitment_state.recruited_brigade_ids.includes(f.id)) {
            return true;
        }
    }
    return false;
}
