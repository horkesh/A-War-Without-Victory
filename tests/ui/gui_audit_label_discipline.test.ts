// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { SituationTab } from '../../src/ui/map/components/SituationTab.js';
import { SelectionPanel } from '../../src/ui/map/components/SelectionPanel.js';
import { CombatSummaryPanel } from '../../src/ui/map/components/CombatSummaryPanel.js';
import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard.js';
import { CombatRecordSection } from '../../src/ui/map/components/army_hq/CombatRecordSection.js';
import { OrbatSection } from '../../src/ui/map/components/army_hq/OrbatSection.js';
import { OpportunityLedgerPanel } from '../../src/ui/map/components/army_hq/OpportunityLedgerPanel.js';
import { SectorsSection } from '../../src/ui/map/components/army_hq/SectorsSection.js';
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
    } as unknown as FormationView;

    useGameStore.setState({ armyHQExpandedSections: { 'orbat-arbih_1st_corps': true } });
    const { container } = render(createElement(OrbatSection, { corpsId: 'arbih_1st_corps', brigades: [brigade] }));

    fireEvent.click(screen.getByRole('button', { name: /101st Brigade/i }));

    expect(container.textContent).toMatch(/12 killed \/ 34 wounded \/ 5 missing or captured/i);
    expect(container.textContent).not.toMatch(/\bKIA\b|\bWIA\b|\bMIA\b/);
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

    expect(container.textContent).toMatch(/1 on line \/\/4 front segments \/\/ density 0\.25/i);
    expect(container.textContent).toMatch(/Front segments: 4/i);
    expect(container.textContent).toMatch(/Brigades per front segment: 0\.25/i);
    expect(container.textContent).not.toMatch(/\bKM\b|per km|FRONTAGE/i);
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
    expect(presidentialCategoriesSource).not.toMatch(/front sitrep/i);
    expect(liveSurfaceBrowserSweepSource).toMatch(/label:\s*'PAX'/);
    expect(oobSource).not.toMatch(/\} assigned|Density:/);
    expect(corpsDetailSource).not.toMatch(/\} front|Density:|toTitleCase\(s\.sector_stance\)|\} men/);
    expect(corpsCardSource).toContain('getPlayerSafeOperationPhaseLabel(activeOperationPhase)');
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
