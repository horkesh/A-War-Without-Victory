/**
 * REQUEST-OP staging contract (Presidential Command Model slice 2/N).
 *
 * Exercises the pure staging logic used by the desktop IPC handler
 * (electron-main.cjs `stage-op-directive-order` delegates to stageOpDirective).
 * Verifies the canon-safety contract:
 *   - player-faction ownership restriction (corps_not_owned_by_player)
 *   - confirm the named corps exists (corps_not_found)
 *   - reject a duplicate directive already staged (pending_op_directive_exists)
 *   - command-authority guard (insufficient_command_authority) + debit on success
 *   - payload validation (missing corpsId / missing targetOsid)
 *   - stages cc.pending_op_directive, NEVER mutates active_operations
 *
 * The president names ONLY a target OSID. Brigade/axis selection is the engine's
 * job (inject-op-directive) — NOT staged here.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageOpDirective, REQUEST_OP_COST } = require('../src/desktop/op_directive_staging.cjs') as {
  stageOpDirective: (state: any, payload: any) => { ok: boolean; error?: string };
  REQUEST_OP_COST: number;
};

function makeState(opts: { playerFaction?: string; corpsFaction?: string; ca?: number } = {}) {
  const ca = opts.ca ?? 100;
  return {
    meta: { turn: 9, player_faction: opts.playerFaction ?? 'RBiH' },
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
  return { corpsId: 'rbih_1st_corps', targetOsid: 'bihac_1', ...over };
}

describe('REQUEST-OP staging contract', () => {
  it('rejects directing a corps not owned by the player faction (no CA debit, nothing staged)', () => {
    const state = makeState({ playerFaction: 'RBiH', corpsFaction: 'RS' });
    const res = stageOpDirective(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_owned_by_player');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.command_authority.spent_this_turn).toBe(0);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_directive).toBeUndefined();
  });

  it('rejects when the corps command entry is absent', () => {
    const state = makeState();
    const res = stageOpDirective(state, makePayload({ corpsId: 'nonexistent_corps' }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_found');
  });

  it('rejects when command authority is insufficient (no debit, nothing staged)', () => {
    const state = makeState({ ca: REQUEST_OP_COST - 1 });
    const res = stageOpDirective(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('insufficient_command_authority');
    expect(state.military.command_authority.current).toBe(REQUEST_OP_COST - 1);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_directive).toBeUndefined();
  });

  it('debits command authority by REQUEST_OP_COST on success', () => {
    const state = makeState({ ca: 100 });
    const res = stageOpDirective(state, makePayload());
    expect(res.ok).toBe(true);
    const auth = state.military.command_authority;
    expect(auth.current).toBe(100 - REQUEST_OP_COST);
    expect(auth.spent_this_turn).toBe(REQUEST_OP_COST);
    expect(auth.lifetime_spent).toBe(REQUEST_OP_COST);
  });

  it('rejects invalid payloads (missing corpsId, missing targetOsid)', () => {
    expect(stageOpDirective(makeState(), makePayload({ corpsId: 42 })).error).toBe('invalid_payload');
    expect(stageOpDirective(makeState(), { corpsId: 'rbih_1st_corps' }).error).toBe('invalid_payload');
    expect(stageOpDirective(makeState(), makePayload({ targetOsid: '' })).error).toBe('invalid_payload');
  });

  it('stages cc.pending_op_directive with target_osid + turn + ca_cost (NOT brigades/axes)', () => {
    const state = makeState();
    const res = stageOpDirective(state, makePayload());
    expect(res.ok).toBe(true);
    const pending = state.military.corps_command.rbih_1st_corps.pending_op_directive;
    expect(pending).toBeDefined();
    expect(pending.target_osid).toBe('bihac_1');
    expect(pending.turn).toBe(9);
    expect(pending.ca_cost).toBe(REQUEST_OP_COST);
    // The president picks ONLY the objective — no brigade/axis fields are staged.
    expect(pending.participating_brigades).toBeUndefined();
    expect(pending.axes).toBeUndefined();
  });

  it('NEVER mutates active_operations (staging only)', () => {
    const state = makeState();
    const res = stageOpDirective(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.rbih_1st_corps.active_operations).toHaveLength(0);
  });

  it('rejects a second directive while pending_op_directive is already set (no double debit, first preserved)', () => {
    const state = makeState({ ca: 100 });
    const first = stageOpDirective(state, makePayload({ targetOsid: 'bihac_1' }));
    expect(first.ok).toBe(true);
    const afterFirst = state.military.command_authority.current;
    expect(afterFirst).toBe(100 - REQUEST_OP_COST);

    const second = stageOpDirective(state, makePayload({ targetOsid: 'kljuc_1' }));
    expect(second.ok).toBe(false);
    expect(second.error).toBe('pending_op_directive_exists');
    expect(state.military.command_authority.current).toBe(afterFirst);
    expect(state.military.command_authority.spent_this_turn).toBe(REQUEST_OP_COST);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_directive.target_osid).toBe('bihac_1');
  });

  it('observer mode (no player_faction) does not block directing', () => {
    const state = makeState();
    state.meta.player_faction = undefined as any;
    const res = stageOpDirective(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.rbih_1st_corps.pending_op_directive).toBeDefined();
  });
});
