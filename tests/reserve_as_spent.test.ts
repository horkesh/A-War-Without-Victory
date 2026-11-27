import { describe, expect, it } from 'vitest';

import { runCohesionDrift } from '../src/sim/combat/cohesion_drift.js';
import { collectStrategicReserves } from '../src/sim/combat/strategic_reserve.js';
import type { FormationState, GameState, MilitiaPoolState } from '../src/state/game_state.js';

/**
 * RESERVE-AS-SPENT (orchestrator ruling §45, 2026-11-27).
 * `pool.committed` carries the strategic-reserve overflow (strategic_reserve.ts, Fix A3), which is right
 * for the mobilization caps. The Part 7c strain ratio must not read those unspent reserve men as spent:
 * it counts `strategic_reserves[faction]` as available.
 */

function brigade(id: string, faction: string): FormationState {
    return {
        id,
        name: id,
        kind: 'brigade',
        status: 'active',
        faction,
        corps_id: 'test_corps',
        location_osid: 'op:test:a',
        personnel: 1500,
        strength: 1500,
        morale: 60,
        cohesion: 70,
        officer_quality: 0.7,
        composition: {
            tanks: 0,
            artillery: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
    } as unknown as FormationState;
}

function pool(mun: string, faction: string, available: number, committed: number): MilitiaPoolState {
    return { mun_id: mun, faction, available, committed, exhausted: 0, updated_turn: 0 } as unknown as MilitiaPoolState;
}

function stateWith(
    pools: Record<string, MilitiaPoolState>,
    reserves: Record<string, number> | undefined,
    faction = 'RBiH',
): GameState {
    return {
        schema_version: 0,
        meta: { turn: 120, phase: 'war', seed: 'reserve-as-spent' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: { b1: brigade('b1', faction) },
            militia_pools: pools,
            strategic_reserves: reserves,
            corps_command: {},
            corps_front_sectors: {},
            brigade_movement_orders: {},
            brigade_movement_state: {},
        },
        political: { political_controllers: { 'op:test:a': faction } },
        displacement: {},
    } as unknown as GameState;
}

describe('RESERVE-AS-SPENT: the strain ratio counts the faction reserve as available', () => {
    it('reserve > 0 puts RBiH under the 0.80 threshold (raw committed ratio 0.90)', () => {
        // committed 9,000 of which 3,000 sit unspent in the reserve; available 1,000.
        // Old ratio 9000/10000 = 0.90 (penalised). Corrected (9000-3000)/10000 = 0.60.
        const state = stateWith({ 'm1:RBiH': pool('m1', 'RBiH', 1000, 9000) }, { RBiH: 3000 });
        const report = runCohesionDrift(state, []);
        expect(report.exhaustion_penalties_applied?.RBiH).toBeUndefined();
    });

    it('still penalises when the spent share alone is over the threshold', () => {
        // (9500-200)/10000 = 0.93 >= 0.80.
        const state = stateWith({ 'm1:RBiH': pool('m1', 'RBiH', 500, 9500) }, { RBiH: 200 });
        const report = runCohesionDrift(state, []);
        expect(report.exhaustion_penalties_applied?.RBiH).toBe(-0.5);
    });

    it('is faction-blind: an RS reserve balance is read the same way', () => {
        // RS threshold 0.92. Raw 9600/10000 = 0.96; corrected (9600-2000)/10000 = 0.76.
        const state = stateWith({ 'm1:RS': pool('m1', 'RS', 400, 9600) }, { RS: 2000 }, 'RS');
        const report = runCohesionDrift(state, []);
        expect(report.exhaustion_penalties_applied?.RS).toBeUndefined();
    });

    it('clamps at 0 when the reserve exceeds committed (orphan-drained men never went through committed)', () => {
        const state = stateWith({ 'm1:RBiH': pool('m1', 'RBiH', 1000, 500) }, { RBiH: 5000 });
        const report = runCohesionDrift(state, []);
        expect(report.exhaustion_penalties_applied).toBeUndefined();
    });

    it('with no reserve the ratio is unchanged from committed / (committed + available)', () => {
        const state = stateWith({ 'm1:RBiH': pool('m1', 'RBiH', 1000, 9000) }, undefined);
        const report = runCohesionDrift(state, []);
        expect(report.exhaustion_penalties_applied?.RBiH).toBe(-0.5);
    });

    it('leaves the mobilization cumulative untouched: overflow still moves into pool.committed and the reserve', () => {
        const pools = { 'm1:RBiH': pool('m1', 'RBiH', 8000, 1000) };
        const state = stateWith(pools, {});
        const collected = collectStrategicReserves(state);
        expect(collected.manpower_collected).toBe(3000);
        expect(pools['m1:RBiH'].available).toBe(5000);
        expect(pools['m1:RBiH'].committed).toBe(4000);
        expect(state.military.strategic_reserves?.RBiH).toBe(3000);
        // The reader change does not write: running drift leaves pools and the reserve as they were.
        runCohesionDrift(state, []);
        expect(pools['m1:RBiH'].committed).toBe(4000);
        expect(pools['m1:RBiH'].available).toBe(5000);
        expect(state.military.strategic_reserves?.RBiH).toBe(3000);
    });
});
