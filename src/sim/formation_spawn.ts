/**
 * Shared formation spawn from militia pools (plan: militia_and_brigade_formation_system).
 * Used by CLI sim_generate_formations and by turn pipeline when formation_spawn_directive is active.
 * FORAWWV H2.4: formation creation only when explicit directive.
 */

import {
    COMBAT_REINFORCEMENT_RATE,
    getBatchSizeForFaction,
    getMaxBrigadesPerMun,
    MAX_BRIGADE_PERSONNEL,
    MIN_BRIGADE_SPAWN,
    MIN_ELIGIBLE_POPULATION_FOR_BRIGADE,
    REINFORCEMENT_RATE,
    WIA_TRICKLE_RATE
} from '../state/formation_constants.js';
import { computeBaseCohesion } from '../state/formation_lifecycle.js';
import { resolveFormationName } from '../state/formation_naming.js';
import type { FormationState, GameState, MilitiaPoolState } from '../state/game_state.js';
import { militiaPoolKey } from '../state/militia_pool_key.js';
import { strictCompare } from '../state/validateGameState.js';
import type { MunicipalityPopulation1991Map } from './phase_i/pool_population.js';
import { getEligiblePopulationCount } from './phase_i/pool_population.js';
import { isEmergentFormationSuppressed } from './recruitment_engine.js';

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
 * Reinforce existing brigades from militia pools up to MAX_BRIGADE_PERSONNEL (3000).
 * Reserve manpower for potential spawn first, then reinforce with the remainder.
 * This keeps frontage-coverage spawning prioritized over pure reinforcement.
 *
 * Rate-limited: each brigade absorbs at most REINFORCEMENT_RATE (200) per turn,
 * or COMBAT_REINFORCEMENT_RATE (100) if in active combat (posture 'attack' or disrupted).
 *
 * Readiness-gated: brigades that are 'degraded' do not reinforce (recruitment_system_design_note §5.3).
 *
 * Deterministic: formations sorted by id; each brigade takes from its (mun, faction) pool.
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

    const brigadeIds = (Object.keys(formations) as string[])
        .filter((id) => {
            const f = formations[id] as FormationState | undefined;
            return f && f.kind === 'brigade' && getMunIdFromFormation(f) !== null;
        })
        .sort(strictCompare);

    const currentTurn = state.meta.turn;
    const spawnDirectiveActive = isFormationSpawnDirectiveActive(state);

    for (const id of brigadeIds) {
        const f = formations[id] as FormationState;
        const mun_id = getMunIdFromFormation(f);
        const faction = f.faction;
        if (!mun_id || !faction) continue;

        // Readiness gate: degraded brigades do not reinforce
        if (f.readiness === 'degraded') continue;
        // Forming brigades also skip reinforcement (must reach 'active' first)
        if (f.readiness === 'forming') continue;

        const current = f.personnel ?? MIN_BRIGADE_SPAWN;
        if (current >= MAX_BRIGADE_PERSONNEL) continue;

        const key = militiaPoolKey(mun_id, faction);
        const pool = pools[key];
        if (!pool || pool.available <= 0) continue;

        // Rate limit: combat brigades get half rate
        const inCombat = f.posture === 'attack' || f.disrupted === true;
        const rate = inCombat ? COMBAT_REINFORCEMENT_RATE : REINFORCEMENT_RATE;

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
 * Respects max_brigades_per_mun as a *total* cap per (mun, faction): only spawns if existing
 * brigade count in that mun is below cap. Militia is the pool (manpower source); only brigades
 * are formed from pools (canon: militia is not a formation kind).
 */
export function spawnFormationsFromPools(
    state: GameState,
    options: SpawnFormationsOptions
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
    const { batchSize: optionsBatchSize, factionFilter, munFilter, maxPerMun, customTags, applyChanges, formationKind, municipalityHqSettlement, population1991ByMun } = options;

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
        const c = a.mun_id.localeCompare(b.mun_id);
        if (c !== 0) return c;
        return (a.pool.faction ?? '').localeCompare(b.pool.faction ?? '');
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

            const cohesion = computeBaseCohesion(kind, currentTurn);

            // Prioritize historical specific HQ, then municipality capital, then nothing
            const hq_sid = historicalHqSid ?? municipalityHqSettlement?.[mun_id];

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
                ...(hq_sid ? { hq_sid } : {})
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

    report.created.sort((a, b) => a.formation_id.localeCompare(b.formation_id));
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
