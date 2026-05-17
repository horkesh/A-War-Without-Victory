import { describe, expect, it } from 'vitest';
// @ts-expect-error CJS contract module imported by Electron main process
import { stageConvoyDecisionOnState } from '../src/desktop/convoy_ipc_contract.cjs';

describe('desktop convoy decision contract', () => {
  it('writes decisions to state.military.pending_convoy_decisions', () => {
    const state: any = {
      military: {
        pending_convoy_decisions: [
          { id: 'convoy_srebrenica_1', enclave_id: 'srebrenica', route_patron: 'UN' },
        ],
      },
      pending_convoy_decisions: [
        { id: 'wrong_root_queue', decision: 'block' },
      ],
    };

    const result = stageConvoyDecisionOnState(state, 'convoy_srebrenica_1', 'allow');

    expect(result).toEqual({ ok: true });
    expect(state.military.pending_convoy_decisions[0].decision).toBe('allow');
    expect(state.pending_convoy_decisions[0].id).toBe('wrong_root_queue');
    expect(state.pending_convoy_decisions[0].decision).toBe('block');
  });

  it('fails when the canonical military queue does not contain the convoy', () => {
    const state: any = {
      military: { pending_convoy_decisions: [] },
      pending_convoy_decisions: [{ id: 'convoy_srebrenica_1' }],
    };

    expect(stageConvoyDecisionOnState(state, 'convoy_srebrenica_1', 'allow')).toEqual({
      ok: false,
      error: 'Convoy not found',
    });
  });

  it('rejects invalid decision values', () => {
    const state: any = {
      military: {
        pending_convoy_decisions: [{ id: 'convoy_a' }],
      },
    };

    expect(stageConvoyDecisionOnState(state, 'convoy_a', 'approve' as any)).toEqual({
      ok: false,
      error: 'Invalid decision',
    });
  });

  it('returns error when convoyId or decision are not strings', () => {
    const state: any = { military: { pending_convoy_decisions: [] } };
    expect(stageConvoyDecisionOnState(state, 42 as any, 'allow')).toEqual({
      ok: false,
      error: 'No game loaded or invalid payload',
    });
    expect(stageConvoyDecisionOnState(state, 'convoy_a', null as any)).toEqual({
      ok: false,
      error: 'No game loaded or invalid payload',
    });
  });

  it('initializes military block when absent and reports not found rather than crashing', () => {
    const state: any = {};
    const result = stageConvoyDecisionOnState(state, 'convoy_a', 'block');
    expect(result).toEqual({ ok: false, error: 'Convoy not found' });
    expect(state.military).toBeDefined();
    expect(Array.isArray(state.military.pending_convoy_decisions)).toBe(true);
  });
});
