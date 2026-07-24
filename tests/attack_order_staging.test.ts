import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageCanonAttackOrder } = require('../src/desktop/author_op_staging.cjs') as {
  stageCanonAttackOrder: (
    state: any,
    payload: { brigadeId?: unknown; targetSettlementId?: unknown },
  ) => { ok: boolean; error?: string; authorization?: string };
};

function makeState(): any {
  return {
    meta: { turn: 8, player_faction: 'RS' },
    military: {
      formations: {
        rs_corps: {
          id: 'rs_corps',
          kind: 'corps',
          faction: 'RS',
          status: 'active',
        },
        rs_brigade: {
          id: 'rs_brigade',
          kind: 'brigade',
          faction: 'RS',
          status: 'active',
          corps_id: 'rs_corps',
          location_osid: 'op:test:start',
          disrupted_turns: 0,
        },
        rs_other_axis: {
          id: 'rs_other_axis',
          kind: 'brigade',
          faction: 'RS',
          status: 'active',
          corps_id: 'rs_corps',
          location_osid: 'op:test:other_start',
          disrupted_turns: 0,
        },
        rbih_brigade: {
          id: 'rbih_brigade',
          kind: 'brigade',
          faction: 'RBiH',
          status: 'active',
          corps_id: 'rbih_corps',
          location_osid: 'op:test:enemy_start',
          disrupted_turns: 0,
        },
      },
      corps_command: {
        rs_corps: { active_operations: [] as any[] },
      },
      brigade_attack_orders: {
        rs_existing: 'op:test:existing_target',
      },
    },
    political: {
      political_controllers: {
        'op:test:start': 'RS',
        'op:test:other_start': 'RS',
        'op:test:enemy_start': 'RBiH',
        'op:test:objective': 'RBiH',
        'op:test:later_objective': 'RBiH',
        'op:test:other_axis_objective': 'RBiH',
        'op:test:counter_target': 'RBiH',
        'op:test:arbitrary_target': 'RBiH',
        'op:test:friendly_target': 'RS',
      },
    },
  };
}

function attack(state: any, targetSettlementId = 'op:test:objective', brigadeId = 'rs_brigade') {
  return stageCanonAttackOrder(state, { brigadeId, targetSettlementId });
}

function addAxisOperation(state: any) {
  state.military.corps_command.rs_corps.active_operations.push({
    name: 'Operation Test',
    type: 'sector_attack',
    phase: 'execution',
    started_turn: 4,
    phase_started_turn: 7,
    participating_brigades: ['rs_brigade', 'rs_other_axis'],
    objectives: ['op:test:objective', 'op:test:later_objective', 'op:test:other_axis_objective'],
    current_objective_index: 0,
    axes: [
      {
        axis_id: 'main',
        assigned_brigades: ['rs_brigade'],
        objectives: ['op:test:objective', 'op:test:later_objective'],
        current_objective_index: 0,
        status: 'executing',
      },
      {
        axis_id: 'support',
        assigned_brigades: ['rs_other_axis'],
        objectives: ['op:test:other_axis_objective'],
        current_objective_index: 0,
        status: 'executing',
      },
    ],
  });
}

describe('desktop attack-order canon staging', () => {
  it('routes the Electron IPC handler through the tested canonical guard', async () => {
    const source = await readFile(
      join(process.cwd(), 'src', 'desktop', 'electron-main.cjs'),
      'utf8',
    );
    const start = source.indexOf("ipcMain.handle('stage-attack-order'");
    const end = source.indexOf("ipcMain.handle('stage-posture-order'", start);
    const handler = source.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(handler).toContain('const result = stageCanonAttackOrder(state, payload);');
    expect(handler).not.toMatch(/state\.brigade_attack_orders|state\.military\.brigade_attack_orders/);
  });

  it('rejects an arbitrary brigade attack without mutating existing orders', () => {
    const state = makeState();
    const before = structuredClone(state.military.brigade_attack_orders);

    expect(attack(state, 'op:test:arbitrary_target')).toEqual({
      ok: false,
      error: 'attack_not_canon_authorized',
    });
    expect(state.military.brigade_attack_orders).toEqual(before);
  });

  it.each([
    {
      name: 'missing player faction',
      mutate: (state: any) => { delete state.meta.player_faction; },
      brigadeId: 'rs_brigade',
      target: 'op:test:objective',
      error: 'player_faction_not_set',
    },
    {
      name: 'formation owned by another faction',
      mutate: (_state: any) => undefined,
      brigadeId: 'rbih_brigade',
      target: 'op:test:objective',
      error: 'brigade_not_owned_by_player',
    },
    {
      name: 'missing formation',
      mutate: (_state: any) => undefined,
      brigadeId: 'missing_brigade',
      target: 'op:test:objective',
      error: 'brigade_not_found',
    },
    {
      name: 'non-brigade formation',
      mutate: (_state: any) => undefined,
      brigadeId: 'rs_corps',
      target: 'op:test:objective',
      error: 'invalid_brigade',
    },
    {
      name: 'inactive brigade',
      mutate: (state: any) => { state.military.formations.rs_brigade.status = 'inactive'; },
      brigadeId: 'rs_brigade',
      target: 'op:test:objective',
      error: 'brigade_not_active',
    },
    {
      name: 'unlocated brigade',
      mutate: (state: any) => { delete state.military.formations.rs_brigade.location_osid; },
      brigadeId: 'rs_brigade',
      target: 'op:test:objective',
      error: 'brigade_not_located',
    },
    {
      name: 'unknown target',
      mutate: (_state: any) => undefined,
      brigadeId: 'rs_brigade',
      target: 'op:test:missing_target',
      error: 'target_not_found',
    },
    {
      name: 'friendly target',
      mutate: (_state: any) => undefined,
      brigadeId: 'rs_brigade',
      target: 'op:test:friendly_target',
      error: 'target_not_hostile',
    },
  ])('rejects $name without changing the order ledger', ({ mutate, brigadeId, target, error }) => {
    const state = makeState();
    mutate(state);
    const before = structuredClone(state.military.brigade_attack_orders);

    expect(attack(state, target, brigadeId)).toEqual({ ok: false, error });
    expect(state.military.brigade_attack_orders).toEqual(before);
  });

  it('stages an executing operation participant against its current assigned-axis objective', () => {
    const state = makeState();
    addAxisOperation(state);

    expect(attack(state)).toEqual({ ok: true, authorization: 'operation' });
    expect(state.military.brigade_attack_orders.rs_brigade).toBe('op:test:objective');
    expect(state.military.brigade_attack_orders.rs_existing).toBe('op:test:existing_target');
  });

  it('rejects a later objective, another axis objective, and a planning operation', () => {
    const state = makeState();
    addAxisOperation(state);

    expect(attack(state, 'op:test:later_objective')).toEqual({
      ok: false,
      error: 'attack_not_canon_authorized',
    });
    expect(attack(state, 'op:test:other_axis_objective')).toEqual({
      ok: false,
      error: 'attack_not_canon_authorized',
    });

    state.military.corps_command.rs_corps.active_operations[0].phase = 'planning';
    expect(attack(state)).toEqual({ ok: false, error: 'attack_not_canon_authorized' });
    expect(state.military.brigade_attack_orders.rs_brigade).toBeUndefined();
  });

  it('supports a flat legacy operation current objective', () => {
    const state = makeState();
    state.military.corps_command.rs_corps.active_operations.push({
      name: 'Flat Operation',
      type: 'sector_attack',
      phase: 'execution',
      participating_brigades: ['rs_brigade'],
      objectives: ['op:test:objective', 'op:test:later_objective'],
      current_objective_index: 0,
    });

    expect(attack(state)).toEqual({ ok: true, authorization: 'operation' });
  });

  it('stages only the same brigade next-turn counterattack against its just-lost OSID', () => {
    const state = makeState();
    state.military.formations.rs_brigade.last_retreat_from = {
      osid: 'op:test:counter_target',
      turn: 7,
    };

    expect(attack(state, 'op:test:counter_target')).toEqual({
      ok: true,
      authorization: 'counterattack',
    });
    expect(state.military.brigade_attack_orders.rs_brigade).toBe('op:test:counter_target');
  });

  it.each([
    {
      name: 'stale retreat',
      retreat: { osid: 'op:test:counter_target', turn: 6 },
      disruptedTurns: 0,
      target: 'op:test:counter_target',
    },
    {
      name: 'different target',
      retreat: { osid: 'op:test:counter_target', turn: 7 },
      disruptedTurns: 0,
      target: 'op:test:arbitrary_target',
    },
    {
      name: 'disrupted brigade',
      retreat: { osid: 'op:test:counter_target', turn: 7 },
      disruptedTurns: 1,
      target: 'op:test:counter_target',
    },
  ])('rejects a $name as a counterattack', ({ retreat, disruptedTurns, target }) => {
    const state = makeState();
    state.military.formations.rs_brigade.last_retreat_from = retreat;
    state.military.formations.rs_brigade.disrupted_turns = disruptedTurns;

    expect(attack(state, target)).toEqual({
      ok: false,
      error: 'attack_not_canon_authorized',
    });
    expect(state.military.brigade_attack_orders.rs_brigade).toBeUndefined();
  });

  it('rejects malformed payloads without mutation', () => {
    const state = makeState();
    const before = structuredClone(state.military.brigade_attack_orders);

    expect(stageCanonAttackOrder(state, { brigadeId: '', targetSettlementId: 'op:test:objective' }))
      .toEqual({ ok: false, error: 'invalid_payload' });
    expect(stageCanonAttackOrder(state, { brigadeId: 'rs_brigade', targetSettlementId: 42 }))
      .toEqual({ ok: false, error: 'invalid_payload' });
    expect(state.military.brigade_attack_orders).toEqual(before);
  });
});
