/**
 * Strategic Reserve: faction-level manpower redistribution.
 *
 * Problem: municipality-locked pools create a topology mismatch — rear municipalities
 * accumulate large surplus pools (brigades at max capacity) while front-line municipalities
 * have empty pools (brigades consume faster than mobilization generates). Increasing
 * mobilization surge factors only adds to the rear surplus.
 *
 * Solution: after brigade reinforcement, sweep excess pool.available above a threshold
 * into a faction-wide strategic reserve. Then run a second reinforcement pass where
 * under-strength brigades draw from the reserve at reduced rate (logistics friction).
 *
 * Historical basis: all three factions redistributed manpower across their territory.
 * VRS rotated units between fronts, ARBiH moved forces to Sarajevo/corridor operations,
 * HVO shuttled between Herzegovina and Central Bosnia.
 *
 * Pipeline order:
 *   phase-ii-ongoing-mobilization → phase-ii-brigade-reinforcement →
 *   phase-ii-strategic-reserve-collection → phase-ii-strategic-reserve-reinforcement
 *
 * Deterministic: sorted pool keys, sorted formation ids, strictCompare throughout.
 */

import {
    COMBAT_REINFORCEMENT_RATE,
    getFactionReinforcementMult,
    getMaxPersonnel,
    isEligibleForExternalReinforcement,
    isInCombat,
    MAX_BRIGADE_PERSONNEL,
    MIN_BRIGADE_SPAWN,
    REINFORCEMENT_RATE
} from '../../state/formation_constants.js';
import type { FormationState, GameState, MilitiaPoolState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { ensureBrigadeHistory } from './brigade_history_recorder.js';
import { getOsidPriority, priorityRank } from './strategic_priorities.js';
import { emitPersonnelWriterRecord, isPersonnelDiagnosticSelected } from './personnel_diagnostic.js';
import { RECONSTITUTION_PERSONNEL_FRACTION } from './brigade_reconstitution.js';
import { isUnderManpowerExhaustionPenalty } from './cohesion_drift.js';
import { isReasonCodeTopicEnabled } from './reason_code_debug.js';
import { REINFORCEMENT_ALLOCATION_PREFIX } from './reinforcement_allocation_diagnostic.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { stableStringify } from '../../utils/stable_json.js';

/**
 * Pool.available above this flows to faction reserve after reinforcement.
 * Keeps a local buffer so the municipality can still support local spawn/reinforcement.
 */
const OVERFLOW_THRESHOLD = 5000;

/**
 * Fraction of normal reinforcement rate when drawing from reserve.
 * Represents logistics friction — moving manpower across municipality boundaries
 * is slower than local reinforcement.
 *
 * Faction-specific: ARBiH had poor logistics/command structure until mid-1994
 * professionalization. VRS/HVO had better redistribution capacity (JNA inheritance
 * and Croatian support respectively).
 */
const RESERVE_DRAW_RATE_MULT_DEFAULT = 0.25;
const FACTION_RESERVE_DRAW_RATE: Record<string, number> = {
    RBiH: 0.15,    // n1065: 0.02 made reserve a dead pool (14k stranded). 0.15 allows redistribution to depleted brigades while still reflecting weaker ARBiH logistics vs JNA-inherited RS.
    RS: 0.25,      // JNA logistics inheritance
    HRHB: 0.25     // Croatian support, compact territory
};

// ─── Collection ─────────────────────────────────────────────────────────────

export interface StrategicReserveCollectionReport {
    pools_overflowed: number;
    manpower_collected: number;
    by_faction: Record<string, number>;
    orphan_pools_drained: number;
    orphan_manpower_collected: number;
    orphan_by_faction: Record<string, number>;
}

/**
 * Collect excess pool.available into faction strategic reserves.
 * Runs AFTER brigade reinforcement — whatever's left above threshold is genuine surplus.
 * Mutates state.militia_pools and state.strategic_reserves.
 */
export function collectStrategicReserves(state: GameState): StrategicReserveCollectionReport {
    const report: StrategicReserveCollectionReport = {
        pools_overflowed: 0,
        manpower_collected: 0,
        by_faction: {},
        orphan_pools_drained: 0,
        orphan_manpower_collected: 0,
        orphan_by_faction: {}
    };

    if (!state.military.militia_pools) return report;
    const pools = state.military.militia_pools as Record<string, MilitiaPoolState>;
    if (!state.military.strategic_reserves) state.military.strategic_reserves = {};
    const reserves = state.military.strategic_reserves as Record<string, number>;

    const poolKeys = Object.keys(pools).sort(strictCompare);
    for (const key of poolKeys) {
        const pool = pools[key];
        if (!pool || pool.available < OVERFLOW_THRESHOLD) continue;
        const faction = pool.faction;
        if (!faction) continue;

        const excess = pool.available - OVERFLOW_THRESHOLD;
        pool.available -= excess;
        pool.committed = (pool.committed ?? 0) + excess;
        reserves[faction] = (reserves[faction] ?? 0) + excess;

        report.pools_overflowed += 1;
        report.manpower_collected += excess;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + excess;
    }

    // Orphan pool collection: minority pools in enemy-controlled municipalities.
    // These represent displaced populations that fled to friendly territory.
    // Drain to strategic reserve rather than leaving stranded.
    const pc = state.political?.political_controllers ?? {};
    for (const key of poolKeys) {
        const pool = pools[key];
        if (!pool || pool.available <= 0 || pool.committed > 0) continue;
        const faction = pool.faction;
        if (!faction) continue;
        const munId = pool.mun_id;

        // Check if faction controls any OSID in this municipality
        let factionHasPresence = false;
        for (const osid of Object.keys(pc).sort(strictCompare)) {
            if (osid.startsWith('op:' + munId + ':') && pc[osid] === faction) {
                factionHasPresence = true;
                break;
            }
        }
        if (factionHasPresence) continue;

        // Drain to strategic reserve
        const excess = pool.available;
        pool.available = 0;
        reserves[faction] = (reserves[faction] ?? 0) + excess;

        report.orphan_pools_drained += 1;
        report.orphan_manpower_collected += excess;
        report.orphan_by_faction[faction] = (report.orphan_by_faction[faction] ?? 0) + excess;
    }

    return report;
}

// ─── Reinforcement from Reserve ─────────────────────────────────────────────

export interface IdleReplacementFactionReport {
    idle_pools: number;
    /** Weariness loss of this faction's idle pools this turn (the offer). */
    offer: number;
    placed: number;
    /** [formation id, personnel before, men placed], in placement order. */
    recipients: Array<[string, number, number]>;
    /** False while the faction is under its own manpower-exhaustion penalty. */
    route_open: boolean;
}

export interface StrategicReserveReinforcementReport {
    formations_reinforced: number;
    manpower_distributed: number;
    by_faction: Record<string, number>;
    /** Idle-replacement stage (OZ-ENGINE), by pool faction. Report only, not state. */
    idle_replacement_by_faction: Record<string, IdleReplacementFactionReport>;
}

/**
 * The reserve draw rate for one brigade: the normal (or in-combat) reinforcement rate, times the
 * faction's reinforcement multiplier, times the pool faction's reserve draw multiplier.
 */
export function getReserveDrawRate(state: GameState, f: FormationState, poolFaction: string): number {
    const factionMult = getFactionReinforcementMult(f.faction, state.meta?.turn ?? 0, state.military.war_timeline);
    const drawMult = FACTION_RESERVE_DRAW_RATE[poolFaction] ?? RESERVE_DRAW_RATE_MULT_DEFAULT;
    const baseRate = isInCombat(f) ? COMBAT_REINFORCEMENT_RATE : REINFORCEMENT_RATE;
    return Math.max(1, Math.floor(baseRate * factionMult * drawMult));
}

function homeMunOf(f: FormationState): string | null {
    for (const t of f.tags ?? []) if (typeof t === 'string' && t.startsWith('mun:')) return t.slice(4);
    return null;
}

/**
 * Idle pools: at least one active brigade is homed on the pool (its `mun:` tag and pool faction),
 * and every one of them is at its personnel cap. A pool with no brigade is not idle.
 * Sorted pool keys.
 */
export function findIdlePoolKeys(state: GameState): string[] {
    const formations = state.military.formations ?? {};
    const homed: Record<string, { n: number; full: number }> = {};
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id] as FormationState | undefined;
        if (!f || f.kind !== 'brigade' || f.status !== 'active') continue;
        const mun = homeMunOf(f);
        if (!mun) continue;
        const key = militiaPoolKey(mun, f.recruit_pool_faction ?? f.faction);
        const h = (homed[key] ??= { n: 0, full: 0 });
        h.n += 1;
        if ((f.personnel ?? 0) >= getMaxPersonnel(f)) h.full += 1;
    }
    const pools = (state.military.militia_pools ?? {}) as Record<string, MilitiaPoolState>;
    return Object.keys(pools).sort(strictCompare).filter((key) => {
        const h = homed[key];
        return !!pools[key]?.faction && !!h && h.n > 0 && h.full === h.n;
    });
}

/**
 * Second reinforcement pass: under-strength brigades draw from faction strategic reserve.
 * Only brigades that couldn't fully reinforce from their home pool benefit.
 * Rate-limited at RESERVE_DRAW_RATE_MULT of normal reinforcement rate.
 *
 * Runs AFTER reserve collection so freshly collected surplus is available same turn.
 * Deterministic: formations sorted by id.
 * `baseDir` (the turn's `dataBaseDir`) locates data/source/strategic_priorities.json;
 * omitted, the loader falls back to the process cwd.
 */
export function reinforceFromStrategicReserves(
    state: GameState,
    baseDir?: string,
    wearinessLossByPool?: Readonly<Record<string, number>>
): StrategicReserveReinforcementReport {
    const report: StrategicReserveReinforcementReport = {
        formations_reinforced: 0,
        manpower_distributed: 0,
        by_faction: {},
        idle_replacement_by_faction: {}
    };

    if (!state.military.strategic_reserves) return report;
    const reserves = state.military.strategic_reserves as Record<string, number>;
    const formations = state.military.formations ?? {};
    const currentTurn = state.meta?.turn ?? 0;

    // Synthesis §3 E-B4: priority-aware allocation order.
    // Sort formations so core-tier receivers draw first, corridor second,
    // periphery last. Within a tier, fall back to strictCompare on id for
    // deterministic ordering. Iteration order does NOT change rates — only
    // which brigades drain a limited reserve first when supply is short.
    const sortedFormationIds = Object.keys(formations).sort((a, b) => {
        const fa = formations[a] as FormationState | undefined;
        const fb = formations[b] as FormationState | undefined;
        const oa = fa?.location_osid;
        const ob = fb?.location_osid;
        const fnA = fa?.recruit_pool_faction ?? fa?.faction;
        const fnB = fb?.recruit_pool_faction ?? fb?.faction;
        const ra = (oa && fnA) ? priorityRank(getOsidPriority(oa, fnA, baseDir)) : 2;
        const rb = (ob && fnB) ? priorityRank(getOsidPriority(ob, fnB, baseDir)) : 2;
        if (ra !== rb) return ra - rb;
        return strictCompare(a, b);
    });
    const servedByReserve = new Set<string>();
    for (const id of sortedFormationIds) {
        const f = formations[id] as FormationState | undefined;
        if (!f) continue;

        // Only brigades (not militia detachments/battalions — those are local by nature)
        if (f.kind !== 'brigade') continue;
        if (!isEligibleForExternalReinforcement(state, f)) continue;

        const faction = f.faction;
        if (!faction) continue;

        const current = f.personnel ?? MIN_BRIGADE_SPAWN;
        const cap = getMaxPersonnel(f);
        if (current >= cap) continue;

        // Check if faction has reserve available
        const poolFaction = f.recruit_pool_faction ?? faction;
        const reserveAvail = reserves[poolFaction] ?? 0;
        if (reserveAvail <= 0) continue;

        // Rate limit: reduced rate for reserve draws (logistics friction)
        const inCombat = isInCombat(f);
        const rate = getReserveDrawRate(state, f, poolFaction);

        const need = Math.min(cap - current, rate);
        const transfer = Math.min(need, reserveAvail);
        if (transfer <= 0) continue;

        (f as FormationState & { personnel: number }).personnel = current + transfer;
        if (isPersonnelDiagnosticSelected(id)) emitPersonnelWriterRecord(id, {
            source: 'strategic_reserve.reinforce', completed_turn: currentTurn,
            before: current, cap, reserve_faction: poolFaction, reserve_before: reserveAvail,
            in_combat: inCombat, rate, need, transfer, after: current + transfer,
            reserve_after: reserveAvail - transfer,
        });
        // Track peak personnel after strategic reserve draw
        const newPers = current + transfer;
        const hist = ensureBrigadeHistory(f);
        if (newPers > hist.peak_personnel) hist.peak_personnel = newPers;

        reserves[poolFaction] -= transfer;
        servedByReserve.add(id);

        report.formations_reinforced += 1;
        report.manpower_distributed += transfer;
        report.by_faction[faction] = (report.by_faction[faction] ?? 0) + transfer;
    }

    if (wearinessLossByPool) {
        placeIdleReplacements(state, sortedFormationIds, servedByReserve, wearinessLossByPool, baseDir, report);
    }
    return report;
}

/**
 * Idle replacement (OZ-ENGINE, Fable consult 12 appendix A; Systems Manual "Idle replacement").
 * The men war weariness took this turn from an idle pool are offered, before they are lost,
 * to the faction's eligible brigades under floor(cap × RECONSTITUTION_PERSONNEL_FRACTION) that the
 * reserve did not serve this turn. Order: the reserve's priority tier, then personnel ÷ cap
 * ascending, then id. Amount: min(reserve draw rate, gap to the line, offer left). Closed for a
 * faction under its own manpower-exhaustion penalty. Placed men are booked as `committed` of the
 * donor pool (pools in sorted key order); `available` and the reserve never change. Men not placed
 * stay lost, as before. Nothing carries to the next turn.
 */
function placeIdleReplacements(
    state: GameState,
    tierSortedIds: readonly string[],
    servedByReserve: ReadonlySet<string>,
    wearinessLossByPool: Readonly<Record<string, number>>,
    baseDir: string | undefined,
    report: StrategicReserveReinforcementReport
): void {
    const pools = (state.military.militia_pools ?? {}) as Record<string, MilitiaPoolState>;
    const formations = state.military.formations ?? {};
    const byFaction = report.idle_replacement_by_faction;
    const factionReport = (fa: string): IdleReplacementFactionReport =>
        (byFaction[fa] ??= { idle_pools: 0, offer: 0, placed: 0, recipients: [], route_open: true });

    // The route is closed while the faction is under its own exhaustion penalty, judged before any placement.
    for (const key of Object.keys(pools).sort(strictCompare)) {
        const fa = pools[key]?.faction;
        if (!fa || byFaction[fa]) continue;
        factionReport(fa).route_open = !isUnderManpowerExhaustionPenalty(state, fa);
    }

    const offers: Record<string, Array<{ key: string; left: number }>> = {};
    for (const key of findIdlePoolKeys(state)) {
        const fa = pools[key].faction;
        if (!fa) continue;
        const fr = factionReport(fa);
        fr.idle_pools += 1;
        const loss = wearinessLossByPool[key] ?? 0;
        if (loss <= 0) continue;
        fr.offer += loss;
        (offers[fa] ??= []).push({ key, left: loss });
    }

    const candidates: Array<{ f: FormationState; rank: number; ratio: number; poolFaction: string; target: number; current: number }> = [];
    for (const id of tierSortedIds) {
        const f = formations[id] as FormationState | undefined;
        if (!f || f.kind !== 'brigade' || !f.faction) continue;
        if (!isEligibleForExternalReinforcement(state, f)) continue;
        const cap = getMaxPersonnel(f);
        const current = f.personnel ?? MIN_BRIGADE_SPAWN;
        const target = Math.floor(cap * RECONSTITUTION_PERSONNEL_FRACTION);
        if (current >= target) continue;
        if (servedByReserve.has(id)) continue;
        const poolFaction = f.recruit_pool_faction ?? f.faction;
        const rank = f.location_osid ? priorityRank(getOsidPriority(f.location_osid, poolFaction, baseDir)) : 2;
        candidates.push({ f, rank, ratio: current / cap, poolFaction, target, current });
    }
    candidates.sort((a, b) => (a.rank - b.rank) || (a.ratio - b.ratio) || strictCompare(a.f.id, b.f.id));

    const currentTurn = state.meta?.turn ?? 0;
    for (const c of candidates) {
        if (byFaction[c.poolFaction] && !byFaction[c.poolFaction].route_open) continue;
        const queue = offers[c.poolFaction];
        if (!queue || queue.length === 0) continue;
        const rate = getReserveDrawRate(state, c.f, c.poolFaction);
        let want = Math.min(c.target - c.current, rate);
        let placed = 0;
        while (want > 0 && queue.length > 0) {
            const o = queue[0];
            const take = Math.min(want, o.left);
            o.left -= take;
            want -= take;
            placed += take;
            pools[o.key].committed = (pools[o.key].committed ?? 0) + take;
            if (o.left <= 0) queue.shift();
        }
        if (placed <= 0) continue;
        const after = c.current + placed;
        (c.f as FormationState & { personnel: number }).personnel = after;
        if (isPersonnelDiagnosticSelected(c.f.id)) emitPersonnelWriterRecord(c.f.id, {
            source: 'strategic_reserve.idle_replacement', completed_turn: currentTurn,
            before: c.current, cap: getMaxPersonnel(c.f), pool_faction: c.poolFaction,
            rate, target: c.target, transfer: placed, after,
        });
        const hist = ensureBrigadeHistory(c.f);
        if (after > hist.peak_personnel) hist.peak_personnel = after;
        const fr = factionReport(c.poolFaction);
        fr.placed += placed;
        fr.recipients.push([c.f.id, c.current, placed]);
        report.formations_reinforced += 1;
        report.manpower_distributed += placed;
        report.by_faction[c.f.faction] = (report.by_faction[c.f.faction] ?? 0) + placed;
    }

    if (isReasonCodeTopicEnabled('reinforcement_allocation')) {
        for (const fa of Object.keys(byFaction).sort(strictCompare)) {
            const fr = byFaction[fa];
            console.log(`${REINFORCEMENT_ALLOCATION_PREFIX} idle_replacement ${stableStringify({
                turn: currentTurn, faction: fa, idle_pools: fr.idle_pools, offer: fr.offer,
                placed: fr.placed, recipients: fr.recipients, route: fr.route_open ? 'open' : 'closed',
            })}`);
        }
    }
}
