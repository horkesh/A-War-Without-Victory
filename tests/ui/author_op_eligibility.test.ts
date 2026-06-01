/**
 * Free War Phase 4 (#67) Slice 1 — author-new-op eligibility read-model.
 *
 * Covers buildAuthorableOpEligibility (read-only wrapper over the canonical
 * validateOpAtInjection gate): warning surfacing for each validation code,
 * blocking vs warning severity, the affordable flag against command authority,
 * and TS↔CJS parity of the AUTHOR_OP_COST constant.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

import {
  buildAuthorableOpEligibility,
} from '../../src/ui/map/data/backTheOfficer.js';
import { AUTHOR_OP_COST } from '../../src/ui/map/utils/commandAuthority.js';
import type { ValidatableOpDef } from '../../src/sim/combat/operation_validation.js';
import type { GameState } from '../../src/state/game_state.js';

// ── Minimal GameState fixture builder ──────────────────────────────────────
// Only the surfaces validateOpAtInjection + the eligibility read-model touch:
// meta.turn, military.formations, military.command_authority, and
// political.political_controllers. Cast once to GameState (no `as unknown`).
interface FixtureOpts {
  controllers?: Record<string, string>;
  formations?: Record<string, { kind?: string; status?: string; faction?: string }>;
  caCurrent?: number;
}
function makeState(opts: FixtureOpts = {}): GameState {
  const state = {
    meta: { turn: 5, player_faction: 'RBiH' },
    military: {
      formations: opts.formations ?? {},
      ...(opts.caCurrent !== undefined
        ? { command_authority: { current: opts.caCurrent, max: 100, spent_this_turn: 0, lifetime_spent: 0 } }
        : {}),
    },
    political: {
      political_controllers: opts.controllers ?? {},
    },
  };
  return state as unknown as GameState;
}

// An eligible brigade formation (kind brigade, active).
const ELIGIBLE_BRIGADE = { kind: 'brigade', status: 'active', faction: 'RBiH' };

function opDef(overrides: Partial<ValidatableOpDef> = {}): ValidatableOpDef {
  return {
    name: 'Authored Op Alpha',
    faction: 'RBiH',
    staging_osid: 'stage_1',
    axes: [
      {
        axis_id: 'axis_1',
        brigades: ['bde_1'],
        objectives: ['enemy_1'],
        staging_osid: 'stage_1',
      },
    ],
    ...overrides,
  };
}

describe('buildAuthorableOpEligibility — warning surfacing per validation code', () => {
  it('surfaces all_objectives_owned when every objective is already friendly', () => {
    const state = makeState({
      controllers: { enemy_1: 'RBiH' }, // objective owned by the op's own faction
      formations: { bde_1: ELIGIBLE_BRIGADE },
    });
    const result = buildAuthorableOpEligibility(state, opDef());
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain('all_objectives_owned');
    // all_objectives_owned is a warning, not a blocker → ok stays true for that code alone
    const owned = result.warnings.find((w) => w.code === 'all_objectives_owned');
    expect(owned?.severity).toBe('warning');
    expect(owned?.message).toMatch(/already controlled/i);
  });

  it('surfaces axis_empty when the axis has no valid objectives', () => {
    // objective owned by own faction → 0 enemy objectives → axis has no valid objectives
    const state = makeState({
      controllers: { enemy_1: 'RBiH' },
      formations: { bde_1: ELIGIBLE_BRIGADE },
    });
    const result = buildAuthorableOpEligibility(state, opDef());
    expect(result.warnings.map((w) => w.code)).toContain('axis_empty');
  });

  it('surfaces brigade_missing when a brigade is absent from formations', () => {
    const state = makeState({
      controllers: { enemy_1: 'RS' },
      formations: {}, // bde_1 missing
    });
    const result = buildAuthorableOpEligibility(state, opDef());
    expect(result.warnings.map((w) => w.code)).toContain('brigade_missing');
  });

  it('surfaces op_empty (error) and blocks when all axes are dropped', () => {
    // No valid brigades AND objective owned → axis_empty → op_empty (error)
    const state = makeState({
      controllers: { enemy_1: 'RBiH' },
      formations: {},
    });
    const result = buildAuthorableOpEligibility(state, opDef());
    expect(result.warnings.map((w) => w.code)).toContain('op_empty');
    const opEmpty = result.warnings.find((w) => w.code === 'op_empty');
    expect(opEmpty?.severity).toBe('error');
    expect(result.ok).toBe(false); // blocking error present
  });

  it('surfaces objective_overlap (error) when cmd carries a conflicting active op', () => {
    const state = makeState({
      controllers: { enemy_1: 'RS' },
      formations: { bde_1: ELIGIBLE_BRIGADE },
    });
    // Existing op carries the conflicting objective on an axis (validator reads
    // axes.flatMap(objectives) first; an empty axes array would mask the conflict).
    const cmd = {
      active_operations: [{ name: 'Existing Op', axes: [{ objectives: ['enemy_1'] }] }],
    } as unknown as Parameters<typeof buildAuthorableOpEligibility>[3];
    const result = buildAuthorableOpEligibility(state, opDef(), undefined, cmd);
    const overlap = result.warnings.find((w) => w.code === 'objective_overlap');
    expect(overlap).toBeDefined();
    expect(overlap?.severity).toBe('error');
    expect(result.ok).toBe(false);
  });

  it('returns ok with no warnings for a clean eligible op', () => {
    const state = makeState({
      controllers: { enemy_1: 'RS' }, // enemy-held objective
      formations: { bde_1: ELIGIBLE_BRIGADE },
    });
    const result = buildAuthorableOpEligibility(state, opDef());
    expect(result.warnings).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('sorts warnings deterministically by code then message', () => {
    const state = makeState({
      controllers: { enemy_1: 'RBiH' }, // produces all_objectives_owned + axis_empty + op_empty
      formations: {},
    });
    const result = buildAuthorableOpEligibility(state, opDef());
    const codes = result.warnings.map((w) => w.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });
});

describe('buildAuthorableOpEligibility — affordable flag + CA cost', () => {
  it('reports ca_cost === AUTHOR_OP_COST', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: { bde_1: ELIGIBLE_BRIGADE } });
    const result = buildAuthorableOpEligibility(state, opDef());
    expect(result.ca_cost).toBe(AUTHOR_OP_COST);
  });

  it('affordable=true when command authority >= cost', () => {
    const state = makeState({
      controllers: { enemy_1: 'RS' },
      formations: { bde_1: ELIGIBLE_BRIGADE },
      caCurrent: AUTHOR_OP_COST,
    });
    expect(buildAuthorableOpEligibility(state, opDef()).affordable).toBe(true);
  });

  it('affordable=false when command authority < cost', () => {
    const state = makeState({
      controllers: { enemy_1: 'RS' },
      formations: { bde_1: ELIGIBLE_BRIGADE },
      caCurrent: AUTHOR_OP_COST - 1,
    });
    expect(buildAuthorableOpEligibility(state, opDef()).affordable).toBe(false);
  });

  it('affordable defaults to true when command_authority is absent (pre-Phase-2 saves)', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: { bde_1: ELIGIBLE_BRIGADE } });
    expect(buildAuthorableOpEligibility(state, opDef()).affordable).toBe(true);
  });

  it('does not mutate the input state or def (pure)', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: { bde_1: ELIGIBLE_BRIGADE } });
    const def = opDef();
    const snapshot = JSON.stringify({ state, def });
    buildAuthorableOpEligibility(state, def);
    expect(JSON.stringify({ state, def })).toBe(snapshot);
  });
});

describe('buildAuthorableOpEligibility — operation-slot availability (silent in-engine)', () => {
  // 12 active brigades on the corps → getMaxOperationSlots = floor(12/12) = 1 slot.
  function corpsWith12Brigades(): Record<string, { kind?: string; status?: string; corps_id?: string }> {
    const f: Record<string, { kind?: string; status?: string; corps_id?: string }> = {
      bde_1: { kind: 'brigade', status: 'active', corps_id: 'corps_A' },
    };
    for (let i = 2; i <= 12; i++) {
      f[`fill_${i}`] = { kind: 'brigade', status: 'active', corps_id: 'corps_A' };
    }
    return f;
  }

  it('reports slots_used/slots_max and has_available_slot when a slot is free', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: corpsWith12Brigades() });
    const cmd = { active_operations: [] } as unknown as Parameters<typeof buildAuthorableOpEligibility>[3];
    const result = buildAuthorableOpEligibility(state, opDef(), undefined, cmd, 'corps_A');
    expect(result.slots_max).toBe(1);
    expect(result.slots_used).toBe(0);
    expect(result.has_available_slot).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('blocks (has_available_slot=false, ok=false) when the corps has no free slot', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: corpsWith12Brigades() });
    // 1 slot max, 1 active op already → exhausted.
    const cmd = {
      active_operations: [{ name: 'Existing Op', objectives: ['other_osid'], axes: [] }],
    } as unknown as Parameters<typeof buildAuthorableOpEligibility>[3];
    const result = buildAuthorableOpEligibility(state, opDef(), undefined, cmd, 'corps_A');
    expect(result.slots_max).toBe(1);
    expect(result.slots_used).toBe(1);
    expect(result.has_available_slot).toBe(false);
    // No validation errors here, yet ok must be false because slot exhaustion blocks.
    expect(result.warnings.some((w) => w.severity === 'error')).toBe(false);
    expect(result.ok).toBe(false);
  });

  it('recovery-phase op does not occupy a slot (still has_available_slot)', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: corpsWith12Brigades() });
    // 1 slot max, but the only active op is in the recovery phase → not counted →
    // a slot remains free for the authored op (mirrors emit.ts `phase !== 'recovery'`).
    const cmd = {
      active_operations: [{ name: 'Recovering Op', objectives: ['other_osid'], axes: [], phase: 'recovery' }],
    } as unknown as Parameters<typeof buildAuthorableOpEligibility>[3];
    const result = buildAuthorableOpEligibility(state, opDef(), undefined, cmd, 'corps_A');
    expect(result.slots_max).toBe(1);
    expect(result.slots_used).toBe(0);
    expect(result.has_available_slot).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('defaults to has_available_slot=true when corps context is unavailable', () => {
    const state = makeState({ controllers: { enemy_1: 'RS' }, formations: { bde_1: ELIGIBLE_BRIGADE } });
    const result = buildAuthorableOpEligibility(state, opDef());
    expect(result.has_available_slot).toBe(true);
    expect(result.slots_max).toBe(1);
    expect(result.slots_used).toBe(0);
  });
});

describe('AUTHOR_OP_COST — TS ↔ CJS contract parity', () => {
  it('matches the CJS mirror in autonomy_ipc_contract.cjs', () => {
    const require = createRequire(import.meta.url);
    const cjs = require('../../src/desktop/autonomy_ipc_contract.cjs') as { AUTHOR_OP_COST: number };
    expect(cjs.AUTHOR_OP_COST).toBe(AUTHOR_OP_COST);
  });
});
