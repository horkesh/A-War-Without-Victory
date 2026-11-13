/**
 * OG (sector) stance and brigade entrenchment.
 *
 * A stationary brigade's entrenchment grows each turn at the rate of the OG stance it holds
 * (SECTOR_STANCE_ENTRENCHMENT_RATE: fortify 2.0, defend 1.2, elastic 0.8, active defense 0.6,
 * screening 0.0). Movement runs before the turn's sectors exist, so it grows every stationary
 * brigade at the Defend rate and records a basis; `applyStanceEntrenchment` runs once the
 * stance in force for this turn's combat is final (commander, holds, player orders) and
 * re-bases that growth to the stance rate. Until 2026-11-13 the movement step read the
 * previous turn's sectors, which the post-combat rebuild always leaves at 'defend', so the
 * stance rates never applied (SE6).
 *
 * Observation: `emitPreCombatEntrenchmentRecords` reports, under the `sector_stance`
 * reason-code topic, how entrenched the brigades of each OG stance are when combat
 * resolves. Stdout only; it never writes state.
 *
 * Determinism: sorted sector and brigade iteration; no randomness.
 */

import type { FormationId, GameState, SectorStance } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { SECTOR_STANCE_ENTRENCHMENT_RATE } from './combat_math.js';
import { emitSectorStanceRecord, isReasonCodeTopicEnabled } from './reason_code_debug.js';

/** Ceiling of the stored entrenchment_turns field (combat reads at most MAX_ENTRENCHMENT of it). */
export const MAX_ENTRENCHMENT_TURNS_FIELD = 12;

/** What the movement step did to a stationary brigade's entrenchment this turn. Turn-local. */
export interface StanceEntrenchmentBasis {
    /** entrenchment_turns before this turn's growth. */
    before: number;
    /** entrenchment_turns after the provisional Defend-rate growth. */
    provisional: number;
    /** Where the brigade stood when it grew. */
    location_osid: string;
}

export interface StanceEntrenchmentReport {
    rebased: number;
    skipped_moved_or_reset: number;
    by_stance: Partial<Record<SectorStance, number>>;
}

/**
 * Re-base this turn's entrenchment growth from the provisional Defend rate to the rate of the
 * OG stance in force for this turn's combat. A brigade that moved, or whose entrenchment
 * another step rewrote since the movement step, is left alone.
 */
export function applyStanceEntrenchment(
    state: GameState,
    basis: ReadonlyMap<FormationId, StanceEntrenchmentBasis>,
): StanceEntrenchmentReport {
    const report: StanceEntrenchmentReport = { rebased: 0, skipped_moved_or_reset: 0, by_stance: {} };
    if (basis.size === 0) return report;
    const formations = state.military.formations ?? {};
    const stanceByBrigade = brigadeSectorStances(state);
    for (const bid of [...basis.keys()].sort(strictCompare)) {
        const b = basis.get(bid)!;
        const f = formations[bid] as ({ location_osid?: string; entrenchment_turns?: number } | undefined);
        if (!f) continue;
        if (f.location_osid !== b.location_osid || (f.entrenchment_turns ?? 0) !== b.provisional) {
            report.skipped_moved_or_reset += 1;
            continue;
        }
        const stance = stanceByBrigade.get(bid) ?? 'defend';
        report.by_stance[stance] = (report.by_stance[stance] ?? 0) + 1;
        if (stance === 'defend') continue;
        f.entrenchment_turns = Math.min(MAX_ENTRENCHMENT_TURNS_FIELD, b.before + SECTOR_STANCE_ENTRENCHMENT_RATE[stance]);
        report.rebased += 1;
    }
    return report;
}

/** Entrenchment buckets: combat reads at most MAX_ENTRENCHMENT (6) turns; the field caps at 12. */
function entrenchmentBucket(turns: number): string {
    if (turns <= 0) return '0';
    if (turns < 2) return '0-2';
    if (turns < 4) return '2-4';
    if (turns < 6) return '4-6';
    if (turns < 12) return '6-12';
    return '12';
}

/** Brigade -> the stance of the OG holding it (front or reserve), first sector in sorted order. */
export function brigadeSectorStances(state: GameState): Map<FormationId, SectorStance> {
    const out = new Map<FormationId, SectorStance>();
    const sectors = state.military.corps_front_sectors ?? {};
    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector) continue;
        const stance = sector.sector_stance ?? 'defend';
        for (const bid of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids]) {
            if (!out.has(bid)) out.set(bid, stance);
        }
    }
    return out;
}

/** Observation only: per faction and OG stance, the entrenchment of the brigades the OGs hold. */
export function emitPreCombatEntrenchmentRecords(state: GameState): void {
    if (!isReasonCodeTopicEnabled('sector_stance')) return;
    const formations = state.military.formations ?? {};
    const tallies = new Map<string, { faction: string; stance: string; n: number; sum: number; buckets: Record<string, number> }>();
    const byBrigade = brigadeSectorStances(state);
    for (const bid of [...byBrigade.keys()].sort(strictCompare)) {
        const f = formations[bid];
        if (!f || f.status !== 'active') continue;
        const stance = byBrigade.get(bid)!;
        const faction = String(f.faction ?? 'unknown');
        const key = `${faction}|${stance}`;
        let t = tallies.get(key);
        if (!t) { t = { faction, stance, n: 0, sum: 0, buckets: {} }; tallies.set(key, t); }
        const turns = (f as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
        t.n += 1;
        t.sum += turns;
        const b = entrenchmentBucket(turns);
        t.buckets[b] = (t.buckets[b] ?? 0) + 1;
    }
    for (const key of [...tallies.keys()].sort(strictCompare)) {
        const t = tallies.get(key)!;
        emitSectorStanceRecord({
            phase: 'entrenchment',
            turn: state.meta.turn,
            faction: t.faction,
            stance: t.stance,
            brigades: t.n,
            entrenchment_sum: Math.round(t.sum * 1000) / 1000,
            buckets: t.buckets,
        });
    }
}
