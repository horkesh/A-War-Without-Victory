/**
 * R4 Phase 6 Task 6.4 — non-field-command lever guard.
 *
 * The main-staff / general-staff entities (`kind: "army_hq"`) are supreme-command
 * reserve pools, not field corps. They must never be a target of the corps-scoped
 * presidential levers (REPLACE-CO / STOP-OP / REQUEST-OP). Five independent Pyrrhic
 * panel specialists found the lever handlers never consulted the existing `kind` data;
 * 1,047 automated REPLACE-CO attempts hit the dead-end. Each handler now rejects an
 * `army_hq` target with a typed `not_a_field_command` error, BEFORE any ownership /
 * command-authority check, so nothing is staged or debited. A genuinely missing corps
 * still returns the pre-existing `corps_not_found`.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageOpHalt } = require('../src/desktop/op_halt.cjs') as {
  stageOpHalt: (state: any, payload: any) => { ok: boolean; error?: string };
};
const { stageOpDirective } = require('../src/desktop/op_directive_staging.cjs') as {
  stageOpDirective: (state: any, payload: any) => { ok: boolean; error?: string };
};
const { stageCoReplacement } = require('../src/desktop/co_replacement.cjs') as {
  stageCoReplacement: (state: any, payload: any) => { ok: boolean; error?: string };
};
const { isNonFieldCommandCorps } = require('../src/desktop/field_command.cjs') as {
  isNonFieldCommandCorps: (state: any, corpsId: string) => boolean;
};

/** State with both a field corps and an army_hq main-staff entity, for faction `f`. */
function makeState(f = 'RS') {
  return {
    meta: { turn: 42, player_faction: f },
    military: {
      command_authority: { current: 500, spent_this_turn: 0, lifetime_spent: 0 },
      formations: {
        vrs_1st_krajina: { id: 'vrs_1st_krajina', faction: f, kind: 'corps' },
        vrs_main_staff: { id: 'vrs_main_staff', faction: f, kind: 'army_hq' },
      },
      named_officers: {
        gen_x: { status: 'active', assigned_corps_id: 'vrs_main_staff' },
      },
      named_officer_data: [{ id: 'gen_x', faction: f, rank: 'corps_commander' }],
      corps_command: {
        vrs_1st_krajina: { active_operations: [{ id: 'op1', name: 'Op One', phase: 'execution' }] } as any,
        vrs_main_staff: { active_operations: [{ id: 'op2', name: 'Op Two', phase: 'execution' }] } as any,
      } as Record<string, any>,
    },
  };
}

describe('non-field-command lever guard (Task 6.4)', () => {
  it('the guard identifies army_hq entities and spares field corps', () => {
    const state = makeState();
    expect(isNonFieldCommandCorps(state, 'vrs_main_staff')).toBe(true);
    expect(isNonFieldCommandCorps(state, 'vrs_1st_krajina')).toBe(false);
    // Missing formation is NOT treated as non-field-command (falls through to corps_not_found).
    expect(isNonFieldCommandCorps(state, 'nope')).toBe(false);
  });

  it('STOP-OP rejects an army_hq target with not_a_field_command, no CA debit', () => {
    const state = makeState();
    const res = stageOpHalt(state, { corpsId: 'vrs_main_staff', opName: 'Op Two' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('not_a_field_command');
    expect(state.military.command_authority.current).toBe(500);
    expect(state.military.corps_command.vrs_main_staff.pending_op_halt).toBeUndefined();
  });

  it('REQUEST-OP rejects an army_hq target with not_a_field_command, no CA debit', () => {
    const state = makeState();
    const res = stageOpDirective(state, { corpsId: 'vrs_main_staff', targetOsid: 'op:tuzla:tuzla_2' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('not_a_field_command');
    expect(state.military.command_authority.current).toBe(500);
    expect(state.military.corps_command.vrs_main_staff.pending_op_directive).toBeUndefined();
  });

  it('REPLACE-CO rejects an army_hq target with not_a_field_command, no CA debit', () => {
    const state = makeState();
    const res = stageCoReplacement(state, { corpsId: 'vrs_main_staff' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('not_a_field_command');
    expect(state.military.command_authority.current).toBe(500);
    expect(state.military.corps_command.vrs_main_staff.pending_co_replacement).toBeUndefined();
  });

  it('a genuinely missing corps still returns corps_not_found, not not_a_field_command', () => {
    const state = makeState();
    const res = stageOpHalt(state, { corpsId: 'does_not_exist', opName: 'Op Two' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_found');
  });

  it('a real field corps is unaffected by the guard (STOP-OP proceeds to stage)', () => {
    const state = makeState();
    const res = stageOpHalt(state, { corpsId: 'vrs_1st_krajina', opName: 'Op One' });
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.vrs_1st_krajina.pending_op_halt).toBeDefined();
  });
});
