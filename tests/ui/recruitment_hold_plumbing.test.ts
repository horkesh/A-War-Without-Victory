/**
 * Recruitment hold plumbing (lane C A1, 2026-11-24): the renderer reaches the
 * `set-recruitment-hold` IPC through the bridge client and the sync helper, and reports
 * a failed hold without loading state.
 */
import { describe, expect, it, vi } from 'vitest';
import { createDesktopBridgeClient } from '../../src/ui/map/desktop/bridge';
import { setRecruitmentHoldAndSync } from '../../src/ui/map/desktop/campaignRecruitmentActions';

describe('recruitment hold plumbing', () => {
  it('the bridge client forwards the hold to window.awwv and reports unavailable without it', async () => {
    const setRecruitmentHold = vi.fn().mockResolvedValue({ ok: true });
    const client = createDesktopBridgeClient({ setRecruitmentHold } as never);
    await expect(client.setRecruitmentHold('b1', true)).resolves.toEqual({ ok: true });
    expect(setRecruitmentHold).toHaveBeenCalledWith('b1', true);
    const none = createDesktopBridgeClient({} as never);
    expect((await none.setRecruitmentHold('b1', false)).ok).toBe(false);
  });

  it('syncs the updated state after a successful hold', async () => {
    const ipc = {
      setRecruitmentHold: vi.fn().mockResolvedValue({ ok: true }),
      getCurrentGameState: vi.fn().mockResolvedValue({ turn: 3 }),
    };
    const loadSave = vi.fn().mockResolvedValue(undefined);
    const setLoadError = vi.fn();
    const ok = await setRecruitmentHoldAndSync({ ipc: ipc as never, loadSave, setLoadError, brigadeId: 'b1', held: true });
    expect(ok).toBe(true);
    expect(ipc.setRecruitmentHold).toHaveBeenCalledWith('b1', true);
    expect(loadSave).toHaveBeenCalledWith({ turn: 3 });
    expect(setLoadError).not.toHaveBeenCalled();
  });

  it('reports a refused hold and loads nothing', async () => {
    const ipc = {
      setRecruitmentHold: vi.fn().mockResolvedValue({ ok: false, error: 'No such brigade.' }),
      getCurrentGameState: vi.fn(),
    };
    const loadSave = vi.fn();
    const setLoadError = vi.fn();
    const ok = await setRecruitmentHoldAndSync({ ipc: ipc as never, loadSave, setLoadError, brigadeId: 'x', held: true });
    expect(ok).toBe(false);
    expect(setLoadError).toHaveBeenCalledWith('No such brigade.');
    expect(loadSave).not.toHaveBeenCalled();
  });
});
