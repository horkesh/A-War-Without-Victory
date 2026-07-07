// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettlementDetailContent } from '../../src/ui/map/components/SettlementDetailContent.js';
import { SelectionPanel } from '../../src/ui/map/components/SelectionPanel.js';
import { derivePanelRailState } from '../../src/ui/map/components/panelRail.js';
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

  it('renders an explicit stationed-unit empty state for settlements with no physical units present', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      formationsAtOsid: [],
    }));

    expect(screen.getByTestId('settlement-stationed-units-empty').textContent).toContain('No fielded units physically reported here.');
  });

  it('shows redacted enemy contact copy instead of implying a contact settlement is empty', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      formationsAtOsid: [],
      enemyContactCount: 2,
    }));

    expect(screen.getByTestId('settlement-enemy-contact-summary').textContent)
      .toContain('2 enemy contacts observed here; formation identities remain unconfirmed.');
    expect(screen.getByTestId('settlement-stationed-units-empty').textContent)
      .toContain('No friendly fielded units physically reported here.');
    expect(screen.queryByText('No fielded units physically reported here.')).toBeNull();
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

  it('links every settlement tab to the active tabpanel it controls', () => {
    render(createElement(SettlementDetailContent, { ...BASE_PROPS }));

    for (const tab of screen.getAllByRole('tab')) {
      fireEvent.click(tab);
      const controls = tab.getAttribute('aria-controls');
      expect(controls).toBeTruthy();
      const panel = document.getElementById(controls ?? '');
      expect(panel).toBeTruthy();
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
    }
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

  it('suppresses pre-war ethnic structure when census ethnicity fields are partial', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      osidPropertiesMap: {
        'op:test:a': {
          mun1990_name: 'Testmun',
          population_total: 100,
          population_bosniaks: 45,
          population_serbs: 35,
        },
      },
    }));

    expect(screen.queryByText('Pre-war ethnic structure')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Bosniaks\s*45|Serbs\s*35|Croats\s*0|Others\s*0/);
  });

  it('suppresses municipality ethnic structure when any included census row is partial', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
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
        'op:test:b': {
          mun1990_id: 'testmun',
          mun1990_name: 'Testmun',
          population_total: 80,
          population_bosniaks: 20,
          population_serbs: 60,
        },
      },
    }));

    fireEvent.click(screen.getByRole('tab', { name: 'Municipality' }));

    expect(screen.queryByText('Pre-war ethnic structure')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Croats\s*15|Others\s*5/);
  });

  it('labels settlement population flows as estimated when only municipality displacement is available', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      osidPropertiesMap: {
        'op:test:a': {
          mun1990_id: 'testmun',
          mun1990_name: 'Testmun',
          population_total: 100,
        },
      },
      displacementByMun: {
        testmun: {
          originalPopulation: 200,
          currentPopulation: 160,
          displacedOut: 40,
          displacedIn: 0,
          lostPopulation: 10,
          arrivedByFaction: {},
        },
      },
      displacementByOsid: {},
    }));

    expect(screen.getByTestId('settlement-displacement-estimate-note').textContent)
      .toContain('Estimated from municipality records');
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

  it('preserves sector context when a settlement stationed unit is clicked from the live panel', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      selectedOsid: 'op:test:a',
      osidDisplayNames: { 'op:test:a': 'Testograd' },
      osidPropertiesMap: { 'op:test:a': { mun1990_id: 'testmun', mun1990_name: 'Testmun' } },
      loadedGameState: {
        label: 'Turn 4',
        turn: 4,
        phase: 'war',
        formations: [
          {
            id: 'brigade_alpha',
            name: 'Alpha Brigade',
            faction: 'RBiH',
            kind: 'brigade',
            status: 'active',
            readiness: 'ready',
            location_osid: 'op:test:a',
            corps_id: 'corps_alpha',
          },
        ],
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
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RBiH',
        fogOfWar: { visibleEnemyOsids: ['op:test:a'], visibleEnemySectorIds: [] },
        corpsFrontSectors: [
          {
            sector_id: 'sector_alpha',
            display_name: 'Alpha Sector',
            corps_id: 'corps_alpha',
            faction: 'RBiH',
            edge_ids: [],
            assigned_brigade_ids: ['brigade_alpha'],
            reserve_brigade_ids: [],
          },
        ],
        frontEdgesOsid: [],
      } as any,
    });

    render(createElement(SelectionPanel));
    fireEvent.click(screen.getByRole('button', { name: /Alpha Brigade/i }));

    const store = useGameStore.getState();
    expect(store.selectedFormationId).toBe('brigade_alpha');
    expect(store.selectedCorpsFrontSectorId).toBe('sector_alpha');
    expect(store.selectedCorpsId).toBe('corps_alpha');
    expect(store.selectedOsid).toBe('op:test:a');
    expect(derivePanelRailState(store)).toEqual({
      panel: 'formation',
      trail: [
        { panel: 'corps', id: 'corps_alpha' },
        { panel: 'sector', id: 'sector_alpha' },
      ],
    });
  });

  it('SelectionPanel counts fog-visible enemy formations as redacted contacts, not stationed units', () => {
    useGameStore.setState({
      selectedOsid: 'op:test:a',
      osidDisplayNames: { 'op:test:a': 'Testograd' },
      osidPropertiesMap: { 'op:test:a': { mun1990_id: 'testmun', mun1990_name: 'Testmun' } },
      loadedGameState: {
        label: 'test',
        turn: 1,
        phase: 'war',
        player_faction: 'RBiH',
        fogOfWar: { visibleEnemyOsids: ['op:test:a'], visibleEnemySectorIds: [] },
        formations: [{
          id: 'vrs_secret_brigade',
          name: 'Secret Enemy Brigade',
          faction: 'RS',
          kind: 'brigade',
          status: 'active',
          readiness: 'ready',
          location_osid: 'op:test:a',
          cohesion: 80,
        }],
        militiaPools: [],
        controlBySettlement: { 'op:test:a': 'RS' },
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

    expect(screen.getByTestId('settlement-enemy-contact-summary').textContent)
      .toContain('1 enemy contact observed here; formation identity remains unconfirmed.');
    expect(document.body.textContent).not.toContain('Secret Enemy Brigade');
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
