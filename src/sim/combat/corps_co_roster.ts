/**
 * Corps commander schedule (command-loop proposal §5E, owner decision 3).
 *
 * A dated, sourced schedule decides who commands each corps unless the President
 * replaced the commander or the commander fell. `findBestReplacement` in
 * officer_system.ts remains the counterfactual fallback when the schedule has no
 * holder (or the scheduled holder is dead, captured or not yet in play).
 *
 * Data: data/scenarios/corps_co_roster.json, keyed by corps id. Faction-symmetric by
 * construction (FORAWWV §X.4): the mechanism has no faction branches; any faction's
 * corps can carry a schedule. The file ships with an EMPTY schedule; with no entries
 * every function here returns "no holder" / "no fate" and the succession pass is
 * byte-identical to the pre-schedule engine. The dates are the post-freeze
 * calibration pass (lane L8, BC17).
 *
 * Pure and deterministic: no I/O, no RNG; schedules are sorted by tenure_start at
 * validation, and lookups iterate corps ids in strictCompare order.
 */

import { strictCompare } from '../../state/validateGameState.js';

/** What happened to the officer at the end of this tenure in history. */
export type CorpsCoHistoricalFate = 'survived' | 'killed' | 'relieved';

export interface CorpsCoTenure {
    officer_id: string;
    /** First turn of the tenure (week 0 = 6 April 1992). */
    tenure_start: number;
    /** Exclusive end turn; null = to the end of the war. */
    tenure_end: number | null;
    /**
     * Fate at the end of this tenure. 'survived' also means the officer survived the
     * war, so he never accrues the casualty-exposure clock (he can still be killed by
     * a scheduled 'killed' tenure elsewhere, or by map events outside this clock).
     * 'killed': the officer dies at tenure_end. 'relieved': removed from command at
     * tenure_end.
     */
    historical_fate: CorpsCoHistoricalFate;
    /** Citation (ICTY first, then Balkan Battlegrounds). Required. */
    source: string;
}

export interface CorpsCoRosterEntry {
    schedule: CorpsCoTenure[];
}

export interface CorpsCoRoster {
    schema_version: number;
    description?: string;
    rosters: Record<string, CorpsCoRosterEntry>;
}

export const EMPTY_CORPS_CO_ROSTER: CorpsCoRoster = { schema_version: 1, rosters: {} };

export class CorpsCoRosterDataError extends Error {}

const FATES: readonly CorpsCoHistoricalFate[] = ['survived', 'killed', 'relieved'];

/**
 * Validate a raw roster. Throws CorpsCoRosterDataError on malformed data so a bad
 * schedule never runs half-applied. Optional reference sets check that officer and
 * corps ids exist (used by the data test against the shipped officer and OOB files).
 */
export function validateCorpsCoRoster(
    raw: unknown,
    refs?: { officerIds?: ReadonlySet<string>; corpsIds?: ReadonlySet<string> },
): CorpsCoRoster {
    if (!raw || typeof raw !== 'object') throw new CorpsCoRosterDataError('roster must be an object');
    const r = raw as Record<string, unknown>;
    if (typeof r.schema_version !== 'number') throw new CorpsCoRosterDataError('schema_version required');
    if (!r.rosters || typeof r.rosters !== 'object' || Array.isArray(r.rosters)) {
        throw new CorpsCoRosterDataError('rosters must be an object keyed by corps id');
    }
    const rosters: Record<string, CorpsCoRosterEntry> = {};
    const officerFates = new Map<string, CorpsCoHistoricalFate[]>();
    for (const corpsId of Object.keys(r.rosters as object).sort(strictCompare)) {
        if (refs?.corpsIds && !refs.corpsIds.has(corpsId)) throw new CorpsCoRosterDataError(`${corpsId}: unknown corps id`);
        const entry = (r.rosters as Record<string, unknown>)[corpsId] as Record<string, unknown> | undefined;
        if (!entry || !Array.isArray(entry.schedule)) throw new CorpsCoRosterDataError(`${corpsId}: schedule array required`);
        const schedule: CorpsCoTenure[] = entry.schedule.map((t, i) => {
            const x = (t ?? {}) as Record<string, unknown>;
            const where = `${corpsId}[${i}]`;
            if (typeof x.officer_id !== 'string' || !x.officer_id) throw new CorpsCoRosterDataError(`${where}: officer_id required`);
            if (refs?.officerIds && !refs.officerIds.has(x.officer_id)) throw new CorpsCoRosterDataError(`${where}: unknown officer ${x.officer_id}`);
            if (typeof x.tenure_start !== 'number' || !Number.isInteger(x.tenure_start) || x.tenure_start < 0) {
                throw new CorpsCoRosterDataError(`${where}: tenure_start must be a non-negative integer`);
            }
            if (x.tenure_end !== null && (typeof x.tenure_end !== 'number' || !Number.isInteger(x.tenure_end) || x.tenure_end <= x.tenure_start)) {
                throw new CorpsCoRosterDataError(`${where}: tenure_end must be null or an integer after tenure_start`);
            }
            if (!FATES.includes(x.historical_fate as CorpsCoHistoricalFate)) throw new CorpsCoRosterDataError(`${where}: historical_fate must be one of ${FATES.join(', ')}`);
            if (x.historical_fate === 'killed' && x.tenure_end === null) throw new CorpsCoRosterDataError(`${where}: a 'killed' tenure needs a tenure_end`);
            if (typeof x.source !== 'string' || !x.source.trim()) throw new CorpsCoRosterDataError(`${where}: source required`);
            return {
                officer_id: x.officer_id,
                tenure_start: x.tenure_start,
                tenure_end: x.tenure_end as number | null,
                historical_fate: x.historical_fate as CorpsCoHistoricalFate,
                source: x.source,
            };
        }).sort((a, b) => a.tenure_start - b.tenure_start || strictCompare(a.officer_id, b.officer_id));
        for (let i = 1; i < schedule.length; i++) {
            const prev = schedule[i - 1]!;
            if (prev.tenure_end === null || prev.tenure_end > schedule[i]!.tenure_start) {
                throw new CorpsCoRosterDataError(`${corpsId}: tenures of ${prev.officer_id} and ${schedule[i]!.officer_id} overlap`);
            }
        }
        for (const t of schedule) officerFates.set(t.officer_id, [...(officerFates.get(t.officer_id) ?? []), t.historical_fate]);
        rosters[corpsId] = { schedule };
    }
    // An officer cannot both survive the war and be killed in it.
    for (const [officerId, fates] of [...officerFates.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        if (fates.includes('killed') && fates.includes('survived')) {
            throw new CorpsCoRosterDataError(`${officerId}: marked both 'killed' and 'survived'`);
        }
    }
    return {
        schema_version: r.schema_version,
        ...(typeof r.description === 'string' ? { description: r.description } : {}),
        rosters,
    };
}

/** True when the roster has at least one scheduled tenure. */
export function hasCorpsCoSchedule(roster: CorpsCoRoster | null | undefined): boolean {
    if (!roster) return false;
    return Object.values(roster.rosters).some((e) => e.schedule.length > 0);
}

/** The tenure in force for a corps on a turn, or null. */
export function scheduledTenure(roster: CorpsCoRoster | null | undefined, corpsId: string, turn: number): CorpsCoTenure | null {
    const schedule = roster?.rosters[corpsId]?.schedule;
    if (!schedule) return null;
    for (const t of schedule) {
        if (t.tenure_start <= turn && (t.tenure_end === null || turn < t.tenure_end)) return t;
    }
    return null;
}

/** The next tenure that starts after `turn` for a corps (for succession suggestions), or null. */
export function nextScheduledTenure(roster: CorpsCoRoster | null | undefined, corpsId: string, turn: number): CorpsCoTenure | null {
    const schedule = roster?.rosters[corpsId]?.schedule;
    if (!schedule) return null;
    return schedule.find((t) => t.tenure_start > turn) ?? null;
}

/** True when the schedule says this officer survived the war (no casualty-exposure clock). */
export function officerSurvivedWar(roster: CorpsCoRoster | null | undefined, officerId: string): boolean {
    if (!roster) return false;
    let survived = false;
    for (const corpsId of Object.keys(roster.rosters)) {
        for (const t of roster.rosters[corpsId]!.schedule) {
            if (t.officer_id !== officerId) continue;
            if (t.historical_fate === 'killed') return false;
            if (t.historical_fate === 'survived') survived = true;
        }
    }
    return survived;
}

/**
 * Tenures that have ended by this turn (tenure_end <= turn) with a 'killed' or
 * 'relieved' fate, sorted by corps id then start. 'survived' endings need no action:
 * the next tenure's start (or the fallback) takes the command. Callers apply these
 * idempotently (kill only a living officer; relieve only while he still holds that
 * corps), so a save loaded after the end turn still converges.
 */
export function tenuresEndedBy(roster: CorpsCoRoster | null | undefined, turn: number): Array<{ corps_id: string; tenure: CorpsCoTenure }> {
    if (!roster) return [];
    const out: Array<{ corps_id: string; tenure: CorpsCoTenure }> = [];
    for (const corpsId of Object.keys(roster.rosters).sort(strictCompare)) {
        for (const t of roster.rosters[corpsId]!.schedule) {
            if (t.tenure_end !== null && t.tenure_end <= turn && t.historical_fate !== 'survived') out.push({ corps_id: corpsId, tenure: t });
        }
    }
    return out;
}
