// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettlementDetailContent } from '../../src/ui/map/components/SettlementDetailContent.js';
import { SelectionPanel } from '../../src/ui/map/components/SelectionPanel.js';
import { buildOsidSupplyExplanation } from '../../src/ui/map/data/osidSupplyExplanation.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

afterEach(() => {
  cleanup();
  setLocale('en');
  useGameStore.setState(useGameStore.getInitialState());
});

const BASE_PROPS = {
  osid: 'op:test:a',
  osidDisplayNames: { 'op:test:a': 'Testograd' } as Record<string, string>,
  osidPropertiesMap: { 'op:test:a': { mun1990_name: 'Testmun' } } as Record<string, Record<string, unknown>>,
  controlBySettlement: { 'op:test:a': 'RBiH' } as Record<string, string>,
  formationsAtOsid: [] as never[],
  variant: 'panel' as const,
  statusLabel: 'Held',
};

describe('buildOsidSupplyExplanation (read-model)', () => {
  it('returns null when no scoped supply level is known (e.g. enemy/unknown settlement)', () => {
    expect(buildOsidSupplyExplanation(undefined)).toBeNull();
    expect(buildOsidSupplyExplanation(null)).toBeNull();
    // Defensive: a non-level value is not surfaced.
    expect(buildOsidSupplyExplanation('bogus' as never)).toBeNull();
  });

  it('maps each derived level to a player-legible label key + tone', () => {
    expect(buildOsidSupplyExplanation('adequate')).toMatchObject({
      level: 'adequate',
      labelKey: 'settlement.supply.adequate.label',
      explanationKey: 'settlement.supply.adequate.explanation',
      tone: 'good',
    });
    expect(buildOsidSupplyExplanation('strained')).toMatchObject({
      level: 'strained',
      labelKey: 'settlement.supply.strained.label',
      tone: 'caution',
    });
    expect(buildOsidSupplyExplanation('critical')).toMatchObject({
      level: 'critical',
      labelKey: 'settlement.supply.critical.label',
      tone: 'danger',
    });
  });
});

describe('SettlementDetailContent supply status surface', () => {
  it('renders player-legible settlement status without raw ids', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      statusLabel: 'CONTESTED',
    }));

    expect(screen.getByText('Contested')).toBeTruthy();
    expect(screen.queryByText('CONTESTED')).toBeNull();
  });

  it('renders a player-legible supply status for a controlled settlement', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      supplyStateByOsid: { 'op:test:a': 'critical' },
    }));

    const row = screen.getByTestId('settlement-supply-status');
    expect(row).toBeTruthy();
    // Player-legible label, NOT the raw enum.
    expect(screen.getByText('Cut off')).toBeTruthy();
    expect(screen.getByText('No supply route reaches this place — it is isolated.')).toBeTruthy();
    // Raw enum value must never be rendered.
    expect(screen.queryByText('critical')).toBeNull();
    expect(screen.queryByText('CRITICAL')).toBeNull();
  });

  it('renders the adequate framing for a well-supplied settlement', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      supplyStateByOsid: { 'op:test:a': 'adequate' },
    }));

    expect(screen.getByText('Well supplied')).toBeTruthy();
    expect(screen.queryByText('adequate')).toBeNull();
  });

  it('shows nothing when there is no scoped supply entry for the settlement', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      // Only another (player) settlement is scoped; the selected one is absent.
      supplyStateByOsid: { 'op:test:b': 'adequate' },
    }));

    expect(screen.queryByTestId('settlement-supply-status')).toBeNull();
  });

  it('shows nothing when no supply data is provided at all', () => {
    render(createElement(SettlementDetailContent, { ...BASE_PROPS }));
    expect(screen.queryByTestId('settlement-supply-status')).toBeNull();
  });

  it('refreshes timeline rows when per-settlement movement data changes', () => {
    const { rerender } = render(createElement(SettlementDetailContent, { ...BASE_PROPS }));
    fireEvent.click(screen.getByRole('tab', { name: /Timeline/i }));
    expect(screen.getByText('No recorded events at this settlement.')).toBeTruthy();

    rerender(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      movementsByOsid: {
        'op:test:a': [{ turn: 3, formation_id: 'bde_101', formation_name: '101st Brigade', type: 'arrived' }],
      },
    }));

    expect(screen.getByText(/101st Brigade stationed at settlement/i)).toBeTruthy();
  });

  it('uses recent control events when full control history is absent', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      recentControlEvents: [{ turn: 4, from: 'RBiH', to: 'RS', mechanism: 'combat' }],
    }));

    fireEvent.click(screen.getByRole('tab', { name: /Timeline/i }));

    expect(screen.getByText('VRS took control')).toBeTruthy();
    expect(screen.queryByText('No recorded events at this settlement.')).toBeNull();
  });

  it('renders localized ethnicity and terrain labels instead of raw data labels', () => {
    setLocale('bcs');

    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      osidPropertiesMap: {
        'op:test:a': {
          mun1990_name: 'Testmun',
          population_total: 100,
          population_bosniaks: 45,
          population_serbs: 35,
          population_croats: 15,
          population_others: 5,
          zone_type: 'rural_dense',
          terrain_friction_index: 0.4,
        },
      },
    }));

    const panel = screen.getByTestId('settlement-detail-panel');
    expect(panel.textContent).toContain('Bosnjaci');
    expect(panel.textContent).toContain('Srbi');
    expect(panel.textContent).toContain('Hrvati');
    expect(panel.textContent).toContain('Ostali');
    expect(panel.textContent).toContain('Gusto naseljeno ruralno podrucje');
    expect(panel.textContent).toContain('Odbrana +30%');
    expect(panel.textContent).not.toMatch(/Bosniak|Serb|Croat|Other|Rural Dense|\+30% Def|rural_dense/);
  });

  it('renders stationed-unit drilldowns as native buttons when they are clickable', () => {
    const onFormationClick = vi.fn();
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      formationsAtOsid: [{
        id: 'bde_101',
        faction: 'RBiH',
        name: '101st Brigade',
        kind: 'brigade',
        readiness: 'ready',
        cohesion: 80,
      }],
      onFormationClick,
    }));

    const brigadeButton = screen.getByRole('button', { name: /101st Brigade/i });
    expect(brigadeButton.tagName).toBe('BUTTON');

    fireEvent.click(brigadeButton);
    expect(onFormationClick).toHaveBeenCalledWith('bde_101');
  });

  it('does not synthesize current ethnic structure without departure evidence', () => {
    useGameStore.setState({
      selectedOsid: 'op:test:a',
      osidDisplayNames: { 'op:test:a': 'Testograd' },
      osidPropertiesMap: {
        'op:test:a': {
          mun1990_id: 'testmun',
          mun1990_name: 'Testmun',
          population_total: 100,
          population_bosniaks: 45,
          population_serbs: 35,
          population_croats: 15,
          population_others: 5,
        },
      },
      loadedGameState: {
        label: 'test',
        turn: 0,
        phase: 'war',
        player_faction: 'RBiH',
        formations: [],
        militiaPools: [],
        controlBySettlement: { 'op:test:a': 'RBiH' },
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
        latestTurnSummary: null,
        turnSummaries: [],
      } as never,
    });

    render(createElement(SelectionPanel));

    expect(screen.getByText('Pre-war ethnic structure')).toBeTruthy();
    expect(screen.queryByText('Current ethnic structure')).toBeNull();
  });
});
