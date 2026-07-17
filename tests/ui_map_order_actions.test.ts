import { describe, expect, it, vi } from 'vitest';
import { advanceTurnAndSync, stageAssignBrigadeToSectorAction } from '../src/ui/map/desktop/orderActions.js';

describe('ui map order actions', () => {
  function makeLoadedState(turn: number): any {
    return {
      label: `Turn ${turn}`,
      turn,
      phase: 'war',
      formations: [],
      militiaPools: [],
      controlBySettlement: {},
      statusBySettlement: {},
      brigadeAorByFormationId: {},
      attackOrders: [],
      aorOrders: [],
      recentControlEvents: [],
      allControlEvents: [],
      displacementEventLog: [],
      battlesByOsid: {},
      movementsByOsid: {},
      supplyTransitionsByOsid: {},
      historicalEventsByTurn: [],
      pressureWarning: false,
      latestTurnSummary: {
        turn,
        battles: [],
        territory_net: { RBiH: 1 },
        notable_flips: [],
        displacement_total: 0,
        displacement_by_ethnicity: {},
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        supply_deltas: {},
        heavy_munitions_deltas: {},
        movements: [],
        supply_transitions: [],
        events_fired: [],
        notable_events: [],
      },
      turnSummaries: [],
      player_faction: 'RBiH',
    };
  }

  it('builds and opens a turn aftermath report after a successful advance', async () => {
    const previous = makeLoadedState(11);
    const next = makeLoadedState(12);
    let current = previous;
    const ipc = {
      advanceTurn: vi.fn().mockResolvedValue({
        ok: true,
        report: { phase: 'war', turn: 12, player_faction: 'RBiH' },
      }),
      getCurrentGameState: vi.fn().mockResolvedValue('{"meta":{"turn":12}}'),
    };
    const loadSave = vi.fn().mockImplementation(async () => {
      current = next;
    });
    const clearStagedOrders = vi.fn();
    const setLoadError = vi.fn();
    const setLastTurnReport = vi.fn();
    const setTurnAftermath = vi.fn();
    const setTurnAftermathOpen = vi.fn();

    await advanceTurnAndSync({
      ipc: ipc as any,
      loadSave,
      clearStagedOrders,
      setLoadError,
      getCurrentState: () => current,
      getOsidNameMap: () => null,
      setLastTurnReport,
      setTurnAftermath,
      setTurnAftermathOpen,
    });

    expect(clearStagedOrders).toHaveBeenCalledOnce();
    expect(loadSave).toHaveBeenCalledWith('{"meta":{"turn":12}}');
    expect(setLastTurnReport).toHaveBeenCalledWith({ phase: 'war', turn: 12, player_faction: 'RBiH' });
    expect(setTurnAftermath).toHaveBeenCalledWith(expect.objectContaining({
      turn: 12,
      tone: 'gain',
      headline: expect.stringContaining('+1'),
    }));
    expect(setTurnAftermathOpen).toHaveBeenCalledWith(true);
    expect(setLoadError).not.toHaveBeenCalled();
  });

  it('does not open turn aftermath when advance-turn is blocked before a state payload exists', async () => {
    const setTurnAftermath = vi.fn();
    const setTurnAftermathOpen = vi.fn();
    const setLoadError = vi.fn();

    await advanceTurnAndSync({
      ipc: { advanceTurn: vi.fn().mockResolvedValue({ ok: false, error: 'pending_required_decisions' }) } as any,
      loadSave: vi.fn(),
      clearStagedOrders: vi.fn(),
      setLoadError,
      setTurnAftermath,
      setTurnAftermathOpen,
    });

    expect(setLoadError).toHaveBeenCalledWith('Presidential decisions are still unsigned. Review the highlighted desk item before advancing.');
    expect(setTurnAftermath).not.toHaveBeenCalled();
    expect(setTurnAftermathOpen).not.toHaveBeenCalled();
  });

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
      targetSectorId: 'sector:arbih_3rd_corps:zavidovici',
    });
    expect(setLoadError).not.toHaveBeenCalled();
  });
});
