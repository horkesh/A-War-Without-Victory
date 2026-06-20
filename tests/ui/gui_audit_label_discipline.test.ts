// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { SituationTab } from '../../src/ui/map/components/SituationTab.js';
import { SelectionPanel } from '../../src/ui/map/components/SelectionPanel.js';
import { OpportunityLedgerPanel } from '../../src/ui/map/components/army_hq/OpportunityLedgerPanel.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
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

  it('uses player-facing local-support headings without Phase E internals', () => {
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

    render(createElement(SituationTab, { state, focusSection: 'support' }));

    expect(screen.getByText('Local Support')).toBeTruthy();
    expect(screen.queryByText(/Phase E/)).toBeNull();

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

    render(createElement(SelectionPanel));

    expect(screen.getAllByText('Local Support').length).toBeGreaterThan(0);
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
