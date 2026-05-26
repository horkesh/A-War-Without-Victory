/**
 * Tests for emergency retreat reachability fix.
 *
 * Verifies that findEmergencyRetreatOsid does NOT teleport brigades
 * through enemy territory. Brigades must retreat to friendly OSIDs
 * reachable through connected friendly territory only.
 */
import { describe, it, expect } from 'vitest';
import { findEmergencyRetreatOsid } from '../src/sim/combat/attack_resolution_osid.js';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data_types.js';

/**
 * Topology:
 *
 *   A --- B --- C --- D --- E
 *
 *   A, B = RBiH (main body)
 *   C    = RS   (enemy salient cutting the front)
 *   D    = RBiH (isolated pocket)
 *   E    = RBiH (isolated pocket)
 *
 * Brigade at D (home_osid=A) should NOT teleport to A through enemy C.
 * It should retreat to E (same pocket) instead.
 */
function buildLinearTopology(): {
    state: GameState;
    adjacency: Map<Osid, Osid[]>;
    reverseMap: OperationalToCanonicalReverseMap;
    friendlyOsids: Set<string>;
} {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'test-retreat' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
        },
        displacement: {
            displacement_state: {},
            minority_flight_state: {},
            sustainability_state: {},
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            civilian_casualties: {},
        },
        political: {
            political_controllers: {
                'op:test:a': 'RBiH',
                'op:test:b': 'RBiH',
                'op:test:c': 'RS',      // enemy salient
                'op:test:d': 'RBiH',    // isolated pocket
                'op:test:e': 'RBiH',    // isolated pocket
            },
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        },
    };

    const adjacency = new Map<Osid, Osid[]>();
    adjacency.set('op:test:a' as Osid, ['op:test:b' as Osid]);
    adjacency.set('op:test:b' as Osid, ['op:test:a' as Osid, 'op:test:c' as Osid]);
    adjacency.set('op:test:c' as Osid, ['op:test:b' as Osid, 'op:test:d' as Osid]);
    adjacency.set('op:test:d' as Osid, ['op:test:c' as Osid, 'op:test:e' as Osid]);
    adjacency.set('op:test:e' as Osid, ['op:test:d' as Osid]);

    // Minimal reverse map — maps OSID to canonical SIDs (not needed here since
    // political_controllers already has OSID keys, but required by function signature)
    const reverseMap: OperationalToCanonicalReverseMap = new Map([
        ['op:test:a', ['S1']],
        ['op:test:b', ['S2']],
        ['op:test:c', ['S3']],
        ['op:test:d', ['S4']],
        ['op:test:e', ['S5']],
    ]);

    const friendlyOsids = new Set(['op:test:a', 'op:test:b', 'op:test:d', 'op:test:e']);

    return { state, adjacency, reverseMap, friendlyOsids };
}

describe('findEmergencyRetreatOsid reachability', () => {
    it('should NOT teleport to home_osid through enemy territory', () => {
        const { state, adjacency, reverseMap, friendlyOsids } = buildLinearTopology();

        const formation: FormationState = {
            id: 'brig_test',
            faction: 'RBiH',
            corps_id: 'corps_test',
            status: 'active',
            kind: 'brigade',
            name: 'Test Brigade',
            personnel: 500,
            morale: 50,
            cohesion: 50,
            home_osid: 'op:test:a',       // Main body — unreachable
            location_osid: 'op:test:d',   // Isolated pocket
        } as unknown as FormationState;

        const result = findEmergencyRetreatOsid(
            state, formation, reverseMap, adjacency, 'op:test:d', friendlyOsids
        );

        // Should retreat within the pocket (D or E), NOT teleport to A
        expect(result).not.toBe('op:test:a');
        expect(result).not.toBe('op:test:b');
        // Should find E (adjacent friendly in same pocket)
        expect(result).toBe('op:test:e');
    });

    it('should return home_osid when reachable through friendly territory', () => {
        const { state, adjacency, reverseMap, friendlyOsids } = buildLinearTopology();

        const formation: FormationState = {
            id: 'brig_test',
            faction: 'RBiH',
            corps_id: 'corps_test',
            status: 'active',
            kind: 'brigade',
            name: 'Test Brigade',
            personnel: 500,
            morale: 50,
            cohesion: 50,
            home_osid: 'op:test:a',
            location_osid: 'op:test:b',   // Adjacent to home, same component
        } as unknown as FormationState;

        const result = findEmergencyRetreatOsid(
            state, formation, reverseMap, adjacency, 'op:test:b', friendlyOsids
        );

        // Home is reachable through friendly territory — should return it
        expect(result).toBe('op:test:a');
    });

    it('BFS should not traverse enemy territory', () => {
        const { state, adjacency, reverseMap, friendlyOsids } = buildLinearTopology();

        // Brigade is at C (enemy OSID — just lost it). Neighbors: B (friendly main body), D (friendly pocket).
        // BFS from C should find nearest friendly neighbor, not traverse through enemy.
        const formation: FormationState = {
            id: 'brig_test',
            faction: 'RBiH',
            corps_id: 'corps_test',
            status: 'active',
            kind: 'brigade',
            name: 'Test Brigade',
            personnel: 500,
            morale: 50,
            cohesion: 50,
            location_osid: 'op:test:c',
        } as unknown as FormationState;

        const result = findEmergencyRetreatOsid(
            state, formation, reverseMap, adjacency, 'op:test:c', friendlyOsids
        );

        // Should find B or D (both are adjacent friendly). Sorted by strictCompare,
        // B (op:test:b) comes before D (op:test:d).
        expect(['op:test:b', 'op:test:d']).toContain(result);
    });

    it('should prefer largest component when completely cut off', () => {
        const { state, adjacency, reverseMap, friendlyOsids } = buildLinearTopology();

        // Make D enemy-controlled too, so E is a single-OSID pocket
        (state.political!.political_controllers as Record<string, string>)['op:test:d'] = 'RS';
        friendlyOsids.delete('op:test:d');

        const formation: FormationState = {
            id: 'brig_test',
            faction: 'RBiH',
            corps_id: 'corps_test',
            status: 'active',
            kind: 'brigade',
            name: 'Test Brigade',
            personnel: 500,
            morale: 50,
            cohesion: 50,
            home_osid: 'op:test:a',
            location_osid: 'op:test:e',   // Single-OSID pocket, no friendly neighbors
        } as unknown as FormationState;

        const result = findEmergencyRetreatOsid(
            state, formation, reverseMap, adjacency, 'op:test:e', friendlyOsids
        );

        // E has no friendly neighbors (D is now enemy). Home A is unreachable.
        // Step 5 (same component): E is in its own component, should find E.
        // Actually E IS friendly, and it's the origin's component (component containing E).
        // The origin is E which IS friendly, so originComponent = E's component.
        // Step 5 finds E itself.
        expect(result).toBe('op:test:e');
    });
});
