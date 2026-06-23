// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { inspectOnField } from '../../src/ui/map/utils/shellNavigation.js';

describe('gameStore field inspection routes', () => {
  beforeEach(() => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      armyHQOpen: true,
      armyHQTab: 'records',
      armyHQRecordsSubTab: 'decisions',
      focusedAftermathTurn: 12,
      focusedOperationHistoryId: 'op-aar',
      focusedDecisionConsequenceId: 'decision-record',
      codexOpen: true,
      chronicleOpen: true,
      isOperationsPanelOpen: true,
      operationTargetOsids: ['target_osid'],
      hoveredOsids: ['stale_hover_osid'],
      hoveredSectorId: 'stale_sector',
      hoveredCorpsId: 'stale_corps',
      tooltipTarget: { type: 'osid', id: 'stale_hover_osid' },
      tooltipPosition: { x: 25, y: 50 },
    });
  });

  afterEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('preserves a formation and sector tuple atomically', () => {
    expect(inspectOnField(useGameStore.getState(), {
      kind: 'field-formation-in-sector',
      formationId: 'brigade_alpha',
      sectorId: 'sector_alpha',
      osid: 'sarajevo_1',
    })).toBe(true);

    expect(useGameStore.getState()).toMatchObject({
      armyHQOpen: false,
      codexOpen: false,
      chronicleOpen: false,
      isOperationsPanelOpen: false,
      selectedFormationId: 'brigade_alpha',
      selectedCorpsFrontSectorId: 'sector_alpha',
      selectedOsid: 'sarajevo_1',
      selectedOperationKey: null,
      operationTargetOsids: [],
      hoveredOsids: [],
      hoveredSectorId: null,
      hoveredCorpsId: null,
      tooltipTarget: null,
      tooltipPosition: null,
      focusedAftermathTurn: null,
      focusedOperationHistoryId: null,
      focusedDecisionConsequenceId: null,
    });
  });

  it('opens operations panel only for operation field targets', () => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-operation',
      operationKey: 'corps_alpha|Operation Alpha',
    });

    expect(useGameStore.getState()).toMatchObject({
      armyHQOpen: false,
      isOperationsPanelOpen: true,
      selectedOperationKey: 'corps_alpha|Operation Alpha',
      selectedFormationId: null,
      selectedCorpsFrontSectorId: null,
    });
  });

  it('preserves settlement plus sector context when supplied', () => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-sector',
      sectorId: 'sector_alpha',
      osid: 'sarajevo_1',
    });

    expect(useGameStore.getState()).toMatchObject({
      isOperationsPanelOpen: false,
      selectedOsid: 'sarajevo_1',
      selectedCorpsFrontSectorId: 'sector_alpha',
      selectedOperationKey: null,
    });
  });

  it('preserves formation plus settlement context atomically', () => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-formation-at-settlement',
      formationId: 'brigade_alpha',
      osid: 'sarajevo_1',
    });

    expect(useGameStore.getState()).toMatchObject({
      isOperationsPanelOpen: false,
      selectedFormationId: 'brigade_alpha',
      selectedOsid: 'sarajevo_1',
      selectedOperationKey: null,
    });
  });

  it('preserves army reserve formation plus parent HQ context atomically', () => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-formation-in-army-reserve',
      formationId: 'brigade_alpha',
      armyHqId: 'army_hq_alpha',
      osid: 'sarajevo_1',
    });

    expect(useGameStore.getState()).toMatchObject({
      isOperationsPanelOpen: false,
      selectedFormationId: 'brigade_alpha',
      selectedArmyHqId: 'army_hq_alpha',
      selectedOsid: 'sarajevo_1',
      selectedOperationKey: null,
      focusedAftermathTurn: null,
      focusedOperationHistoryId: null,
      focusedDecisionConsequenceId: null,
    });
  });

  it('preserves corps plus sector context atomically', () => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-sector-in-corps',
      sectorId: 'sector_alpha',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
    });

    expect(useGameStore.getState()).toMatchObject({
      isOperationsPanelOpen: false,
      selectedCorpsFrontSectorId: 'sector_alpha',
      selectedCorpsId: 'corps_alpha',
      selectedOsid: 'sarajevo_1',
      selectedOperationKey: null,
    });
  });

  it('preserves formation plus corps and settlement context atomically', () => {
    inspectOnField(useGameStore.getState(), {
      kind: 'field-formation-in-corps',
      formationId: 'brigade_alpha',
      corpsId: 'corps_alpha',
      osid: 'sarajevo_1',
    });

    expect(useGameStore.getState()).toMatchObject({
      isOperationsPanelOpen: false,
      selectedFormationId: 'brigade_alpha',
      selectedCorpsId: 'corps_alpha',
      selectedOsid: 'sarajevo_1',
      selectedOperationKey: null,
    });
  });
});
