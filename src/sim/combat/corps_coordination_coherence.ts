/**
 * Corps-level coordination coherence per corps (synthesis §3 E-B1).
 *
 * `FormationState.coordination_coherence` (number in [0,1], default 1.0) is the
 * per-corps measure of OPERATIONAL COORDINATION — a corps' ability to launch
 * ops, hold a coherent line, and keep its brigades under one command. It is
 * distinct from brigade health: a corps can be manned yet lose coordination.
 * Models the operational-level collapse that destroyed VRS 2nd Krajina in
 * September 1995 (per docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md
 * §3 E-B1; ICTY Mladić MICT-13-56 §3437–3450; BB v2 ch 28).
 *
 * DEGRADES FROM (design intent, §3 E-B1 + game_state.ts:1046-1056):
 *   - adjacent-OSID losses (AOR territory falling to the enemy),
 *   - severed C2 (NATO Deliberate Force air suppression),
 *   - brigade-rotation failures / parallel-command-crisis events,
 * with `strategic_depth` (§3 E-B3) MODULATING the decay — low depth ⇒ less room
 * to reconstitute coordination, so coherence tracks depth.
 *
 * ── SLICE 4.1 SCOPE (this file): DIAGNOSTICS ONLY, BEHAVIOR-INERT. ──
 * Nothing in the engine reads `coordination_coherence` yet (verified: the field
 * has zero consumers). This module supplies the pure derivation + the read-only
 * diagnostic snapshot consumed by run_summary. The consumer thresholds (< 0.7 no
 * new ops, < 0.5 no >1-hop defence, < 0.3 fragment — game_state.ts:1050-1053) and
 * the `updateCoordinationCoherence`/`initCoordinationCoherence` persistence wiring
 * are SLICE 4.2 (a separate, owner-reviewed decision). They are exported here so
 * 4.2 only adds call sites + consumers, but are NOT wired into the pipeline in 4.1.
 *
 * DERIVATION SHAPE: STATELESS recompute-from-current-state each call (mirrors
 * `strategic_depth`), NOT a stateful accumulator. Coherence declines organically
 * as the current-state drivers worsen (AOR contested, C2 severed, depth collapsed
 * post-Storm) — which is exactly the fall-1995 signal the diagnostic must surface.
 * A true stateful decay accumulator (memory of prior coherence) is a candidate
 * refinement flagged for the 4.2 review. The coefficients below are a documented
 * FIRST-PASS proxy and are calibration-tunable; because 4.1 has no consumer, their
 * exact values are non-load-bearing (they only shape the observed diagnostic).
 *
 * CANONICAL OWNERSHIP: this module owns the `coordination_coherence` derivation.
 * Do not write `formation.coordination_coherence` elsewhere; call
 * `updateCoordinationCoherence()` / `computeCoordinationCoherence()` (from 4.2).
 *
 * Determinism: sorted iteration (strictCompare), integer/fraction math only,
 * event-truth + field reads only, no randomness, no timestamps.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getStrategicDepth } from './strategic_depth.js';

/** Non-zero floor so an incoherent corps never reads exactly 0 (mirrors strategic_depth). */
export const COORDINATION_COHERENCE_FLOOR = 0.1;

/**
 * Multiplier applied while NATO Deliberate Force has fired — models the air
 * campaign's suppression of VRS command-and-control / comms (Aug–Sep 1995).
 * Magnitude mirrors the ×0.70 Deliberate Force equipment-quality suppression the
 * combat model already uses (strategic_depth.ts:88-90). FIRST-PASS, calibration-tunable.
 */
export const C2_SEVERED_COHERENCE_MULT = 0.7;

/** Canonical event id whose firing severs corps C2 (NATO air campaign, Aug–Sep 1995). */
export const NATO_DELIBERATE_FORCE_EVENT_ID = 'nato_deliberate_force_1995';

/**
 * Weight on the AOR-loss term: coherence loses up to this fraction as the corps'
 * area of responsibility is overrun (contested/enemy-held share of its sectors).
 * FIRST-PASS, calibration-tunable.
 */
export const AOR_LOSS_COHERENCE_WEIGHT = 0.5;

/**
 * Canonical read accessor. Default 1.0 (full coherence) when absent/invalid —
 * keep the default semantics in one place so callers never read the raw field.
 */
export function getCoordinationCoherence(corps: FormationState | undefined | null): number {
    if (!corps) return 1.0;
    const v = corps.coordination_coherence;
    if (typeof v !== 'number' || !Number.isFinite(v)) return 1.0;
    return v;
}

/**
 * Compute coordination_coherence for one corps from current state. Pure; reads
 * strategic_depth + political_controllers + corps_front_sectors + fired events,
 * mutates nothing. Clamped to [COORDINATION_COHERENCE_FLOOR, 1.0].
 *
 * coherence = strategic_depth × c2Mult × (1 − AOR_LOSS_WEIGHT × contestedFraction)
 *   - strategic_depth : the §3 E-B3 modulator (low depth ⇒ fragile coordination),
 *   - c2Mult          : Deliberate-Force C2 severance penalty (event truth),
 *   - contestedFraction: share of the corps' AOR NOT held by the corps faction
 *                        (proxy for adjacent-OSID losses).
 * Full coherence (1.0) in the benign case: full depth, C2 intact, AOR fully held.
 */
export function computeCoordinationCoherence(state: GameState, corpsId: FormationId): number {
    const corps = state.military.formations?.[corpsId];
    if (!corps) return 1.0;
    // Accept both `corps` and `corps_asset` (engine OOB tags corps as `corps_asset`).
    if (corps.kind !== 'corps' && corps.kind !== 'corps_asset') return 1.0;

    const depth = getStrategicDepth(corps); // [0.1, 1.0]

    const c2Severed = isCorpsC2Severed(state);
    const c2Mult = c2Severed ? C2_SEVERED_COHERENCE_MULT : 1.0;

    const contestedFraction = computeAorContestedFraction(state, corps);
    const lossFactor = 1.0 - AOR_LOSS_COHERENCE_WEIGHT * contestedFraction;

    const coherence = depth * c2Mult * lossFactor;
    return Math.max(COORDINATION_COHERENCE_FLOOR, Math.min(1.0, coherence));
}

/**
 * Recompute coordination_coherence for every corps formation. Deterministic
 * (sorted corps ids). Mutates `formation.coordination_coherence`.
 *
 * NOT WIRED IN SLICE 4.1 — persistence + consumers are slice 4.2. Exported now so
 * 4.2 only adds the call site (mirror `updateStrategicDepth`).
 */
export function updateCoordinationCoherence(state: GameState): void {
    const formations = state.military.formations;
    if (!formations) return;
    const corpsIds = Object.keys(formations).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const f = formations[corpsId];
        if (!f || (f.kind !== 'corps' && f.kind !== 'corps_asset')) continue;
        f.coordination_coherence = computeCoordinationCoherence(state, corpsId);
    }
}

/**
 * Initial population at scenario load. Identical semantics to
 * `updateCoordinationCoherence`; named separately for call-site intent.
 * NOT WIRED IN SLICE 4.1 (see module header).
 */
export function initCoordinationCoherence(state: GameState): void {
    updateCoordinationCoherence(state);
}

/** One corps' coherence diagnostic row. */
export interface CoordinationCoherenceRow {
    corps_id: string;
    faction: FactionId;
    coordination_coherence: number;
    strategic_depth: number;
    c2_severed: boolean;
    aor_contested_fraction: number;
}

/** A per-turn coherence snapshot across all corps (for run_summary observability). */
export interface CoordinationCoherenceSnapshot {
    turn: number;
    corps: CoordinationCoherenceRow[];
}

/**
 * Build a READ-ONLY per-corps coherence snapshot for the current state. Pure
 * observability — computes but never persists the field. Corps sorted by id.
 * This is the slice-4.1 diagnostic surface (run_summary).
 */
export function buildCoordinationCoherenceSnapshot(state: GameState): CoordinationCoherenceSnapshot {
    const formations = state.military.formations ?? {};
    const c2Severed = isCorpsC2Severed(state);
    const rows: CoordinationCoherenceRow[] = [];
    for (const corpsId of Object.keys(formations).sort(strictCompare)) {
        const f = formations[corpsId];
        if (!f || (f.kind !== 'corps' && f.kind !== 'corps_asset')) continue;
        rows.push({
            corps_id: corpsId,
            faction: f.faction,
            coordination_coherence: computeCoordinationCoherence(state, corpsId as FormationId),
            strategic_depth: getStrategicDepth(f),
            c2_severed: c2Severed,
            aor_contested_fraction: computeAorContestedFraction(state, f),
        });
    }
    return { turn: state.meta.turn, corps: rows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True once NATO Deliberate Force has fired (event truth, not calendar) — models
 * the severed-C2 driver. Faction-symmetric: the air campaign degraded VRS C2
 * historically, but the gate is the fired event, not faction identity, so any
 * corps under the same shock reads the same penalty.
 */
function isCorpsC2Severed(state: GameState): boolean {
    const fired = state.military?.fired_event_ids;
    return Array.isArray(fired) && fired.includes(NATO_DELIBERATE_FORCE_EVENT_ID);
}

/**
 * Fraction of the corps' AOR (its sector territory OSIDs) NOT currently held by
 * the corps' faction — a proxy for adjacent-OSID losses. 0 when fully held, →1
 * as the AOR is overrun. Deterministic; reads sectors + political_controllers.
 */
function computeAorContestedFraction(state: GameState, corps: FormationState): number {
    const faction: FactionId = corps.faction;
    const sectors = state.military.corps_front_sectors ?? {};
    const pc = state.political?.political_controllers ?? {};

    const aorOsids = new Set<string>();
    for (const sid of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sid];
        if (!sector || sector.corps_id !== corps.id) continue;
        for (const osid of sector.territory_osids ?? []) aorOsids.add(osid);
    }
    if (aorOsids.size === 0) return 0;

    let contested = 0;
    for (const osid of aorOsids) {
        if (pc[osid] !== faction) contested += 1;
    }
    return contested / aorOsids.size;
}
