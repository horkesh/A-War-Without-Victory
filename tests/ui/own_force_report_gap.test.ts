// @vitest-environment jsdom

import React, { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { CorpsFrontPanel } from '../../src/ui/map/components/CorpsFrontPanel.js';
import { FormationDetail } from '../../src/ui/map/components/FormationDetail.js';
import { ForceReadiness, type CorpsReadiness } from '../../src/ui/map/components/army_hq/ForceReadiness.js';
import { OrbatSection } from '../../src/ui/map/components/army_hq/OrbatSection.js';
import { OOBSidebar } from '../../src/ui/map/components/OOBSidebar.js';
import { RawIntelTab } from '../../src/ui/map/components/ops_modal/RawIntelTab.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { CorpsFrontSectorView, FormationView, LoadedGameState } from '../../src/ui/map/data/types.js';

function baseState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    player_faction: 'RBiH',
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
    ...overrides,
  } as LoadedGameState;
}

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

const sparseBrigade = {
  id: 'arbih_sparse_brigade',
  name: 'Sparse Brigade',
  faction: 'RBiH',
  kind: 'brigade',
  status: 'active',
  readiness: 'ready',
  corps_id: corps.id,
  location_osid: 'op:sarajevo:dobrinja_1',
  composition: {
    infantry: 1200,
    tanks: 10,
    artillery: 5,
    aa_systems: 1,
  },
} as unknown as FormationView;

const sparseSector = {
  sector_id: 'sector:arbih_1st_corps:dobrinja',
  display_name: 'Dobrinja line',
  faction: 'RBiH',
  corps_id: corps.id,
  assigned_brigade_ids: [sparseBrigade.id],
  reserve_brigade_ids: [],
  rear_brigade_ids: [],
  opposing_factions: ['RS'],
  length_edges: 2,
  sub_segment_count: 1,
  density: 0.5,
  combat_strength_class: 'adequate',
} as unknown as CorpsFrontSectorView;

function sparseOwnForceState(): LoadedGameState {
  return baseState({
    formations: [corps, sparseBrigade],
    corpsFrontSectors: [sparseSector],
  });
}

function expectOwnForceReportGap(container: HTMLElement, expectedFields: string[]) {
  const notice = container.querySelector('[data-awwv-report-gap]');
  expect(notice).toBeTruthy();
  expect(notice?.textContent).toContain('Staff returns incomplete');
  const fieldList = notice?.getAttribute('data-awwv-report-gap') ?? '';
  for (const field of expectedFields) {
    expect(fieldList).toContain(field);
  }
}

describe('own-force report gap presentation', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('omits per-field Unreported labels in own-force sector intelligence and renders one report-gap notice', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: sparseOwnForceState(),
      osidDisplayNames: { 'op:sarajevo:dobrinja_1': 'Dobrinja' },
      selectedCorpsFrontSectorId: sparseSector.sector_id,
      selectedCorpsId: corps.id,
    });

    const { container } = render(createElement(CorpsFrontPanel, { railSlot: 'primary' }));

    expect(container.textContent).not.toMatch(/[Uu]nreported/);
    expectOwnForceReportGap(container, ['corps stance', 'sector stance', 'operational security', 'confidence', 'supply priority']);
  });

  it('omits per-field Unreported labels in own-force formation detail while preserving explicit reported zeroes', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: sparseOwnForceState(),
      osidDisplayNames: { 'op:sarajevo:dobrinja_1': 'Dobrinja' },
      selectedFormationId: sparseBrigade.id,
    });

    const { container } = render(createElement(FormationDetail, { railSlot: 'primary' }));

    expect(container.textContent).toContain('Awaiting first posture order');
    expect(container.textContent).toContain('1');
    expect(container.textContent).not.toMatch(/[Uu]nreported/);
    expectOwnForceReportGap(container, ['posture', 'cohesion', 'morale', 'fatigue', 'personnel']);
  });

  it('omits per-field Unreported labels in own-force readiness summaries', () => {
    const item: CorpsReadiness = {
      corpsId: corps.id,
      corpsName: '1st Corps',
      grade: 'UNREPORTED',
      ineffectiveCount: 0,
      totalBrigades: 1,
      avgFatigue: null,
      avgCohesion: null,
      disruptedCount: 0,
      overextendedCount: 0,
      incompleteAssessmentCount: 1,
      missingAssessmentFields: ['fatigue', 'cohesion'],
      hasThreat: false,
      recommendationId: 'assessment_incomplete',
      recommendation: 'Assessment incomplete',
    };

    const html = renderToStaticMarkup(createElement(ForceReadiness, { items: [item] }));

    expect(html).toContain('data-awwv-report-gap');
    expect(html).toContain('Staff returns incomplete');
    expect(html).not.toMatch(/[Uu]nreported/);
  });

  it('omits per-field Unreported labels in own-force ORBAT rows and expanded detail', () => {
    useGameStore.setState({ armyHQExpandedSections: { [`orbat-${corps.id}`]: true } });
    const { container } = render(createElement(OrbatSection, { corpsId: corps.id, brigades: [sparseBrigade] }));

    fireEvent.click(screen.getByTestId('army-hq-formation-toggle'));

    expect(container.textContent).not.toMatch(/[Uu]nreported/);
    expectOwnForceReportGap(container, ['personnel', 'cohesion', 'fatigue', 'posture']);
  });

  it('omits per-field Unreported labels in OOB direct summaries', () => {
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: baseState({
        mobilizationSummary: {
          RBiH: {
            total_available: null,
            total_committed: null,
            total_exhausted: null,
            exhaustion_pct: null,
            strategic_reserve: null,
            top_pools: [],
          },
        } as unknown as LoadedGameState['mobilizationSummary'],
        operations: [
          {
            corps_id: corps.id,
            corps_name: corps.name,
            faction: 'RBiH',
            name: 'sparse_operation',
            display_name: 'Sparse Operation',
            type: 'offensive',
            phase: 'planning',
            objectives: ['op:sarajevo:dobrinja_1'],
            participating_brigade_count: 0,
            started_turn: 0,
          },
        ],
      }),
    });

    const { container } = render(createElement(OOBSidebar));

    fireEvent.click(screen.getByTestId('oob-section-mobilization-toggle'));
    const operationsToggle = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Operations'));
    expect(operationsToggle).toBeTruthy();
    fireEvent.click(operationsToggle!);

    expect(container.textContent).not.toMatch(/[Uu]nreported/);
    expectOwnForceReportGap(container, ['Available', 'Strategic reserve']);
    const operationNotice = Array.from(container.querySelectorAll('[data-awwv-report-gap]'))
      .find((notice) => notice.getAttribute('data-awwv-report-gap')?.includes('Supply'));
    expect(operationNotice?.textContent).toContain('Staff returns incomplete');
  });

  it('keeps enemy-intel Unreported copy unchanged', () => {
    const { container } = render(createElement(RawIntelTab, {
      prediction: {
        overall: {
          recommendedAction: 'postpone',
          predictedOutcome: null,
          intelConfidence: null,
          forceRatio: null,
          estimatedCasualties: null,
        },
        perAxis: [
          {
            axisId: 'axis_north',
            predictedOutcome: null,
            forceRatio: null,
            defenseStrength: null,
          },
        ],
      },
    } as Parameters<typeof RawIntelTab>[0]));

    expect(container.textContent).toMatch(/[Uu]nreported/);
    expect(container.querySelector('[data-awwv-report-gap]')).toBeNull();
  });
});
