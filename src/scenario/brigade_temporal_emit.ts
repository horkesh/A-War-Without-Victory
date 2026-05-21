/**
 * LANE-2026-05-02-A1-PER-TURN-BRIGADE-SNAPSHOT — Brigade temporal log emit.
 *
 * Pure read-only projection over `state.military.formations`. Produces
 * deterministic per-brigade rows for the per-turn `brigade_temporal_log.jsonl`
 * artifact. Mirrors the existing `weekly_report.jsonl` emit pattern.
 *
 * Engine ownership boundary: this module is harness-side only; the engine
 * pipeline never imports it. The scenario harness calls
 * `buildBrigadeTemporalRows(state, weekIndex)` once per turn after `runTurn`
 * returns and serializes the resulting rows via `stableStringify`.
 *
 * Determinism contract:
 *  - Brigade iteration is sorted ascending by `formation.id` via `strictCompare`.
 *  - `mv_destinations` is sorted ascending via `strictCompare`.
 *  - Corps iteration for active-op attribution is sorted ascending by `corps_id`
 *    via `strictCompare`; if a brigade appears in multiple corps' active_operations
 *    (architecturally impossible per op-architecture invariant, but defended
 *    here for stability), the first match wins.
 *  - Within a corps, `active_operations` is iterated in array order
 *    (engine-emitted, deterministic upstream), and the first op containing
 *    the brigade in `participating_brigades` wins.
 *  - Field key order on each row is fixed at construction time; downstream
 *    serialization should still use `stableStringify` for defense in depth.
 *  - No nondeterministic primitives (no RNG, wall-clock, locale-aware sort).
 *    Static-grep guard test enforces the absence of forbidden tokens in
 *    this file via tests/brigade_temporal_emit.test.ts (T8).
 *
 * Scope:
 *  - Brigade-kind formations only (`kind === 'brigade'` or undefined for
 *    backward compatibility — the canonical default per FormationState).
 *  - Corps / militia / paramilitary / OG / corps_asset / army_hq / phantom
 *    are filtered out — they have separate lifecycles and do not belong on
 *    a "brigade" temporal log.
 *
 * No engine state mutation. No GameState writes. Read-only over input state.
 */

import type { FormationState, GameState } from '../state/game_state.js';
import { strictCompare } from '../state/turn_phases.js';
import { asRecord } from '../state/schema_validators.js';

/** One row of the per-turn brigade temporal log. Fixed field shape. */
export interface BrigadeTemporalRow {
    /** Engine turn at emit time (1-indexed). */
    turn: number;
    /** Harness week index (0-indexed). Mirrors weekly_report row. */
    week_index: number;
    /** Formation id. */
    brigade_id: string;
    /** Canonical faction id. */
    faction: string;
    /** Parent corps id, or null when unattached. */
    corps_id: string | null;
    /** Formation kind. Always 'brigade' for rows in this log. */
    kind: string;
    /** Active or inactive. */
    status: string;
    /** Lifecycle status (active / forming / disbanded / merged / destroyed / withdrawn / displaced) or null. */
    lifecycle_status: string | null;
    /** Current OSID. May be undefined in pathological scenarios. */
    location_osid: string | null;
    /** Origin OSID (raised/permanently based). For drift classification. */
    home_osid: string | null;
    /** Sector id when assignment.kind === 'sector'. */
    sector_id: string | null;
    /** Sub-segment id (AoR). */
    assigned_sub_segment_id: string | null;
    /** Movement state (deployed/packing/in_transit/unpacking) or null. */
    mv_state: string | null;
    /** Destinations from movement-state OR queued movement-orders, sorted via strictCompare. Null when neither present. */
    mv_destinations: string[] | null;
    /** Composed `${corps_id}:${op.name}:t${op.started_turn}` when brigade is in any corps active_operations.participating_brigades; else null. */
    active_op_id: string | null;
    /** Phase of the matched active_op; else null. */
    current_op_phase: string | null;
    personnel: number;
    morale: number;
    cohesion: number;
    fatigue: number;
    /**
     * LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-1-OBSERVABILITY — Brigade-level officer
     * quality [0,1] read directly from FormationState.officer_quality. Optional
     * on the row to preserve byte-identity on legacy fixtures that lack the
     * field; populated whenever the formation carries the field.
     *
     * Maintained by `updateBrigadeOfficerQuality` and casualty-driven
     * `applyOfficerCasualtyLoss` (post-2026-05-01 Phase 3 of the FORCE
     * QUALITY FOUNDATION). This row makes the per-turn trajectory visible so
     * Gap 2 (officer brain-drain verification) is measurable on the same
     * harness `tools/diagnostics/force_quality_trajectory.cjs` already runs.
     */
    officer_quality?: number;
    /**
     * LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-1-OBSERVABILITY — Per-brigade active
     * officer count when the formation carries one; else null. The current
     * schema does not yet track an officer headcount on FormationState, so
     * this field is reserved for forward compatibility with a future officer
     * roster representation. Emitting it as part of the row schema lets the
     * harness consume the trajectory the moment such data lands without
     * requiring another schema bump.
     */
    officer_count_active?: number | null;
}

/** Find the first active op for a given brigade. Stable iteration order. */
function findActiveOp(
    state: GameState,
    brigadeId: string,
): { op_id: string; phase: string } | null {
    // BATCH C §3.5: `state.military.corps_command` is typed on MilitaryState
    // (game_state.ts L1940) so the prior widening cast is unnecessary.
    const corpsCmds = state.military.corps_command;
    if (!corpsCmds) return null;
    const corpsIds = Object.keys(corpsCmds).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCmds[corpsId];
        if (!cmd) continue;
        const ops = cmd.active_operations;
        if (!ops || ops.length === 0) continue;
        for (const op of ops) {
            const parts = op.participating_brigades;
            if (!parts || parts.length === 0) continue;
            if (parts.includes(brigadeId)) {
                return {
                    op_id: `${corpsId}:${op.name}:t${op.started_turn}`,
                    phase: op.phase,
                };
            }
        }
    }
    return null;
}

/**
 * Build per-turn brigade temporal rows. Pure read-only projection over
 * `state.military.formations`. Filters to brigade-kind only.
 */
export function buildBrigadeTemporalRows(
    state: GameState,
    weekIndex: number,
): BrigadeTemporalRow[] {
    const formations = state.military?.formations;
    if (!formations) return [];

    const ids = Object.keys(formations).sort(strictCompare);
    // BATCH C §3.5: state.meta, state.military.brigade_movement_state, and
    // state.military.brigade_movement_orders are all typed on GameState /
    // MilitaryState (game_state.ts L1755 / L1880 / L1882), so the prior
    // widening casts are unnecessary.
    const turn = state.meta?.turn ?? 0;
    const movementState = state.military.brigade_movement_state;
    const movementOrders = state.military.brigade_movement_orders;

    const out: BrigadeTemporalRow[] = [];

    for (const id of ids) {
        const f = formations[id] as FormationState;
        if (!f) continue;
        const kind = (f.kind ?? 'brigade') as string;
        if (kind !== 'brigade') continue;

        const mv = movementState?.[id];
        const order = movementOrders?.[id];
        let mvDestinations: string[] | null = null;
        if (mv?.destination_sids && mv.destination_sids.length > 0) {
            mvDestinations = [...mv.destination_sids].sort(strictCompare);
        } else if (order?.destination_sids && order.destination_sids.length > 0) {
            mvDestinations = [...order.destination_sids].sort(strictCompare);
        }

        const opMatch = findActiveOp(state, id);

        const row: BrigadeTemporalRow = {
            turn,
            week_index: weekIndex,
            brigade_id: id,
            faction: f.faction,
            corps_id: f.corps_id ?? null,
            kind,
            status: f.status,
            lifecycle_status: f.lifecycle_status ?? null,
            location_osid: f.location_osid ?? null,
            home_osid: f.home_osid ?? null,
            sector_id:
                f.assignment && f.assignment.kind === 'sector' && f.assignment.sector_id
                    ? f.assignment.sector_id
                    : null,
            assigned_sub_segment_id: f.assigned_sub_segment_id ?? null,
            mv_state: mv?.status ?? null,
            mv_destinations: mvDestinations,
            active_op_id: opMatch?.op_id ?? null,
            current_op_phase: opMatch?.phase ?? null,
            personnel: typeof f.personnel === 'number' ? f.personnel : 0,
            morale: typeof f.morale === 'number' ? f.morale : 0,
            cohesion: typeof f.cohesion === 'number' ? f.cohesion : 0,
            fatigue: f.ops && typeof f.ops.fatigue === 'number' ? f.ops.fatigue : 0,
        };
        // LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-1-OBSERVABILITY — only attach the
        // officer fields when the formation actually carries them, so legacy
        // fixtures without officer_quality continue to serialize byte-identical.
        if (typeof f.officer_quality === 'number') {
            row.officer_quality = f.officer_quality;
        }
        // officer_count_active is reserved for a future roster representation;
        // surface as `null` whenever the underlying source carries an explicit
        // numeric count (currently never; the optional read keeps the door open).
        // BATCH C §3.5: `officer_count_active` is not declared on FormationState,
        // so go through asRecord to read it as `unknown` without widening f.
        const fRecord = asRecord(f);
        const officerCountActive = fRecord?.officer_count_active;
        if (typeof officerCountActive === 'number') {
            row.officer_count_active = officerCountActive;
        } else if (officerCountActive === null) {
            row.officer_count_active = null;
        }
        out.push(row);
    }

    return out;
}
