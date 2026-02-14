/**
 * Tests for Phase II brigade posture system (Stage 4B).
 * Validates posture adoption constraints, order processing,
 * per-turn cohesion costs, and auto-downgrade mechanics.
 */
import { describe, it, expect } from 'vitest';
import {
  canAdoptPosture,
  applyPostureOrders,
  applyPostureCosts
} from '../src/sim/phase_ii/brigade_posture.js';
import type { GameState, FormationState, FactionId, BrigadePosture } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeFormation(id: string, faction: FactionId, hq: string, personnel: number = 1000): FormationState {
  return {
    id, faction, name: `Brigade ${id}`, created_turn: 1, status: 'active',
    assignment: null, kind: 'brigade', personnel, cohesion: 60, hq_sid: hq, tags: []
  };
}

function makePostureState(overrides?: Partial<{ formations: Record<string, FormationState> }>): GameState {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 20, seed: 'posture-test', phase: 'phase_ii' } as any,
    factions: [
      { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: overrides?.formations ?? {
      'rs-brig-1': makeFormation('rs-brig-1', 'RS', 'S1')
    },
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RS' },
    brigade_posture_orders: []
  } as GameState;
}

describe('brigade posture - canAdoptPosture', () => {
  it('high cohesion (60) can adopt attack', () => {
    const brig = makeFormation('rs-brig-1', 'RS', 'S1');
    brig.cohesion = 60;
    expect(canAdoptPosture(brig, 'attack')).toBe(true);
  });

  it('low cohesion (30) cannot adopt attack (min 40)', () => {
    const brig = makeFormation('rs-brig-1', 'RS', 'S1');
    brig.cohesion = 30;
    expect(canAdoptPosture(brig, 'attack')).toBe(false);
  });

  it('readiness=degraded cannot adopt attack (only active allowed)', () => {
    const brig = makeFormation('rs-brig-1', 'RS', 'S1');
    brig.cohesion = 60;
    brig.readiness = 'degraded';
    expect(canAdoptPosture(brig, 'attack')).toBe(false);
  });

  it('can adopt consolidation posture (min cohesion 0, readiness active/overextended/degraded)', () => {
    const brig = makeFormation('rs-brig-1', 'RS', 'S1');
    brig.cohesion = 20;
    brig.readiness = 'active';
    expect(canAdoptPosture(brig, 'consolidation')).toBe(true);
    brig.readiness = 'degraded';
    expect(canAdoptPosture(brig, 'consolidation')).toBe(true);
  });
});

describe('brigade posture - applyPostureOrders', () => {
  it('changes posture and reports count', () => {
    const state = makePostureState();
    state.brigade_posture_orders = [
      { brigade_id: 'rs-brig-1', posture: 'attack' }
    ];

    const report = applyPostureOrders(state);

    expect(report.postures_changed).toBe(1);
    expect(report.postures_rejected).toBe(0);
    expect(state.formations['rs-brig-1'].posture).toBe('attack');
  });

  it('rejects invalid posture order when cohesion is too low', () => {
    const state = makePostureState();
    state.formations['rs-brig-1'].cohesion = 30;
    state.brigade_posture_orders = [
      { brigade_id: 'rs-brig-1', posture: 'attack' }
    ];

    const report = applyPostureOrders(state);

    expect(report.postures_changed).toBe(0);
    expect(report.postures_rejected).toBe(1);
    // Posture should remain unchanged (default is undefined which means 'defend')
    expect(state.formations['rs-brig-1'].posture).not.toBe('attack');
  });

  it('clears orders after processing', () => {
    const state = makePostureState();
    state.brigade_posture_orders = [
      { brigade_id: 'rs-brig-1', posture: 'probe' }
    ];

    applyPostureOrders(state);

    expect(state.brigade_posture_orders).toEqual([]);
  });

  it('applies consolidation posture order', () => {
    const state = makePostureState();
    state.brigade_posture_orders = [
      { brigade_id: 'rs-brig-1', posture: 'consolidation' }
    ];

    const report = applyPostureOrders(state);

    expect(report.postures_changed).toBe(1);
    expect(state.formations['rs-brig-1'].posture).toBe('consolidation');
  });
});

describe('brigade posture - applyPostureCosts', () => {
  it('attack posture drains 3 cohesion per turn', () => {
    const state = makePostureState();
    state.formations['rs-brig-1'].posture = 'attack';
    state.formations['rs-brig-1'].cohesion = 60;

    applyPostureCosts(state);

    expect(state.formations['rs-brig-1'].cohesion).toBe(57);
  });

  it('consolidation posture adds 0.5 cohesion per turn (soft front)', () => {
    const state = makePostureState();
    state.formations['rs-brig-1'].posture = 'consolidation';
    state.formations['rs-brig-1'].cohesion = 50;

    applyPostureCosts(state);

    expect(state.formations['rs-brig-1'].cohesion).toBe(50); // 0.5 truncated to 0
  });

  it('defend posture recovers 1 cohesion per turn, capped at 80', () => {
    const state = makePostureState();
    state.formations['rs-brig-1'].posture = 'defend';
    state.formations['rs-brig-1'].cohesion = 79;

    applyPostureCosts(state);

    // 79 + 1 = 80 (at cap)
    expect(state.formations['rs-brig-1'].cohesion).toBe(80);

    // Apply again: should stay at 80
    applyPostureCosts(state);
    expect(state.formations['rs-brig-1'].cohesion).toBe(80);
  });

  it('auto-downgrades to defend when cohesion drops below posture minimum', () => {
    const state = makePostureState();
    // attack requires min 40; set cohesion to 41 so after -3 drain it becomes 38 < 40
    state.formations['rs-brig-1'].posture = 'attack';
    state.formations['rs-brig-1'].cohesion = 41;

    applyPostureCosts(state);

    // 41 - 3 = 38, below attack minimum of 40 => auto-downgrade to defend
    expect(state.formations['rs-brig-1'].cohesion).toBe(38);
    expect(state.formations['rs-brig-1'].posture).toBe('defend');
  });
});
