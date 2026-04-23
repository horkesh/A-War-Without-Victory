/**
 * SpatialContext: immutable spatial snapshot computed at pipeline boundaries.
 *
 * All spatial queries during a pipeline phase use this instead of rebuilding
 * adjacency, friendlyOsids, and connected components from scratch.
 *
 * Invalidated and recomputed after any step that changes political_controllers.
 *
 * Phase 0: compute and cache only — no consumers yet.
 * Phase 1+: pipeline steps read from SpatialContext instead of rebuilding.
 *
 * Determinism: sorted neighbor lists via strictCompare; no randomness.
 */

import type { EdgeRecord } from '../map/settlements.js';
import type { FrontEdge } from '../map/front_edges.js';
import type { Osid } from './combat/osid_adjacency.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency } from './combat/osid_adjacency.js';
import { buildFriendlyComponents } from './combat/sector_utils.js';
import type { FactionId } from '../state/game_state.js';
import { CANONICAL_FACTIONS } from '../state/game_state.js';
import { ALLIED_THRESHOLD } from './early_war/alliance_update.js';

/**
 * SpatialContext: immutable spatial snapshot computed at pipeline boundaries.
 * All spatial queries during a pipeline phase use this instead of rebuilding.
 *
 * Invalidated and recomputed after any step that changes political_controllers.
 */
export interface SpatialContext {
    /** Full OSID adjacency map (all edges, sorted neighbor lists). Immutable within a phase. */
    readonly adjacency: ReadonlyMap<Osid, readonly Osid[]>;

    /** Shared-boundary adjacency (5.5m threshold). Used only by sector system. */
    readonly sharedBoundaryAdjacency: ReadonlyMap<Osid, readonly Osid[]>;

    /** Per-faction set of controlled OSIDs, derived from political_controllers.
     *  Own-faction only; alliance has no effect here. Used by brigade
     *  assignment, supply reachability, front-edge derivation. */
    readonly friendlyOsidsByFaction: ReadonlyMap<FactionId, ReadonlySet<string>>;

    /** Per-faction set of politically-connected OSIDs: own-faction territory
     *  plus allied-faction territory when alliance > ALLIED_THRESHOLD.
     *  Used ONLY for zone corridor width / besieged-posture derivation —
     *  reflects the real-war fact that an alliance-held neighbour is not a
     *  hostile siege perimeter. Do not use this for brigade assignment,
     *  supply, or front-edge generation (those retain own-faction semantics).
     *  Optional for backward compatibility with test fixtures that construct
     *  SpatialContext directly; when absent, consumers must fall back to
     *  `friendlyOsidsByFaction`. */
    readonly politicallyConnectedOsidsByFaction?: ReadonlyMap<FactionId, ReadonlySet<string>>;

    /** Per-faction connected component map (OSID -> component index). */
    readonly componentsByFaction: ReadonlyMap<FactionId, ReadonlyMap<string, number>>;

    /** OSID front edges snapshot (if available). */
    readonly frontEdgesOsid: readonly FrontEdge[] | undefined;

    /** Turn number when this context was computed. For staleness detection. */
    readonly computedAtTurn: number;

    /** Pipeline phase marker: 'pre-combat' | 'post-combat'. */
    readonly phase: 'pre-combat' | 'post-combat';
}

/**
 * Compute a fresh SpatialContext from current state.
 * Pure function: reads edges + political_controllers + alliance, produces immutable snapshot.
 *
 * @param edges         Operational edge list (immutable within a turn)
 * @param politicalControllers  Current political_controllers record
 * @param factions      Faction IDs to compute friendly sets for
 * @param turn          Current turn number (for staleness detection)
 * @param phase         Pipeline phase marker
 * @param frontEdgesOsid  Pre-computed front edges (optional)
 * @param preCombatAdjacency  Reuse adjacency from pre-combat context (post-combat optimization)
 * @param preCombatSharedBoundary  Reuse shared-boundary adjacency from pre-combat context
 * @param allianceRbihHrhb  Current `state.political.war_alliance_rbih_hrhb`. When
 *   above `ALLIED_THRESHOLD`, HRHB's and RBiH's `politicallyConnectedOsidsByFaction`
 *   sets include each other's territory (alliance-aware posture). When below or
 *   undefined, politicallyConnected = friendlyOsids (own-faction only). Defaults
 *   to 1.0 (strong-allied) when undefined to preserve pre-fix behaviour for
 *   callers that don't pass alliance state.
 */
export function computeSpatialContext(
    edges: EdgeRecord[],
    politicalControllers: Record<string, string | null | undefined>,
    factions: readonly FactionId[],
    turn: number,
    phase: 'pre-combat' | 'post-combat',
    frontEdgesOsid?: FrontEdge[],
    preCombatAdjacency?: ReadonlyMap<Osid, readonly Osid[]>,
    preCombatSharedBoundary?: ReadonlyMap<Osid, readonly Osid[]>,
    allianceRbihHrhb?: number,
): SpatialContext {
    // Build adjacency (or reuse from pre-combat — edges don't change within a turn)
    const adjacency: Map<Osid, Osid[]> | ReadonlyMap<Osid, readonly Osid[]> =
        preCombatAdjacency ?? buildOsidAdjacency(edges);
    const sharedBoundaryAdjacency: Map<Osid, Osid[]> | ReadonlyMap<Osid, readonly Osid[]> =
        preCombatSharedBoundary ?? buildSharedBoundaryAdjacency(edges);

    // Build per-faction friendly OSID sets from political_controllers
    const friendlyOsidsByFaction = new Map<FactionId, ReadonlySet<string>>();
    for (const faction of factions) {
        const friendly = new Set<string>();
        for (const [osid, controller] of Object.entries(politicalControllers)) {
            if (controller === faction) friendly.add(osid);
        }
        friendlyOsidsByFaction.set(faction, friendly);
    }

    // Build per-faction politically-connected OSID sets.
    // HRHB and RBiH share their territory for zone corridor purposes when
    // alliance > ALLIED_THRESHOLD. RS is never politically connected to any
    // other faction. Absent alliance data, fall back to own-faction-only.
    const politicallyConnectedOsidsByFaction = new Map<FactionId, ReadonlySet<string>>();
    const rbihHrhbAllied = (allianceRbihHrhb ?? 1.0) > ALLIED_THRESHOLD;
    for (const faction of factions) {
        if (rbihHrhbAllied && (faction === 'RBiH' || faction === 'HRHB')) {
            const combined = new Set<string>(friendlyOsidsByFaction.get(faction)!);
            const ally: FactionId = faction === 'RBiH' ? 'HRHB' : 'RBiH';
            const allyFriendly = friendlyOsidsByFaction.get(ally);
            if (allyFriendly) for (const osid of allyFriendly) combined.add(osid);
            politicallyConnectedOsidsByFaction.set(faction, combined);
        } else {
            politicallyConnectedOsidsByFaction.set(faction, friendlyOsidsByFaction.get(faction)!);
        }
    }

    // Build per-faction connected components
    const componentsByFaction = new Map<FactionId, ReadonlyMap<string, number>>();
    for (const faction of factions) {
        const friendly = friendlyOsidsByFaction.get(faction)!;
        // buildFriendlyComponents expects mutable Map and Set — cast adjacency
        // to the expected type (the data is only read, not mutated).
        const components = buildFriendlyComponents(
            adjacency as Map<Osid, Osid[]>,
            friendly as Set<string>,
        );
        componentsByFaction.set(faction, components);
    }

    const ctx: SpatialContext = {
        adjacency,
        sharedBoundaryAdjacency,
        friendlyOsidsByFaction,
        politicallyConnectedOsidsByFaction,
        componentsByFaction,
        frontEdgesOsid,
        computedAtTurn: turn,
        phase,
    };

    return Object.freeze(ctx);
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience query functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BFS distance through friendly territory for a specific faction.
 * Returns -1 if unreachable within maxHops (or at all).
 */
export function spatialFriendlyDistance(
    ctx: SpatialContext,
    faction: FactionId,
    from: string,
    to: string,
    maxHops?: number,
): number {
    if (from === to) return 0;
    const friendly = ctx.friendlyOsidsByFaction.get(faction);
    if (!friendly) return -1;
    if (!friendly.has(from) || !friendly.has(to)) return -1;

    const visited = new Set<string>([from]);
    let frontier = [from];
    let depth = 0;

    while (frontier.length > 0) {
        depth++;
        if (maxHops !== undefined && depth > maxHops) return -1;
        const next: string[] = [];
        for (const osid of frontier) {
            const neighbors = ctx.adjacency.get(osid as Osid);
            if (!neighbors) continue;
            for (const n of neighbors) {
                if (n === to) return depth;
                if (!visited.has(n) && friendly.has(n)) {
                    visited.add(n);
                    next.push(n);
                }
            }
        }
        frontier = next;
    }

    return -1;
}

/**
 * Check if two OSIDs are in the same connected component for a faction.
 */
export function spatialSameComponent(
    ctx: SpatialContext,
    faction: FactionId,
    a: string,
    b: string,
): boolean {
    const components = ctx.componentsByFaction.get(faction);
    if (!components) return false;
    const ca = components.get(a);
    const cb = components.get(b);
    if (ca === undefined || cb === undefined) return false;
    return ca === cb;
}

/**
 * Get the friendly OSID set for a faction.
 * Returns an empty set if the faction is not in the context.
 */
export function spatialFriendlyOsids(
    ctx: SpatialContext,
    faction: FactionId,
): ReadonlySet<string> {
    return ctx.friendlyOsidsByFaction.get(faction) ?? new Set<string>();
}
