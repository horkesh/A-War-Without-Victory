import { describe, expect, it, vi } from 'vitest';
import { createDesktopBridgeClient } from '../src/ui/map/desktop/bridge.js';
import {
  applyRecruitmentAndSync,
  fetchRecruitmentCatalog,
  startCampaignFromSidePicker,
} from '../src/ui/map/desktop/campaignRecruitmentActions.js';

describe('desktop recruitment and side picker flows', () => {
  it('starts new campaign with selected faction and syncs returned state', async () => {
    const stateJson = { meta: { turn: 0, phase: 'peace', player_faction: 'RS' }, formations: {}, political_controllers: {} };
    const startNewCampaign = vi.fn().mockResolvedValue({ ok: true, stateJson });
    const ipc = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      startNewCampaign,
    });
    const loadSave = vi.fn().mockResolvedValue(undefined);
    const setLoadError = vi.fn();

    await expect(startCampaignFromSidePicker(
      { ipc, loadSave, setLoadError },
      'RS',
    )).resolves.toBe(true);
    expect(startNewCampaign).toHaveBeenCalledWith({ playerFaction: 'RS', scenarioKey: 'apr_1992' });
    expect(loadSave).toHaveBeenCalledWith(stateJson);
    expect(setLoadError).not.toHaveBeenCalled();
  });

  it('fetches recruitment catalog via IPC and sorts results deterministically', async () => {
    const ipc = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      getRecruitmentCatalog: vi.fn().mockResolvedValue({
        brigades: [
          { id: 'b2', faction: 'RS', name: 'B2', home_mun: 'x', manpower_cost: 2, capital_cost: 3, default_equipment_class: 'light', mandatory: false },
          { id: 'b1', faction: 'RS', name: 'B1', home_mun: 'x', manpower_cost: 2, capital_cost: 3, default_equipment_class: 'light', mandatory: false },
        ],
      }),
    });

    const brigades = await fetchRecruitmentCatalog({ ipc, setLoadError: vi.fn() });
    expect(brigades.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('applies recruitment via IPC and syncs returned state', async () => {
    const stateJson = { meta: { turn: 1, phase: 'war' }, formations: {}, political_controllers: {} };
    const applyRecruitment = vi.fn().mockResolvedValue({ ok: true, stateJson, newFormationId: 'new_1' });
    const ipc = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      applyRecruitment,
    });
    const loadSave = vi.fn().mockResolvedValue(undefined);

    await expect(applyRecruitmentAndSync({
      ipc,
      loadSave,
      setLoadError: vi.fn(),
      brigadeId: 'new_1',
      equipmentClass: 'light',
    })).resolves.toBe(true);

    expect(applyRecruitment).toHaveBeenCalledWith('new_1', 'light');
    expect(loadSave).toHaveBeenCalledWith(stateJson);
  });

  it('fails campaign start when desktop response has no state payload', async () => {
    const ipc = createDesktopBridgeClient({
      stageAttackOrder: vi.fn().mockResolvedValue({ ok: true }),
      queryCombatEstimate: vi.fn().mockResolvedValue({ ok: true }),
      startNewCampaign: vi.fn().mockResolvedValue({ ok: true }),
    });
    const setLoadError = vi.fn();
    const loadSave = vi.fn().mockResolvedValue(undefined);

    await expect(startCampaignFromSidePicker(
      { ipc, loadSave, setLoadError },
      'RBiH',
    )).resolves.toBe(false);
    expect(loadSave).not.toHaveBeenCalled();
    expect(setLoadError).toHaveBeenCalledWith('Campaign started but no state payload was returned.');
  });
});
