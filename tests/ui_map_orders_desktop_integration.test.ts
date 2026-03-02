import { describe, expect, it, vi } from 'vitest';
import { createDesktopBridgeClient } from '../src/ui/map/desktop/bridge.js';
import { advanceTurnAndSync, stageMoveOrderFromOsid, stagePostureOrderAction } from '../src/ui/map/desktop/orderActions.js';

describe('desktop order and turn integration', () => {
  it('clears local staged queue only after successful advance turn', async () => {
    const stateJson = { meta: { turn: 9, phase: 'war' }, formations: {}, political_controllers: {} };
    const client = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      advanceTurn: vi.fn().mockResolvedValue({ ok: true, stateJson }),
    });
    const loadSave = vi.fn().mockResolvedValue(undefined);
    const clearStagedOrders = vi.fn();
    const setLoadError = vi.fn();

    await expect(advanceTurnAndSync({
      ipc: client,
      loadSave,
      clearStagedOrders,
      setLoadError,
    })).resolves.toBe(true);
    expect(loadSave).toHaveBeenCalledWith(stateJson);
    expect(clearStagedOrders).toHaveBeenCalledTimes(1);
    expect(setLoadError).not.toHaveBeenCalled();
  });

  it('does not clear local queue when advance turn fails', async () => {
    const client = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      advanceTurn: vi.fn().mockResolvedValue({ ok: false, error: 'turn-failed' }),
    });
    const clearStagedOrders = vi.fn();
    const setLoadError = vi.fn();

    await expect(advanceTurnAndSync({
      ipc: client,
      loadSave: vi.fn().mockResolvedValue(undefined),
      clearStagedOrders,
      setLoadError,
    })).resolves.toBe(false);
    expect(clearStagedOrders).not.toHaveBeenCalled();
    expect(setLoadError).toHaveBeenCalledWith('turn-failed');
  });

  it('stages movement order through desktop bridge and mirrors it locally', async () => {
    const stagePostureOrder = vi.fn().mockResolvedValue({ ok: true });
    const stageBrigadeMovementOrder = vi.fn().mockResolvedValue({ ok: true });
    const client = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      stagePostureOrder,
      stageBrigadeMovementOrder,
    });

    const addStagedOrder = vi.fn();

    await expect(stageMoveOrderFromOsid(
      { ipc: client, addStagedOrder, setLoadError: vi.fn() },
      'b7',
      'op:mun:foo'
    )).resolves.toBe(true);

    expect(stageBrigadeMovementOrder).toHaveBeenCalledWith('b7', ['op:mun:foo']);
    expect(addStagedOrder).toHaveBeenCalledWith({ type: 'move', formationId: 'b7', targetOsid: 'op:mun:foo' });
    expect(stagePostureOrder).not.toHaveBeenCalled();
  });

  it('stages posture locally in browser fallback when desktop unavailable', async () => {
    const client = createDesktopBridgeClient({
      stageAttackOrder: undefined,
      queryCombatEstimate: undefined,
    });
    const addStagedOrder = vi.fn();

    await expect(stagePostureOrderAction(
      { ipc: client, addStagedOrder, setLoadError: vi.fn() },
      'b11',
      'defensive'
    )).resolves.toBe(true);
    expect(addStagedOrder).toHaveBeenCalledWith({ type: 'posture', formationId: 'b11', postureName: 'defensive' });
  });
});
