// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ArmyHQCorpsCard } from '../../src/ui/map/components/army_hq/ArmyHQCorpsCard.js';
import { ArmyHQModal } from '../../src/ui/map/components/army_hq/ArmyHQModal.js';
import { CorpsDetail } from '../../src/ui/map/components/CorpsDetail.js';
import { FormationDetail } from '../../src/ui/map/components/FormationDetail.js';
import {
  aggregateEffectiveness,
  computeBrigadeEffectiveness,
  effectivenessBandLabel,
} from '../../src/ui/map/utils/combatEffectiveness.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { CorpsFrontSectorView, FormationView, LoadedGameState } from '../../src/ui/map/data/types.js';

const rawCorpsEffectivenessPattern = /Combat Eff\.\s*[\d,]/;
const rawFormationEffectivenessPattern = /Effectiveness\s*[\d,]/;
const rawArmyCardEffectivenessPattern = /Effectiveness:\s*\d/;

function reportedBrigade(overrides: Partial<FormationView> = {}): FormationView {
  return {
    id: 'rbih_reported_brigade',
    faction: 'RBiH',
    name: 'Reported Brigade',
    kind: 'brigade',
    readiness: 'ready',
    status: 'active',
    createdTurn: 0,
    tags: [],
    corps_id: 'rbih_1st_corps',
    personnel: 1200,
    fatigue: 4,
    cohesion: 80,
    morale: 65,
    officer_quality: 0.7,
    posture: 'defend',
    composition: {
      infantry: 900,
      tanks: 2,
      artillery: 3,
      aa_systems: 0,
      tank_condition: { operational: 2, damaged: 0, destroyed: 0 },
      artillery_condition: { operational: 3, damaged: 0, destroyed: 0 },
    },
    ...overrides,
  } as FormationView;
}

function reportedCorps(overrides: Partial<FormationView> = {}): FormationView {
  return {
    id: 'rbih_1st_corps',
    faction: 'RBiH',
    name: '1st Corps',
    kind: 'corps',
    readiness: 'ready',
    status: 'active',
    createdTurn: 0,
    tags: [],
    corpsStance: 'defensive',
    ...overrides,
  } as FormationView;
}

function sector(): CorpsFrontSectorView {
  return {
    sector_id: 'sector:rbih_1st_corps:0',
    corps_id: 'rbih_1st_corps',
    corps_name: '1st Corps',
    display_name: 'Northern line',
    faction: 'RBiH',
    opposing_factions: ['RS'],
    edge_ids: ['edge_1'],
    sub_segment_count: 1,
    length_edges: 2,
    assigned_brigade_ids: ['rbih_reported_brigade'],
    reserve_brigade_ids: [],
    rear_brigade_ids: [],
    density: 1,
    threat_ratio: 0.8,
    defensive_power: 10,
    intel_confidence: 1,
    offensive_signs: false,
  } as CorpsFrontSectorView;
}

function loadedState(): LoadedGameState {
  return {
    label: 'Qualitative display test',
    turn: 0,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [reportedCorps(), reportedBrigade()],
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
    corpsFrontSectors: [sector()],
    activeOperations: [],
    factionReserves: {},
  } as unknown as LoadedGameState;
}

beforeEach(() => {
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    loadedGameState: loadedState(),
    selectedArmyId: 'RBiH',
    selectedCorpsId: 'rbih_1st_corps',
    selectedFormationId: 'rbih_reported_brigade',
    armyHQOpen: true,
  });
});

afterEach(() => {
  cleanup();
  useGameStore.setState(useGameStore.getInitialState());
});

describe('WP-7 qualitative effectiveness display', () => {
  it('maps complete and incomplete effectiveness through one i18n band helper', () => {
    const completeAggregate = aggregateEffectiveness([reportedBrigade()]);
    const completeBand = effectivenessBandLabel(completeAggregate);

    expect(completeBand).toEqual({ grade: 'A', labelKey: 'effectiveness.band.combatReady' });

    const sparseAggregate = aggregateEffectiveness([reportedBrigade({ fatigue: undefined })]);
    const sparseBand = effectivenessBandLabel(sparseAggregate);
    const sparseBreakdownBand = effectivenessBandLabel(computeBrigadeEffectiveness(
      reportedBrigade({ fatigue: undefined }),
    ));

    expect(sparseBand).toEqual({ grade: 'UNREPORTED', labelKey: 'effectiveness.band.unreported' });
    expect(sparseBreakdownBand).toEqual({ grade: 'UNREPORTED', labelKey: 'effectiveness.band.unreported' });
  });

  it('renders Corps Detail and Formation Detail primary effectiveness as grade plus qualitative band', () => {
    const corpsView = render(React.createElement(CorpsDetail, { railSlot: 'primary' }));
    const corpsCopy = corpsView.container.textContent ?? '';

    expect(corpsCopy).toContain('Combat ready');
    expect(corpsCopy).not.toMatch(rawCorpsEffectivenessPattern);
    expect(corpsView.container.querySelector('[data-testid="corps-detail-effectiveness"]')?.getAttribute('title'))
      .toMatch(/exact/i);

    cleanup();
    const formationView = render(React.createElement(FormationDetail, { railSlot: 'primary' }));
    const formationCopy = formationView.container.textContent ?? '';

    expect(formationCopy).toContain('Combat ready');
    expect(formationCopy).not.toMatch(rawFormationEffectivenessPattern);
    expect(formationView.container.querySelector('[data-testid="formation-detail-effectiveness"]')?.getAttribute('title'))
      .toMatch(/exact/i);
  });

  it('renders Army HQ corps cards with i18n band labels and no raw effectiveness scalar', () => {
    const state = loadedState();
    const card = render(
      React.createElement(ArmyHQCorpsCard, {
        corps: state.formations[0],
        brigades: [state.formations[1]],
        sectors: state.corpsFrontSectors ?? [],
        operations: [],
        factionBattles: [],
        gameState: state,
        isExpanded: false,
        isCompressed: false,
        onToggleExpand: () => undefined,
        readinessGrade: 'COMBAT READY',
        hasThreat: false,
      }),
    );
    const copy = card.container.textContent ?? '';

    expect(copy).toContain('Combat ready');
    expect(copy).not.toMatch(rawArmyCardEffectivenessPattern);
  });

  it('keeps Army HQ Command Access chips to corps name plus readiness only', () => {
    const view = render(React.createElement(ArmyHQModal));
    const commandAccess = screen.getByTestId('army-hq-corps-index');
    const copy = commandAccess.textContent ?? '';

    expect(copy).toContain('Readiness');
    expect(copy).not.toMatch(/\b\d+\s+sectors?\b/i);
    expect(copy).not.toMatch(/\b\d+\s+operations?\b/i);
    expect(view.container.textContent ?? '').toContain('Effectiveness');
  });
});
