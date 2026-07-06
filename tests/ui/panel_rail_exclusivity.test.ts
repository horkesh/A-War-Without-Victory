// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PanelBreadcrumb } from '../../src/ui/map/components/PanelBreadcrumb.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('single tactical detail panel rail exclusivity', () => {
  it('derives one leaf panel and an ordered breadcrumb trail for old two-rail states', () => {
    expect(derivePanelRailState({
      selectedOsid: 'op:sarajevo:centar_1',
      selectedArmyId: null,
      selectedArmyHqId: null,
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: 'sector_north',
      selectedFormationId: 'rbih_1_brigade',
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    })).toEqual({
      panel: 'formation',
      trail: [
        { panel: 'corps', id: 'rbih_1_corps' },
        { panel: 'sector', id: 'sector_north' },
      ],
    });

    expect(derivePanelRailState({
      selectedOsid: 'op:sarajevo:centar_1',
      selectedArmyId: null,
      selectedArmyHqId: null,
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: 'sector_north',
      selectedFormationId: null,
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    })).toEqual({
      panel: 'sector',
      trail: [{ panel: 'corps', id: 'rbih_1_corps' }],
    });

    expect(derivePanelRailState({
      selectedOsid: 'op:sarajevo:centar_1',
      selectedArmyId: null,
      selectedArmyHqId: 'arbih_general_staff',
      selectedCorpsId: null,
      selectedCorpsFrontSectorId: null,
      selectedFormationId: 'rbih_reserve_brigade',
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    })).toEqual({
      panel: 'formation',
      trail: [{ panel: 'army_reserve', id: 'arbih_general_staff' }],
    });
  });

  it('keeps settlement selection as a map highlight when a force leaf is selected', () => {
    const rail = derivePanelRailState({
      selectedOsid: 'op:sarajevo:centar_1',
      selectedArmyId: null,
      selectedArmyHqId: null,
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: null,
      selectedFormationId: 'rbih_1_brigade',
      selectedOperationKey: null,
      selectedOrbatCorpsId: null,
    });

    expect(rail.panel).toBe('formation');
    expect(JSON.stringify(rail)).not.toContain('settlement');
  });

  it('clicking a breadcrumb chip selects that parent and clears deeper selections', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: 'sector_north',
      selectedFormationId: 'rbih_1_brigade',
      selectedOsid: 'op:sarajevo:centar_1',
    });

    render(React.createElement(PanelBreadcrumb, {
      railState: derivePanelRailState(useGameStore.getState()),
    }));

    fireEvent.click(screen.getByRole('button', { name: /Back to Corps/i }));

    const state = useGameStore.getState();
    expect(state.selectedCorpsId).toBe('rbih_1_corps');
    expect(state.selectedCorpsFrontSectorId).toBeNull();
    expect(state.selectedFormationId).toBeNull();
    expect(state.selectedOsid).toBeNull();
    expect(derivePanelRailState(state)).toEqual({
      panel: 'corps',
      trail: [],
    });
  });

  it('Escape walks up the breadcrumb before closing the root panel', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: 'sector_north',
      selectedFormationId: 'rbih_1_brigade',
      selectedOsid: 'op:sarajevo:centar_1',
    });

    const { rerender } = render(React.createElement(PanelBreadcrumb, {
      railState: derivePanelRailState(useGameStore.getState()),
    }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGameStore.getState().selectedFormationId).toBeNull();
    expect(useGameStore.getState().selectedCorpsFrontSectorId).toBe('sector_north');
    expect(derivePanelRailState(useGameStore.getState()).panel).toBe('sector');

    rerender(React.createElement(PanelBreadcrumb, {
      railState: derivePanelRailState(useGameStore.getState()),
    }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGameStore.getState().selectedCorpsFrontSectorId).toBeNull();
    expect(useGameStore.getState().selectedCorpsId).toBe('rbih_1_corps');
    expect(derivePanelRailState(useGameStore.getState()).panel).toBe('corps');

    rerender(React.createElement(PanelBreadcrumb, {
      railState: derivePanelRailState(useGameStore.getState()),
    }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useGameStore.getState().selectedCorpsId).toBeNull();
    expect(derivePanelRailState(useGameStore.getState()).panel).toBe('inbox');
  });

  it('does not steal Escape from a focused interactive control', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      selectedCorpsId: 'rbih_1_corps',
      selectedCorpsFrontSectorId: 'sector_north',
    });

    render(React.createElement('div', null,
      React.createElement('button', { type: 'button' }, 'Focused control'),
      React.createElement(PanelBreadcrumb, {
        railState: derivePanelRailState(useGameStore.getState()),
      }),
    ));
    screen.getByRole('button', { name: 'Focused control' }).focus();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(useGameStore.getState().selectedCorpsFrontSectorId).toBe('sector_north');
    expect(derivePanelRailState(useGameStore.getState()).panel).toBe('sector');
  });
});
