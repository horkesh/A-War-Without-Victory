/**
 * Shared formation spawn from militia pools (plan: militia_and_brigade_formation_system).
 * Used by CLI sim_generate_formations and by turn pipeline when formation_spawn_directive is active.
 * FORAWWV H2.4: formation creation only when explicit directive.
 */

import { resolveLocationOsid, type CanonicalToOperationalMap } from '../data/operational_data_types.js';
import {
    COMBAT_REINFORCEMENT_RATE,
    DISPLACED_FORMATION_THRESHOLD,
    getBatchSizeForFaction,
    getFactionReinforcementMult,
    getMaxBrigadesPerMun,
    MAX_BRIGADE_PERSONNEL,
    MAX_TO_PER_MUN,
    MILITIA_COHESION,
    MIN_BATTALION_THRESHOLD,
    MIN_BRIGADE_SPAWN,
    MIN_BRIGADE_THRESHOLD,
    MIN_DETACHMENT_SPAWN,
    MIN_ELIGIBLE_POPULATION_FOR_BRIGADE,
    REINFORCEMENT_RATE,
    SIEGE_RATIO_MOSTLY,
    SIEGE_RATIO_PARTIAL,
    WIA_TRICKLE_RATE,
} from '../state/formation_constants.js';
import { computeBaseCohesion } from '../state/formation_lifecycle.js';
import { resolveFormationName } from '../state/formation_naming.js';
import type { FormationState, GameState, MilitiaPoolState } from '../state/game_state.js';
import { militiaPoolKey } from '../state/militia_pool_key.js';
import { strictCompare } from '../state/validateGameState.js';
import type { MunicipalityPopulation1991Map } from './early_war/pool_population.js';
import { getEligiblePopulationCount } from './early_war/pool_population.js';
import { type SiegeRatioByMunFaction, getSiegeRatio } from './early_war/compute_siege_state.js';
import { isEmergentFormationSuppressed } from './recruitment_engine.js';
import { getFactionDefaultOfficerQuality } from './combat/combat_math.js';

export interface SpawnFormationsOptions {
    /** If set, used for all factions; if omitted, per-faction nominal size from OOB is used (RBiH 1000, RS 2500, HRHB 1500). */
    batchSize?: number | null;
    factionFilter: string | null;
    munFilter: string | null;
    maxPerMun: number | null;
    customTags: string[];
    applyChanges: boolean;
    formationKind: 'militia' | 'brigade' | null;
    /** When set, emergent brigades get hq_sid from this map (mun1990_id -> sid) for map placement. */
    municipalityHqSettlement?: Record<string, string> | null;
    /** When set, emergent brigades get historical name for (faction, mun_id, ordinal) from OOB when available. */
    historicalNameLookup?: ((faction: string, mun_id: string, ordinal: number) => string | null) | null;
    /** When set, emergent brigades get historical HQ settlement ID for (faction, mun_id, ordinal) from OOB when available. */
    historicalHqLookup?: ((faction: string, mun_id: string, ordinal: number) => string | null) | null;
    /** When set, emergent spawn is gated by demographics: skip (mun, faction) where 1991 eligible population < MIN_ELIGIBLE_POPULATION_FOR_BRIGADE. */
    population1991ByMun?: MunicipalityPopulation1991Map | null;
    /** When set, emergent formations get location_osid from hq_sid via canonical_to_operational_map. */
    canonicalToOperational?: CanonicalToOperationalMap;
}

export interface SpawnFormationsReport {
    formations_created: number;
    manpower_committed: number;
    pools_touched: number;
    created: Array<{ formation_id: string; name: string; mun_id: string; faction: string; kind: string }>;
}

function generateDeterministicFormationId(state: GameState, faction: string): string {
    const formations = state.formations ?? {};
    const factionFormations = Object.values(formations)
        .filter((f) => f && typeof f === 'object' && (f as FormationState).faction === faction)
        .map((f) => (f as FormationState).id)
        .filter((id): id is string => typeof id === 'string');

    const pattern = new RegExp(`^F_${faction.replace(/[^A-Za-z0-9]/g, '_')}_(\\d+)$`);
    let maxNum = 0;
    for (const id of factionFormations) {
        const match = id.match(pattern);
        if (match) {
            const num = Number.parseInt(match[1], 10);
            if (Number.isFinite(num) && num > maxNum) maxNum = num;
        }
    }

    const nextNum = maxNum + 1;
    const padded = String(nextNum).padStart(4, '0');
    return `F_${faction}_${padded}`;
}

/**
 * Count existing brigade formations for (mun_id, faction). Uses tag "mun:mun_id" on formations.
 * Canon: roughly one brigade per municipality (two for large/mixed e.g. Sarajevo, Mostar).
 */
function countBrigadesInMun(state: GameState, mun_id: string, faction: string): number {
    const formations = state.formations ?? {};
    const tag = `mun:${mun_id}`;
    let n = 0;
    for (const f of Object.values(formations)) {
        if (!f || typeof f !== 'object') continue;
        if ((f as FormationState).faction !== faction) continue;
        if ((f as FormationState).kind !== 'brigade') continue;
        const tags = (f as FormationState).tags;
        if (Array.isArray(tags) && tags.includes(tag)) n += 1;
    }
    return n;
}

/**
 * Count existing militia-kind formations for (mun_id, faction). Uses tag "mun:mun_id" on formations.
 * Used in bottom_up mode to enforce MAX_TO_PER_MUN cap on TO detachments/battalions per municipality.
 * Deterministic: pure count, no ordering needed.
 */
function countMilitiaFormationsInMun(state: GameState, mun_id: string, faction: string): number {
    const formations = state.formations ?? {};
    const tag = `mun:${mun_id}`;
    let n = 0;
    for (const f of Object.values(formations)) {
        if (!f || typeof f !== 'object') continue;
        if ((f as FormationState).faction !== faction) continue;
        if ((f as FormationState).kind !== 'militia') continue;
        const tags = (f as FormationState).tags;
        if (Array.isArray(tags) && tags.includes(tag)) n += 1;
    }
    return n;
}

/** Get mun_id from formation tags (tag "mun:mun_id"). Returns null if not found. */
function getMunIdFromFormation(f: FormationState): string | null {
    const tags = f.tags;
    if (!Array.isArray(tags)) return null;
    for (const t of tags) {
        if (typeof t === 'string' && t.startsWith('mun:')) return t.slice(4);
    }
    return null;
}

function reservedSpawnManpowerForReinforcement(
    state: GameState,
    mun_id: string,
    faction: string,
    spawnDirectiveActive: boolean
): number {
    if (!spawnDirectiveActive) return 0;
    if (isEmergentFormationSuppressed(state, mun_id, faction)) return 0;
    const hasSpawnHeadroom = countBrigadesInMun(state, mun_id, faction) < getMaxBrigadesPerMun(mun_id);
    if (!hasSpawnHeadroom) return 0;
    return getBatchSizeForFaction(faction);
}

export interface ReinforceBrigadesReport {
    formations_reinforced: number;
    manpower_added: number;
    pools_touched: number;
}

/**
 * Reinforce existing formations from militia pools.
 *
 * **Legacy path** (recruitment_mode !== 'bottom_up'):
 *   Brigades only, up to MAX_BRIGADE_PERSONNEL (3000). Rate-limited by REINFORCEMENT_RATE.
 *   Readiness-gated: degraded/forming brigades skip reinforcement.
 *   Reserve manpower for potential spawn first.
 *
 * **Bottom-up path** (recruitment_mode === 'bottom_up'):
 *   All formation kinds (militia detachments, battalions, brigades) with tier-aware growth caps:
 *   - Detachment (militia, personnel < MIN_BATTALION_THRESHOLD): grows to MIN_BATTALION_THRESHOLD (500)
 *   - Battalion (militia, personnel >= MIN_BATTALION_THRESHOLD): grows to MIN_BRIGADE_THRESHOLD (1500)
 *   - Brigade (kind === 'brigade'): grows to MAX_BRIGADE_PERSONNEL (3000)
 *   transfer = min(growth_rate, pool.available, tier_cap - personnel)
 *   No readiness gate for militia-kind formations (they absorb manpower while forming).
 *
 * Deterministic: formations sorted by id; each formation takes from its (mun, faction) pool.
 *
 * Note: Previously named reinforceBrigadesFromPools. Alias preserved for callers in turn_pipeline.ts.
 */
export function reinforceBrigadesFromPools(state: GameState): ReinforceBrigadesReport {
    const report: ReinforceBrigadesReport = {
        formations_reinforced: 0,
        manpower_added: 0,
        pools_touched: 0
    };
    const formations = state.formations ?? {};
    const pools = state.militia_pools as Record<string, MilitiaPoolState> | undefined;
    if (!pools || typeof pools !== 'object') return report;

    const recruitmentMode = state.meta.recruitment_mode;
    const isBottomUp = recruitmentMode === 'bottom_up';

    const currentTurn = state.meta.turn;
    const spawnDirectiveActive = isFormationSpawnDirectiveActive(state);

    if (isBottomUp) {
        // --- bottom_up path: reinforce all formation kinds with tier-aware caps ---
        // Include both militia-kind (TO detachments/battalions) and brigade-kind formations.
        const formationIds = (Object.keys(formations) as string[])
            .filter((id) => {
                const f = formations[id] as FormationState | undefined;
                if (!f) return false;
                const kind = f.kind ?? 'brigade';
                return (kind === 'militia' || kind === 'brigade') && getMunIdFromFormation(f) !== null;
            })
            .sort(strictCompare);

        for (const id of formationIds) {
            const f = formations[id] as FormationState;
            const mun_id = getMunIdFromFormation(f);
            const faction = f.faction;
            if (!mun_id || !faction) continue;

            const kind = f.kind ?? 'brigade';
            const current = f.personnel ?? (kind === 'militia' ? MIN_DETACHMENT_SPAWN : MIN_BRIGADE_SPAWN);

            // Determine tier cap
            let tierCap: number;
            if (kind === 'brigade') {
                tierCap = MAX_BRIGADE_PERSONNEL;
                // Enclave gate: besieged brigades cannot receive reinforcements (L26)
                if (Array.isArray(f.tags) && f.tags.includes('enclave')) continue;
                // Readiness gate only for brigades
                if (f.readiness === 'degraded') continue;
                if (f.readiness === 'forming') continue;
            } else {
                // militia-kind: detachment or battalion — derive tier from personnel
                if (current >= MIN_BATTALION_THRESHOLD) {
                    tierCap = MIN_BRIGADE_THRESHOLD;
                } else {
                    tierCap = MIN_BATTALION_THRESHOLD;
                }
            }

            if (current >= tierCap) continue;

            const poolFaction = f.recruit_pool_faction ?? faction;
            const key = militiaPoolKey(mun_id, poolFaction);
            const pool = pools[key];
            if (!pool || pool.available <= 0) continue;

            // Rate limit: combat formations get half rate; faction-specific multiplier
            const inCombat = f.posture === 'attack' || f.disrupted === true;
            const factionMult = getFactionReinforcementMult(faction, currentTurn, state.war_timeline);
            const baseRate = inCombat ? COMBAT_REINFORCEMENT_RATE : REINFORCEMENT_RATE;
            const rate = Math.max(1, Math.floor(baseRate * factionMult));

            const need = Math.min(tierCap - current, rate);
            // For brigades: reserve manpower for potential spawn; for militia-kind: no reserve needed
            const reserveForSpawn = kind === 'brigade'
                ? reservedSpawnManpowerForReinforcement(state, mun_id, faction, spawnDirectiveActive)
                : 0;
            const availableForReinforcement = Math.max(0, pool.available - reserveForSpawn);
            const transfer = Math.min(need, availableForReinforcement);

            if (transfer <= 0) continue;

            (f as FormationState & { personnel: number }).personnel = current + transfer;
            pool.available -= transfer;
            pool.committed += transfer;
            pool.updated_turn = currentTurn;

            // Update name when militia formation crosses battalion threshold
            if (kind === 'militia') {
                const newPersonnel = current + transfer;
                const wasDetachment = current < MIN_BATTALION_THRESHOLD;
                const isBattalion = newPersonnel >= MIN_BATTALION_THRESHOLD;
                if (wasDetachment && isBattalion) {
                    // Auto-promote name: "TO <mun_id>" → "TO Bn <mun_id>"
                    f.name = resolveFormationName(faction, mun_id, 'militia', 0, newPersonnel);
                }
            }

            report.formations_reinforced += 1;
            report.manpower_added += transfer;
            report.pools_touched += 1;
        }

        return report;
    }

    // --- Legacy path (auto_oob / player_choice): brigades only ---
    const brigadeIds = (Object.keys(formations) as string[])
        .filter((id) => {
            const f = formations[id] as FormationState | undefined;
            return f && f.kind === 'brigade' && getMunIdFromFormation(f) !== null;
        })
        .sort(strictCompare);

    for (const id of brigadeIds) {
        const f = formations[id] as FormationState;
        const mun_id = getMunIdFromFormation(f);
        const faction = f.faction;
        if (!mun_id || !faction) continue;

        // Enclave gate: besieged brigades cannot receive reinforcements (L26)
        if (Array.isArray(f.tags) && f.tags.includes('enclave')) continue;

        // Readiness gate: degraded brigades do not reinforce
        if (f.readiness === 'degraded') continue;
        // Forming brigades also skip reinforcement (must reach 'active' first)
        if (f.readiness === 'forming') continue;

        const current = f.personnel ?? MIN_BRIGADE_SPAWN;
        if (current >= MAX_BRIGADE_PERSONNEL) continue;

        const poolFaction = f.recruit_pool_faction ?? faction;
        const key = militiaPoolKey(mun_id, poolFaction);
        const pool = pools[key];
        if (!pool || pool.available <= 0) continue;

        // Rate limit: combat brigades get half rate; faction-specific mobilization multiplier
        const inCombat = f.posture === 'attack' || f.disrupted === true;
        const currentTurnNum = state.meta?.turn ?? 0;
        const factionMult = getFactionReinforcementMult(faction, currentTurnNum, state.war_timeline);
        const rate = Math.max(1, Math.floor((inCombat ? COMBAT_REINFORCEMENT_RATE : REINFORCEMENT_RATE) * factionMult));

        const need = Math.min(MAX_BRIGADE_PERSONNEL - current, rate);
        const reserveForSpawn = reservedSpawnManpowerForReinforcement(state, mun_id, faction, spawnDirectiveActive);
        const availableForReinforcement = Math.max(0, pool.available - reserveForSpawn);
        const transfer = Math.min(need, availableForReinforcement);

        if (transfer <= 0) continue;

        (f as FormationState & { personnel: number }).personnel = current + transfer;
        pool.available -= transfer;
        pool.committed += transfer;
        pool.updated_turn = currentTurn;

        report.formations_reinforced += 1;
        report.manpower_added += transfer;
        report.pools_touched += 1;
    }

    return report;
}

/**
 * Spawn formations from militia pools. Uses composite key (mun_id, faction).
 *
 * **Legacy path** (recruitment_mode !== 'bottom_up' — i.e. 'auto_oob' or 'player_choice'):
 *   Spawns brigades when pool >= batch size (MIN_BRIGADE_SPAWN / 800).
 *   Respects max_brigades_per_mun as a *total* cap per (mun, faction).
 *
 * **Bottom-up path** (state.meta.recruitment_mode === 'bottom_up'):
 *   Spawns TO detachments when pool >= MIN_DETACHMENT_SPAWN (100).
 *   - kind: 'militia', personnel: MIN_DETACHMENT_SPAWN, cohesion: MILITIA_COHESION (30)
 *   - name: "TO <mun_id>" via resolveFormationName
 *   - origin_mun set to mun_id for tracking
 *   - MAX_TO_PER_MUN (5) cap: counts existing militia-kind formations per (mun, faction)
 *   - Task 3: when any brigade in mun reaches MAX_BRIGADE_PERSONNEL AND pool >= MIN_DETACHMENT_SPAWN,
 *     spawns a new TO detachment (gated by MAX_TO_PER_MUN cap).
 *
 * Deterministic: pools sorted by (mun_id, faction); formations sorted by id in report.
 */
export function spawnFormationsFromPools(
    state: GameState,
    options: SpawnFormationsOptions,
    siegeRatios?: SiegeRatioByMunFaction
): SpawnFormationsReport {
    const report: SpawnFormationsReport = {
        formations_created: 0,
        manpower_committed: 0,
        pools_touched: 0,
        created: []
    };

    if (!state.formations || typeof state.formations !== 'object') {
        (state as GameState & { formations: Record<string, FormationState> }).formations = {};
    }
    if (!state.militia_pools || typeof state.militia_pools !== 'object') {
        (state as GameState & { militia_pools: Record<string, MilitiaPoolState> }).militia_pools = {};
    }

    const pools = state.militia_pools as Record<string, MilitiaPoolState>;
    const currentTurn = state.meta.turn;
    const recruitmentMode = state.meta.recruitment_mode;
    const isBottomUp = recruitmentMode === 'bottom_up';
    const { batchSize: optionsBatchSize, factionFilter, munFilter, maxPerMun, customTags, applyChanges, formationKind, municipalityHqSettlement, population1991ByMun, canonicalToOperational } = options;

    if (isBottomUp) {
        // --- bottom_up path: TO detachments at MIN_DETACHMENT_SPAWN threshold ---

        // Collect eligible pools: available >= MIN_DETACHMENT_SPAWN, faction set, not fragmented
        const eligiblePools: Array<{ mun_id: string; pool: MilitiaPoolState }> = [];
        for (const [key, pool] of Object.entries(pools)) {
            if (!pool || typeof pool !== 'object') continue;
            if (pool.faction === null || pool.faction === undefined) continue;
            const mun_id = typeof pool.mun_id === 'string' ? pool.mun_id : key;
            if (state.municipalities?.[mun_id]?.control === 'fragmented') continue;
            if (factionFilter !== null && pool.faction !== factionFilter) continue;
            if (munFilter !== null && mun_id !== munFilter) continue;
            // Only check the first two conditions for bottom_up (no emergent suppression check,
            // no population gate — TO detachments emerge wherever there is manpower)
            if (pool.available < MIN_DETACHMENT_SPAWN) continue;
            eligiblePools.push({ mun_id, pool });
        }

        // Sort deterministically by (mun_id, faction) — strictCompare per Engine Invariants §11.3
        eligiblePools.sort((a, b) => {
            const c = strictCompare(a.mun_id, b.mun_id);
            if (c !== 0) return c;
            return strictCompare(a.pool.faction ?? '', b.pool.faction ?? '');
        });

        for (const { mun_id, pool } of eligiblePools) {
            const faction = pool.faction!;

            // maxPerMun=0 means caller explicitly suppresses all spawns for this run
            if (maxPerMun !== null && maxPerMun < 1) continue;

            // Phase F Step 25: lift MAX_TO_PER_MUN cap under mostly-surrounded siege
            const currentSiegeRatio = getSiegeRatio(siegeRatios ?? new Map(), mun_id, faction);
            const activeCap = currentSiegeRatio >= SIEGE_RATIO_MOSTLY
                ? MAX_TO_PER_MUN * 3  // Lifted cap — people fight regardless
                : MAX_TO_PER_MUN;

            // Check per-mun cap: count existing militia-kind formations in this (mun, faction)
            const existingMilitiaCount = countMilitiaFormationsInMun(state, mun_id, faction);
            if (existingMilitiaCount >= activeCap) continue;

            // Spawn one TO detachment per eligible pool per turn
            const formationId = generateDeterministicFormationId(state, faction);
            const kind: 'militia' = 'militia';
            const name = resolveFormationName(faction, mun_id, kind, 0, MIN_DETACHMENT_SPAWN);

            const baseTags = [`generated_phase_i0`, `kind:${kind}`, `mun:${mun_id}`];
            const allTags = Array.from(new Set([...baseTags, ...customTags])).sort(strictCompare);

            const hq_sid = municipalityHqSettlement?.[mun_id];
            const location_osid = canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, canonicalToOperational) : undefined;

            const formation: FormationState = {
                id: formationId,
                faction,
                name,
                created_turn: currentTurn,
                status: 'active',
                assignment: null,
                tags: allTags.length > 0 ? allTags : undefined,
                kind,
                personnel: MIN_DETACHMENT_SPAWN,
                readiness: 'forming',
                cohesion: MILITIA_COHESION,
                activation_gated: true,
                activation_turn: null,
                origin_mun: mun_id,
                officer_quality: getFactionDefaultOfficerQuality(faction, currentTurn),
                ...(hq_sid ? { hq_sid } : {}),
                ...(location_osid != null ? { location_osid } : {})
            };

            report.created.push({ formation_id: formationId, name, mun_id, faction, kind });
            report.formations_created += 1;
            report.manpower_committed += MIN_DETACHMENT_SPAWN;
            report.pools_touched += 1;

            if (applyChanges) {
                state.formations![formationId] = formation;
                pool.available -= MIN_DETACHMENT_SPAWN;
                pool.committed += MIN_DETACHMENT_SPAWN;
                pool.updated_turn = currentTurn;
            }
        }

        // Phase F Step 27: Displacement-driven TO emergence.
        // Large displaced-in populations in besieged municipalities spawn an ADDITIONAL formation
        // beyond the normal pool-threshold spawn. Processed after the normal pool loop so that
        // the normal spawn's mutations are visible when checking the lifted cap.
        if (siegeRatios && applyChanges) {
            // Build a sorted list of unique (mun_id, faction) pairs from all pools
            const dispPairs: Array<{ mun_id: string; faction: string }> = [];
            for (const pool of Object.values(pools)) {
                if (!pool || typeof pool !== 'object') continue;
                if (!pool.faction || typeof pool.mun_id !== 'string') continue;
                if (factionFilter !== null && pool.faction !== factionFilter) continue;
                if (munFilter !== null && pool.mun_id !== munFilter) continue;
                dispPairs.push({ mun_id: pool.mun_id, faction: pool.faction });
            }
            // Sort for determinism — strictCompare per Engine Invariants §11.3
            dispPairs.sort((a, b) => {
                const c = strictCompare(a.mun_id, b.mun_id);
                if (c !== 0) return c;
                return strictCompare(a.faction, b.faction);
            });

            const dispState = state.displacement_state;
            for (const { mun_id: dispMunId, faction: dispFaction } of dispPairs) {
                const munDisp = dispState?.[dispMunId];
                const dispIn = munDisp?.displaced_in_by_faction?.[dispFaction as import('../state/game_state.js').FactionId] ?? 0;
                const siegeRatio = getSiegeRatio(siegeRatios, dispMunId, dispFaction);

                if (dispIn < DISPLACED_FORMATION_THRESHOLD) continue;
                if (siegeRatio < SIEGE_RATIO_PARTIAL) continue;

                // Determine lifted cap (same rule as normal spawn above)
                const liftedCap = siegeRatio >= SIEGE_RATIO_MOSTLY ? MAX_TO_PER_MUN * 3 : MAX_TO_PER_MUN;
                const currentCount = countMilitiaFormationsInMun(state, dispMunId, dispFaction);
                if (currentCount >= liftedCap) continue;

                // Check pool has enough to spawn a detachment
                const poolKey = militiaPoolKey(dispMunId, dispFaction);
                const pool = pools[poolKey];
                if (!pool || pool.available < MIN_DETACHMENT_SPAWN) continue;

                // Spawn extra displaced-origin detachment
                const dispFormationId = generateDeterministicFormationId(state, dispFaction);
                const dispKind: 'militia' = 'militia';
                const dispName = resolveFormationName(dispFaction, dispMunId, dispKind, 0, MIN_DETACHMENT_SPAWN);
                const dispBaseTags = [`generated_phase_i0`, `displaced_origin`, `kind:${dispKind}`, `mun:${dispMunId}`];
                const dispAllTags = Array.from(new Set([...dispBaseTags, ...customTags])).sort(strictCompare);

                const dispHqSid = municipalityHqSettlement?.[dispMunId];
                const dispLocationOsid = canonicalToOperational && dispHqSid
                    ? resolveLocationOsid(dispHqSid, canonicalToOperational)
                    : undefined;

                const dispFormation: FormationState = {
                    id: dispFormationId,
                    faction: dispFaction,
                    name: dispName,
                    created_turn: currentTurn,
                    status: 'active',
                    assignment: null,
                    tags: dispAllTags.length > 0 ? dispAllTags : undefined,
                    kind: dispKind,
                    personnel: MIN_DETACHMENT_SPAWN,
                    readiness: 'forming',
                    cohesion: MILITIA_COHESION,
                    activation_gated: true,
                    activation_turn: null,
                    origin_mun: dispMunId,
                    officer_quality: getFactionDefaultOfficerQuality(dispFaction, currentTurn),
                    ...(dispHqSid ? { hq_sid: dispHqSid } : {}),
                    ...(dispLocationOsid != null ? { location_osid: dispLocationOsid } : {})
                };

                state.formations![dispFormationId] = dispFormation;
                pool.available -= MIN_DETACHMENT_SPAWN;
                pool.committed += MIN_DETACHMENT_SPAWN;
                pool.updated_turn = currentTurn;

                report.created.push({ formation_id: dispFormationId, name: dispName, mun_id: dispMunId, faction: dispFaction, kind: dispKind });
                report.formations_created += 1;
                report.manpower_committed += MIN_DETACHMENT_SPAWN;
                report.pools_touched += 1;
            }
        }

        report.created.sort((a, b) => strictCompare(a.formation_id, b.formation_id));
        return report;
    }

    // --- Legacy path (auto_oob / player_choice): spawn brigades at batch size threshold ---
    const eligiblePools: Array<{ mun_id: string; pool: MilitiaPoolState }> = [];
    for (const [key, pool] of Object.entries(pools)) {
        if (!pool || typeof pool !== 'object') continue;
        if (pool.faction === null || pool.faction === undefined) continue;
        const mun_id = typeof pool.mun_id === 'string' ? pool.mun_id : key;
        if (state.municipalities?.[mun_id]?.control === 'fragmented') continue;
        if (factionFilter !== null && pool.faction !== factionFilter) continue;
        if (munFilter !== null && mun_id !== munFilter) continue;
        // Suppress emergent formation if a recruited OOB brigade already covers this (mun, faction)
        if (isEmergentFormationSuppressed(state, mun_id, pool.faction)) continue;
        if (population1991ByMun != null) {
            const eligiblePop = getEligiblePopulationCount(population1991ByMun, mun_id, pool.faction);
            if (eligiblePop < MIN_ELIGIBLE_POPULATION_FOR_BRIGADE) continue;
        }
        const batchSizeForPool = optionsBatchSize ?? getBatchSizeForFaction(pool.faction);
        if (pool.available < batchSizeForPool) continue;
        eligiblePools.push({ mun_id, pool });
    }

    eligiblePools.sort((a, b) => {
        const c = strictCompare(a.mun_id, b.mun_id);
        if (c !== 0) return c;
        return strictCompare(a.pool.faction ?? '', b.pool.faction ?? '');
    });

    const kindRequested = formationKind === 'militia' ? 'brigade' : (formationKind ?? 'brigade');

    for (const { mun_id, pool } of eligiblePools) {
        const faction = pool.faction!;
        const batchSize = optionsBatchSize ?? getBatchSizeForFaction(faction);
        const maxBrigades = getMaxBrigadesPerMun(mun_id);
        const existingInMun = countBrigadesInMun(state, mun_id, faction);
        const headroom = Math.max(0, maxBrigades - existingInMun);
        if (headroom === 0) continue;

        let count = Math.floor(pool.available / batchSize);
        if (kindRequested === 'brigade') {
            if (count > headroom) count = headroom;
        }
        if (maxPerMun !== null && count > maxPerMun) count = maxPerMun;
        if (count === 0) continue;

        for (let k = 1; k <= count; k += 1) {
            const formationId = generateDeterministicFormationId(state, faction);
            const kind = kindRequested;

            // Lookups for historical accuracy
            const ordinal = existingInMun + k;
            const historicalName = options.historicalNameLookup?.(faction, mun_id, ordinal) ?? null;
            const historicalHqSid = options.historicalHqLookup?.(faction, mun_id, ordinal) ?? null;

            const name = historicalName ?? resolveFormationName(faction, mun_id, kind, ordinal);

            const baseTags = [`generated_phase_i0`, `kind:${kind}`, `mun:${mun_id}`];
            const allTags = Array.from(new Set([...baseTags, ...customTags])).sort(strictCompare);

            const cohesion = computeBaseCohesion(kind, currentTurn, faction);

            // Prioritize historical specific HQ, then municipality capital, then nothing
            const hq_sid = historicalHqSid ?? municipalityHqSettlement?.[mun_id];
            const location_osid = canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, canonicalToOperational) : undefined;

            const formation: FormationState = {
                id: formationId,
                faction,
                name,
                created_turn: currentTurn,
                status: 'active',
                assignment: null,
                tags: allTags.length > 0 ? allTags : undefined,
                kind,
                personnel: batchSize,
                readiness: 'forming',
                cohesion,
                activation_gated: true,
                activation_turn: null,
                officer_quality: getFactionDefaultOfficerQuality(faction, currentTurn),
                ...(hq_sid ? { hq_sid } : {}),
                ...(location_osid != null ? { location_osid } : {})
            };

            report.created.push({ formation_id: formationId, name, mun_id, faction, kind });
            report.formations_created += 1;
            report.manpower_committed += batchSize;

            if (applyChanges) {
                state.formations![formationId] = formation;
                pool.available -= batchSize;
                pool.committed += batchSize;
                pool.updated_turn = currentTurn;
            }
        }

        if (count > 0) report.pools_touched += 1;
    }

    report.created.sort((a, b) => strictCompare(a.formation_id, b.formation_id));
    return report;
}

export interface WiaTricklebackReport {
    formations_returned: number;
    personnel_returned: number;
}

/**
 * WIA trickleback: return wounded to formations that are out of combat.
 * Only brigades not in attack posture and not disrupted receive personnel back.
 * Deterministic: formations processed in sorted order by id.
 */
export function applyWiaTrickleback(state: GameState): WiaTricklebackReport {
    const report: WiaTricklebackReport = {
        formations_returned: 0,
        personnel_returned: 0
    };
    const formations = state.formations ?? {};
    const brigadeIds = (Object.keys(formations) as string[])
        .filter((id) => (formations[id] as FormationState | undefined)?.kind === 'brigade')
        .sort(strictCompare);

    for (const id of brigadeIds) {
        const f = formations[id] as FormationState;
        const pending = f.wounded_pending ?? 0;
        if (pending <= 0) continue;

        if (f.posture === 'attack' || f.disrupted) continue;

        const current = f.personnel ?? 0;
        if (current >= MAX_BRIGADE_PERSONNEL) continue;

        const returned = Math.min(pending, WIA_TRICKLE_RATE, MAX_BRIGADE_PERSONNEL - current);
        if (returned <= 0) continue;

        f.wounded_pending = pending - returned;
        f.personnel = current + returned;
        report.formations_returned += 1;
        report.personnel_returned += returned;
    }

    return report;
}

/**
 * Returns true if formation spawn directive is active for the current turn.
 */
export function isFormationSpawnDirectiveActive(state: GameState): boolean {
    const directive = state.formation_spawn_directive;
    if (!directive) return false;
    const turn = state.meta?.turn;
    if (typeof turn !== 'number') return false;
    if (directive.turn !== undefined && directive.turn !== null && directive.turn !== turn) return false;
    return true;
}
