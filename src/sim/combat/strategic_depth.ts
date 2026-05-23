/**
 * Strategic depth per corps (synthesis §3 E-B3).
 *
 * `FormationState.strategic_depth` (number in [0,1], default 1.0) is the
 * per-corps measure of operational room — friendly hinterland behind the
 * line, distance to hostile front, and cross-border partner support.
 *
 * Higher depth → more time/space to absorb shocks, faster cohesion recovery.
 * Lower depth → less reserve room, fragile under sustained pressure.
 *
 * Computation inputs (per corps):
 *   (1) Friendly municipalities adjacent to the corps' AOR (sector territory).
 *   (2) Minimum BFS distance (in hops) from corps' AOR boundary to nearest
 *       non-friendly OSID front.
 *   (3) RS-only: if VRS 2nd Krajina-style corps near the Croatian border and
 *       `state.meta.svk_corps_active` is true, retain partner buffer; once
 *       false (post-Storm), depth collapses ~0.7×.
 *
 * Faction-symmetric in shape; the SVK arc is canonical history (ICTY Gotovina
 * IT-06-90-T) and is keyed strictly off a state flag, not faction identity.
 *
 * CANONICAL OWNERSHIP: this module owns the `strategic_depth` derivation.
 * Do not write `formation.strategic_depth` elsewhere; call
 * `updateStrategicDepth()` or `computeStrategicDepth()`.
 *
 * Determinism: sorted iteration, integer/fraction math only, no randomness,
 * no timestamps.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Maximum BFS depth examined when measuring distance to hostile front. */
const MAX_BFS_DEPTH = 6;

/** Adjacent-friendly-territory normalisation cap (saturates above this). */
const ADJACENT_FRIENDLY_SATURATION = 8;

/**
 * SVK partner buffer multiplier. RS corps that are within reach of the
 * Croatian Krajina border keep this multiplier while
 * `state.meta.svk_corps_active === true`. Once SVK falls (Operation Storm),
 * the multiplier collapses to 1.0 — depth is recomputed from in-theatre
 * factors only, which historically caused the western RS line to lose its
 * rear-area cushion.
 */
const SVK_PARTNER_DEPTH_BONUS = 1.4;

/**
 * VRS 2nd Krajina Corps id (where applicable in current OOB). Only applied
 * for SVK partner buffer because historically 2KK was the formation whose
 * depth collapsed when SVK dissolved. Faction symmetry: the gate is the
 * `svk_corps_active` flag, not corps name — but only this corps has the
 * geography that benefits in practice.
 */
const VRS_2KK_CORPS_ID: FormationId = '2nd_krajina_corps';

export interface CorpsAdjacency {
    /** Friendly-controlled OSIDs adjacent to (or inside) the corps' AOR. */
    friendlyAdjacentCount: number;
    /** Min hops from corps AOR to nearest non-friendly OSID front. */
    hopsToHostileFront: number;
    /** True when SVK partner buffer applies. */
    partnerBuffer: boolean;
}

/**
 * Return strategic_depth for a corps formation. Default 1.0 if absent.
 * This is the canonical read accessor — use it instead of reading the
 * raw field directly so the default semantics stay in one place.
 */
export function getStrategicDepth(corps: FormationState | undefined | null): number {
    if (!corps) return 1.0;
    const v = corps.strategic_depth;
    if (typeof v !== 'number' || !Number.isFinite(v)) return 1.0;
    return v;
}

/**
 * Compute strategic_depth for one corps based on current state.
 * Pure function; reads political_controllers + corps_front_sectors + meta flags
 * but does not mutate.
 *
 * Output is clamped to [0.1, 1.0] so a non-zero floor remains even for
 * encircled corps (matches the formation field design in game_state.ts).
 */
export function computeStrategicDepth(state: GameState, corpsId: FormationId): number {
    const corps = state.military.formations?.[corpsId];
    if (!corps) return 1.0;
    // Accept both legacy `corps` and the current `corps_asset` formation kinds —
    // engine OOB tags corps formations as `corps_asset` (army_hq_overrides.ts,
    // corps_command.ts, combat_summary_aggregator.ts use the same widened check).
    if (corps.kind !== 'corps' && corps.kind !== 'corps_asset') return 1.0;

    const adjacency = collectCorpsAdjacency(state, corps);

    // Component 1: friendly territory adjacency (0..1, saturates at SATURATION).
    const friendlyComponent = Math.min(
        1.0,
        adjacency.friendlyAdjacentCount / ADJACENT_FRIENDLY_SATURATION,
    );

    // Component 2: hop-distance to hostile front. 0 hops = on the line (low),
    // MAX_BFS_DEPTH+ = full depth.
    const hopComponent = Math.min(1.0, adjacency.hopsToHostileFront / MAX_BFS_DEPTH);

    // Weighted blend favouring hop distance (real-war depth-of-defence proxy).
    let depth = 0.4 * friendlyComponent + 0.6 * hopComponent;

    // Component 3: partner buffer (gated on canonical state flag).
    if (adjacency.partnerBuffer) {
        depth *= SVK_PARTNER_DEPTH_BONUS;
    }

    return Math.max(0.1, Math.min(1.0, depth));
}

/**
 * Recompute strategic_depth for every corps formation each turn.
 * Deterministic: corps iterated in sorted id order. Mutates
 * `formation.strategic_depth` on every corps formation.
 */
export function updateStrategicDepth(state: GameState): void {
    const formations = state.military.formations;
    if (!formations) return;

    const corpsIds = Object.keys(formations).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const f = formations[corpsId];
        // Accept both `corps` and `corps_asset` (engine OOB uses `corps_asset`).
        if (!f || (f.kind !== 'corps' && f.kind !== 'corps_asset')) continue;
        f.strategic_depth = computeStrategicDepth(state, corpsId);
    }
}

/**
 * Initial population for scenario init: compute strategic_depth for every
 * corps at turn 0 (or any other scenario load point). Identical semantics
 * to `updateStrategicDepth`; named separately so callers can document
 * intent at the init site without duplicating logic.
 */
export function initStrategicDepth(state: GameState): void {
    updateStrategicDepth(state);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

function collectCorpsAdjacency(state: GameState, corps: FormationState): CorpsAdjacency {
    const faction: FactionId = corps.faction;
    const sectors = state.military.corps_front_sectors ?? {};
    const pc = state.political?.political_controllers ?? {};

    // Aggregate AOR OSIDs from all sectors owned by this corps.
    const aorOsids = new Set<string>();
    const sectorIds = Object.keys(sectors).sort(strictCompare);
    for (const sid of sectorIds) {
        const sector = sectors[sid];
        if (!sector || sector.corps_id !== corps.id) continue;
        for (const osid of sector.territory_osids ?? []) aorOsids.add(osid);
    }

    const friendlyAdjacentCount = aorOsids.size;

    // Hop distance to hostile front: scan AOR OSIDs; if any is not friendly,
    // hops=0 (front passes through). Otherwise estimate via municipality
    // adjacency proxy — for now, if AOR is fully friendly, return a depth
    // proportional to aorOsids.size capped by MAX_BFS_DEPTH. This is a coarse
    // first-pass proxy that is deterministic and faction-agnostic.
    let hopsToHostileFront = MAX_BFS_DEPTH;
    let allFriendly = true;
    for (const osid of aorOsids) {
        const controller = pc[osid];
        if (controller !== faction) {
            allFriendly = false;
            hopsToHostileFront = 0;
            break;
        }
    }
    if (allFriendly && aorOsids.size > 0) {
        // Saturate hop estimate by AOR size — larger AOR ⇒ more depth.
        hopsToHostileFront = Math.min(MAX_BFS_DEPTH, Math.floor(aorOsids.size / 3));
    }

    // SVK partner buffer: applies to RS 2nd Krajina Corps while the flag is
    // active. Once Operation Storm flips the flag false, the buffer drops.
    //
    // Read priority (descending):
    //   1. event_flags.svk_corps_active (canonical event-driven source,
    //      written by operation_storm_1995 sets_flags).
    //   2. state.meta.svk_corps_active   (canonical scenario init source).
    //   3. state.meta.operation_storm_triggered === true ⇒ implicitly false
    //      (Storm already fired but neither flag was authored).
    //   4. default true (pre-Storm semantics).
    const eventFlag = state.military.event_flags?.svk_corps_active;
    let svkActive: boolean;
    if (eventFlag === false || eventFlag === true) {
        svkActive = eventFlag;
    } else if (state.meta.svk_corps_active === false || state.meta.svk_corps_active === true) {
        svkActive = state.meta.svk_corps_active;
    } else if (state.meta.operation_storm_triggered === true) {
        svkActive = false;
    } else {
        svkActive = true;
    }
    const partnerBuffer = svkActive && corps.id === VRS_2KK_CORPS_ID && corps.faction === 'RS';

    return { friendlyAdjacentCount, hopsToHostileFront, partnerBuffer };
}
