/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Execution-Only
 * DOMAIN:    Brigade lifecycle — reconstitution of destroyed formations
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Whether a destroyed brigade is eligible for reconstitution this turn
 * WRITES:    location_osid (spawn placement at home municipality)
 * READS:     lifecycle_status='destroyed', home_osid, municipality militia pool
 * MUST NOT:  move existing brigades — only place newly reconstituted formations
 *
 * UPSTREAM:  GameState brigade lifecycle (lifecycle_status), municipality manpower pools
 * DOWNSTREAM: sector assignment (brigade re-enters sector system after spawn)
 *
 * TRUTH INVARIANTS:
 * - Max 1 reconstitution per corps per turn (logistics constraint)
 * - Home municipality must remain faction-controlled for reconstitution to proceed
 * - Spawn at 40% max_personnel, cohesion 30, faction baseline morale
 *
 * MOVEMENT TIER: T5 — Lifecycle (Brigade Reconstitution) (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

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
    /**
     * ENGINE-2 Clause 2 (memo
     * docs/40_reports/proposals/20260523_ENGINE_2_BRIGADE_LIFECYCLE_DESIGN.md
     * §Part 4): true when the brigade was reconstituted via Path C
     * (faction strategic reserve fallback) instead of Path A (home pool)
     * or Path B (refugee pool). Provides traceability for the
     * reserve-drain accounting introduced by Engine-2.
     */
    via_reserve?: boolean;
    /**
     * ENGINE-2 Clause 2: when via_reserve is true, this captures the OSID
     * the reserve-reconstituted brigade was spawned at (home OSID if
     * friendly, otherwise the first sorted same-corps friendly OSID).
     */
    reserve_spawn_osid?: string;
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
 *
 * When `allowedOsids` is provided, only OSIDs in that set qualify — used by
 * the refugee placement path to enforce the same-corps territory gate at
 * OSID-selection time rather than after picking the alphabetically first
 * friendly OSID. Mixed municipalities (containing both same-corps and
 * foreign-corps friendly OSIDs) require this filter at selection time;
 * applying it after the pick can reject a valid same-corps destination
 * when the alphabetically first friendly OSID happens to be foreign-corps.
 */
function findFriendlyOsidInMunicipality(
    state: GameState,
    munId: MunicipalityId,
    faction: FactionId,
    allowedOsids?: ReadonlySet<string>,
): string | undefined {
    const pc = state.political.political_controllers ?? {};
    const prefix = `op:${munId}:`;
    // Return first alphabetically for determinism
    const candidates: string[] = [];
    for (const osid of Object.keys(pc)) {
        if (!osid.startsWith(prefix)) continue;
        if (pc[osid] !== faction) continue;
        if (allowedOsids && !allowedOsids.has(osid)) continue;
        candidates.push(osid);
    }
    candidates.sort(strictCompare);
    return candidates[0];
}

/**
 * Build the set of OSIDs that belong to a corps's own sector territory.
 *
 * Used to gate refugee placement: a brigade reconstituted via displaced-population
 * fallback (Path B) must land in territory its OWN corps already controls,
 * otherwise the spawn introduces a foreign corps formation into another corps's
 * territory and produces emergent cross-corps drift.
 *
 * Deterministic: only inspects sector ownership; iteration order does not affect
 * membership of the returned set.
 */
function corpsTerritoryOsids(state: GameState, corpsId: string): Set<string> {
    const out = new Set<string>();
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return out;
    for (const sid of Object.keys(sectors)) {
        const sector = sectors[sid];
        if (!sector || sector.corps_id !== corpsId) continue;
        for (const osid of sector.territory_osids ?? []) out.add(osid);
    }
    return out;
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
    corpsId?: string,
): { mun: MunicipalityId; osid: string } | undefined {
    const pools = state.military.militia_pools ?? {};

    // LANE D-CONTENT (Path A): read from bounded origin-dest arrivals aggregate
    // instead of full-history scan over displacement_event_log. The aggregate is
    // written at append-time via appendDisplacementEvent for cross-mun events
    // with positive settled count, which exactly matches the legacy filter
    // (origin_mun !== dest_mun, settled > 0). The legacy `evt.settled ?? evt.displaced ?? 0`
    // defensive fallback is intentionally not replicated here: every production
    // event has a numeric settled (defaulted to 0 at append sites).
    const odAgg = state.displacement?.displacement_origin_dest_arrivals;
    if (!odAgg) return undefined;
    const compositeKey = `${homeMun}|${faction}`;
    const destBucket = odAgg[compositeKey];
    if (!destBucket) return undefined;

    // Convert aggregate into ordered candidate list. O(dest_mun) per call instead
    // of O(events) full scan.
    const arrivals = new Map<string, number>();
    for (const destMun of Object.keys(destBucket)) {
        const settled = destBucket[destMun] ?? 0;
        if (settled <= 0) continue;
        arrivals.set(destMun, settled);
    }
    if (arrivals.size === 0) return undefined;

    // Same-corps territory gate: refugee placement must land within the brigade's
    // OWN corps territory. Otherwise the reconstituted brigade enters another
    // corps's territory tagged with the wrong corps_id, breaks sector ownership,
    // and produces artifactual cross-corps drift (e.g. vrs_herzegovina/vrs_drina
    // brigades reappearing at op:banja_luka:banja_luka_2 after Drina/Herzegovina
    // home OSIDs fall to RBiH — the displaced RS population's largest receiving
    // muni without this gate; banja_luka is vrs_1st_krajina territory).
    //
    // If corpsId is omitted (call sites that don't pass it), the gate is skipped.
    // If the brigade's corps territory is fully overrun (territoryOsids empty),
    // no refugee placement qualifies — brigade stays destroyed (historically
    // accurate when a corps has no territory left).
    const territoryOsids = corpsId ? corpsTerritoryOsids(state, corpsId) : null;

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
        // Find placement OSID — apply the same-corps territory gate at SELECTION
        // time so a mixed municipality whose alphabetically first friendly OSID
        // is foreign-corps but whose later friendly OSID is same-corps still
        // qualifies. Filtering after a single-OSID pick is a false-negative:
        // the helper is asked for the first allowed OSID, not the first OSID
        // (which may then be rejected even though a valid one exists later).
        const osid = findFriendlyOsidInMunicipality(
            state, destMun as MunicipalityId, faction,
            territoryOsids ?? undefined,
        );
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
            const refugee = findRefugeeMunicipality(state, homeMun, faction, poolFaction, RECONSTITUTION_MIN_POOL, corpsId);
            if (refugee) {
                reconMun = refugee.mun;
                locationOsid = refugee.osid;
                const poolKey = militiaPoolKey(reconMun, poolFaction);
                pool = pools[poolKey];
                isRefugee = true;
            }
            // If !refugee, fall through to Path C (reserve fallback) below.
        }

        // ENGINE-2 Clause 2 — Path C (faction strategic reserve fallback).
        // Reference: docs/40_reports/proposals/20260523_ENGINE_2_BRIGADE_LIFECYCLE_DESIGN.md §Part 4.
        //
        // When BOTH Path A (home OSID pool) and Path B (refugee destination
        // pool) fail to provide ≥ RECONSTITUTION_MIN_POOL manpower, draw from
        // the faction-wide strategic reserve. Half of every dissolved
        // brigade's personnel flows into state.military.strategic_reserves
        // via brigade_dissolution.ts:188-193 — without this Path C the reserve
        // is a sink with no exit door. Path C closes the loop and rescues
        // already-dead brigades when municipal pools are demographically
        // exhausted (HRHB at t188: every municipality available=0, reserve
        // is the only remaining manpower source).
        //
        // Spawn placement: prefer home OSID if friendly-controlled, else the
        // first sorted same-corps friendly OSID (deterministic via
        // strictCompare). All faction-symmetric; mechanism reads the same
        // strategic_reserves[faction] number regardless of faction id.
        if (!locationOsid || !pool || pool.available < RECONSTITUTION_MIN_POOL) {
            const reserves = state.military.strategic_reserves ?? {};
            const reserveAvailable = reserves[faction] ?? 0;
            if (reserveAvailable < RECONSTITUTION_MIN_POOL) continue;

            const maxPersC = f.max_personnel ?? 2000;
            const targetPersonnelC = Math.floor(maxPersC * RECONSTITUTION_PERSONNEL_FRACTION);
            const reserveDraw = Math.min(targetPersonnelC, reserveAvailable);
            if (reserveDraw < RECONSTITUTION_MIN_POOL) continue;

            // Choose spawn OSID: home if friendly, else first sorted same-corps
            // friendly OSID. If the brigade's corps has zero friendly territory
            // and home is hostile, no spawn is possible — brigade stays
            // destroyed (historically accurate: a corps with no held ground
            // cannot reform a destroyed brigade).
            const homeFriendly = f.home_osid != null
                && state.political.political_controllers?.[f.home_osid] === faction;
            let spawnOsidC: string | undefined;
            if (homeFriendly && f.home_osid) {
                spawnOsidC = f.home_osid;
            } else {
                const territoryOsids = corpsTerritoryOsids(state, corpsId);
                const pc = state.political.political_controllers ?? {};
                const sameCorpsFriendly: string[] = [];
                for (const osid of territoryOsids) {
                    if (pc[osid] === faction) sameCorpsFriendly.push(osid);
                }
                sameCorpsFriendly.sort(strictCompare);
                spawnOsidC = sameCorpsFriendly[0];
            }
            if (!spawnOsidC) continue;

            // Drain reserve (mutation), then reactivate the brigade.
            (state.military.strategic_reserves as Record<string, number>)[faction]
                = reserveAvailable - reserveDraw;

            f.status = 'active';
            f.lifecycle_status = undefined;
            f.personnel = reserveDraw;
            const reconHistC = ensureBrigadeHistory(f);
            if (reserveDraw > reconHistC.peak_personnel) reconHistC.peak_personnel = reserveDraw;

            f.cohesion = RECONSTITUTION_COHESION;
            // No refugee morale bonus on reserve path — these are cadre cadre
            // dispersed from the faction-wide reserve, not motivated refugees.
            f.morale = RECONSTITUTION_MORALE[faction];
            f.readiness = 'forming';
            f.location_osid = spawnOsidC;
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
                personnel_spawned: reserveDraw,
                pool_drawn: reserveDraw,
                turns_since_destruction: destructionTurn != null ? turn - destructionTurn : 0,
                via_reserve: true,
                reserve_spawn_osid: spawnOsidC,
            });
            report.reconstituted_count++;
            continue;
        }

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
