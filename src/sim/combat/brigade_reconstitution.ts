/**
 * Brigade reconstitution — reform destroyed brigades from municipality manpower.
 *
 * Historical: ARBiH brigades that were mauled didn't permanently vanish if their
 * municipality still had manpower. The surviving cadre served as a nucleus around
 * which new recruits coalesced. The 28th Division was reconstituted from remnants
 * after Srebrenica survivors reached Tuzla. The 17th Krajina Brigade reformed
 * after losing Ključ.
 *
 * Mechanics:
 * - Destroyed brigades (lifecycle_status='destroyed') are eligible after a delay
 * - Home municipality must still be faction-controlled
 * - Municipality militia pool must have sufficient manpower
 * - Reconstituted at 40% of max_personnel, reduced cohesion (30), faction baseline morale
 * - Max 1 reconstitution per corps per turn (logistics constraint)
 * - Deterministic: sorted iteration by formation ID via strictCompare.
 */

import type { FactionId, FormationId, FormationState, GameState, MunicipalityId } from '../../state/game_state.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';
import { ensureBrigadeHistory } from './brigade_history_recorder.js';

// ── Constants ──────────────────────────────────────────────────────────────

/** Turns after destruction before reconstitution is eligible. */
export const RECONSTITUTION_DELAY_TURNS = 5;

/** Fraction of max_personnel the reconstituted brigade spawns with. */
export const RECONSTITUTION_PERSONNEL_FRACTION = 0.40;

/** Minimum manpower required in the municipality pool to reconstitute. */
export const RECONSTITUTION_MIN_POOL = 200;

/** Cohesion of a reconstituted brigade (green unit with cadre nucleus). */
export const RECONSTITUTION_COHESION = 30;

/** Officer quality penalty for reconstituted units (worse than original). */
export const RECONSTITUTION_OFFICER_QUALITY_PENALTY = 0.10;

/** Max reconstitutions per corps per turn. */
export const RECONSTITUTION_MAX_PER_CORPS = 1;

/** Morale baselines by faction for reconstituted brigades. */
const RECONSTITUTION_MORALE: Record<FactionId, number> = {
    RBiH: 45,
    RS: 55,
    HRHB: 50,
};

/** Morale bonus for refugee brigades (displaced population fights harder). */
const REFUGEE_MORALE_BONUS = 5;

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReconstitutionEntry {
    id: string;
    name: string;
    faction: string;
    corps_id: string;
    home_mun: string;
    personnel_spawned: number;
    pool_drawn: number;
    turns_since_destruction: number;
    /** Set when reconstituted from displaced population at a receiving municipality. */
    refugee_mun?: string;
}

export interface ReconstitutionReport {
    reconstituted_count: number;
    reconstituted_brigades: ReconstitutionEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if a municipality has at least one OSID controlled by the given faction.
 */
function isMunicipalityControlled(state: GameState, munId: MunicipalityId, faction: FactionId): boolean {
    const pc = state.political.political_controllers ?? {};
    const prefix = `op:${munId}:`;
    for (const osid of Object.keys(pc)) {
        if (osid.startsWith(prefix) && pc[osid] === faction) {
            return true;
        }
    }
    return false;
}

/**
 * Find the first friendly-controlled OSID in the municipality for placement.
 */
function findFriendlyOsidInMunicipality(state: GameState, munId: MunicipalityId, faction: FactionId): string | undefined {
    const pc = state.political.political_controllers ?? {};
    const prefix = `op:${munId}:`;
    // Return first alphabetically for determinism
    const candidates: string[] = [];
    for (const osid of Object.keys(pc)) {
        if (osid.startsWith(prefix) && pc[osid] === faction) {
            candidates.push(osid);
        }
    }
    candidates.sort(strictCompare);
    return candidates[0];
}

/**
 * Find the best receiving municipality for a refugee brigade.
 * Scans displacement_event_log for the municipality that received the most
 * displaced population from the brigade's home municipality and is still
 * controlled by the brigade's faction with adequate militia pool.
 *
 * Historical: Srebrenica survivors regrouped in Tuzla; Ključ refugees reformed
 * in Travnik; Ilidža Bosniaks coalesced around Sarajevo.
 */
function findRefugeeMunicipality(
    state: GameState,
    homeMun: MunicipalityId,
    faction: FactionId,
    poolFaction: FactionId,
    minPool: number,
): { mun: MunicipalityId; osid: string } | undefined {
    const eventLog = state.displacement?.displacement_event_log;
    if (!eventLog || eventLog.length === 0) return undefined;
    const pools = state.military.militia_pools ?? {};

    // Tally displaced arrivals by destination municipality
    const arrivals = new Map<string, number>();
    for (const evt of eventLog) {
        if (evt.origin_mun !== homeMun) continue;
        if (evt.ethnicity !== faction) continue;
        if (!evt.dest_mun || evt.dest_mun === homeMun) continue;
        const settled = evt.settled ?? evt.displaced ?? 0;
        if (settled <= 0) continue;
        arrivals.set(evt.dest_mun, (arrivals.get(evt.dest_mun) ?? 0) + settled);
    }
    if (arrivals.size === 0) return undefined;

    // Sort by arrivals descending, then alphabetically for determinism
    const candidates = [...arrivals.entries()]
        .sort((a, b) => b[1] - a[1] || strictCompare(a[0], b[0]));

    for (const [destMun] of candidates) {
        // Must be faction-controlled
        if (!isMunicipalityControlled(state, destMun as MunicipalityId, faction)) continue;
        // Must have adequate pool
        const poolKey = militiaPoolKey(destMun as MunicipalityId, poolFaction);
        const pool = pools[poolKey];
        if (!pool || pool.available < minPool) continue;
        // Find placement OSID
        const osid = findFriendlyOsidInMunicipality(state, destMun as MunicipalityId, faction);
        if (!osid) continue;
        return { mun: destMun as MunicipalityId, osid };
    }
    return undefined;
}

// ── Main ───────────────────────────────────────────────────────────────────

/**
 * Reconstitute destroyed brigades from municipality manpower pools.
 * Returns a report of all reconstituted brigades.
 */
export function reconstituteBrigades(state: GameState): ReconstitutionReport {
    const report: ReconstitutionReport = { reconstituted_count: 0, reconstituted_brigades: [] };
    const turn = state.meta?.turn ?? 0;
    const formations = state.military.formations ?? {};
    const pools = state.military.militia_pools ?? {};

    // Track reconstitutions per corps this turn
    const reconByCorps = new Map<string, number>();

    // Iterate destroyed formations in deterministic order
    const formationIds = Object.keys(formations).sort(strictCompare);

    for (const fid of formationIds) {
        const f = formations[fid];
        if (!f) continue;
        if (f.status !== 'inactive') continue;
        if (f.lifecycle_status !== 'destroyed') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;

        // Delay check: must have been destroyed long enough ago
        // Use the turn the formation was last modified (created_turn tracks original creation;
        // we need destruction turn). Since we don't have a dedicated field, approximate:
        // the formation was destroyed when personnel was zeroed. We use a state field if available,
        // otherwise check if enough turns have passed since creation.
        const destructionTurn = f.destruction_turn;
        if (destructionTurn != null) {
            if (turn - destructionTurn < RECONSTITUTION_DELAY_TURNS) continue;
        } else {
            // No destruction_turn recorded — skip (this formation was destroyed before
            // the reconstitution system existed). We'll record it going forward.
            continue;
        }

        const faction = f.faction;
        if (!faction) continue;
        const corpsId = f.corps_id;
        if (!corpsId) continue;

        // Corps cap
        const corpsCount = reconByCorps.get(corpsId) ?? 0;
        if (corpsCount >= RECONSTITUTION_MAX_PER_CORPS) continue;

        // Municipality control check — try home mun first, then refugee fallback
        const homeMun = f.origin_mun ?? extractMunFromHomeOsid(f.home_osid);
        if (!homeMun) continue;
        const poolFaction = f.recruit_pool_faction ?? faction;

        let reconMun = homeMun;
        let locationOsid: string | undefined;
        let pool: { available: number; committed: number; updated_turn?: number } | undefined;
        let isRefugee = false;

        // Check if home OSID is still faction-controlled. Having 1 of 5 OSIDs in a
        // municipality doesn't mean the brigade can reconstitute there — the specific
        // home area must be accessible, and the local pool must have manpower.
        const homeOsidControlled = f.home_osid
            ? (state.political.political_controllers?.[f.home_osid] === faction)
            : isMunicipalityControlled(state, homeMun, faction);
        const homePoolKey = militiaPoolKey(homeMun, poolFaction);
        const homePool = pools[homePoolKey];
        const homePoolViable = homePool != null && homePool.available >= RECONSTITUTION_MIN_POOL;

        if (homeOsidControlled && homePoolViable) {
            // Path A: Home OSID still held with adequate pool — reconstitute in place
            pool = homePool;
            locationOsid = findFriendlyOsidInMunicipality(state, homeMun, faction);
        } else {
            // Path B: Home municipality lost — find where displaced population went.
            // Historical: 28th Division reformed in Tuzla from Srebrenica survivors;
            // Ključ refugees reformed in Travnik; Ilidža Bosniaks joined Sarajevo units.
            const refugee = findRefugeeMunicipality(state, homeMun, faction, poolFaction, RECONSTITUTION_MIN_POOL);
            if (!refugee) continue;
            reconMun = refugee.mun;
            locationOsid = refugee.osid;
            const poolKey = militiaPoolKey(reconMun, poolFaction);
            pool = pools[poolKey];
            isRefugee = true;
        }

        if (!locationOsid || !pool || pool.available < RECONSTITUTION_MIN_POOL) continue;

        // Calculate personnel
        const maxPers = f.max_personnel ?? 2000;
        const targetPersonnel = Math.floor(maxPers * RECONSTITUTION_PERSONNEL_FRACTION);
        const poolDraw = Math.min(targetPersonnel, pool.available);
        if (poolDraw < RECONSTITUTION_MIN_POOL) continue;

        // ── Reconstitute ──
        // Draw from pool
        pool.available -= poolDraw;
        pool.committed += poolDraw;
        pool.updated_turn = turn;

        // Reactivate formation
        f.status = 'active';
        f.lifecycle_status = undefined;
        f.personnel = poolDraw;
        // Track peak personnel after reconstitution
        const reconHist = ensureBrigadeHistory(f);
        if (poolDraw > reconHist.peak_personnel) reconHist.peak_personnel = poolDraw;

        f.cohesion = RECONSTITUTION_COHESION;
        // Refugee brigades get a morale bonus — displaced population fights with purpose
        f.morale = RECONSTITUTION_MORALE[faction] + (isRefugee ? REFUGEE_MORALE_BONUS : 0);
        f.readiness = 'forming';
        f.location_osid = locationOsid;
        f.entrenchment_turns = 0;
        f.disrupted_turns = 0;
        f.defense_streak = 0;
        f.destruction_turn = undefined;
        f.officer_quality = Math.max(0.05, (f.officer_quality ?? 0.3) - RECONSTITUTION_OFFICER_QUALITY_PENALTY);

        reconByCorps.set(corpsId, corpsCount + 1);

        report.reconstituted_brigades.push({
            id: fid,
            name: f.name ?? fid,
            faction,
            corps_id: corpsId,
            home_mun: homeMun,
            personnel_spawned: poolDraw,
            pool_drawn: poolDraw,
            turns_since_destruction: destructionTurn != null ? turn - destructionTurn : 0,
            refugee_mun: isRefugee ? reconMun : undefined,
        });
        report.reconstituted_count++;
    }

    return report;
}

/**
 * Extract municipality ID from home_osid (format: "op:municipality:slug").
 */
function extractMunFromHomeOsid(homeOsid: string | undefined): MunicipalityId | undefined {
    if (!homeOsid) return undefined;
    const parts = homeOsid.split(':');
    if (parts.length >= 3 && parts[0] === 'op') {
        return parts[1] as MunicipalityId;
    }
    return undefined;
}
