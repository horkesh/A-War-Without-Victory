import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from '../src/ui/map/store/gameStore.js';

function seedConflictingSelectionState(): void {
  useGameStore.setState({
    selectedOsid: 'op:test:settlement',
    selectedFormationId: 'brigade:test',
    selectedCorpsFrontSectorId: 'sector:test:0',
    selectedCorpsId: 'corps:test',
    selectedArmyId: 'RBiH',
    selectedArmyHqId: 'army_hq:test',
    selectedOperationKey: 'corps:test|operation_test',
    selectedOrbatCorpsId: 'corps:test',
  });
}

function expectOnlySelection(active: Partial<Record<
  'selectedOsid'
  | 'selectedFormationId'
  | 'selectedCorpsFrontSectorId'
  | 'selectedCorpsId'
  | 'selectedArmyId'
  | 'selectedArmyHqId'
  | 'selectedOperationKey'
  | 'selectedOrbatCorpsId',
  string | null
>>): void {
  const state = useGameStore.getState();
  expect({
    selectedOsid: state.selectedOsid,
    selectedFormationId: state.selectedFormationId,
    selectedCorpsFrontSectorId: state.selectedCorpsFrontSectorId,
    selectedCorpsId: state.selectedCorpsId,
    selectedArmyId: state.selectedArmyId,
    selectedArmyHqId: state.selectedArmyHqId,
    selectedOperationKey: state.selectedOperationKey,
    selectedOrbatCorpsId: state.selectedOrbatCorpsId,
  }).toEqual({
    selectedOsid: null,
    selectedFormationId: null,
    selectedCorpsFrontSectorId: null,
    selectedCorpsId: null,
    selectedArmyId: null,
    selectedArmyHqId: null,
    selectedOperationKey: null,
    selectedOrbatCorpsId: null,
    ...active,
  });
}

describe('tactical map selection store clearing', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('settlement selection clears stale formation, sector, corps, army, operation, and ORBAT context', () => {
    seedConflictingSelectionState();

    useGameStore.getState().setSelectedOsid('op:test:next');

    expectOnlySelection({ selectedOsid: 'op:test:next' });
  });

  it('formation selection clears stale settlement, sector, operation, and ORBAT context', () => {
    seedConflictingSelectionState();

    useGameStore.getState().setSelectedFormationId('brigade:next');

    expect(useGameStore.getState()).toMatchObject({
      selectedOsid: null,
      selectedFormationId: 'brigade:next',
      selectedCorpsFrontSectorId: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    });
  });

  it('sector selection clears stale settlement, formation, corps, army, operation, and ORBAT context', () => {
    seedConflictingSelectionState();

    useGameStore.getState().setSelectedCorpsFrontSectorId('sector:next:0');

    expectOnlySelection({ selectedCorpsFrontSectorId: 'sector:next:0' });
  });

  it('settlement-in-sector selection preserves only the intentional sector context', () => {
    seedConflictingSelectionState();

    useGameStore.getState().setSelectedOsidInSector('op:test:next', 'sector:next:0');

    expectOnlySelection({
      selectedOsid: 'op:test:next',
      selectedCorpsFrontSectorId: 'sector:next:0',
    });
  });

  it('clearing an operation selection also closes operation context surfaces', () => {
    seedConflictingSelectionState();
    useGameStore.setState({ isOperationsPanelOpen: true, operationTargetOsids: ['op:test:target'] });

    useGameStore.getState().setSelectedOperationKey(null);

    expect(useGameStore.getState()).toMatchObject({
      selectedOperationKey: null,
      isOperationsPanelOpen: false,
      operationTargetOsids: [],
    });
  });
});
