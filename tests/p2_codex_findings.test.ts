/**
 * Package "1994-95 attack and defence" P2: the three Codex review findings on #774, each pinned by a
 * test that failed before its fix.
 *  1. An unloaned army-reserve elite off the front takes its `hold` rest order (step 2).
 *  2. A dug-in rear donor sent on an empty-sector relief march is released by the march (step 1).
 *  3. A defensive-gap loan deploys to the sector the request chose (breach first), not to the
 *     highest pressure-index sector (step 2/2b).
 */
import { describe, expect, it } from 'vitest';

import { applyPostureOrders } from '../src/sim/combat/brigade_posture.js';
import { deployEliteLoan } from '../src/sim/combat/army_reserve_system.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

const brigade = (id: string, faction: FactionId, loc: string, extra: Partial<FormationState> = {}): FormationState => ({
    id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade',
    personnel: 1500, cohesion: 40, tags: [], location_osid: loc, home_osid: loc, hq_sid: 'S1',
    ...extra,
} as FormationState);

const unloanedElite = () => ({
    on_loan: false, loaned_to_corps: null, loan_start_turn: null, last_recall_turn: null,
    loan_start_personnel: null, permanently_degraded: false, current_episode_id: null,
});

describe('Codex finding 1: an off-front army-reserve elite takes its hold rest order', () => {
    const state = (eliteLoan: boolean): GameState => ({
        meta: { turn: 20, phase: 'war' },
        factions: [{ id: 'RS' }],
        military: {
            formations: {
                rs_elite: brigade('rs_elite', 'RS', 'S1', { posture: 'defend', ...(eliteLoan ? { elite_loan_state: unloanedElite() } : {}) } as any),
            },
            brigade_posture_orders: [{ brigade_id: 'rs_elite', posture: 'hold' }],
            corps_front_sectors: {}, // off the front: no sector assigns it
        },
        political: { political_controllers: {} },
    } as unknown as GameState);

    it('an unloaned elite off the front moves from defend to hold', () => {
        const s = state(true);
        applyPostureOrders(s);
        expect(s.military.formations.rs_elite!.posture).toBe('hold');
    });

    it('an ordinary off-front brigade still cannot change posture', () => {
        const s = state(false);
        applyPostureOrders(s);
        expect(s.military.formations.rs_elite!.posture).toBe('defend');
    });
});

describe('Codex finding 2: an empty-sector relief march releases a dug-in rear donor', () => {
    const osids = ['A', 'B', 'C', 'D'];
    const edges = (): EdgeRecord[] => [
        { a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' },
    ] as unknown as EdgeRecord[];
    const reverseMap = (): OperationalToCanonicalReverseMap => new Map(osids.map((o) => [o, [o]])) as any;
    const terrain = (): TerrainScalarsData => ({ by_sid: Object.fromEntries(osids.map((o) => [o, {}])) }) as any;
    const state = (relief: boolean): GameState => ({
        meta: { turn: 1, phase: 'war' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        military: {
            formations: {
                rs_rear: brigade('rs_rear', 'RS', 'A', { corps_id: 'corps_1', posture: 'dig_in', dig_in_progress: 3 } as any),
            },
            corps_command: {
                corps_1: {
                    active_operations: [],
                    directive: {
                        sector_reassignment_orders: [{
                            brigade_id: 'rs_rear', to_sector_id: 'sec_empty',
                            ...(relief ? { empty_sector_relief: true } : {}),
                        }],
                    },
                },
            },
            corps_front_sectors: {
                sec_empty: {
                    sector_id: 'sec_empty', corps_id: 'corps_1', faction: 'RS',
                    sub_segments: [{ sub_segment_id: 'sec_empty:0', friendly_osids: ['C'], enemy_osids: ['D'] }],
                    assigned_brigade_ids: [], reserve_brigade_ids: [], territory_osids: ['C'],
                },
            },
            brigade_movement_orders: { rs_rear: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' } },
            front_pressure: {}, militia_pools: {},
        },
        political: { political_controllers: { A: 'RS', B: 'RS', C: 'RS', D: 'RBiH' } },
    } as unknown as GameState);

    it('the relief march starts and the donor leaves dig_in', () => {
        const s = state(true);
        const report = processOsidColumnMovement(s, edges(), reverseMap(), terrain());
        expect(report.column_blocked).toBe(0);
        expect(s.military.formations.rs_rear!.posture).toBe('defend');
        expect(s.military.formations.rs_rear!.dig_in_progress).toBe(0);
    });

    it('a sector reassignment that is not an empty-sector relief still cannot move a dug-in brigade', () => {
        const s = state(false);
        const report = processOsidColumnMovement(s, edges(), reverseMap(), terrain());
        expect(report.column_blocked).toBe(1);
        expect(s.military.formations.rs_rear!.posture).toBe('dig_in');
    });
});

describe('Codex finding 3: a defensive-gap loan deploys to the sector the request chose', () => {
    const chainAdj = (n: number): Map<Osid, Osid[]> => {
        const adj = new Map<Osid, Osid[]>();
        for (let i = 0; i < n; i++) {
            const id = `op:mun:o${i}` as Osid;
            adj.set(id, [i > 0 ? `op:mun:o${i - 1}` : null, i < n - 1 ? `op:mun:o${i + 1}` : null].filter(Boolean) as Osid[]);
        }
        return adj;
    };
    const sector = (id: string, osid: string, threat: number) => ({
        sector_id: id, corps_id: 'rs_corps', faction: 'RS', opposing_factions: ['RBiH'],
        edge_ids: [], sub_segments: [{ sub_segment_id: `${id}:0`, edge_ids: [], friendly_osids: [osid], enemy_osids: ['op:enemy:e0'], primary_brigade_ids: [], length_edges: 1 }],
        length_edges: 1, territory_osids: [osid], assigned_brigade_ids: [], reserve_brigade_ids: [],
        density: 0, threat_ratio: threat, defensive_power: 1, sector_stance: 'defend',
    });
    const state = (): GameState => ({
        meta: { turn: 30, phase: 'war' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        military: {
            formations: {
                rs_elite: brigade('rs_elite', 'RS', 'op:mun:o0', { corps_id: 'rs_main_staff', elite_loan_state: unloanedElite() } as any),
            },
            corps_command: { rs_corps: { active_operations: [] } },
            corps_front_sectors: {
                'sector:rs_corps:0': sector('sector:rs_corps:0', 'op:mun:o2', 1),   // the breach
                'sector:rs_corps:1': sector('sector:rs_corps:1', 'op:mun:o4', 100), // high pressure, not breached
            },
            front_pressure: {}, militia_pools: {},
        },
        political: { political_controllers: Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`op:mun:o${i}`, 'RS'])) },
    } as unknown as GameState);

    it('deploys to the requested breached sector, not the highest-index one', () => {
        const s = state();
        deployEliteLoan(s, 'rs_elite', 'rs_corps', 'defensive_gap', 2, 30, undefined, undefined, 'army_ai', chainAdj(5),
            { defend_sector_id: 'sector:rs_corps:0' });
        expect(s.military.brigade_movement_orders?.rs_elite?.destination_sids).toEqual(['op:mun:o2']);
    });

    it('without a requested sector it keeps the old highest-pressure choice', () => {
        const s = state();
        deployEliteLoan(s, 'rs_elite', 'rs_corps', 'defensive_gap', 2, 30, undefined, undefined, 'army_ai', chainAdj(5));
        expect(s.military.brigade_movement_orders?.rs_elite?.destination_sids).toEqual(['op:mun:o4']);
    });
});
