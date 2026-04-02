import { describe, expect, it, vi } from 'vitest';
import { stageAssignBrigadeToSectorAction } from '../src/ui/map/desktop/orderActions.js';

describe('ui map order actions', () => {
  it('routes map-click sector assignment through the canonical sector override IPC', async () => {
    const assignBrigadeToSector = vi.fn().mockResolvedValue({ ok: true });
    const assignBrigadeToFront = vi.fn().mockResolvedValue({ ok: true });
    const addStagedOrder = vi.fn();
    const setLoadError = vi.fn();

    await stageAssignBrigadeToSectorAction(
      {
        ipc: {
          assignBrigadeToSector,
          assignBrigadeToFront,
        } as any,
        addStagedOrder,
        setLoadError,
      },
      'rbih_1st_brigade',
      'sector:arbih_3rd_corps:zavidovici',
    );

    expect(assignBrigadeToSector).toHaveBeenCalledWith(
      'rbih_1st_brigade',
      'sector:arbih_3rd_corps:zavidovici',
    );
    expect(assignBrigadeToFront).not.toHaveBeenCalled();
    expect(addStagedOrder).toHaveBeenCalledWith({
      type: 'sector',
      formationId: 'rbih_1st_brigade',
      targetOsid: 'sector:arbih_3rd_corps:zavidovici',
    });
    expect(setLoadError).not.toHaveBeenCalled();
  });
});
