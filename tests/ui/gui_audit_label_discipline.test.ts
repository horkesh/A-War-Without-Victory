// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { SituationTab } from '../../src/ui/map/components/SituationTab.js';
import { SelectionPanel, resolveSelectionPanelMunicipalityId } from '../../src/ui/map/components/SelectionPanel.js';
import { CombatSummaryPanel } from '../../src/ui/map/components/CombatSummaryPanel.js';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { CorpsCard } from '../../src/ui/map/components/CorpsCard.js';
import { FormationDetail } from '../../src/ui/map/components/FormationDetail.js';
import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard.js';
import { CombatRecordSection } from '../../src/ui/map/components/army_hq/CombatRecordSection.js';
import { CollapsibleSection } from '../../src/ui/map/components/army_hq/CollapsibleSection.js';
import { OrbatSection } from '../../src/ui/map/components/army_hq/OrbatSection.js';
import { OpportunityLedgerPanel } from '../../src/ui/map/components/army_hq/OpportunityLedgerPanel.js';
import { SectorsSection } from '../../src/ui/map/components/army_hq/SectorsSection.js';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { CorpsFrontSectorView, FormationView, LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40',
    turn: 40,
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
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

function makeSitrepState(): LoadedGameState {
  return makeState({
    war_alliance_rbih_hrhb: 0.75,
    controlBySettlement: {
      'op:bijeljina:cadjavica_gornja_2': 'RBiH',
      'op:ugljevik:srednja_trnova_2': 'RS',
    },
    operationalSitrep: {
      headline: 'Front contact currently reported.',
      territory: { territoryPercent: 50, settlementsControlled: 1, settlementsTotal: 2 },
      front: {
        engagedCount: 496,
        exposedCount: 402,
        edges: [
          {
            id: 'edge-1',
            label: 'Bijeljina Cadjavica_gornja_2 - Ugljevik Srednja_trnova_2',
            tier: 'exposed',
            pressure: 1,
            friction: 1,
          },
        ],
      },
      readiness: { weakestBrigades: [], encircledCount: 0 },
      sustainment: { adequateCount: 2, strainedCount: 0, criticalCount: 0, collapsedMunicipalities: [], activeHostileTakeoverTimers: 0, activeCamps: 0 },
      operations: { activeCount: 0, corps: [] },
      alerts: [],
    },
  });
}

describe('GUI audit label discipline', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('renders SITREP priority fronts with player-facing display names instead of raw slugs', () => {
    useGameStore.setState({
      osidDisplayNames: {
        'op:bijeljina:cadjavica_gornja_2': 'Cadjavica Gornja (Bijeljina)',
        'op:ugljevik:srednja_trnova_2': 'Srednja Trnova (Ugljevik)',
      },
    });

    const { container } = render(createElement(SituationTab, { state: makeSitrepState() }));

    expect(screen.getByText(/Priority fronts:/).textContent).toContain('Cadjavica Gornja (Bijeljina) - Srednja Trnova (Ugljevik)');
    expect(screen.getByText(/Front posture:/).textContent).toContain('widespread contact');
    expect(screen.getByText(/thinly held sectors:/).textContent).toContain('widespread');
    expect(screen.getByText(/Alliance posture:/).textContent).toContain('close coordination');
    expect(container.textContent).not.toMatch(/cadjavica_gornja|srednja_trnova|_\d\b/i);
    expect(container.textContent).not.toMatch(/Front contacts:\s*\d|thinly held:\s*\d|0\.75/);
  });

  it('uses area-weighted territory in SituationTab instead of the legacy sitrep settlement share', () => {
    render(createElement(SituationTab, { state: makeSitrepState() }));

    expect(screen.getByText('0.1%')).toBeTruthy();
    expect(screen.queryByText('50.0%')).toBeNull();
  });

  it('renders operational SITREP token copy in BCS mode without English generated fallbacks', () => {
    setLocale('bcs');
    const state = makeSitrepState();
    state.operationalSitrep = {
      ...state.operationalSitrep!,
      headline: 'Widespread thinly held front sectors need staff review.',
      headlineToken: { key: 'operationalSitrep.headline.frontExposed.widespread' },
      alerts: [{
        id: 'collapse-eligible',
        severity: 'critical',
        text: 'Faction is collapse-eligible.',
        textToken: { key: 'operationalSitrep.alert.collapseEligible' },
      }],
    } as typeof state.operationalSitrep;

    const { container } = render(createElement(SituationTab, { state }));

    expect(container.textContent).toContain('Široko rasprostranjeni tanko držani frontovski sektori traže pregled štaba.');
    expect(container.textContent).toContain('Frakcija ispunjava uslove za kolaps.');
    expect(container.textContent).not.toContain('Widespread thinly held front sectors need staff review.');
    expect(container.textContent).not.toContain('Faction is collapse-eligible.');
    expect(container.textContent).not.toContain('thinly held front sectors');
    expect(container.textContent).not.toContain('collapse-eligible');
  });

  it('localizes local-support labels without English order names in BCS mode', () => {
    setLocale('bcs');
    const state = makeState({
      controlBySettlement: { 'op:tuzla:center': 'RBiH' },
      municipalitySupportOrders: {
        RBiH: {
          faction: 'RBiH',
          mun_id: 'tuzla',
          type: 'weapons_shipment',
          staged_turn: 40,
          label: 'RBiH weapons shipment staged',
        },
      },
    });

    const situation = render(createElement(SituationTab, { state, focusSection: 'support' }));

    expect(situation.container.textContent).not.toMatch(/Phase E|weapons shipment|staff priority|croatian support package|local support/i);
    expect(screen.queryByText(/Phase E/)).toBeNull();
    cleanup();

    useGameStore.setState({
      loadedGameState: state,
      selectedOsid: 'op:tuzla:center',
      osidDisplayNames: { 'op:tuzla:center': 'Tuzla' },
      osidPropertiesMap: {
        'op:tuzla:center': {
          osid: 'op:tuzla:center',
          settlement_name: 'Tuzla',
          mun1990_name: 'Tuzla',
          population_total: 1000,
        },
      },
    });

    const selection = render(createElement(SelectionPanel));

    expect(selection.container.textContent).not.toMatch(/Phase E|weapons shipment|staff priority|croatian support package|local support/i);
    expect(screen.queryByText(/Phase E/)).toBeNull();
  });

  it('targets settlement support by metadata municipality and keeps the assigned panel rail', () => {
    const state = makeState({
      player_faction: 'RBiH',
      controlBySettlement: { 'op:legacy_slug:actual_cell': 'RBiH' },
    });
    const properties = {
      'op:legacy_slug:actual_cell': {
        osid: 'op:legacy_slug:actual_cell',
        settlement_name: 'Actual Cell',
        mun1990_id: 'actual_municipality',
        mun1990_name: 'Actual Municipality',
        population_total: 1000,
      },
    };

    expect(resolveSelectionPanelMunicipalityId('op:legacy_slug:actual_cell', properties)).toBe('actual_municipality');

    useGameStore.setState({
      loadedGameState: state,
      selectedOsid: 'op:legacy_slug:actual_cell',
      osidDisplayNames: { 'op:legacy_slug:actual_cell': 'Actual Cell' },
      osidPropertiesMap: properties,
    });

    const selection = render(createElement(SelectionPanel, { railSlot: 'secondary' }));
    const panel = selection.container.querySelector('[data-testid="selection-panel"]') as HTMLElement | null;
    const localSupport = selection.container.querySelector('[data-testid="settlement-local-support"]');

    expect(panel?.getAttribute('data-rail-slot')).toBe('secondary');
    expect(panel?.style.right).toBe('25.5rem');
    expect(localSupport?.getAttribute('data-target-mun-id')).toBe('actual_municipality');
    expect(selection.container.textContent).toContain('Actual Municipality');
    expect(selection.container.textContent).not.toContain('Legacy Slug');
    expect(screen.getByRole('button', { name: /Close settlement info/i })).toBeTruthy();
  });

  it('resets settlement detail tabs to overview when selecting a different settlement', async () => {
    useGameStore.setState({
      loadedGameState: makeState({
        controlBySettlement: {
          'op:first': 'RBiH',
          'op:second': 'RBiH',
        },
      }),
      selectedOsid: 'op:first',
      osidDisplayNames: { 'op:first': 'First Settlement', 'op:second': 'Second Settlement' },
      osidPropertiesMap: {
        'op:first': { osid: 'op:first', settlement_name: 'First Settlement', mun1990_name: 'First Municipality', population_total: 1000 },
        'op:second': { osid: 'op:second', settlement_name: 'Second Settlement', mun1990_name: 'Second Municipality', population_total: 1000 },
      },
    });

    render(createElement(SelectionPanel));

    fireEvent.click(screen.getByRole('tab', { name: /Timeline/i }));
    expect(screen.getByRole('tab', { name: /Timeline/i }).getAttribute('aria-selected')).toBe('true');

    useGameStore.setState({ selectedOsid: 'op:second' });

    await waitFor(() => expect(screen.getByRole('tab', { name: /Overview/i }).getAttribute('aria-selected')).toBe('true'));
    expect(screen.getByText('Second Settlement')).toBeTruthy();
  });

  it('renames the opportunity pulse reserve-crisis metric instead of exposing T3 internals', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        operationOpportunityRecords: [
          {
            proposal_id: 'p1',
            opportunity_id: 'o1',
            display_name: 'Reserve crisis',
            faction: 'RBiH',
            status: 'approved',
            response: 'approve',
            exit_class: 't3_authorized_no_offensive',
          },
        ],
      }),
    });

    const { container } = render(createElement(OpportunityLedgerPanel));

    expect(screen.getByText('Reserve-Crisis Authorization')).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bT3\b/);
  });

  it('labels opportunity AAR objectives as held at close, not taken', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        operationOpportunityRecords: [
          {
            proposal_id: 'p1',
            opportunity_id: 'o1',
            display_name: 'Pocket relief',
            faction: 'RBiH',
            status: 'approved',
            response: 'approve',
            exit_class: 'partial_success',
            objectives_targeted: 3,
            objectives_captured: 2,
          },
        ],
      }),
    });

    const { container } = render(createElement(OpportunityLedgerPanel));

    expect(container.textContent).toMatch(/2\/3 held at close/i);
    expect(container.textContent).not.toMatch(/2\/3 objectives/i);
  });

  it('keeps combat records explicit about ground won and lost without capture shorthand', () => {
    const combatSummary = {
      battles_fought: 4,
      battles_as_attacker: 3,
      battles_as_defender: 1,
      victories: 2,
      defeats: 1,
      stalemates: 1,
      win_rate: 0.5,
      total_casualties_taken: 120,
      total_casualties_inflicted: 180,
      casualty_exchange_ratio: 1.5,
      total_osids_captured: 3,
      total_osids_lost: 1,
      brigade_count: 4,
      active_brigade_count: 3,
      peak_aggregate_personnel: 6000,
      nadir_aggregate_personnel: 5200,
      current_personnel: 5500,
      arc_distribution: { bloodied: 2 },
      most_victories_brigade_id: null,
      most_casualties_brigade_id: null,
    };

    const { container: summaryContainer } = render(createElement(CombatSummaryPanel, {
      summary: combatSummary,
    }));

    expect(summaryContainer.textContent).toMatch(/3 as attacker \/ 1 as defender/i);
    expect(summaryContainer.textContent).not.toMatch(/\b3 att \/ 1 def\b/i);
    expect(summaryContainer.textContent).toMatch(/Wins: 2 \/ Losses: 1 \/ Stalemates: 1/i);
    expect(summaryContainer.textContent).not.toMatch(/\b2W 1L 1D\b/);
    expect(summaryContainer.textContent).toMatch(/3 won \/ 1 lost/i);
    expect(summaryContainer.textContent).toMatch(/3 active brigades \/ 4 total/i);
    expect(summaryContainer.textContent).not.toMatch(/3 active \/ 4 total/i);
    expect(summaryContainer.textContent).toMatch(/2 Blooded in combat/i);
    expect(summaryContainer.textContent).not.toMatch(/\bbloodied\b/);
    expect(summaryContainer.textContent).not.toMatch(/\bcap\b|captured/i);

    cleanup();

    useGameStore.setState({ armyHQExpandedSections: { 'combat-arbih_1st_corps': true } });

    const { container: corpsContainer } = render(createElement(CombatRecordSection, {
      corpsId: 'arbih_1st_corps',
      corps: { combatSummary } as unknown as FormationView,
    }));

    expect(corpsContainer.textContent).toMatch(/Ground Won\/Lost/i);
    expect(corpsContainer.textContent).toMatch(/Wins: 2 \/ Losses: 1 \/ Stalemates: 1/i);
    expect(corpsContainer.textContent).toMatch(/3 won \/ 1 lost/i);
    expect(corpsContainer.textContent).not.toMatch(/\b\d+W\b|\b\d+L\b|\b\d+D\b|\+\d+\s*\/\s*-\d+/);
    expect(corpsContainer.textContent).not.toMatch(/\bcap\b|captured/i);
  });

  it('does not turn sparse combat summary fields into exact zero outcomes', () => {
    const combatSummary = {
      battles_fought: 2,
      battles_as_attacker: 0,
      battles_as_defender: 0,
      victories: 0,
      defeats: 0,
      stalemates: 0,
      win_rate: 0,
      total_casualties_taken: 0,
      total_casualties_inflicted: 0,
      casualty_exchange_ratio: 0,
      total_osids_captured: 0,
      total_osids_lost: 0,
      brigade_count: 0,
      active_brigade_count: 0,
      peak_aggregate_personnel: 0,
      nadir_aggregate_personnel: 0,
      current_personnel: 0,
      arc_distribution: {},
      most_victories_brigade_id: null,
      most_casualties_brigade_id: null,
      reportedFields: ['battles_fought'],
    };

    const { container } = render(createElement(CombatSummaryPanel, {
      summary: combatSummary,
    }));

    expect(container.textContent).toContain('Battles2');
    expect(container.textContent).toContain('Win RateUnreported');
    expect(container.textContent).toContain('Men lostUnreported');
    expect(container.textContent).toContain('Casualties InflictedUnreported');
    expect(container.textContent).toContain('Exchange RatioUnreported');
    expect(container.textContent).toContain('Ground Won/LostUnreported');
    expect(container.textContent).toContain('BrigadesUnreported');
    expect(container.textContent).not.toMatch(/0\.0%|0\.00:1|0 won \/ 0 lost|0 active brigades \/ 0 total/i);
  });

  it('renders brigade effectiveness unreported when grade-critical inputs are incomplete', () => {
    const brigade = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      createdTurn: 0,
      tags: [],
    } as FormationView;
    useGameStore.setState({
      loadedGameState: makeState({ formations: [brigade] }),
      selectedFormationId: brigade.id,
    });

    const { container } = render(createElement(FormationDetail, { railSlot: 'primary' }));

    expect(container.textContent).toContain('EffectivenessUnreported');
    expect(container.textContent).not.toMatch(/Effectiveness\d/);
  });

  it('keeps Army HQ corps cards free of stance and count shorthand', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      personnel: 0,
      cohesion: 75,
      fatigue: 5,
      corpsStance: 'defensive',
      createdTurn: 0,
    } as FormationView;
    const brigade = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      morale: 60,
      createdTurn: 0,
      corps_id: 'arbih_1st_corps',
    } as unknown as FormationView;
    const sector = {
      sector_id: 'sector:arbih_1st_corps:0',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      display_name: 'Sarajevo front',
      edge_ids: [],
      assigned_brigade_ids: ['arbih_101_brigade'],
      reserve_brigade_ids: [],
      length_edges: 4,
      sub_segment_count: 0,
      defensive_power: 1200,
      density: 0.25,
      threat_ratio: 1.1,
      intel_confidence: 0.8,
      offensive_signs: false,
      sub_segments: [],
    } as unknown as CorpsFrontSectorView;
    const gameState = makeState({
      formations: [corps, brigade],
      corpsFrontSectors: [sector],
    });

    const { container: frontContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [brigade],
      sectors: [sector],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(frontContainer.textContent).toContain('DEFENSIVE');
    expect(frontContainer.textContent).toContain('1 brigades');
    expect(frontContainer.textContent).toContain('1 sectors');
    expect(frontContainer.textContent).not.toMatch(/\bOFF\b|\bDEF\b|\bBAL\b|\bREORG\b|\bBRG\b|\bSEC\b/);
    cleanup();

    const { container: backContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [brigade],
      sectors: [sector],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: true,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(backContainer.textContent).toContain('personnel');
    expect(backContainer.textContent).toContain('brigades');
    expect(backContainer.textContent).toContain('sectors');
    expect(backContainer.textContent).not.toMatch(/\bPers\b|\bBrg\b|\bSec\b/);
  });

  it('renders missing corps stance as unreported instead of balanced', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      personnel: 0,
      cohesion: 75,
      fatigue: 5,
      createdTurn: 0,
    } as unknown as FormationView;
    const gameState = makeState({ formations: [corps] });

    const { container } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(container.textContent).toContain('UNREPORTED');
    expect(container.textContent).not.toContain('BALANCED');
    cleanup();

    render(createElement(CorpsCard, {
      corpsId: 'arbih_1st_corps',
      corpsName: '1st Corps',
      brigades: [],
      faction: 'RBiH',
      onStanceChange: vi.fn(),
    } as Parameters<typeof CorpsCard>[0]));

    const stanceSelect = screen.getByLabelText('Corps stance') as HTMLSelectElement;
    expect(stanceSelect.value).toBe('unreported');
    expect(stanceSelect.textContent).toContain('Unreported');
    expect(stanceSelect.textContent).toContain('Balanced');
  });

  it('does not render missing OOB corps cohesion as depleted zero percent', () => {
    const { container } = render(createElement(CorpsCard, {
      corpsId: 'arbih_1st_corps',
      corpsName: '1st Corps',
      brigades: [{
        id: 'arbih_101_brigade',
        name: '101st Brigade',
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        readiness: 'ready',
        personnel: 1200,
        fatigue: 4,
        createdTurn: 0,
        tags: [],
      } as FormationView],
      faction: 'RBiH',
    } as Parameters<typeof CorpsCard>[0]));

    const flipTarget = container.querySelector('[role="button"]');
    expect(flipTarget).toBeTruthy();
    fireEvent.click(flipTarget!);

    expect(container.textContent).toContain('Avg CohesionUnreported');
    expect(container.textContent).not.toContain('Avg Cohesion0%');
  });

  it('renders missing command strain and corps exhaustion as unreported instead of healthy silence', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      corpsStance: 'defensive',
      createdTurn: 0,
      tags: [],
    } as unknown as FormationView;
    const gameState = makeState({ formations: [corps] });

    const { container } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: true,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(container.textContent).toContain('Command Relationship');
    expect(container.textContent).toContain('Command strainUnreported');
    expect(container.textContent).toContain('Corps exhaustionUnreported');
    expect(container.textContent).not.toContain('Command Relationship - Healthy');
    expect(container.textContent).not.toContain('Corps exhaustion (0%)');
  });

  it('uses neutral, partial, and threshold strength colors for corps personnel reports', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      corpsStance: 'defensive',
      createdTurn: 0,
      tags: [],
    } as unknown as FormationView;
    const reportedStrong = {
      id: 'reported_strong',
      name: 'Reported Strong Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 8200,
      createdTurn: 0,
      tags: [],
    } as FormationView;
    const reportedPartial = {
      ...reportedStrong,
      id: 'reported_partial',
      name: 'Reported Partial Brigade',
      personnel: 4200,
    } as FormationView;
    const unreported = {
      ...reportedStrong,
      id: 'unreported_personnel',
      name: 'Unreported Brigade',
      personnel: undefined,
    } as FormationView;

    const { container: unreportedContainer } = render(createElement(CorpsCard, {
      corpsId: 'arbih_1st_corps',
      corpsName: '1st Corps',
      brigades: [unreported],
      faction: 'RBiH',
    } as Parameters<typeof CorpsCard>[0]));
    expect(unreportedContainer.querySelector('[data-testid="corps-card-personnel"]')?.className).toContain('text-text-secondary');
    expect(unreportedContainer.querySelector('[data-testid="corps-card-personnel-icon"]')?.getAttribute('data-color')).toBe('neutral');
    expect(unreportedContainer.textContent).toContain('Unreported');
    cleanup();

    const { container: armyUnreportedContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [unreported],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState: makeState({ formations: [corps, unreported] }),
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));
    expect(armyUnreportedContainer.querySelector('[data-testid="army-hq-corps-card-personnel"]')?.className).toContain('text-text-secondary');
    expect(armyUnreportedContainer.querySelector('[data-testid="army-hq-corps-card-personnel"]')?.getAttribute('data-report-state')).toBe('unreported');
    cleanup();

    const { container: partialContainer } = render(createElement(CorpsCard, {
      corpsId: 'arbih_1st_corps',
      corpsName: '1st Corps',
      brigades: [reportedPartial, unreported],
      faction: 'RBiH',
    } as Parameters<typeof CorpsCard>[0]));
    expect(partialContainer.querySelector('[data-testid="corps-card-personnel"]')?.className).toContain('text-amber-400');
    expect(partialContainer.querySelector('[data-testid="corps-card-personnel-icon"]')?.getAttribute('data-color')).toBe('partial');
    expect(partialContainer.textContent).toMatch(/Partial 4[,.]200/);
    cleanup();

    const { container: armyPartialContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [reportedPartial, unreported],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState: makeState({ formations: [corps, reportedPartial, unreported] }),
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));
    expect(armyPartialContainer.querySelector('[data-testid="army-hq-corps-card-personnel"]')?.className).toContain('text-amber-400');
    expect(armyPartialContainer.querySelector('[data-testid="army-hq-corps-card-personnel"]')?.getAttribute('data-report-state')).toBe('partial');
    cleanup();

    const { container: completeContainer } = render(createElement(CorpsCard, {
      corpsId: 'arbih_1st_corps',
      corpsName: '1st Corps',
      brigades: [reportedStrong],
      faction: 'RBiH',
    } as Parameters<typeof CorpsCard>[0]));
    expect(completeContainer.querySelector('[data-testid="corps-card-personnel"]')?.className).toContain('text-emerald-400');
    expect(completeContainer.querySelector('[data-testid="corps-card-personnel-icon"]')?.getAttribute('data-color')).toBe('complete-strong');
    expect(completeContainer.textContent).toMatch(/8[,.]200/);
    cleanup();

    const { container: armyCompleteContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [reportedStrong],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState: makeState({ formations: [corps, reportedStrong] }),
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));
    expect(armyCompleteContainer.querySelector('[data-testid="army-hq-corps-card-personnel"]')?.className).toContain('text-emerald-400');
    expect(armyCompleteContainer.querySelector('[data-testid="army-hq-corps-card-personnel"]')?.getAttribute('data-report-state')).toBe('complete-strong');
  });

  it('highlights only physical brigade locations on CorpsCard hover', () => {
    const onHoverOsidsChange = vi.fn();
    render(createElement(CorpsCard, {
      corpsId: 'rbih_1_corps',
      corpsName: '1st Corps',
      faction: 'RBiH',
      brigades: [
        {
          id: 'rbih_1_brigade',
          name: '1st Brigade',
          faction: 'RBiH',
          kind: 'brigade',
          status: 'active',
          readiness: 'ready',
          location_osid: 'op:real:front',
          aorSettlementIds: ['op:stale:aor_1', 'op:stale:aor_2'],
        } as FormationView,
      ],
      onHoverOsidsChange,
    } as Parameters<typeof CorpsCard>[0]));

    fireEvent.mouseEnter(screen.getAllByText('1st Corps')[0]);

    expect(onHoverOsidsChange).toHaveBeenCalledWith(['op:real:front']);
  });

  it('describes planning-only corps operations without saying the corps has no active operations', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      personnel: 0,
      cohesion: 75,
      fatigue: 5,
      corpsStance: 'defensive',
      createdTurn: 0,
    } as unknown as FormationView;
    const brigade = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      morale: 60,
      createdTurn: 0,
      corps_id: 'arbih_1st_corps',
    } as unknown as FormationView;
    const gameState = makeState({ formations: [corps, brigade] });

    const { container } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [brigade],
      sectors: [],
      operations: [{
        name: 'operation_planning',
        display_name: 'Planning Operation',
        phase: 'planning',
      } as unknown as Parameters<typeof ArmyHQCorpsCard>[0]['operations'][number]],
      factionBattles: [],
      gameState,
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(container.textContent).toContain('PLANNING OPERATION');
    expect(container.textContent).toContain('Planning Operation');
    expect(container.textContent).not.toContain('No active operations');
  });

  it('gives Army HQ expand and collapse controls explicit stateful accessible names', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      personnel: 0,
      cohesion: 75,
      fatigue: 5,
      corpsStance: 'defensive',
      createdTurn: 0,
    } as unknown as FormationView;
    const gameState = makeState({ formations: [corps] });
    const onToggleExpand = vi.fn();

    const { rerender } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: false,
      isCompressed: false,
      onToggleExpand,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Expand 1st Corps command card' }));
    expect(onToggleExpand).toHaveBeenCalledOnce();

    rerender(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: true,
      isCompressed: false,
      onToggleExpand,
    }));

    expect(screen.getByRole('button', { name: 'Collapse 1st Corps command card' })).toBeTruthy();

    cleanup();

    useGameStore.setState({ armyHQExpandedSections: {} });
    render(createElement(CollapsibleSection, {
      sectionKey: 'combat-arbih_1st_corps',
      title: 'Combat record',
      count: 2,
      defaultOpen: false,
      children: createElement('div', null, 'Combat body'),
    }));

    const sectionToggle = screen.getByRole('button', { name: 'Expand Combat record section' });
    expect(sectionToggle.getAttribute('aria-expanded')).toBe('false');
    expect(sectionToggle.textContent).toContain('>');
    fireEvent.click(sectionToggle);
    const collapseToggle = screen.getByRole('button', { name: 'Collapse Combat record section' });
    expect(collapseToggle.getAttribute('aria-expanded')).toBe('true');
    expect(collapseToggle.textContent).toContain('v');
  });

  it('spells out Army HQ ORBAT campaign losses', () => {
    const brigade = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      morale: 60,
      posture: 'defend',
      createdTurn: 0,
      campaignKia: 12,
      campaignWia: 34,
      campaignMia: 5,
      eliteCommander: {
        name: 'Dzevad Rado',
        competence: 4,
        aggressiveness: 3,
        defensive_skill: 3,
        origin: 'military',
      },
    } as unknown as FormationView;

    useGameStore.setState({ armyHQExpandedSections: { 'orbat-arbih_1st_corps': true } });
    const { container } = render(createElement(OrbatSection, { corpsId: 'arbih_1st_corps', brigades: [brigade] }));

    const toggle = screen.getByTestId('army-hq-formation-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('army-hq-formation-detail-arbih_101_brigade');
    expect(toggle.getAttribute('aria-label')).toMatch(/Expand formation details for 101st Brigade/i);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toMatch(/Collapse formation details for 101st Brigade/i);
    expect(screen.getByTestId('army-hq-formation-detail').getAttribute('id')).toBe('army-hq-formation-detail-arbih_101_brigade');
    expect(screen.getByTestId('army-hq-formation-inspect').getAttribute('aria-label')).toBe('Inspect 101st Brigade on field');
    expect(container.querySelector('button button')).toBeNull();

    expect(container.textContent).toMatch(/12 killed \/ 34 wounded \/ 5 missing or captured/i);
    expect(container.textContent).toContain('Elite commander');
    expect(container.textContent).toContain('Dzevad Rado');
    expect(container.textContent).toContain('Command 4');
    expect(container.textContent).toContain('Tempo 3');
    expect(container.textContent).toContain('Defense 3');
    expect(container.textContent).not.toMatch(/\bKIA\b|\bWIA\b|\bMIA\b/);
    expect(container.textContent).not.toMatch(/\borigin\b|\bmilitary\b/i);
  });

  it('renders Army HQ equipment condition fractions as operational equipment counts', () => {
    const corps = {
      id: 'arbih_1st_corps',
      faction: 'RBiH',
      name: '1st Corps',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      personnel: 0,
      cohesion: 75,
      fatigue: 5,
      createdTurn: 0,
    } as unknown as FormationView;
    const first = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      morale: 60,
      createdTurn: 0,
      entrenchment_turns: 1.5,
      composition: {
        infantry: 1200,
        tanks: 10,
        artillery: 5,
        aa_systems: 0,
        tank_condition: { operational: 0.8 },
        artillery_condition: { operational: 0.6 },
      },
    } as unknown as FormationView;
    const second = {
      ...first,
      id: 'arbih_102_brigade',
      name: '102nd Brigade',
      composition: {
        infantry: 1000,
        tanks: 10,
        artillery: 5,
        aa_systems: 0,
        tank_condition: { operational: 0.5 },
        artillery_condition: { operational: 0.4 },
      },
    } as unknown as FormationView;
    const gameState = makeState({ formations: [corps, first, second] });

    const { container: cardContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [first, second],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(cardContainer.textContent).toContain('13/20');
    expect(cardContainer.textContent).toContain('5/10');
    expect(cardContainer.textContent).not.toContain('1/20');
    cleanup();

    const partiallyReported = {
      ...second,
      composition: {
        infantry: 1000,
        tanks: 10,
        artillery: 5,
        aa_systems: 0,
      },
    } as unknown as FormationView;
    const { container: partialContainer } = render(createElement(ArmyHQCorpsCard, {
      corps,
      brigades: [first, partiallyReported],
      sectors: [],
      operations: [],
      factionBattles: [],
      gameState,
      isExpanded: false,
      isCompressed: false,
      onToggleExpand: vi.fn(),
    }));

    expect(partialContainer.textContent).toContain('Partial 8/20');
    expect(partialContainer.textContent).toContain('Partial 3/10');
    expect(partialContainer.textContent).not.toContain('18/20');
    cleanup();

    useGameStore.setState({ armyHQExpandedSections: { 'orbat-arbih_1st_corps': true } });
    const { container: orbatContainer } = render(createElement(OrbatSection, { corpsId: 'arbih_1st_corps', brigades: [first] }));

    fireEvent.click(screen.getAllByRole('button', { name: /101st Brigade/i })[0]);

    expect(orbatContainer.textContent).toContain('8/10');
    expect(orbatContainer.textContent).toContain('3/5');
    expect(orbatContainer.textContent).toContain('8/10 operational');
    expect(orbatContainer.textContent).toContain('3/5 operational');
    expect(orbatContainer.textContent).toContain('1.5 turns');
    expect(orbatContainer.textContent).not.toContain('1/10');
    expect(orbatContainer.textContent).not.toMatch(/\bOP\b|\b1\.5T\b/);
  });

  it('renders sparse ORBAT brigade metrics as unreported instead of zero or active-green', () => {
    const brigade = {
      id: 'sparse_brigade',
      name: 'Sparse Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      location_osid: 'op:sarajevo:dobrinja_1',
    } as unknown as FormationView;

    useGameStore.setState({
      armyHQExpandedSections: { 'orbat-arbih_1st_corps': true },
      osidDisplayNames: { 'op:sarajevo:dobrinja_1': 'Dobrinja' },
    });

    const { container } = render(createElement(OrbatSection, { corpsId: 'arbih_1st_corps', brigades: [brigade] }));

    expect(container.textContent).toContain('--');
    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toMatch(/\b0\b/);
    const posture = Array.from(container.querySelectorAll('span')).find((node) => node.textContent === 'Unreported');
    expect(posture?.className).toContain('text-text-secondary/50');

    fireEvent.click(screen.getAllByRole('button', { name: /Sparse Brigade/i })[0]);

    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('renders Army HQ modal aggregate personnel as exact, partial, or unreported from reported brigade rows', () => {
    const corps = {
      id: 'arbih_1st_corps',
      name: '1st Corps',
      faction: 'RBiH',
      kind: 'corps',
      status: 'active',
      readiness: 'ready',
      createdTurn: 0,
      tags: [],
    } as unknown as FormationView;
    const reported = {
      id: 'reported_brigade',
      name: 'Reported Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      corps_id: corps.id,
      personnel: 1200,
      cohesion: 70,
      fatigue: 5,
      morale: 60,
      createdTurn: 0,
      tags: [],
    } as unknown as FormationView;
    const unreported = {
      ...reported,
      id: 'unreported_brigade',
      name: 'Unreported Brigade',
      personnel: undefined,
    } as unknown as FormationView;

    for (const [formations, expected, unexpected] of [
      [[corps, reported], /1[,.]200/, /Partial|Unreported/i],
      [[corps, reported, unreported], /Partial 1[,.]200/, /\b2[,.]400\b/],
      [[corps, unreported], /Unreported/, /\b0\b|Partial/i],
    ] as const) {
      useGameStore.setState({
        ...useGameStore.getInitialState(),
        loadedGameState: makeState({ player_faction: 'RBiH', formations: formations as unknown as LoadedGameState['formations'] }),
        armyHQOpen: true,
        armyHQTab: 'briefing',
        selectedArmyId: 'RBiH',
      });

      const { container } = render(createElement(ArmyHQModal));
      const reporting = container.querySelector('[data-testid="army-hq-personnel-reporting"]');

      expect(reporting).not.toBeNull();
      expect(reporting!.textContent).toMatch(expected);
      expect(reporting!.textContent).not.toMatch(unexpected);
      cleanup();
    }
  });

  it('renders missing ORBAT equipment condition as unreported instead of fully operational', () => {
    const brigade = {
      id: 'sparse_equipment_brigade',
      name: 'Sparse Equipment Brigade',
      faction: 'RBiH',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 5,
      morale: 60,
      createdTurn: 0,
      entrenchment_turns: 1,
      composition: {
        infantry: 1200,
        tanks: 10,
        artillery: 5,
        aa_systems: 0,
      },
    } as unknown as FormationView;

    useGameStore.setState({ armyHQExpandedSections: { 'orbat-arbih_1st_corps': true } });
    const { container } = render(createElement(OrbatSection, { corpsId: 'arbih_1st_corps', brigades: [brigade] }));

    fireEvent.click(screen.getAllByRole('button', { name: /Sparse Equipment Brigade/i })[0]);

    expect(container.textContent).toContain('Unreported');
    expect(container.textContent).not.toContain('10/10 operational');
    expect(container.textContent).not.toContain('5/5 operational');
  });

  it('renders Army HQ sector length as front segments instead of kilometers', () => {
    const brigade = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      morale: 60,
      createdTurn: 0,
      location_osid: 'op:sarajevo:dobrinja_1',
    } as unknown as FormationView;
    const sector = {
      sector_id: 'sector:arbih_1st_corps:0',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      display_name: 'Sarajevo front',
      edge_ids: ['edge-1', 'edge-2', 'edge-3', 'edge-4'],
      assigned_brigade_ids: [brigade.id],
      reserve_brigade_ids: [],
      length_edges: 4,
      sub_segment_count: 1,
      defensive_power: 1200,
      density: 0.25,
      threat_ratio: 1.1,
      intel_confidence: 0.8,
      offensive_signs: false,
      combat_strength_class: 'adequate',
      sub_segments: [{ sub_segment_id: 's1', friendly_osids: ['op:sarajevo:dobrinja_1'], enemy_osids: [] }],
    } as unknown as CorpsFrontSectorView;

    useGameStore.setState({
      loadedGameState: makeState({ formations: [brigade] }),
      armyHQExpandedSections: { 'sec-arbih_1st_corps': true },
      osidDisplayNames: { 'op:sarajevo:dobrinja_1': 'Dobrinja' },
    });

    const { container } = render(createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));

    const sectorRow = container.querySelector('[data-testid="army-hq-sector-row"]');
    expect(sectorRow?.getAttribute('data-sector-id')).toBe('sector:arbih_1st_corps:0');
    const frontage = container.querySelector('[data-testid="army-hq-sector-frontage"]');
    expect(frontage?.getAttribute('data-front-segments')).toBe('4');
    expect(container.textContent).toMatch(/1 on line; 4 front segments; density 0\.25/i);
    expect(container.textContent).toMatch(/Front segments: 4/i);
    expect(container.textContent).toMatch(/Brigades per front segment: 0\.25/i);
    expect(container.textContent).not.toMatch(/\bKM\b|per km|FRONTAGE/i);
  });

  it('offers separate field-inspection controls for Army HQ sector and ORBAT rows', () => {
    const brigade = {
      id: 'arbih_101_brigade',
      faction: 'RBiH',
      name: '101st Brigade',
      kind: 'brigade',
      status: 'active',
      readiness: 'ready',
      personnel: 1200,
      cohesion: 70,
      fatigue: 4,
      morale: 60,
      posture: 'defend',
      createdTurn: 0,
      location_osid: 'op:sarajevo:dobrinja_1',
      corps_id: 'arbih_1st_corps',
    } as unknown as FormationView;
    const sector = {
      sector_id: 'sector:arbih_1st_corps:0',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      display_name: 'Sarajevo front',
      edge_ids: ['edge-1'],
      assigned_brigade_ids: [brigade.id],
      reserve_brigade_ids: [],
      length_edges: 1,
      sub_segment_count: 1,
      defensive_power: 1200,
      density: 1,
      threat_ratio: 1.1,
      intel_confidence: 0.8,
      offensive_signs: false,
      sub_segments: [{ sub_segment_id: 's1', friendly_osids: ['op:sarajevo:dobrinja_1'], enemy_osids: [] }],
    } as unknown as CorpsFrontSectorView;

    useGameStore.setState({
      loadedGameState: makeState({ formations: [brigade] }),
      armyHQExpandedSections: { 'sec-arbih_1st_corps': true, 'orbat-arbih_1st_corps': true },
      osidDisplayNames: { 'op:sarajevo:dobrinja_1': 'Dobrinja' },
    });

    const { container: sectorsContainer } = render(createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));
    expect(sectorsContainer.querySelector('[data-testid="army-hq-sector-inspect"]')).toBeTruthy();
    expect(sectorsContainer.querySelector('[data-testid="army-hq-sector-brigade-inspect"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Inspect Sarajevo front on field/i }));
    let store = useGameStore.getState();
    expect(store.selectedCorpsFrontSectorId).toBe('sector:arbih_1st_corps:0');
    expect(store.selectedCorpsId).toBe('arbih_1st_corps');
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
    expect(store.armyHQOpen).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Inspect 101st Brigade on field/i }));
    store = useGameStore.getState();
    expect(store.selectedFormationId).toBe('arbih_101_brigade');
    expect(store.selectedCorpsFrontSectorId).toBe('sector:arbih_1st_corps:0');
    expect(store.selectedCorpsId).toBe('arbih_1st_corps');
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
    expect(store.armyHQOpen).toBe(false);

    cleanup();
    useGameStore.setState({
      loadedGameState: makeState({ formations: [brigade] }),
      armyHQExpandedSections: { 'orbat-arbih_1st_corps': true },
    });

    const { container: orbatContainer } = render(createElement(OrbatSection, { corpsId: 'arbih_1st_corps', brigades: [brigade] }));
    expect(orbatContainer.querySelector('[data-testid="army-hq-formation-inspect"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Inspect 101st Brigade on field/i }));
    store = useGameStore.getState();
    expect(store.selectedFormationId).toBe('arbih_101_brigade');
    expect(store.selectedCorpsId).toBe('arbih_1st_corps');
    expect(store.selectedOsid).toBe('op:sarajevo:dobrinja_1');
    expect(store.armyHQOpen).toBe(false);
  });

  it('keeps Army HQ sector inspect anchored to the first authored friendly segment', () => {
    const sector = {
      sector_id: 'sector:arbih_1st_corps:0',
      corps_id: 'arbih_1st_corps',
      corps_name: '1st Corps',
      faction: 'RBiH',
      opposing_factions: ['RS'],
      display_name: 'Sarajevo front',
      edge_ids: ['edge-1', 'edge-2'],
      assigned_brigade_ids: [],
      reserve_brigade_ids: [],
      length_edges: 2,
      sub_segment_count: 2,
      defensive_power: 1200,
      density: 0.5,
      threat_ratio: 1.1,
      intel_confidence: 0.8,
      offensive_signs: false,
      sub_segments: [
        { sub_segment_id: 's1', friendly_osids: ['op:sector:z_authored_first'], enemy_osids: [] },
        { sub_segment_id: 's2', friendly_osids: ['op:sector:a_lexicographic_first'], enemy_osids: [] },
      ],
    } as unknown as CorpsFrontSectorView;

    useGameStore.setState({
      loadedGameState: makeState({ formations: [] }),
      armyHQExpandedSections: { 'sec-arbih_1st_corps': true },
      osidDisplayNames: {
        'op:sector:z_authored_first': 'Authored First',
        'op:sector:a_lexicographic_first': 'Lexicographic First',
      },
    });

    render(createElement(SectorsSection, {
      corpsId: 'arbih_1st_corps',
      sectors: [sector],
      factionBattles: [],
      defaultOpen: true,
    }));

    fireEvent.click(screen.getByRole('button', { name: /Inspect Sarajevo front on field/i }));

    const store = useGameStore.getState();
    expect(store.selectedCorpsFrontSectorId).toBe('sector:arbih_1st_corps:0');
    expect(store.selectedOsid).toBe('op:sector:z_authored_first');
    expect(store.selectedOsid).not.toBe('op:sector:a_lexicographic_first');
  });

  it('renders Situation pressure and security copy without telemetry labels', () => {
    const state = makeState({
      internationalVisibilityPressure: {
        sarajevo_siege_visibility: 0.6,
        enclave_humanitarian_pressure: 0.4,
        atrocity_visibility: 0.2,
        negotiation_momentum: 0.5,
        composite_ivp: 0.43,
        last_major_shift: 0,
      },
      ivpConsequencesActive: ['international_sanctions'],
      corpsFrontSectors: [
        {
          sector_id: 'sector:arbih:1',
          corps_id: 'arbih_1st_corps',
          faction: 'RBiH',
          display_name: 'Sarajevo front',
          assigned_brigade_ids: [],
          reserve_brigade_ids: [],
          length_edges: 4,
          density: 0.2,
          threat_ratio: 1.3,
          intel_confidence: 0.65,
          offensive_signs: true,
          opsec_active: true,
        },
      ] as unknown as LoadedGameState['corpsFrontSectors'],
    });

    const { container: pressureContainer } = render(createElement(SituationTab, { state, focusSection: 'ivp' }));

    expect(screen.getByText('International Pressure')).toBeTruthy();
    expect(screen.getByText(/Current pressure:/)).toBeTruthy();
    expect(pressureContainer.textContent).not.toMatch(/\bIVP\b|Composite|Thresholds|×|raw/i);

    cleanup();

    const { container: securityContainer } = render(createElement(SituationTab, { state, focusSection: 'opsec' }));

    expect(screen.getByText('Operational Security')).toBeTruthy();
    expect(screen.getByText('Security screen active')).toBeTruthy();
    expect(securityContainer.textContent).not.toMatch(/\bOPSEC\b|\bSITREP\b/);
  });

  it('spells out Situation casualty rows without KIA/WIA/MIA shorthand', () => {
    const state = makeState({
      player_faction: 'RBiH',
      casualtyLedger: {
        RBiH: { killed: 12, wounded: 34, missing_captured: 5 },
      },
    } as Partial<LoadedGameState>);

    const { container } = render(createElement(SituationTab, { state, focusSection: 'casualties' }));

    expect(container.textContent).toMatch(/12 killed \/ 34 wounded \/ 5 missing or captured/i);
    expect(container.textContent).not.toMatch(/\bKIA\b|\bWIA\b|\bMIA\b/);
  });

  it('keeps Corps Front security controls free of OPSEC shorthand', () => {
    expect(enMessages['corpsFront.opsec']).toBe('Operational security');
    expect(enMessages['corpsFront.enableOpsec']).toBe('Tighten sector security');
    expect(enMessages['corpsFront.disableOpsec']).toBe('Relax sector security');
    expect(enMessages['corpsFront.opsecEnabled']).toBe('Sector security tightened.');
    expect(enMessages['corpsFront.opsecDisabled']).toBe('Sector security relaxed.');
    expect(enMessages['corpsFront.opsecToggleFailed']).toBe('Failed to update sector security');

    const panelSource = readFileSync('src/ui/map/components/CorpsFrontPanel.tsx', 'utf8');
    expect(panelSource).not.toMatch(/>[\s\r\n]*OPSEC[\s\r\n]*</);
  });

  it('keeps Army HQ and map drilldowns free of raw week and density debug copy', () => {
    const formationDetailSource = readFileSync('src/ui/map/components/FormationDetail.tsx', 'utf8');
    const armyReserveSource = readFileSync('src/ui/map/components/ArmyReservePanel.tsx', 'utf8');
    const corpsFrontSource = readFileSync('src/ui/map/components/CorpsFrontPanel.tsx', 'utf8');
    const oobSource = readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');
    const corpsDetailSource = readFileSync('src/ui/map/components/CorpsDetail.tsx', 'utf8');
    const corpsCardSource = readFileSync('src/ui/map/components/CorpsCard.tsx', 'utf8');
    const presidentialCategoriesSource = readFileSync('src/ui/map/data/presidentialCategories.ts', 'utf8');
    const liveSurfaceBrowserSweepSource = readFileSync('tools/ui/live_surface_browser_sweep.cjs', 'utf8');

    expect(formationDetailSource).toContain('formationDetail.dateParen');
    expect(formationDetailSource).not.toContain('formationDetail.weekParen');
    expect(armyReserveSource).not.toMatch(/turns_deployed\}w|w\{ep\.loan_start_turn|travelWeeks', \{ weeks:/);
    expect(corpsFrontSource).not.toMatch(/'INTEL'|'STAGING'|'SUPPLY'|'ASSESS'|'READY'|\/\{maxTurns\}t/);
    expect(enMessages['corpsFront.frontReserveBrigades']).not.toMatch(/Front|Reserve|\//);
    expect(enMessages['corpsFront.pax']).toBe('{count} personnel');
    expect(enMessages['corpsFront.pax']).not.toMatch(/\bPAX\b/);
    expect(enMessages['situation.frontsLine']).not.toMatch(/Front contacts|thinly held:\s*\{/);
    expect(enMessages['situation.allianceGauge']).not.toMatch(/Gauge/);
    expect(enMessages['situation.casualtyBreakdown']).not.toMatch(/\bKIA\b|\bWIA\b|\bMIA\b/);
    expect(enMessages['operationsSection.exchangeNoFriendlyLosses']).not.toMatch(/\bINF\b/);
    expect(enMessages['operationHistory.casualtyLine']).not.toMatch(/\bKIA\b|\bWIA\b|\bMIA\b/);
    expect(enMessages['operationHistory.exchangeNoFriendlyLosses']).not.toMatch(/\bINF\b/);
    expect(enMessages['operationsPanel.bdeCount']).not.toMatch(/\bbde\b/i);
    expect(enMessages['personnel.brigadeSummary']).not.toMatch(/\bbrg\b/i);
    expect(enMessages['operationsSection.directInterventionButton']).not.toMatch(/\bAUTH\b/);
    expect(enMessages['operationsSection.prep.intelGathering']).not.toMatch(/\bINTEL\b/);
    expect(enMessages['orbat.intelNarrative']).not.toMatch(/\bINTEL\b/);
    expect(enMessages['formationDetail.kia']).not.toMatch(/\bKIA\b/);
    expect(enMessages['formationDetail.wia']).not.toMatch(/\bWIA\b/);
    expect(enMessages['formationDetail.miaPow']).not.toMatch(/\bMIA\b|\bPOW\b/);
    expect(enMessages['warSummary.label.kia']).not.toMatch(/\bKIA\b/);
    expect(enMessages['warSummary.label.wia']).not.toMatch(/\bWIA\b/);
    expect(enMessages['sectorsSection.intel']).not.toMatch(/\bINTEL\b/);
    expect(enMessages['sectorsSection.defPerEdge']).not.toMatch(/DEF\/EDGE/);
    expect(enMessages['corpsFront.defPerEdge']).not.toMatch(/DEF\/EDGE/i);
    expect(enMessages['corpsFront.defPerEdge']).toContain('Defense per front segment');
    expect(enMessages['sectorsSection.morShort']).not.toMatch(/\bMOR\b/);
    expect(enMessages['sectorsSection.fatShort']).not.toMatch(/\bFAT\b/);
    expect(enMessages['sectorsSection.persShort']).not.toMatch(/\bPERS\b/);
    expect(enMessages['sectorsSection.personnelLosses']).not.toMatch(/\bPERS\b/);
    expect(enMessages['armyHqCorps.orbat']).toBe('Order of battle');
    expect(enMessages['orbat.loc']).toBe('Location');
    expect(enMessages['orbat.homeDef']).toBe('Home defense');
    expect(enMessages['orbat.title']).toBe('Order of battle');
    expect(enMessages['orbat.turnsShort']).not.toMatch(/\bT\b/);
    expect(enMessages['orbat.operationalCount']).not.toMatch(/\bOP\b/);
    expect(enMessages['operationsSection.operationalOrbat']).not.toMatch(/\bORBAT\b/);
    expect(enMessages['corpsCard.orbat']).toBe('Order of battle');
    expect(enMessages['sectorsSection.stance.activeDefense']).toBe('Active defense');
    expect(enMessages['corpsFront.tab.forces']).toBe('Order of battle');
    expect(enMessages['formationDetail.overridePermanentHelp']).not.toMatch(/frontline position/i);
    expect(enMessages['formationDetail.overridePermanentHelp']).toMatch(/sector command responsibility/i);
    expect(bcsMessages['situation.operationalSitrep']).not.toMatch(/\bSITREP\b/);
    expect(bcsMessages['decisionRoom.category.operational']).not.toMatch(/\bSITREP\b/);
    expect(bcsMessages['warroom.status.category.operational']).not.toMatch(/\bSITREP\b/);
    expect(bcsMessages['armyHqCorps.orbat']).not.toMatch(/\bORBAT\b/);
    expect(bcsMessages['orbat.loc']).not.toMatch(/\bLOK\b/);
    expect(bcsMessages['orbat.homeDef']).not.toMatch(/\bDOM ODB\b/);
    expect(bcsMessages['orbat.title']).not.toMatch(/\bORBAT\b/);
    expect(bcsMessages['orbat.turnsShort']).not.toMatch(/\bT\b/);
    expect(bcsMessages['orbat.operationalCount']).not.toMatch(/\bOP\b/);
    expect(bcsMessages['operationsSection.operationalOrbat']).not.toMatch(/\bORBAT\b/);
    expect(bcsMessages['corpsCard.orbat']).not.toMatch(/\bORBAT\b/i);
    expect(bcsMessages['sectorsSection.stance.activeDefense']).not.toMatch(/\bAKT ODB\b/);
    expect(bcsMessages['corpsFront.tab.forces']).not.toMatch(/\bORBAT\b/);
    expect(bcsMessages['corpsFront.opsec']).not.toMatch(/\bOPSEC\b/);
    expect(bcsMessages['situation.opsecActive']).not.toMatch(/\bOPSEC\b/);
    expect(bcsMessages['presidentialToolbar.auth']).not.toMatch(/\bAUTH\b/);
    expect(bcsMessages['operationsSection.directInterventionButton']).not.toMatch(/\bAUT\b/);
    expect(bcsMessages['operationsPanel.bdeCount']).not.toMatch(/brig\./i);
    expect(bcsMessages['personnel.brigadeSummary']).not.toMatch(/brig\./i);
    expect(bcsMessages['operationsSection.prep.intelGathering']).not.toMatch(/OBAVJ\./i);
    expect(bcsMessages['formationDetail.kia']).not.toMatch(/\bKIA\b/);
    expect(bcsMessages['formationDetail.wia']).not.toMatch(/\bWIA\b/);
    expect(bcsMessages['formationDetail.miaPow']).not.toMatch(/\bMIA\b|\bPOW\b/);
    expect(bcsMessages['armyHq.commandAccessOps']).not.toMatch(/\bops\b/i);
    expect(bcsMessages['armyHq.activeOps']).not.toMatch(/\bops\b/i);
    expect(bcsMessages['presidentialToolbar.ops']).not.toMatch(/\bOPS\b/);
    expect(bcsMessages['toolbar.ops']).not.toMatch(/\bOPS\b/);
    expect(bcsMessages['presidentialToolbar.commandAuthorityTitle']).not.toMatch(/Level 3|override/i);
    expect(bcsMessages['presidentialToolbar.commandAuthorityDescription']).not.toMatch(/Level 3|override/i);
    expect(bcsMessages['toolbar.commandAuthority.title']).not.toMatch(/Level 3|override/i);
    expect(bcsMessages['toolbar.commandAuthority.description']).not.toMatch(/Level 3|override/i);
    expect(bcsMessages['warSummary.campaignDrag.commandStrainDetail']).not.toMatch(/Command Relationship/);
    expect(bcsMessages['chiefOfStaff.exhaustion.precise']).not.toMatch(/Command Relationship/);
    expect(bcsMessages['brigadeRow.title']).not.toMatch(/Snabd\./);
    expect(bcsMessages['operationsSection.prep.supplyCheck']).not.toMatch(/Snabd\./i);
    expect(bcsMessages['operationsSection.readinessTitle']).not.toMatch(/obavj\./i);
    expect(bcsMessages['operationHistory.oic']).not.toMatch(/Kom\./);
    expect(bcsMessages['operationHistory.equipmentLost']).not.toMatch(/\{tanks\}T|\{artillery\}A/);
    expect(bcsMessages['operationHistory.equipmentDestroyed']).not.toMatch(/\{tanks\}T|\{artillery\}A/);
    expect(bcsMessages['operationHistory.equipmentCaptured']).not.toMatch(/\{tanks\}T|\{artillery\}A/);
    expect(presidentialCategoriesSource).not.toMatch(/front sitrep/i);
    expect(liveSurfaceBrowserSweepSource).toMatch(/label:\s*'PAX'/);
    expect(enMessages['recordsContent.tab.aar']).toMatch(/LATEST AFTER-ACTION REPORT/i);
    expect(enMessages['recordsContent.archiveSummary.operationAars']).toMatch(/Completed Operation AARs/i);
    expect(bcsMessages['recordsContent.tab.aar']).toMatch(/NAJNOVIJI/);
    expect(bcsMessages['recordsContent.archiveSummary.operationAars']).not.toMatch(/\bAAR\b/);
    expect(oobSource).not.toMatch(/\} assigned|Density:/);
    expect(corpsDetailSource).not.toMatch(/\} front|Density:|toTitleCase\(s\.sector_stance\)|\} men|~'\}\{s\.length_edges\} km|~.*km/);
    expect(corpsFrontSource).not.toMatch(/`~\$\{sector\.length_edges\} km`/);
    expect(corpsCardSource).toContain('getPlayerSafeOperationPhaseLabel(activeOperationPhase)');
  });

  it('uses a contextual accessible close name for the Army Reserve panel', () => {
    const armyReserveSource = readFileSync('src/ui/map/components/ArmyReservePanel.tsx', 'utf8');

    expect(armyReserveSource).toContain("aria-label={t('armyReserve.closePanelAria')}");
    expect(enMessages['armyReserve.closePanelAria']).toBe('Close Army Reserve panel');
    expect(enMessages['armyReserve.closePanelAria']).not.toBe('Close');
    expect(bcsMessages['armyReserve.closePanelAria']).toBeTruthy();
  });

  it('keeps settlement support panel copy on i18n keys', () => {
    const selectionSource = readFileSync('src/ui/map/components/SelectionPanel.tsx', 'utf8');

    expect(selectionSource).toContain("t('selection.settlementInfo')");
    expect(selectionSource).toContain("t('selection.localSupport')");
    expect(selectionSource).toContain("t('selection.noLocalSupportStaged')");
    expect(selectionSource).not.toMatch(/Settlement Info|Local support staged|Failed to stage local support|none staged/);
  });

  it('keeps normal command-surface English copy free of SITREP shorthand', () => {
    const commandSurfaceKeys = [
      'decisionRoom.category.operational',
      'decisionRoom.card.supply.explanation.critical',
      'decisionRoom.card.supply.explanation.warning',
      'decisionRoom.card.sitrep.title',
      'warroom.status.category.operational',
    ] as const;

    for (const key of commandSurfaceKeys) {
      expect(enMessages[key]).not.toMatch(/\bSITREP\b/);
    }
  });
});
