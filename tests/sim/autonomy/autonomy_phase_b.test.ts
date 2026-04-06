import { describe, it, expect } from 'vitest';
import type { PendingProposalReview } from '../../../src/state/game_state.js';
import type { GameState, FactionId } from '../../../src/state/game_state.js';
import { applyAutonomyOverride, clearAutonomyOverride, getAutonomyOverride } from '../../../src/sim/ai_commander/autonomy_overrides.js';

function makeMinimalState(turn = 5, autonomyLevel?: 0|1|2|3): GameState {
  return {
    meta: {
      turn,
      seed: 'test',
      ...(autonomyLevel !== undefined ? { autonomy_level: autonomyLevel } : {}),
    },
  } as unknown as GameState;
}

describe('autonomy_overrides: applyAutonomyOverride', () => {
  it('creates override when none exists', () => {
    const state = makeMinimalState(5);
    applyAutonomyOverride(state, { level: 'corps', target_id: 'arbih_1st', faction: 'RBiH' });
    expect(state.meta.autonomy_overrides).toHaveLength(1);
    expect(state.meta.autonomy_overrides![0]).toMatchObject({
      turn: 5,
      level: 'corps',
      target_id: 'arbih_1st',
      faction: 'RBiH',
    });
  });

  it('is idempotent: second apply for same target_id replaces first', () => {
    const state = makeMinimalState(5);
    applyAutonomyOverride(state, { level: 'corps', target_id: 'arbih_1st', faction: 'RBiH' });
    applyAutonomyOverride(state, { level: 'army', target_id: 'arbih_1st', faction: 'RBiH' });
    expect(state.meta.autonomy_overrides).toHaveLength(1);
    expect(state.meta.autonomy_overrides![0].level).toBe('army');
  });

  it('preserves other overrides when upserting a different target_id', () => {
    const state = makeMinimalState(5);
    applyAutonomyOverride(state, { level: 'corps', target_id: 'arbih_1st', faction: 'RBiH' });
    applyAutonomyOverride(state, { level: 'corps', target_id: 'vrs_2nd', faction: 'RS' });
    expect(state.meta.autonomy_overrides).toHaveLength(2);
  });
});

describe('autonomy_overrides: clearAutonomyOverride', () => {
  it('removes override for the specified target_id', () => {
    const state = makeMinimalState(5);
    applyAutonomyOverride(state, { level: 'corps', target_id: 'arbih_1st', faction: 'RBiH' });
    clearAutonomyOverride(state, 'arbih_1st');
    expect(state.meta.autonomy_overrides).toHaveLength(0);
  });

  it('leaves other overrides intact', () => {
    const state = makeMinimalState(5);
    applyAutonomyOverride(state, { level: 'corps', target_id: 'arbih_1st', faction: 'RBiH' });
    applyAutonomyOverride(state, { level: 'corps', target_id: 'vrs_2nd', faction: 'RS' });
    clearAutonomyOverride(state, 'arbih_1st');
    expect(state.meta.autonomy_overrides).toHaveLength(1);
    expect(state.meta.autonomy_overrides![0].target_id).toBe('vrs_2nd');
  });
});

describe('autonomy_overrides: getAutonomyOverride', () => {
  it('returns undefined when no overrides exist', () => {
    const state = makeMinimalState(5);
    expect(getAutonomyOverride(state, 'arbih_1st')).toBeUndefined();
  });

  it('returns the matching override', () => {
    const state = makeMinimalState(5);
    applyAutonomyOverride(state, { level: 'event', target_id: 'test_event', faction: 'RBiH' });
    const result = getAutonomyOverride(state, 'test_event');
    expect(result).toBeDefined();
    expect(result!.faction).toBe('RBiH');
  });
});

describe('PendingProposalReview type shape', () => {
  it('accepts a valid PendingProposalReview on StateMeta', () => {
    const state = makeMinimalState(5);
    state.meta.pending_proposal_reviews = [{
      id: 'PROP_5_military_0',
      turn: 5,
      faction: 'RBiH' as FactionId,
      domain: 'military',
      description: 'Hold sector Bihać',
      proposed_action: 'hold_sector',
    }];
    expect(state.meta.pending_proposal_reviews).toHaveLength(1);
    expect(state.meta.pending_proposal_reviews![0].domain).toBe('military');
  });

  it('accepted and resolved_turn are optional', () => {
    const review: PendingProposalReview = {
      id: 'PROP_5_military_0',
      turn: 5,
      faction: 'RBiH' as FactionId,
      domain: 'military',
      description: 'test',
      proposed_action: 'test_action',
    };
    // Should compile without accepted/resolved_turn
    expect(review.accepted).toBeUndefined();
  });
});
