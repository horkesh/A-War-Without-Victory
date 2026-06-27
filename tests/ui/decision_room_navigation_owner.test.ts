// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { openPresidentialDecisionRoomNavigationTarget } from '../../src/ui/map/utils/presidentialDecisionRoomNavigation.js';

describe('Decision Room navigation ownership', () => {
  it('does not route generic inbox targets through the map rail helper', () => {
    const state = {
      setCodexOpen: vi.fn(),
      setChronicleOpen: vi.fn(),
      setArmyHQOpen: vi.fn(),
      setIsOperationsPanelOpen: vi.fn(),
      setSelectedOsid: vi.fn(),
      setSelectedFormationId: vi.fn(),
      setSelectedCorpsId: vi.fn(),
      setSelectedCorpsFrontSectorId: vi.fn(),
      setSelectedArmyId: vi.fn(),
      setSelectedArmyHqId: vi.fn(),
      setSelectedOperationKey: vi.fn(),
      setSelectedOrbatCorpsId: vi.fn(),
      setFocusedAftermathTurn: vi.fn(),
      setFocusedOperationHistoryId: vi.fn(),
      setFocusedDecisionConsequenceId: vi.fn(),
    } as any;

    expect(openPresidentialDecisionRoomNavigationTarget({ kind: 'inbox' }, state)).toBe(false);
    expect(state.setArmyHQOpen).not.toHaveBeenCalled();
    expect(state.setSelectedOsid).not.toHaveBeenCalled();
  });
});
