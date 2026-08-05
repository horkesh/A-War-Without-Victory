/**
 * ARBiH OG→Division promotion (ADR-0006 historical reorganization).
 *
 * Historian-confirmed basis: ARBiH numbered Operational Groups were transitional and were
 * PROMOTED into permanent Divisions. 2nd Corps Tuzla: 1st OG → 21st Division, 5th OG → 25th
 * Division. This is faction-specific to ARBiH (RBiH). VRS used geographic OGs as standing
 * task-tools (no promotion); HVO used operational zones. So promotion fires for RBiH only.
 *
 * CRITICAL INVARIANT (Engine Invariants — NO permanent force inflation): promotion is an
 * IDENTITY / COMMAND-ECHELON re-badge of brigades that ALREADY EXIST. It spawns NO brigades
 * and adds NO personnel/equipment/geometry. The standing OG's display identity is upgraded
 * ("N. OG (Place)" → the explicitly verified Division identity), and a one-way
 * promotion record is written. No force totals change.
 *
 * DETERMINISM (sacred): pure functions; no Math.random / Date.now / timestamps. All iteration
 * is sorted via strictCompare. The promotion check is a pure function of (state, turn).
 *
 * FLAG-GATED: every entry point here is reached only inside ENABLE_TG_OG_PROMOTION; with the
 * flag off no counter is incremented and no record is written, so state is byte-identical.
 */

import type {
    FormationId,
    GameState,
    OgPromotionRecord,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    ARBIH_OG_TO_DIVISION_NUMBER,
    PROMOTION_TG_FORMATION_THRESHOLD,
} from './tactical_group_config.js';

/** ARBiH (RBiH) faction id — promotion is faction-specific to ARBiH. */
const ARBIH_FACTION = 'RBiH';

/**
 * The standing-OG ordinal for a corps in this conservative first cut: the corps's PRIMARY
 * numbered OG (ordinal 1). The historical map (ARBIH_OG_TO_DIVISION_NUMBER) keys on the
 * (corps, ordinal) pair so future cuts can promote a corps's secondary OG (e.g. 2nd Corps's
 * 5th OG) without touching this default. Pure + deterministic.
 */
function standingOgOrdinalForCorps(_corpsId: FormationId): number {
    return 1;
}

/** Format the promoted Division display identity, e.g. 21 → "21. Division". Pure. */
export function divisionDisplayName(divisionNumber: number): string {
    return `${divisionNumber}. Division`;
}

/** Normalize a Division display identity for deterministic collision checks and diagnostics. */
export function normalizeDivisionDisplayName(displayName: string): string {
    return displayName.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Resolve a verified promoted Division number for a (corps, og_ordinal) pair. An absent
 * mapping has no historical identity and therefore cannot produce a promotion. Pure.
 */
export function resolveDivisionNumber(corpsId: FormationId, ogOrdinal: number): number | undefined {
    return ARBIH_OG_TO_DIVISION_NUMBER[`${corpsId}:${ogOrdinal}`];
}

/**
 * Determine which RBiH corps standing OGs are eligible for a NEW promotion this turn.
 *
 * Criterion (deterministic, RBiH-only): the corps has anchored at least
 * PROMOTION_TG_FORMATION_THRESHOLD TG formations (state.military.tg_formations_by_corps), is a
 * RBiH corps, and has NOT already been promoted (one-way). Returns the promotion records to
 * write, sorted by corps_id. Pure — reads state, returns data; does NOT mutate.
 */
export function evaluateOgPromotions(state: GameState, turn: number): OgPromotionRecord[] {
    const mil = state.military;
    if (!mil) return [];
    const counts = mil.tg_formations_by_corps;
    if (!counts) return [];
    const formations = mil.formations ?? {};
    const existing = mil.og_promotions ?? {};
    const occupiedDivisionNumbers = new Set<number>();
    const occupiedDisplayNames = new Set<string>();
    for (const recordKey of Object.keys(existing).sort(strictCompare)) {
        const record = existing[recordKey];
        occupiedDivisionNumbers.add(record.division_number);
        occupiedDisplayNames.add(normalizeDivisionDisplayName(record.division_display_name));
    }

    const out: OgPromotionRecord[] = [];
    for (const corpsId of Object.keys(counts).sort(strictCompare)) {
        if (existing[corpsId]) continue; // one-way: already promoted
        const count = counts[corpsId] ?? 0;
        if (count < PROMOTION_TG_FORMATION_THRESHOLD) continue;
        // RBiH-only: the corps formation's faction must be ARBiH.
        if (formations[corpsId]?.faction !== ARBIH_FACTION) continue;

        const ogOrdinal = standingOgOrdinalForCorps(corpsId);
        const divisionNumber = resolveDivisionNumber(corpsId, ogOrdinal);
        if (divisionNumber == null) continue;
        const displayName = divisionDisplayName(divisionNumber);
        const normalizedDisplayName = normalizeDivisionDisplayName(displayName);
        if (occupiedDivisionNumbers.has(divisionNumber) || occupiedDisplayNames.has(normalizedDisplayName)) {
            continue;
        }
        out.push({
            corps_id: corpsId,
            faction: ARBIH_FACTION,
            og_ordinal: ogOrdinal,
            division_number: divisionNumber,
            division_display_name: displayName,
            promoted_on_turn: turn,
        });
        occupiedDivisionNumbers.add(divisionNumber);
        occupiedDisplayNames.add(normalizedDisplayName);
    }
    return out;
}

/**
 * Apply OG→Division promotions: write the one-way records onto state.military.og_promotions.
 * NO brigade/personnel/equipment mutation — identity/command-tier metadata only. Returns the
 * records actually written (deterministic order). Caller is already inside the flag gate.
 */
export function applyOgPromotions(state: GameState, turn: number): OgPromotionRecord[] {
    const mil = state.military;
    if (!mil) return [];
    const promotions = evaluateOgPromotions(state, turn);
    if (promotions.length === 0) return [];
    if (!mil.og_promotions) mil.og_promotions = {};
    for (const rec of promotions) {
        mil.og_promotions[rec.corps_id] = rec;
    }
    return promotions;
}

/**
 * Project recorded promotions onto the (freshly-rebuilt, derived) corps_front_sectors so the
 * Division identity survives the per-turn sector rebuild. Sets sector.display_name on the
 * promoted corps's sector. Read-model identity only — no geometry/force change. Deterministic:
 * sorted iteration; idempotent. Caller is already inside the flag gate.
 */
export function projectPromotionDisplayNames(state: GameState): void {
    const mil = state.military;
    const promotions = mil?.og_promotions;
    const sectors = mil?.corps_front_sectors;
    if (!mil || !promotions || !sectors) return;
    for (const corpsId of Object.keys(promotions).sort(strictCompare)) {
        const rec = promotions[corpsId];
        for (const sid of Object.keys(sectors).sort(strictCompare)) {
            const sector = sectors[sid];
            if (sector?.corps_id === corpsId) {
                sector.display_name = rec.division_display_name;
            }
        }
    }
}
