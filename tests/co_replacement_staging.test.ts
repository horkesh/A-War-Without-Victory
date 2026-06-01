/**
 * REPLACE-CO staging contract (Presidential Command Model slice 3/N).
 *
 * Exercises the pure staging logic used by the desktop IPC handler
 * (electron-main.cjs `stage-co-replacement-order` delegates to stageCoReplacement).
 * Verifies the canon-safety contract:
 *   - player-faction ownership restriction (corps_not_owned_by_player)
 *   - confirm the corps HAS a current named CO (no_current_co)
 *   - explicit replacement must be a same-faction corps_commander in reserve
 *     (replacement_not_in_reserve)
 *   - auto-pick fails when no reserve officer is available (no_reserve_officer_available)
 *   - reject a duplicate replacement already staged (pending_co_replacement_exists)
 *   - command-authority guard (insufficient_command_authority) + debit on success
 *   - payload validation (missing/invalid corpsId, invalid replacementOfficerId)
 *   - stages cc.pending_co_replacement, NEVER mutates named_officers
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { stageCoReplacement, REPLACE_CO_COST } = require('../src/desktop/co_replacement.cjs') as {
  stageCoReplacement: (state: any, payload: any) => { ok: boolean; error?: string; replacementOfficerId?: string };
  REPLACE_CO_COST: number;
};

function makeState(opts: {
  playerFaction?: string;
  corpsFaction?: string;
  ca?: number;
  withReserve?: boolean;
  withCurrentCo?: boolean;
} = {}) {
  const ca = opts.ca ?? 100;
  const corpsFaction = opts.corpsFaction ?? 'RBiH';
  const withReserve = opts.withReserve ?? true;
  const withCurrentCo = opts.withCurrentCo ?? true;

  const named_officers: Record<string, any> = {};
  const named_officer_data: any[] = [];

  if (withCurrentCo) {
    named_officers.co_current = { officer_id: 'co_current', status: 'active', assigned_corps_id: 'rbih_1st_corps', turns_in_command: 5 };
    named_officer_data.push({ id: 'co_current', name: 'Current CO', faction: corpsFaction, rank: 'corps_commander', competence: 3, pool_tier: 'tier_b', home_corps_id: 'rbih_1st_corps' });
  }
  if (withReserve) {
    named_officers.co_reserve = { officer_id: 'co_reserve', status: 'reserve', assigned_corps_id: null };
    named_officer_data.push({ id: 'co_reserve', name: 'Reserve CO', faction: corpsFaction, rank: 'corps_commander', competence: 4, pool_tier: 'tier_a', home_corps_id: 'rbih_1st_corps' });
  }

  return {
    meta: { turn: 9, player_faction: opts.playerFaction ?? 'RBiH' },
    military: {
      command_authority: { current: ca, spent_this_turn: 0, lifetime_spent: 0 },
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: corpsFaction },
      },
      named_officers,
      named_officer_data,
      corps_command: {
        rbih_1st_corps: {} as any,
      } as Record<string, any>,
    },
  };
}

function makePayload(over: Record<string, unknown> = {}) {
  return { corpsId: 'rbih_1st_corps', ...over };
}

describe('REPLACE-CO staging contract', () => {
  it('rejects replacing a CO on a corps not owned by the player faction (no CA debit, nothing staged)', () => {
    const state = makeState({ playerFaction: 'RBiH', corpsFaction: 'RS' });
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_owned_by_player');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeUndefined();
  });

  it('rejects when the corps has no current named CO (no_current_co)', () => {
    const state = makeState({ withCurrentCo: false });
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('no_current_co');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeUndefined();
  });

  it('rejects an explicit replacement that is not a same-faction reserve corps_commander', () => {
    const state = makeState();
    // Point at the CURRENT (active) CO, not a reserve officer.
    const res = stageCoReplacement(state, makePayload({ replacementOfficerId: 'co_current' }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('replacement_not_in_reserve');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeUndefined();
  });

  it('rejects auto-pick when no reserve officer is available (no_reserve_officer_available)', () => {
    const state = makeState({ withReserve: false });
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toBe('no_reserve_officer_available');
    expect(state.military.command_authority.current).toBe(100);
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeUndefined();
  });

  it('rejects when command authority is insufficient (no debit, nothing staged)', () => {
    const state = makeState({ ca: REPLACE_CO_COST - 1 });
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(false);
    expect(res.error).toContain('insufficient_command_authority');
    expect(state.military.command_authority.current).toBe(REPLACE_CO_COST - 1);
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeUndefined();
  });

  it('rejects invalid payloads (missing corpsId, invalid replacementOfficerId)', () => {
    expect(stageCoReplacement(makeState(), makePayload({ corpsId: 42 })).error).toBe('invalid_payload');
    expect(stageCoReplacement(makeState(), makePayload({ replacementOfficerId: 99 })).error).toBe('invalid_payload');
  });

  it('rejects when the corps command entry is absent', () => {
    const state = makeState();
    const res = stageCoReplacement(state, makePayload({ corpsId: 'nonexistent_corps' }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('corps_not_found');
  });

  it('auto-picks the best reserve officer and debits REPLACE_CO_COST on success', () => {
    const state = makeState({ ca: 100 });
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(true);
    expect(res.replacementOfficerId).toBe('co_reserve');
    const auth = state.military.command_authority;
    expect(auth.current).toBe(100 - REPLACE_CO_COST);
    expect(auth.spent_this_turn).toBe(REPLACE_CO_COST);
    expect(auth.lifetime_spent).toBe(REPLACE_CO_COST);
    const pending = state.military.corps_command.rbih_1st_corps.pending_co_replacement;
    expect(pending).toBeDefined();
    expect(pending.replacement_officer_id).toBe('co_reserve');
    expect(pending.turn).toBe(9);
    expect(pending.ca_cost).toBe(REPLACE_CO_COST);
  });

  it('accepts an explicit reserve replacement officer id', () => {
    const state = makeState();
    const res = stageCoReplacement(state, makePayload({ replacementOfficerId: 'co_reserve' }));
    expect(res.ok).toBe(true);
    expect(res.replacementOfficerId).toBe('co_reserve');
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement.replacement_officer_id).toBe('co_reserve');
  });

  it('NEVER mutates named_officers (staging only)', () => {
    const state = makeState();
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.named_officers.co_current.status).toBe('active');
    expect(state.military.named_officers.co_reserve.status).toBe('reserve');
    expect(state.military.named_officers.co_current.assigned_corps_id).toBe('rbih_1st_corps');
  });

  it('rejects a second replacement while pending_co_replacement is already set (no double debit, first preserved)', () => {
    const state = makeState({ ca: 100 });
    const first = stageCoReplacement(state, makePayload());
    expect(first.ok).toBe(true);
    const afterFirst = state.military.command_authority.current;
    expect(afterFirst).toBe(100 - REPLACE_CO_COST);

    const second = stageCoReplacement(state, makePayload());
    expect(second.ok).toBe(false);
    expect(second.error).toBe('pending_co_replacement_exists');
    expect(state.military.command_authority.current).toBe(afterFirst);
    expect(state.military.command_authority.spent_this_turn).toBe(REPLACE_CO_COST);
  });

  it('observer mode (no player_faction) does not block replacing', () => {
    const state = makeState();
    state.meta.player_faction = undefined as any;
    const res = stageCoReplacement(state, makePayload());
    expect(res.ok).toBe(true);
    expect(state.military.corps_command.rbih_1st_corps.pending_co_replacement).toBeDefined();
  });
});
