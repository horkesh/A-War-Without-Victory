/**
 * Author-new-op staging contract (Free War Phase 4, #67) — Slice 2 Part A.
 *
 * Exercises the pure staging logic used by the desktop IPC handler
 * (electron-main.cjs `stage-corps-operation-order` delegates to
 * stageAuthoredOperation). Verifies the canon-safety contract:
 *   - player-faction ownership restriction (corps_not_owned_by_player)
 *   - command-authority guard (insufficient_command_authority) + debit on success
 *   - payload validation (invalid type / missing fields)
 *   - stages cc.pending_authored_op
 *   - NEVER pushes directly to active_operations (the old PHASE 5 hack)
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageAuthoredOperation, AUTHOR_OP_COST } = require('../src/desktop/author_op_staging.cjs') as {
  stageAuthoredOperation: (state: any, payload: any) => { ok: boolean; error?: string };
  AUTHOR_OP_COST: number;
};

function makeState(opts: { playerFaction?: string; corpsFaction?: string; ca?: number } = {}) {
  const ca = opts.ca ?? 100;
  return {
    meta: { turn: 5, player_faction: opts.playerFaction ?? 'RBiH' },
    military: {
      command_authority: { current: ca, spent_this_turn: 0, lifetime_spent: 0 },
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: opts.corpsFaction ?? 'RBiH' },
      },
      corps_command: {
        rbih_1st_corps: { active_operations: [] as any[] } as any,
      } as Record<string, any>,
    },
  };
}

function makePayload(over: Record<string, unknown> = {}) {
  return {
    corpsId: 'rbih_1st_corps',
    name: 'Operation Author Test',
    type: 'sector_attack',
    objectives: ['op:test:a', 'op:test:b'],
    participatingBrigades: ['rbih_b1', 'rbih_b2'],
    stagingOsid: 'op:test:stage',
    ...over,
  };
}

describe('author-op staging contract', () => {
  it('rejects authoring a corps not owned by the player faction (no CA debit, nothing staged)', () => {
    const state = makeState({ playerFaction: 'RBiH', corpsFaction: 'RS' });
    const res = stageAuthoredOperation(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_owned_by_player');
    // No debit.
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.command_authority.spent_this_turn).toBe(0);
    // Nothing staged.
    expect(state.military.corps_command.rbih_1st_corps.pending_authored_op).toBeUndefined();
  });

  it('rejects when command authority is insufficient (no debit, nothing staged)', () => {
    const state = makeState({ ca: AUTHOR_OP_COST - 1 });
    const res = stageAuthoredOperation(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('insufficient_command_authority');
    expect(state.military.command_authority.current).toBe(AUTHOR_OP_COST - 1);
    expect(state.military.corps_command.rbih_1st_corps.pending_authored_op).toBeUndefined();
  });

  it('debits command authority by AUTHOR_OP_COST on success', () => {
    const state = makeState({ ca: 100 });
    const res = stageAuthoredOperation(state, makePayload());
    expect(res.ok).toBe(true);
    const auth = state.military.command_authority;
    expect(auth.current).toBe(100 - AUTHOR_OP_COST);
    expect(auth.spent_this_turn).toBe(AUTHOR_OP_COST);
    expect(auth.lifetime_spent).toBe(AUTHOR_OP_COST);
  });

  it('rejects invalid payloads (bad type, missing name/corpsId)', () => {
    const state = makeState();
    expect(stageAuthoredOperation(state, makePayload({ type: 'nuke_everything' })).error).toContain('Invalid operation type');
    expect(stageAuthoredOperation(makeState(), makePayload({ name: '' })).error).toBe('invalid_payload');
    expect(stageAuthoredOperation(makeState(), makePayload({ corpsId: 42 })).error).toBe('invalid_payload');
    // None of these debited or staged the (last) state.
    expect(state.military.corps_command.rbih_1st_corps.pending_authored_op).toBeUndefined();
  });

  it('rejects when the corps command entry is absent', () => {
    const state = makeState();
    const res = stageAuthoredOperation(state, makePayload({ corpsId: 'nonexistent_corps' }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_found');
  });

  it('stages cc.pending_authored_op with the authored def + turn + ca_cost', () => {
    const state = makeState();
    const res = stageAuthoredOperation(state, makePayload({ tempo: 'all_out', artilleryPreparation: true }));
    expect(res.ok).toBe(true);
    const pending = state.military.corps_command.rbih_1st_corps.pending_authored_op;
    expect(pending).toBeDefined();
    expect(pending.turn).toBe(5);
    expect(pending.ca_cost).toBe(AUTHOR_OP_COST);
    expect(pending.def.corps_id).toBe('rbih_1st_corps');
    expect(pending.def.name).toBe('Operation Author Test');
    expect(pending.def.type).toBe('sector_attack');
    expect(pending.def.objectives).toEqual(['op:test:a', 'op:test:b']);
    expect(pending.def.participating_brigades).toEqual(['rbih_b1', 'rbih_b2']);
    expect(pending.def.tempo).toBe('all_out');
    expect(pending.def.artillery_preparation).toBe(true);
  });

  it('NEVER pushes directly to active_operations (the removed PHASE 5 hack)', () => {
    const state = makeState();
    const res = stageAuthoredOperation(state, makePayload());
    expect(res.ok).toBe(true);
    // The whole point of the rewrite: staging does not mutate active_operations.
    expect(state.military.corps_command.rbih_1st_corps.active_operations).toHaveLength(0);
  });

  it('observer mode (no player_faction) does not block authoring', () => {
    const state = makeState();
    state.meta.player_faction = undefined as any;
    const res = stageAuthoredOperation(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.rbih_1st_corps.pending_authored_op).toBeDefined();
  });
});
