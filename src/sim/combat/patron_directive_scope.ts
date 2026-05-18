/**
 * Patron directive scope lookup.
 *
 * Patron directives express the political ceiling that a faction's patron
 * (e.g. Zagreb for HRHB) places on the faction's stance choices over time.
 * The directive shape supports a HYBRID scope (faction-wide default + named
 * per-corps exceptions) selected 2026-05-17 — see
 * `docs/40_reports/audits/20260517_HRHB_PATRON_DIRECTIVE_SCOPE_DECISION.md`.
 *
 * Data shape (loaded from `data/scenarios/timelines/<scenario>.json` into
 * `state.military.war_timeline.patron_directives`):
 *
 *   patron_directives: Record<FactionId, PatronDirective[]>
 *   PatronDirective = {
 *     name: string,
 *     start_week: number,    // inclusive
 *     end_week: number,      // exclusive
 *     stance_ceiling: 'reorganize' | 'defensive' | 'balanced' | 'offensive',
 *     corps_ids?: string[],  // omit for faction-wide; present for per-corps scope
 *     description?: string,
 *   }
 *
 * Consumers:
 * - `bot_corps_stance.ts` calls `getActivePatronDirective(faction, turn, state, corps.id)`
 *   so each corps sees the directive intended for it (Posavina exempt; Mostar /
 *   Central Bosnia / Tomislavgrad diverge after the alliance breaks).
 * - `order_interpretation.ts` calls `getActivePatronDirective(faction, turn, state)`
 *   (no corpsId) because officer-level interpretation is intentionally
 *   faction-level — preserves prior behavior literally.
 *
 * Deterministic: sorted iteration is not required (data is loaded in JSON
 * declaration order, and `.find()` short-circuits on the first match — the
 * timeline JSON is authored so the intended directive is encountered first).
 */

import type { FactionId, GameState } from '../../state/game_state.js';

export type PatronStanceCeiling = 'reorganize' | 'defensive' | 'balanced' | 'offensive';

export interface PatronDirective {
    name: string;
    start_week: number;
    end_week: number;
    stance_ceiling: PatronStanceCeiling;
    corps_ids?: string[];
    description?: string;
}

interface PatronDirectiveTimelineSlice {
    patron_directives?: Record<string, PatronDirective[]>;
}

/**
 * Returns the active patron directive for `faction` at `turn` from `state.military.war_timeline`.
 *
 * - When `corpsId` is supplied, only directives whose `corps_ids?` includes that
 *   corps (or whose `corps_ids` is absent) are eligible. This is the per-corps
 *   hybrid scope.
 * - When `corpsId` is omitted, returns the first directive whose turn window
 *   matches, ignoring `corps_ids`. This is the faction-wide scope used by
 *   officer-level callers that have no corps context.
 *
 * Returns `null` when no directive matches (including faction has no directives,
 * or no directive's turn window contains `turn`).
 */
export function getActivePatronDirective(
    faction: FactionId,
    turn: number,
    state: GameState,
    corpsId?: string,
): PatronDirective | null {
    const timeline = state.military.war_timeline as
        | (typeof state.military.war_timeline & PatronDirectiveTimelineSlice)
        | undefined;
    const directives = timeline?.patron_directives?.[faction];
    if (!directives || directives.length === 0) return null;

    const match = directives.find((d) => {
        if (turn < d.start_week || turn >= d.end_week) return false;
        if (corpsId === undefined) return true;
        if (!d.corps_ids) return true;
        return d.corps_ids.includes(corpsId);
    });

    return match ?? null;
}
