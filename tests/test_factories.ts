/**
 * Shared test factories for FormationState, CorpsFrontSector, and related types.
 * Consolidates 15+ duplicate makeFormation() and 4+ duplicate makeSector() helpers.
 *
 * Usage: import { makeFormation, makeSector } from './test_factories.js';
 */

import type {
    FormationState,
    FactionId,
    FormationId,
    CorpsFrontSector,
    CorpsFrontSubSegment,
} from '../src/state/game_state.js';

// ─── FormationState factory ────────────────────────────────────────────────

/**
 * Create a minimal FormationState for testing.
 * All fields have sensible defaults; pass overrides to customise.
 *
 * Common patterns this replaces:
 *   makeFormation({ id: 'b1', faction: 'RS' })                 — override style
 *   makeFormation({ id: 'b1', faction: 'RS', personnel: 500 }) — with extras
 */
export function makeFormation(
    overrides: Partial<FormationState> & { id: string; faction: FactionId },
): FormationState {
    return {
        name: overrides.name ?? overrides.id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 60,
        morale: 60,
        experience: 0.5,
        posture: 'defend',
        ...overrides,
    } as FormationState;
}

/**
 * Create a corps FormationState.
 * Convenience wrapper with kind='corps' defaults.
 */
export function makeCorps(
    overrides: Partial<FormationState> & { id: string; faction: FactionId },
): FormationState {
    return makeFormation({
        kind: 'corps',
        personnel: 50,
        cohesion: 80,
        ...overrides,
    });
}

// ─── CorpsFrontSubSegment factory ──────────────────────────────────────────

/**
 * Create a minimal CorpsFrontSubSegment for testing.
 */
export function makeSubSegment(
    overrides: Partial<CorpsFrontSubSegment> & {
        sub_segment_id: string;
        edge_ids: string[];
    },
): CorpsFrontSubSegment {
    return {
        friendly_osids: [],
        enemy_osids: [],
        length_edges: overrides.edge_ids.length,
        ...overrides,
    };
}

// ─── CorpsFrontSector factory ──────────────────────────────────────────────

/**
 * Create a minimal CorpsFrontSector for testing.
 *
 * If sub_segments is not provided, a single sub-segment is auto-built from
 * the supplied friendly_osids, enemy_osids, and edge_ids.
 *
 * Common patterns this replaces:
 *   makeSector('sec1', 'corps1', edges, friendly, enemy, assigned)
 *   makeSector({ sector_id, corps_id, ... })
 */
export function makeSector(opts: {
    sector_id: string;
    corps_id: string;
    faction?: FactionId;
    opposing_factions?: FactionId[];
    edge_ids?: string[];
    sub_segments?: CorpsFrontSubSegment[];
    friendly_osids?: string[];
    enemy_osids?: string[];
    assigned_brigade_ids?: string[];
    reserve_brigade_ids?: string[];
    density?: number;
    threat_ratio?: number;
    defensive_power?: number;
    length_edges?: number;
}): CorpsFrontSector {
    const edgeIds = opts.edge_ids ?? [];
    const friendlyOsids = opts.friendly_osids ?? [];
    const enemyOsids = opts.enemy_osids ?? [];
    const assignedBrigadeIds = (opts.assigned_brigade_ids ?? []) as FormationId[];
    const reserveBrigadeIds = (opts.reserve_brigade_ids ?? []) as FormationId[];

    const subSegments: CorpsFrontSubSegment[] = opts.sub_segments ?? [
        {
            sub_segment_id: `subseg:${opts.corps_id}:0`,
            edge_ids: edgeIds,
            friendly_osids: friendlyOsids,
            enemy_osids: enemyOsids,
            length_edges: edgeIds.length,
        },
    ];

    const lengthEdges = opts.length_edges ?? edgeIds.length;

    return {
        sector_id: opts.sector_id,
        corps_id: opts.corps_id as FormationId,
        faction: (opts.faction ?? 'RS') as FactionId,
        opposing_factions: (opts.opposing_factions ?? ['RBiH']) as FactionId[],
        edge_ids: edgeIds,
        sub_segments: subSegments,
        length_edges: lengthEdges,
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: reserveBrigadeIds,
        density: opts.density ?? (lengthEdges > 0 ? assignedBrigadeIds.length / lengthEdges : 0),
        threat_ratio: opts.threat_ratio ?? 1.0,
        defensive_power: opts.defensive_power ?? 100,
    };
}
