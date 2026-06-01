/**
 * STOP-OP staging contract (Presidential Command Model slice 1/N).
 *
 * Exercises the pure staging logic used by the desktop IPC handler
 * (electron-main.cjs `stage-op-halt-order` delegates to stageOpHalt). Verifies the
 * canon-safety contract:
 *   - player-faction ownership restriction (corps_not_owned_by_player)
 *   - confirm a matching LIVE op exists (op_not_found)
 *   - reject a duplicate halt already staged (pending_op_halt_exists)
 *   - command-authority guard (insufficient_command_authority) + debit on success
 *   - payload validation (missing corpsId / missing op identifier)
 *   - stages cc.pending_op_halt, NEVER mutates active_operations
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageOpHalt, STOP_OP_COST } = require('../src/desktop/op_halt.cjs') as {
  stageOpHalt: (state: any, payload: any) => { ok: boolean; error?: string };
  STOP_OP_COST: number;
};

function makeState(opts: { playerFaction?: string; corpsFaction?: string; ca?: number; ops?: any[] } = {}) {
  const ca = opts.ca ?? 100;
  const ops = opts.ops ?? [{ id: 'op_live_1', name: 'Operation Live', phase: 'execution' }];
  return {
    meta: { turn: 7, player_faction: opts.playerFaction ?? 'RBiH' },
    military: {
      command_authority: { current: ca, spent_this_turn: 0, lifetime_spent: 0 },
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: opts.corpsFaction ?? 'RBiH' },
      },
      corps_command: {
        rbih_1st_corps: { active_operations: ops as any[] } as any,
      } as Record<string, any>,
    },
  };
}

function makePayload(over: Record<string, unknown> = {}) {
  return { corpsId: 'rbih_1st_corps', opId: 'op_live_1', ...over };
}

describe('STOP-OP staging contract', () => {
  it('rejects halting a corps not owned by the player faction (no CA debit, nothing staged)', () => {
    const state = makeState({ playerFaction: 'RBiH', corpsFaction: 'RS' });
    const res = stageOpHalt(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_owned_by_player');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.command_authority.spent_this_turn).toBe(0);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_halt).toBeUndefined();
  });

  it('rejects when no matching live op exists (no debit, nothing staged)', () => {
    const state = makeState();
    const res = stageOpHalt(state, makePayload({ opId: 'op_does_not_exist' }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('op_not_found');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_halt).toBeUndefined();
  });

  it('rejects when command authority is insufficient (no debit, nothing staged)', () => {
    const state = makeState({ ca: STOP_OP_COST - 1 });
    const res = stageOpHalt(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('insufficient_command_authority');
    expect(state.military.command_authority.current).toBe(STOP_OP_COST - 1);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_halt).toBeUndefined();
  });

  it('debits command authority by STOP_OP_COST on success', () => {
    const state = makeState({ ca: 100 });
    const res = stageOpHalt(state, makePayload());
    expect(res.ok).toBe(true);
    const auth = state.military.command_authority;
    expect(auth.current).toBe(100 - STOP_OP_COST);
    expect(auth.spent_this_turn).toBe(STOP_OP_COST);
    expect(auth.lifetime_spent).toBe(STOP_OP_COST);
  });

  it('rejects invalid payloads (missing corpsId, missing op identifier)', () => {
    expect(stageOpHalt(makeState(), makePayload({ corpsId: 42 })).error).toBe('invalid_payload');
    expect(stageOpHalt(makeState(), { corpsId: 'rbih_1st_corps' }).error).toBe('invalid_payload');
  });

  it('rejects when the corps command entry is absent', () => {
    const state = makeState();
    const res = stageOpHalt(state, makePayload({ corpsId: 'nonexistent_corps' }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_found');
  });

  it('matches a live op by name when opId is not provided', () => {
    const state = makeState();
    const res = stageOpHalt(state, { corpsId: 'rbih_1st_corps', opName: 'Operation Live' });
    expect(res.ok).toBe(true);
    const pending = state.military.corps_command.rbih_1st_corps.pending_op_halt;
    expect(pending.op_name).toBe('Operation Live');
    expect(pending.op_id).toBe('op_live_1');
  });

  it('stages cc.pending_op_halt with op id/name + turn + ca_cost', () => {
    const state = makeState();
    const res = stageOpHalt(state, makePayload());
    expect(res.ok).toBe(true);
    const pending = state.military.corps_command.rbih_1st_corps.pending_op_halt;
    expect(pending).toBeDefined();
    expect(pending.op_id).toBe('op_live_1');
    expect(pending.op_name).toBe('Operation Live');
    expect(pending.turn).toBe(7);
    expect(pending.ca_cost).toBe(STOP_OP_COST);
  });

  it('NEVER mutates active_operations (staging only)', () => {
    const state = makeState();
    const res = stageOpHalt(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.rbih_1st_corps.active_operations).toHaveLength(1);
  });

  it('rejects a second halt while pending_op_halt is already set (no double debit, first preserved)', () => {
    const state = makeState({
      ca: 100,
      ops: [
        { id: 'op_live_1', name: 'Operation Live' },
        { id: 'op_live_2', name: 'Operation Second' },
      ],
    });
    const first = stageOpHalt(state, makePayload({ opId: 'op_live_1' }));
    expect(first.ok).toBe(true);
    const afterFirst = state.military.command_authority.current;
    expect(afterFirst).toBe(100 - STOP_OP_COST);

    const second = stageOpHalt(state, makePayload({ opId: 'op_live_2' }));
    expect(second.ok).toBe(false);
    expect(second.error).toBe('pending_op_halt_exists');
    expect(state.military.command_authority.current).toBe(afterFirst);
    expect(state.military.command_authority.spent_this_turn).toBe(STOP_OP_COST);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_halt.op_id).toBe('op_live_1');
  });

  it('observer mode (no player_faction) does not block halting', () => {
    const state = makeState();
    state.meta.player_faction = undefined as any;
    const res = stageOpHalt(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_halt).toBeDefined();
  });
});
