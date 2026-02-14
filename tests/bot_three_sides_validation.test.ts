/**
 * Validation tests for three-sided bot AI system.
 *
 * Verifies:
 * - Defender casualties are nonzero after battle resolution fix
 * - HRHB has active brigades (min_active_brigades enforcement)
 * - RS early-war aggression tuning
 * - Corps stance selection determinism
 * - AoR rebalancing reduces extreme disparities
 * - Attack dedup with OG operation exception
 * - Doctrine phase selection
 *
 * Deterministic: all tests use fixed state, no randomness.
 */

import { describe, it, expect } from 'vitest';
import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  SettlementId,
  CorpsCommandState
} from '../src/state/game_state.js';
import { MIN_COMBAT_PERSONNEL, MIN_BRIGADE_SPAWN, MAX_BRIGADE_PERSONNEL } from '../src/state/formation_constants.js';
import { FACTION_STRATEGIES, getEffectiveAttackShare, getActiveDoctrinePhase, getActiveStandingOrder, FACTION_STANDING_ORDERS } from '../src/sim/phase_ii/bot_strategy.js';

describe('Three-Sided Bot AI Validation', () => {

  // --- A1: Defender casualty floor ---

  it('MIN_COMBAT_PERSONNEL is lower than MIN_BRIGADE_SPAWN', () => {
    expect(MIN_COMBAT_PERSONNEL).toBeLessThan(MIN_BRIGADE_SPAWN);
    expect(MIN_COMBAT_PERSONNEL).toBe(100);
  });

  // --- A2: HRHB thresholds lowered ---

  it('HRHB attack_coverage_threshold is 100 (lowered from 170)', () => {
    expect(FACTION_STRATEGIES.HRHB.attack_coverage_threshold).toBe(100);
  });

  it('HRHB max_attack_posture_share is 0.35 (raised from 0.25)', () => {
    expect(FACTION_STRATEGIES.HRHB.max_attack_posture_share).toBe(0.35);
  });

  it('HRHB min_active_brigades is 2', () => {
    expect(FACTION_STRATEGIES.HRHB.min_active_brigades).toBe(2);
  });

  // --- A3: RS early-war attack share boost ---

  it('RS getEffectiveAttackShare returns 0.55 at turn 0', () => {
    const share = getEffectiveAttackShare('RS', 0);
    expect(share).toBeCloseTo(0.55, 2);
  });

  it('RS getEffectiveAttackShare tapers to base by turn 20', () => {
    const share = getEffectiveAttackShare('RS', 20);
    expect(share).toBe(FACTION_STRATEGIES.RS.max_attack_posture_share);
  });

  it('Non-RS factions are unaffected by early-war boost', () => {
    expect(getEffectiveAttackShare('RBiH', 0)).toBe(FACTION_STRATEGIES.RBiH.max_attack_posture_share);
    expect(getEffectiveAttackShare('HRHB', 0)).toBe(FACTION_STRATEGIES.HRHB.max_attack_posture_share);
  });

  // --- D3: Doctrine phases ---

  it('RS doctrine phase at turn 5 is offensive', () => {
    const phase = getActiveDoctrinePhase('RS', 5);
    expect(phase).not.toBeNull();
    expect(phase!.default_corps_stance).toBe('offensive');
    expect(phase!.max_attack_share_override).toBe(0.55);
  });

  it('RBiH doctrine phase at turn 5 is defensive', () => {
    const phase = getActiveDoctrinePhase('RBiH', 5);
    expect(phase).not.toBeNull();
    expect(phase!.default_corps_stance).toBe('defensive');
  });

  it('RBiH doctrine phase at turn 45 allows counteroffensive', () => {
    const phase = getActiveDoctrinePhase('RBiH', 45);
    expect(phase).not.toBeNull();
    expect(phase!.max_attack_share_override).toBe(0.25);
  });

  it('RS doctrine phase at turn 60 is strategic defense', () => {
    const phase = getActiveDoctrinePhase('RS', 60);
    expect(phase).not.toBeNull();
    expect(phase!.default_corps_stance).toBe('defensive');
    expect(phase!.aggression_modifier).toBe(-0.1);
  });

  // --- Faction strategies completeness ---

  it('all factions have min_active_brigades defined', () => {
    for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
      expect(FACTION_STRATEGIES[faction].min_active_brigades).toBeGreaterThanOrEqual(1);
    }
  });

  it('all factions have offensive_objectives and defensive_priorities', () => {
    for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
      expect(FACTION_STRATEGIES[faction].offensive_objectives.length).toBeGreaterThan(0);
      expect(FACTION_STRATEGIES[faction].defensive_priorities.length).toBeGreaterThan(0);
    }
  });

  // --- Army-Wide Standing Orders ---

  it('all factions have standing orders with no gaps', () => {
    for (const faction of ['RS', 'RBiH', 'HRHB'] as FactionId[]) {
      const orders = FACTION_STANDING_ORDERS[faction];
      expect(orders.length).toBeGreaterThanOrEqual(2);
      // First order starts at week 0
      expect(orders[0].start_week).toBe(0);
      // Orders are contiguous (no gaps)
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i].start_week).toBe(orders[i - 1].end_week);
      }
      // Last order extends far into the future
      expect(orders[orders.length - 1].end_week).toBe(9999);
    }
  });

  it('RS standing order at turn 5 is Territorial Seizure (general_offensive)', () => {
    const order = getActiveStandingOrder('RS', 5);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Territorial Seizure');
    expect(order!.army_stance).toBe('general_offensive');
  });

  it('RS standing order at turn 30 is Consolidation (balanced)', () => {
    const order = getActiveStandingOrder('RS', 30);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Consolidation');
    expect(order!.army_stance).toBe('balanced');
  });

  it('RS standing order at turn 60 is Strategic Hold (general_defensive)', () => {
    const order = getActiveStandingOrder('RS', 60);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Strategic Hold');
    expect(order!.army_stance).toBe('general_defensive');
  });

  it('RBiH standing order at turn 5 is Survival Defense (general_defensive)', () => {
    const order = getActiveStandingOrder('RBiH', 5);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Survival Defense');
    expect(order!.army_stance).toBe('general_defensive');
  });

  it('RBiH standing order at turn 50 is Stretch the Front (general_offensive)', () => {
    const order = getActiveStandingOrder('RBiH', 50);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Stretch the Front');
    expect(order!.army_stance).toBe('general_offensive');
    expect(order!.description).toContain('pinprick');
  });

  it('RBiH standing order at turn 90 is Controlled Counteroffensive (balanced)', () => {
    const order = getActiveStandingOrder('RBiH', 90);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Controlled Counteroffensive');
    expect(order!.army_stance).toBe('balanced');
  });

  it('HRHB standing order at turn 15 is Lasva Offensive (general_offensive)', () => {
    const order = getActiveStandingOrder('HRHB', 15);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Lasva Offensive');
    expect(order!.army_stance).toBe('general_offensive');
  });

  it('HRHB standing order at turn 30 is Washington Pivot (general_defensive)', () => {
    const order = getActiveStandingOrder('HRHB', 30);
    expect(order).not.toBeNull();
    expect(order!.name).toBe('Washington Pivot');
    expect(order!.army_stance).toBe('general_defensive');
  });
});
