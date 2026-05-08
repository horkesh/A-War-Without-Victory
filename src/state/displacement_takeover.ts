import type { SettlementRecord } from '../map/settlements.js';
import type { DisplacementRoutingRecord } from './displacement.js';
import {
    DISPLACEMENT_KILLED_FRACTION,
    getDisplacementKillFraction,
    getFactionFleeAbroadFraction
} from './displacement_loss_constants.js';
import {
    POSAVINA_MUN_IDS,
    getDisplacementRouteForMun,
    getReceivingCapacityFraction
} from './displacement_routing_data.js';
import { appendDisplacementEvent } from './displacement_event_log.js';
import { factionHasBrigadeInMunicipality, getMunicipalityIdFromRecord, getOrInitDisplacementState, recordCivilianDisplacementCasualties } from './displacement_state_utils.js';
import type {
    DisplacementCampState,
    DisplacementState,
    FactionId,
    GameState,
    HostileTakeoverTimerState,
    MunicipalityId
} from './game_state.js';
import { LARGE_URBAN_MUN_IDS } from './large_urban_mun_data.js';
import { militiaPoolKey } from './militia_pool_key.js';
import type { MunicipalityPopulation1991Map } from './population_share.js';
import { strictCompare } from './validateGameState.js';

const TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4;
const CAMP_REROUTE_DELAY_TURNS = 4;

/** Sustained displacement: fraction of remaining minority displaced per OSID per turn after initial fire. */
const SUSTAINED_DISPLACEMENT_RATE = 0.03;
/** Stop sustained displacement when remaining minority in OSID falls below this threshold. */
const SUSTAINED_MIN_REMAINING = 10;
/** Fraction of minority displaced in the initial maturation wave. The rest trickles via sustained mode.
 *  Historically ~70% of minorities fled in the first weeks after takeover; 30% remained under duress. */
const INITIAL_DISPLACEMENT_FRACTION = 0.70;

/** HRHB-controlled OSIDs: 100% of Serbs expelled — no front gating (historic mass exodus). */
const HRHB_SERB_EXPULSION_FRACTION = 1.00;
/** RBiH-controlled front-adjacent OSIDs: 50% of Serbs displaced. */
const RBIH_SERB_DISPLACEMENT_FRACTION = 0.50;
/** RBiH-controlled Sarajevo urban OSIDs: only 10% displaced (gradual departure, no mass exodus). */
const SARAJEVO_SERB_DISPLACEMENT_FRACTION = 0.10;

/** Sarajevo urban municipalities: Serb displacement is historically lower. */
const SARAJEVO_URBAN_MUN_IDS = new Set<MunicipalityId>([
    'centar_sarajevo', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo',
    'ilidza', 'vogosca', 'hadzici',
]);

/** Posavina Croats: most flee to Croatia (canon: displacement redesign 2026-02-17). */
const POSAVINA_CROAT_FLEE_ABROAD = 0.70;

/**
 * Border-adjacent municipalities where displaced Bosniaks flee abroad (Croatia, Germany, Austria, Sweden).
 * Historically, Bosniaks near international borders had realistic escape routes.
 * Interior populations (Sarajevo, Central Bosnia, Drina enclaves) displaced internally.
 */
/** Krajina Bosniaks: ~35% fled via organized ICRC/UNHCR convoys to Croatia (Karlovac transit camp).
 * This was the PRIMARY escape mechanism for Prijedor, Sanski Most, Bosanski Novi.
 * Convoys ran after international pressure forced camp closures (Aug 1992). */
const KRAJINA_BOSNIAK_CONVOY_MUN_IDS = new Set<MunicipalityId>([
    'prijedor', 'sanski_most', 'bosanski_novi',
    'bosanska_dubica', 'bosanska_kostajnica', 'bosanska_gradiska',
    'banja_luka', 'celinac', 'laktasi', 'prnjavor',
]);
const KRAJINA_BOSNIAK_FLEE_ABROAD = 0.35;

const BOSNIAK_BORDER_ADJACENT_MUN_IDS = new Set<MunicipalityId>([
    // Krajina — near Croatian border (non-convoy municipalities)
    'kljuc', 'kotor_varos', 'skender_vakuf', 'mrkonjic_grad', 'sipovo',
    'bosanski_petrovac', 'titov_drvar', 'bosansko_grahovo', 'glamoc',
    'srbac',
    // Posavina — near Croatia/Serbia border
    'brcko', 'bosanski_samac', 'odzak', 'orasje',
    'derventa', 'modrica', 'bosanski_brod', 'bijeljina',
    'lopare', 'ugljevik',
    // Herzegovina — near Croatian border
    'mostar', 'capljina', 'stolac', 'jablanica', 'konjic',
    'trebinje', 'bileca', 'nevesinje', 'ljubinje', 'gacko',
    // Bihać pocket — near Croatian border
    'bihac', 'cazin', 'velika_kladusa', 'bosanska_krupa',
]);
const BOSNIAK_BORDER_FLEE_ABROAD = 0.10;

// Enclave-overrun special case (historical high-lethality second displacement).
export const ENCLAVE_OVERRUN_KILL_FRACTION = 0.35;

const REINFORCEMENT_RATE = 0.02;
/** Besieged enclaves: refugees arrive starving, unarmed, traumatized — far lower militarization rate. */
const ENCLAVE_REINFORCEMENT_RATE = 0.005;
const DISPLACED_CONTRIBUTION_CAP = 300;
const RBIH_HRHB_ALLIED_THRESHOLD = 0.20;

const ENCLAVE_MUN_IDS = new Set<MunicipalityId>(['srebrenica', 'gorazde', 'zepa']);

const FALLBACK_ROUTES_BY_FACTION: Record<string, MunicipalityId[]> = {
    RBiH: [
        'tuzla',
        'zenica',
        'travnik',
        'gorazde',
        'srebrenica',
        'centar_sarajevo',
        'novi_grad_sarajevo',
        'novo_sarajevo',
        'bihac'
    ],
    RS: ['banja_luka', 'bijeljina', 'doboj', 'prijedor', 'zvornik', 'brcko'],
    HRHB: ['mostar', 'livno', 'travnik', 'brcko']
};

/**
 * Seed a displacement timer for an OSID that changed control outside of battle resolution.
 * Called from: rear pocket consolidation, paramilitary sweep, null-OSID auto-claim, JNA phantom captures.
 *
 * Seeds timers for ALL hostile factions (e.g. RS capturing a mixed Bosniak/Croat OSID seeds both
 * RBiH and HRHB timers). Idempotent — skips if timer already exists for a given OSID+faction pair.
 *
 * Must be called AFTER political_controllers has been updated for the OSID.
 */
export function seedDisplacementTimerOnFlip(
    state: GameState,
    osid: string,
    fromFaction: FactionId,
    toFaction: FactionId,
): void {
    if (state.meta.phase !== 'war') return;
    if (!fromFaction || !toFaction || fromFaction === toFaction) return;

    if (!state.displacement.hostile_takeover_timers) state.displacement.hostile_takeover_timers = {};
    const timerMap = state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>;

    const parts = osid.split(':');
    const munId = parts.length >= 2 ? parts[1] as MunicipalityId : undefined;
    if (!munId) return;

    const currentTurn = state.meta.turn;
    const allFactions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
    for (const displaced of allFactions) {
        if (displaced === toFaction) continue;
        const timerKey = `${osid}|${displaced}`;
        if (timerMap[timerKey]) continue;
        timerMap[timerKey] = {
            mun_id: munId,
            from_faction: displaced,
            to_faction: toFaction,
            started_turn: currentTurn,
        };
    }
}

export interface TakeoverBattleRecord {
    settlement_flipped: boolean;
    location: string;
    osid?: string;
    attacker_faction: FactionId;
    defender_faction: FactionId;
}

export interface BattleResolutionLike {
    battles: TakeoverBattleRecord[];
}

export interface TakeoverDisplacementReport {
    timers_started: number;
    timers_matured: number;
    camps_created: number;
    camps_routed: number;
    displaced_total: number;
    killed_total: number;
    fled_abroad_total: number;
    routed_total: number;
    sustained_fires: number;
    sustained_displaced_total: number;
    source_municipalities: MunicipalityId[];
    routing: DisplacementRoutingRecord[];
}

function isRbihHrhbPair(a: FactionId, b: FactionId): boolean {
    return (a === 'RBiH' && b === 'HRHB') || (a === 'HRHB' && b === 'RBiH');
}

function areFactionsAtWar(state: GameState, a: FactionId, b: FactionId): boolean {
    if (!a || !b || a === b) return false;
    if (!isRbihHrhbPair(a, b)) return true;
    const currentTurn = state.meta.turn;
    const earliestTurn =
        typeof state.meta.rbih_hrhb_war_earliest_turn === 'number'
            ? state.meta.rbih_hrhb_war_earliest_turn
            : Number.MAX_SAFE_INTEGER;
    if (currentTurn < earliestTurn) return false;
    const alliance = typeof state.political.war_alliance_rbih_hrhb === 'number' ? state.political.war_alliance_rbih_hrhb : 0;
    return alliance <= RBIH_HRHB_ALLIED_THRESHOLD;
}

function getFleeAbroadFraction(sourceMun: MunicipalityId, fromFaction: FactionId): number {
    if (fromFaction === 'HRHB' && POSAVINA_MUN_IDS.has(sourceMun)) return POSAVINA_CROAT_FLEE_ABROAD;
    if (fromFaction === 'RBiH' && KRAJINA_BOSNIAK_CONVOY_MUN_IDS.has(sourceMun)) return KRAJINA_BOSNIAK_FLEE_ABROAD;
    if (fromFaction === 'RBiH' && BOSNIAK_BORDER_ADJACENT_MUN_IDS.has(sourceMun)) return BOSNIAK_BORDER_FLEE_ABROAD;
    return getFactionFleeAbroadFraction(fromFaction);
}

function getPopulationTotal(entry: { total: number; bosniak: number; serb: number; croat: number; other: number }): number {
    return Math.max(0, entry.total);
}

function getFactionAlignedPopulation(entry: { total: number; bosniak: number; serb: number; croat: number; other: number }, faction: FactionId): number {
    if (faction === 'RBiH') return Math.max(0, entry.bosniak + entry.other);
    if (faction === 'RS') return Math.max(0, entry.serb);
    if (faction === 'HRHB') return Math.max(0, entry.croat);
    return 0;
}

/** Get actual population for an OSID from settlement census data. */
function getOsidCensusPopulation(rec: SettlementRecord | undefined): number {
    const pop = rec?.properties?.population_total;
    return typeof pop === 'number' && Number.isFinite(pop) && (pop as number) > 0 ? (pop as number) : 0;
}

/** Get per-OSID hostile share from census data. Returns null if data unavailable. */
function getOsidCensusHostileShare(rec: SettlementRecord | undefined, fromFaction: FactionId): number | null {
    const total = getOsidCensusPopulation(rec);
    if (total <= 0) return null;
    const props = rec!.properties!;
    const b = typeof props.population_bosniaks === 'number' ? (props.population_bosniaks as number) : 0;
    const s = typeof props.population_serbs === 'number' ? (props.population_serbs as number) : 0;
    const c = typeof props.population_croats === 'number' ? (props.population_croats as number) : 0;
    const o = typeof props.population_others === 'number' ? (props.population_others as number) : 0;
    // Match getFactionAlignedPopulation logic: RBiH = bosniak + other
    let factionPop: number;
    if (fromFaction === 'RBiH') factionPop = b + o;
    else if (fromFaction === 'RS') factionPop = s;
    else if (fromFaction === 'HRHB') factionPop = c;
    else return null;
    const share = factionPop / total;
    return Number.isFinite(share) ? Math.max(0, Math.min(1, share)) : null;
}

function getDynamicHostileShare(
    munId: MunicipalityId,
    fromFaction: FactionId,
    dispState: DisplacementState,
    population1991ByMun?: MunicipalityPopulation1991Map
): number {
    const fallback = 1;
    if (!population1991ByMun) return fallback;
    const entry = population1991ByMun[munId];
    if (!entry) return fallback;
    const baseTotal = getPopulationTotal(entry);
    if (baseTotal <= 0) return fallback;
    const baseFaction = getFactionAlignedPopulation(entry, fromFaction);
    const incomingByFaction = dispState.displaced_in_by_faction ?? {};
    const incomingTotal = Object.values(incomingByFaction)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
        .reduce((sum, v) => sum + v, 0);
    const incomingFaction = incomingByFaction[fromFaction] ?? 0;
    const adjustedTotal = Math.max(1, baseTotal + incomingTotal);
    const adjustedFaction = Math.max(0, baseFaction + incomingFaction);
    const share = adjustedFaction / adjustedTotal;
    if (!Number.isFinite(share)) return fallback;
    return Math.max(0, Math.min(1, share));
}

function isEnclaveOverrun(munId: MunicipalityId, fromFaction: FactionId, toFaction: FactionId): boolean {
    if (!ENCLAVE_MUN_IDS.has(munId)) return false;
    return fromFaction === 'RBiH' && toFaction !== 'RBiH';
}

function buildFriendlyMunicipalitiesByFaction(
    state: GameState,
    _settlements: Map<string, SettlementRecord>
): Record<FactionId, Set<MunicipalityId>> {
    const out: Record<FactionId, Set<MunicipalityId>> = {
        RBiH: new Set<MunicipalityId>(),
        RS: new Set<MunicipalityId>(),
        HRHB: new Set<MunicipalityId>()
    };
    // OSID-level political_controllers: extract municipality from OSID "op:mun:slug"
    const pc = state.political.political_controllers;
    if (pc && typeof pc === 'object') {
        const osids = Object.keys(pc).sort(strictCompare);
        for (const osid of osids) {
            const controller = pc[osid] as string | undefined;
            if (!controller || !out[controller as FactionId]) continue;
            const parts = osid.split(':');
            const mun = parts.length >= 2 ? parts[1] : undefined;
            if (mun) out[controller as FactionId].add(mun as MunicipalityId);
        }
    }
    return out;
}

function orderedUnique(items: MunicipalityId[]): MunicipalityId[] {
    const out: MunicipalityId[] = [];
    const seen = new Set<MunicipalityId>();
    for (const id of items) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function getRoutingOrder(sourceMun: MunicipalityId, faction: FactionId): MunicipalityId[] {
    const primary = getDisplacementRouteForMun(sourceMun, faction);
    const fallback = FALLBACK_ROUTES_BY_FACTION[faction] ?? [];
    return orderedUnique([...primary, ...fallback, ...LARGE_URBAN_MUN_IDS]);
}

/**
 * Shared routing helper for displaced cohorts. Routes population from sourceMunId
 * to friendly municipalities in routing order, respecting capacity constraints.
 *
 * Three callers with different options:
 *  - Pass-through: no militia pool, no brigade check, no event logging
 *  - Sustained displacement: militia pool tracking, event logging
 *  - Camp reroute: militia pool tracking, brigade presence check, event logging
 */
function routeDisplacedCohort(
    state: GameState,
    sourceMunId: MunicipalityId,
    faction: FactionId,
    amount: number,
    friendlyMuns: Set<MunicipalityId>,
    settlements: Map<string, SettlementRecord>,
    routedByPoolKey: Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>,
    report: TakeoverDisplacementReport,
    options: {
        trackMilitiaPool?: boolean;
        requireBrigadePresence?: boolean;
        eventReason?: string;
    }
): { routed: number; remaining: number } {
    const currentTurn = state.meta.turn;
    let remaining = amount;
    let totalRouted = 0;
    const routeOrder = getRoutingOrder(sourceMunId, faction);
    for (const targetMunId of routeOrder) {
        if (remaining <= 0) break;
        if (!friendlyMuns?.has(targetMunId)) continue;
        if (targetMunId === sourceMunId) continue;
        if (options.requireBrigadePresence && !factionHasBrigadeInMunicipality(state, faction, targetMunId, settlements)) continue;
        const targetState = getOrInitDisplacementState(
            state,
            targetMunId,
            state.displacement.displacement_state?.[targetMunId]?.original_population ?? 10000
        );
        const targetCurrent = Math.max(
            0,
            targetState.original_population + targetState.displaced_in
            - targetState.displaced_out - targetState.lost_population
        );
        const targetCapacity = Math.floor(
            targetState.original_population * getReceivingCapacityFraction(targetMunId)
        );
        const availableCapacity = Math.max(0, targetCapacity - targetCurrent);
        if (availableCapacity <= 0) continue;
        const routed = Math.min(remaining, availableCapacity);
        if (routed <= 0) continue;

        targetState.displaced_in += routed;
        if (!targetState.displaced_in_by_faction) targetState.displaced_in_by_faction = {};
        targetState.displaced_in_by_faction[faction] =
            (targetState.displaced_in_by_faction[faction] ?? 0) + routed;
        targetState.last_updated_turn = currentTurn;

        if (options.trackMilitiaPool) {
            const poolKey = militiaPoolKey(targetMunId, faction);
            const current = routedByPoolKey.get(poolKey);
            if (current) {
                current.amount += routed;
            } else {
                routedByPoolKey.set(poolKey, { munId: targetMunId, faction, amount: routed });
            }
        }

        if (options.eventReason) {
            report.routing.push({
                from_mun: sourceMunId,
                to_mun: targetMunId,
                amount: routed,
                reason: options.eventReason
            });

            appendDisplacementEvent(state, {
                turn: currentTurn,
                origin_mun: sourceMunId,
                dest_mun: targetMunId,
                ethnicity: faction,
                displaced: 0,
                killed: 0,
                fled_abroad: 0,
                settled: routed,
            });
        }

        remaining -= routed;
        totalRouted += routed;
    }
    return { routed: totalRouted, remaining };
}

function addOneTurnPoolContribution(
    state: GameState,
    routedByPoolKey: Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>
): void {
    if (!state.military.militia_pools) state.military.militia_pools = {};
    const poolKeys = Array.from(routedByPoolKey.keys()).sort(strictCompare);
    for (const key of poolKeys) {
        const row = routedByPoolKey.get(key);
        if (!row) continue;
        const effectiveRate = ENCLAVE_MUN_IDS.has(row.munId) ? ENCLAVE_REINFORCEMENT_RATE : REINFORCEMENT_RATE;
        const contribution = Math.min(
            Math.floor(Math.max(0, row.amount) * effectiveRate),
            DISPLACED_CONTRIBUTION_CAP
        );
        if (contribution <= 0) continue;
        const currentTurn = state.meta.turn;
        const pool = state.military.militia_pools[key];
        if (pool) {
            pool.available += contribution;
            pool.updated_turn = currentTurn;
        } else {
            state.military.militia_pools[key] = {
                mun_id: row.munId,
                faction: row.faction,
                available: contribution,
                committed: 0,
                exhausted: 0,
                updated_turn: currentTurn
            };
        }
    }
}

/**
 * Returns the initial-wave displacement fraction for a controller/displaced-faction pair.
 * Returns null to skip seeding entirely (e.g. deep-rear Serbs in RBiH territory).
 *
 * Canon rules (displacement redesign 2026-03-05):
 *  - Serbs in HRHB territory: 1.00 exodus — no front gating.
 *  - Serbs in RBiH territory: 0.10 in Sarajevo urban; 0.50 front-adjacent only; null for deep rear.
 *    (Front-adjacency gating applies only to this case — RS is not immune for minorities.)
 *  - Bosniaks or Croats in RS territory: always INITIAL_DISPLACEMENT_FRACTION (0.70), no front gating.
 *  - All other: INITIAL_DISPLACEMENT_FRACTION (0.70)
 */
function getInitialDisplacementFraction(
    toFaction: FactionId,
    fromFaction: FactionId,
    munId: MunicipalityId,
    isFrontAdjacent: boolean
): number | null {
    if (toFaction === 'HRHB' && fromFaction === 'RS') return HRHB_SERB_EXPULSION_FRACTION;
    if (toFaction === 'RBiH' && fromFaction === 'RS') {
        if (SARAJEVO_URBAN_MUN_IDS.has(munId)) return SARAJEVO_SERB_DISPLACEMENT_FRACTION;
        if (!isFrontAdjacent) return null;
        return RBIH_SERB_DISPLACEMENT_FRACTION;
    }
    return INITIAL_DISPLACEMENT_FRACTION;
}

export function processDisplacementTakeover(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    battleReport?: BattleResolutionLike,
    population1991ByMun?: MunicipalityPopulation1991Map,
    /** Optional OSID-keyed settlements with per-OSID census data (population_total, population_bosniaks, etc.). */
    osidSettlements?: Map<string, SettlementRecord>
): TakeoverDisplacementReport {
    if (state.meta.phase !== 'war') {
        return {
            timers_started: 0,
            timers_matured: 0,
            camps_created: 0,
            camps_routed: 0,
            displaced_total: 0,
            killed_total: 0,
            fled_abroad_total: 0,
            routed_total: 0,
            sustained_fires: 0,
            sustained_displaced_total: 0,
            source_municipalities: [],
            routing: []
        };
    }

    if (!state.displacement.hostile_takeover_timers) state.displacement.hostile_takeover_timers = {};
    if (!state.displacement.displacement_camp_state) state.displacement.displacement_camp_state = {};
    if (!state.displacement.displacement_event_log) state.displacement.displacement_event_log = [];

    const report: TakeoverDisplacementReport = {
        timers_started: 0,
        timers_matured: 0,
        camps_created: 0,
        camps_routed: 0,
        displaced_total: 0,
        killed_total: 0,
        fled_abroad_total: 0,
        routed_total: 0,
        sustained_fires: 0,
        sustained_displaced_total: 0,
        source_municipalities: [],
        routing: []
    };

    const currentTurn = state.meta.turn;
    const timerMap = state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>;
    const allFactions: FactionId[] = ['HRHB', 'RBiH', 'RS'];
    const campMap = state.displacement.displacement_camp_state as Record<MunicipalityId, DisplacementCampState>;

    // Build set of OSIDs on the front line (for front-adjacency gating in displacement seeding).
    // war_front_edges_osid.a/b are OSIDs in op:municipality:slug format.
    const frontOsids = new Set<string>();
    for (const fe of state.military.war_front_edges_osid ?? []) {
        if (fe.a) frontOsids.add(fe.a);
        if (fe.b) frontOsids.add(fe.b);
    }
    // Fallback: if no front edges computed yet (turn 1), treat all as front-adjacent.
    const allFrontAdjacent = frontOsids.size === 0;

    const battles = (battleReport?.battles ?? []).slice().sort((a, b) => {
        const byAttacker = strictCompare(a.attacker_faction, b.attacker_faction);
        if (byAttacker !== 0) return byAttacker;
        return strictCompare(a.location, b.location);
    });

    // 0) Seed displacement timers for ALL OSIDs at war start.
    //    Every OSID's minority population begins displacement on day one.
    //    NOTE: war_start_turn is set to the initial state's turn (e.g. 0), but runTurn()
    //    increments turn BEFORE executing phases. So the first executed war turn is always
    //    warStartTurn + 1. Use +1 here to fire on that actual first war turn.
    const warStartTurn = typeof state.meta.war_start_turn === 'number' ? state.meta.war_start_turn : 0;
    if (currentTurn === warStartTurn + 1) {
        const pc = state.political.political_controllers;
        if (pc) {
            const osids = Object.keys(pc).sort(strictCompare);
            for (const osid of osids) {
                if (!osid.startsWith('op:')) continue;
                const controller = pc[osid] as FactionId;
                if (!controller) continue;
                const parts = osid.split(':');
                const munId = parts.length >= 2 ? parts[1] as MunicipalityId : undefined;
                if (!munId) continue;
                for (const fromFaction of allFactions) {
                    if (fromFaction === controller) continue;
                    if (!areFactionsAtWar(state, fromFaction, controller)) continue;
                    const timerKey = `${osid}|${fromFaction}`;
                    if (timerMap[timerKey]) continue;
                    // Skip seeding if per-faction rules say no displacement (e.g. deep-rear RBiH->RS).
                    const isFrontAdj = allFrontAdjacent || frontOsids.has(osid);
                    const fraction = getInitialDisplacementFraction(controller, fromFaction, munId, isFrontAdj);
                    if (fraction === null) continue;
                    timerMap[timerKey] = {
                        mun_id: munId,
                        from_faction: fromFaction,
                        to_faction: controller,
                        started_turn: currentTurn
                    };
                    report.timers_started += 1;
                }
            }
        }
    }

    // 1) Start takeover timers from flipped OSIDs (battle-driven).
    //    Seeds timers for ALL minority factions — not just the defender.
    //    Example: VRS captures HRHB OSID with Bosniak minority → seeds both HRHB and RBiH timers.
    for (const battle of battles) {
        if (!battle.settlement_flipped) continue;
        const toFaction = battle.attacker_faction;
        if (!toFaction) continue;
        const rec = settlements.get(battle.location);
        if (!rec) continue;
        const munId = getMunicipalityIdFromRecord(rec);
        if (!munId) continue;
        const osidKey = battle.osid ?? `sid:${battle.location}`;
        for (const fromFaction of allFactions) {
            if (fromFaction === toFaction) continue;
            if (!areFactionsAtWar(state, fromFaction, toFaction)) continue;
            const timerKey = `${osidKey}|${fromFaction}`;
            if (timerMap[timerKey]) continue;
            timerMap[timerKey] = {
                mun_id: munId,
                from_faction: fromFaction,
                to_faction: toFaction,
                started_turn: currentTurn
            };
            report.timers_started += 1;
        }
    }

    const friendlyMunsByFaction = buildFriendlyMunicipalitiesByFaction(state, settlements);

    // 2) Mature timers into camp state (per-OSID displacement).
    // Count OSIDs per municipality once for per-OSID population split.
    const osidCountByMun = new Map<MunicipalityId, number>();
    {
        const pc2 = state.political.political_controllers;
        if (pc2) {
            for (const key of Object.keys(pc2)) {
                if (!key.startsWith('op:')) continue;
                const mParts = key.split(':');
                if (mParts.length < 2) continue;
                const m = mParts[1] as MunicipalityId;
                osidCountByMun.set(m, (osidCountByMun.get(m) ?? 0) + 1);
            }
        }
    }

    const routedByPoolKey = new Map<string, { munId: MunicipalityId; faction: FactionId; amount: number }>();

    const timerKeys = Object.keys(timerMap).sort(strictCompare);
    for (const timerKey of timerKeys) {
        const timer = timerMap[timerKey];
        if (!timer) continue;

        // Extract OSID from timerKey "osid|faction"
        const pipeIdx = timerKey.indexOf('|');
        const osid = pipeIdx >= 0 ? timerKey.substring(0, pipeIdx) : timerKey;

        // Recapture check: if displaced faction regained control, delete timer
        const currentController = state.political.political_controllers?.[osid] as FactionId | undefined;
        if (currentController === timer.from_faction) {
            delete timerMap[timerKey];
            continue;
        }
        // Alliance check: if factions no longer at war, delete timer
        if (currentController && !areFactionsAtWar(state, timer.from_faction, currentController)) {
            delete timerMap[timerKey];
            continue;
        }

        if (timer.matured_turn === undefined) {
            // ── Branch A: Initial maturation ──
            if (currentTurn - timer.started_turn < TAKEOVER_DISPLACEMENT_DELAY_TURNS) continue;

            const munId = timer.mun_id;
            const dispState = getOrInitDisplacementState(
                state,
                munId,
                state.displacement.displacement_state?.[munId]?.original_population ?? 10000
            );

            const osidRec = osidSettlements?.get(osid);
            const osidCensusPop = getOsidCensusPopulation(osidRec);
            const osidCount = osidCountByMun.get(munId) ?? 1;
            const osidPop = osidCensusPop > 0
                ? osidCensusPop
                : Math.floor(dispState.original_population / osidCount);
            const remainingPop = Math.max(
                0,
                dispState.original_population - dispState.displaced_out - dispState.lost_population
            );
            const osidCensusShare = getOsidCensusHostileShare(osidRec, timer.from_faction);
            let hostileShare: number;
            if (osidCensusShare !== null) {
                hostileShare = Math.min(osidCensusShare, 0.95);
            } else {
                hostileShare = getDynamicHostileShare(
                    munId, timer.from_faction, dispState, population1991ByMun
                );
                hostileShare = Math.min(hostileShare, 0.80);
            }

            const isFrontAdjMatured = allFrontAdjacent || frontOsids.has(osid);
            const initFraction = getInitialDisplacementFraction(
                timer.to_faction, timer.from_faction, munId, isFrontAdjMatured
            ) ?? INITIAL_DISPLACEMENT_FRACTION;
            const displacementAmount = Math.min(
                Math.max(0, Math.floor(osidPop * hostileShare * initFraction)),
                remainingPop
            );

            if (displacementAmount > 0) {
                const killFraction = isEnclaveOverrun(munId, timer.from_faction, timer.to_faction)
                    ? ENCLAVE_OVERRUN_KILL_FRACTION
                    : getDisplacementKillFraction(timer.from_faction, timer.to_faction);
                const killed = Math.floor(displacementAmount * killFraction);
                const survivors = Math.max(0, displacementAmount - killed);
                const fledAbroad = Math.floor(survivors * getFleeAbroadFraction(munId, timer.from_faction));
                const routedToCamp = Math.max(0, survivors - fledAbroad);
                const lost = killed + fledAbroad;

                const beforePop = remainingPop;
                dispState.displaced_out += routedToCamp;
                dispState.lost_population += lost;
                dispState.last_updated_turn = currentTurn;

                const sourcePoolKey = militiaPoolKey(munId, timer.from_faction);
                const sourcePool = state.military.militia_pools?.[sourcePoolKey];
                if (sourcePool && beforePop > 0) {
                    const ratio = displacementAmount / beforePop;
                    const reduction = Math.floor(sourcePool.available * ratio);
                    if (reduction > 0) {
                        sourcePool.available = Math.max(0, sourcePool.available - reduction);
                        sourcePool.updated_turn = currentTurn;
                    }
                }

                if (routedToCamp > 0) {
                    const existingCamp = campMap[munId];
                    const created = !existingCamp;
                    const camp: DisplacementCampState = existingCamp ?? {
                        mun_id: munId,
                        population: 0,
                        started_turn: currentTurn,
                        by_faction: {}
                    };
                    camp.population += routedToCamp;
                    camp.by_faction[timer.from_faction] = (camp.by_faction[timer.from_faction] ?? 0) + routedToCamp;
                    if (created) report.camps_created += 1;
                    campMap[munId] = camp;
                }

                report.timers_matured += 1;
                report.displaced_total += displacementAmount;
                report.killed_total += killed;
                report.fled_abroad_total += fledAbroad;
                report.routed_total += routedToCamp;
                report.source_municipalities.push(munId);

                recordCivilianDisplacementCasualties(state, timer.from_faction, killed, fledAbroad);

                appendDisplacementEvent(state, {
                    turn: currentTurn,
                    origin_mun: munId,
                    origin_osid: osid,
                    dest_mun: munId,
                    ethnicity: timer.from_faction,
                    caused_by: timer.to_faction,
                    displaced: displacementAmount,
                    killed,
                    fled_abroad: fledAbroad,
                    settled: 0,
                });
            }

            // Re-route displaced_in population without casualties (pass-through).
            // These people were already displaced once; second displacement incurs no
            // additional killed/fled_abroad and does not increment displaced_total.
            if (dispState.displaced_in > 0) {
                const byFaction = dispState.displaced_in_by_faction ?? {};
                const fKeys = (Object.keys(byFaction) as FactionId[]).sort(strictCompare);
                for (const fid of fKeys) {
                    let rem = Math.max(0, Math.floor(byFaction[fid] ?? 0));
                    if (rem <= 0) continue;
                    const result = routeDisplacedCohort(
                        state, munId, fid as FactionId, rem,
                        friendlyMunsByFaction[fid as FactionId],
                        settlements, routedByPoolKey, report,
                        {}
                    );
                    byFaction[fid] = result.remaining;
                }
                const remainder = (Object.values(byFaction) as number[])
                    .filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0)
                    .reduce((sum, v) => sum + v, 0);
                dispState.displaced_in = remainder;
            }

            // Mark timer as matured instead of deleting
            timer.matured_turn = currentTurn;
            timer.cumulative_displaced = displacementAmount;  // Sustained pool accounts for initial fire
        } else {
            // ── Branch B: Sustained displacement ──
            const munId = timer.mun_id;
            const dispState = getOrInitDisplacementState(
                state,
                munId,
                state.displacement.displacement_state?.[munId]?.original_population ?? 10000
            );

            const osidRecB = osidSettlements?.get(osid);
            const osidCensusPopB = getOsidCensusPopulation(osidRecB);
            const osidCount = osidCountByMun.get(munId) ?? 1;
            const osidPop = osidCensusPopB > 0
                ? osidCensusPopB
                : Math.floor(dispState.original_population / osidCount);
            const remainingPop = Math.max(
                0,
                dispState.original_population - dispState.displaced_out - dispState.lost_population
            );
            const osidCensusShareB = getOsidCensusHostileShare(osidRecB, timer.from_faction);
            let hostileShare: number;
            if (osidCensusShareB !== null) {
                hostileShare = Math.min(osidCensusShareB, 0.95);
            } else {
                hostileShare = getDynamicHostileShare(
                    munId, timer.from_faction, dispState, population1991ByMun
                );
                hostileShare = Math.min(hostileShare, 0.80);
            }

            const initialMinority = Math.floor(osidPop * hostileShare);
            const cumulativeDisplaced = timer.cumulative_displaced ?? 0;
            const remainingMinority = Math.max(0, initialMinority - cumulativeDisplaced);

            if (remainingMinority < SUSTAINED_MIN_REMAINING) {
                delete timerMap[timerKey];
                continue;
            }

            const sustainedAmount = Math.min(
                Math.floor(remainingMinority * SUSTAINED_DISPLACEMENT_RATE),
                remainingPop
            );
            if (sustainedAmount <= 0) continue;

            const killFraction = isEnclaveOverrun(munId, timer.from_faction, timer.to_faction)
                ? ENCLAVE_OVERRUN_KILL_FRACTION
                : getDisplacementKillFraction(timer.from_faction, timer.to_faction);
            const killed = Math.floor(sustainedAmount * killFraction);
            const survivors = Math.max(0, sustainedAmount - killed);
            const fledAbroad = Math.floor(survivors * getFleeAbroadFraction(munId, timer.from_faction));
            const directRouted = Math.max(0, survivors - fledAbroad);
            const lost = killed + fledAbroad;

            const beforePop = remainingPop;
            dispState.displaced_out += directRouted;
            dispState.lost_population += lost;
            dispState.last_updated_turn = currentTurn;

            // Reduce source militia pool proportionally
            const sourcePoolKey = militiaPoolKey(munId, timer.from_faction);
            const sourcePool = state.military.militia_pools?.[sourcePoolKey];
            if (sourcePool && beforePop > 0) {
                const ratio = sustainedAmount / beforePop;
                const reduction = Math.floor(sourcePool.available * ratio);
                if (reduction > 0) {
                    sourcePool.available = Math.max(0, sourcePool.available - reduction);
                    sourcePool.updated_turn = currentTurn;
                }
            }

            timer.cumulative_displaced = cumulativeDisplaced + sustainedAmount;

            // Direct routing to friendly municipalities (no camp — sustained = civilian flight)
            if (directRouted > 0) {
                routeDisplacedCohort(
                    state, munId, timer.from_faction, directRouted,
                    friendlyMunsByFaction[timer.from_faction],
                    settlements, routedByPoolKey, report,
                    { trackMilitiaPool: true, eventReason: 'sustained_displacement' }
                );
            }

            recordCivilianDisplacementCasualties(state, timer.from_faction, killed, fledAbroad);

            appendDisplacementEvent(state, {
                turn: currentTurn,
                origin_mun: munId,
                origin_osid: osid,
                dest_mun: munId,
                ethnicity: timer.from_faction,
                caused_by: timer.to_faction,
                displaced: sustainedAmount,
                killed,
                fled_abroad: fledAbroad,
                settled: 0,
            });

            report.sustained_fires += 1;
            report.sustained_displaced_total += sustainedAmount;
            report.displaced_total += sustainedAmount;
            report.killed_total += killed;
            report.fled_abroad_total += fledAbroad;
            report.routed_total += directRouted;
            report.source_municipalities.push(munId);
        }
    }

    // 3) Mature camp state into routed arrivals (urban-center order + capacity overflow).
    const campMuns = Object.keys(campMap).sort(strictCompare) as MunicipalityId[];
    for (const sourceMunId of campMuns) {
        const camp = campMap[sourceMunId];
        if (!camp) continue;
        if (currentTurn - camp.started_turn < CAMP_REROUTE_DELAY_TURNS) continue;

        let routedFromCamp = 0;
        const factionKeys = (Object.keys(camp.by_faction) as FactionId[]).sort(strictCompare);
        for (const factionId of factionKeys) {
            const cohortAmount = Math.max(0, Math.floor(camp.by_faction[factionId] ?? 0));
            if (cohortAmount <= 0) continue;
            const result = routeDisplacedCohort(
                state, sourceMunId, factionId, cohortAmount,
                friendlyMunsByFaction[factionId],
                settlements, routedByPoolKey, report,
                { trackMilitiaPool: true, requireBrigadePresence: true, eventReason: 'camp_reroute_urban_motherland' }
            );
            camp.by_faction[factionId] = result.remaining;
            routedFromCamp += result.routed;
        }

        camp.population = (Object.values(camp.by_faction) as number[])
            .filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
            .reduce((sum, v) => sum + v, 0);

        if (routedFromCamp > 0) report.camps_routed += 1;
        if (camp.population <= 0) delete campMap[sourceMunId];
    }

    addOneTurnPoolContribution(state, routedByPoolKey);

    report.source_municipalities = orderedUnique(report.source_municipalities).sort(strictCompare);
    report.routing.sort((a, b) => {
        const fromCmp = strictCompare(a.from_mun, b.from_mun);
        if (fromCmp !== 0) return fromCmp;
        return strictCompare(a.to_mun, b.to_mun);
    });
    return report;
}

