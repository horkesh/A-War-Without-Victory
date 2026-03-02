import { describe, expect, it, vi } from 'vitest';
import { createDesktopBridgeClient, getAwwvBridge } from '../src/ui/map/desktop/bridge.js';

describe('desktop bridge client', () => {
  it('returns unavailable client in browser fallback mode', async () => {
    const client = createDesktopBridgeClient(null);

    expect(client.isAvailable).toBe(false);
    await expect(client.stageAttackOrder('b1', 'op:foo')).resolves.toEqual({
      ok: false,
      error: 'Desktop bridge unavailable',
    });
  });

  it('passes through methods and arguments to preload bridge', async () => {
    const stageAttackOrder = vi.fn().mockResolvedValue({ ok: true });
    const queryCombatEstimate = vi.fn().mockResolvedValue({ ok: true, win_probability: 0.42 });
    const client = createDesktopBridgeClient({
      stageAttackOrder,
      queryCombatEstimate,
    });

    await expect(client.stageAttackOrder('b2', 'op:bar')).resolves.toEqual({ ok: true });
    await expect(client.queryCombatEstimate('b2', 'op:bar')).resolves.toEqual({
      ok: true,
      win_probability: 0.42,
    });
    expect(stageAttackOrder).toHaveBeenCalledWith('b2', 'op:bar');
    expect(queryCombatEstimate).toHaveBeenCalledWith('b2', 'op:bar');
  });

  it('normalizes thrown errors into { ok:false, error } responses', async () => {
    const client = createDesktopBridgeClient({
      stageAttackOrder: async () => {
        throw new Error('kaboom');
      },
    });

    await expect(client.stageAttackOrder('b3', 'op:baz')).resolves.toEqual({
      ok: false,
      error: 'kaboom',
    });
  });

  it('normalizes thrown query errors into { ok:false, error } responses', async () => {
    const client = createDesktopBridgeClient({
      queryCombatEstimate: async () => {
        throw new Error('estimate-failed');
      },
    });

    await expect(client.queryCombatEstimate('b4', 'op:q')).resolves.toEqual({
      ok: false,
      error: 'estimate-failed',
    });
  });

  it('reports unavailable when bridge surface is partial', () => {
    const partialClient = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
    });
    expect(partialClient.isAvailable).toBe(false);
  });

  it('extracts typed bridge from a window-like object', () => {
    const windowLike = {
      awwv: {
        stageAttackOrder: vi.fn(),
      },
    };
    expect(getAwwvBridge(windowLike)).toBe(windowLike.awwv);
    expect(getAwwvBridge({})).toBeNull();
  });

  it('passes through brigade movement staging with settlement ids', async () => {
    const stageBrigadeMovementOrder = vi.fn().mockResolvedValue({ ok: true });
    const client = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      stageBrigadeMovementOrder,
    });

    await expect(client.stageBrigadeMovementOrder('b9', ['op:mun:a'])).resolves.toEqual({ ok: true });
    expect(stageBrigadeMovementOrder).toHaveBeenCalledWith('b9', ['op:mun:a']);
  });
});
